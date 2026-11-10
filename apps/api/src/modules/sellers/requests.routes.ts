import type { DocType, Prisma, SellerListingRequest } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { setPoint } from '../../lib/geo';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { objectKey, presignedGet, putObject } from '../../lib/storage';
import { requireDocumentFile, singleFile } from '../../lib/upload';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { queueDocument } from '../docai/pipeline';
import type { DocFlag } from '../docai/types';

/**
 * Seller listing requests, firm side (SPEC §7.6, §5.2):
 * CompanyAdmin and Broker see every request of the firm; a Sales Manager or Sales Person sees
 * and works only the requests where they are the chosen agent.
 */
export const sellerRequestsRouter = Router();
sellerRequestsRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON'));

/** The four documents every listing needs before it can go to the broker. */
export const LISTING_DOCS = ['LAND_TITLE', 'TAX_DECLARATION', 'RPT_RECEIPT', 'SELLER_ID'] as const;
type ListingDoc = (typeof LISTING_DOCS)[number];

const isAgentRole = (role: string) => role === 'SALES_MANAGER' || role === 'SALES_PERSON';

function scopeWhere(req: Express.Request): Prisma.SellerListingRequestWhereInput {
  const { firmId } = firmScope(req.user!);
  return isAgentRole(req.user!.role) ? { firmId, agentId: req.user!.id } : { firmId };
}

async function findRequest(req: Express.Request, id: string) {
  const r = await prisma.sellerListingRequest.findFirst({ where: { ...scopeWhere(req), id } });
  if (!r) throw notFoundError();
  return r;
}

/** Only the chosen agent works the request (admins and brokers read). */
function assertAgent(req: Express.Request, r: SellerListingRequest) {
  if (r.agentId !== req.user!.id) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the agent the seller chose can do this.');
  }
}

function assertStatus(
  r: SellerListingRequest,
  allowed: SellerListingRequest['status'][],
  what: string,
) {
  if (!allowed.includes(r.status)) {
    throw new HttpError(409, 'WRONG_STATUS', `This request can't be ${what} right now.`);
  }
}

const docSummary = {
  id: true,
  declaredType: true,
  detectedType: true,
  aiStatus: true,
  reviewStatus: true,
  flags: true,
  reviewNote: true,
  createdAt: true,
} as const satisfies Prisma.DocumentSelect;

async function documentsOf(r: SellerListingRequest) {
  return prisma.document.findMany({
    where: { firmId: r.firmId, ownerType: 'SELLER_REQUEST', ownerId: r.id },
    select: docSummary,
    orderBy: { createdAt: 'asc' },
  });
}

type Doc = Awaited<ReturnType<typeof documentsOf>>[number];

/** The document that currently counts for each type: the newest one not rejected. */
function currentByType(docs: Doc[]) {
  const out: Partial<Record<ListingDoc, Doc>> = {};
  for (const d of docs) {
    const t = d.declaredType as ListingDoc;
    if (LISTING_DOCS.includes(t) && d.reviewStatus !== 'REJECTED') out[t] = d;
  }
  return out;
}

async function agentOf(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
}

/** Why the broker last sent the listing back, from the audit trail (shown to the agent). */
async function lastRejection(propertyId: string | undefined) {
  if (!propertyId) return null;
  const log = await prisma.auditLog.findFirst({
    where: { entityType: 'Property', entityId: propertyId, action: 'LISTING_REJECTED' },
    orderBy: { createdAt: 'desc' },
    select: { after: true, createdAt: true },
  });
  const reason = (log?.after as { reason?: string } | null)?.reason;
  return reason ? { reason, at: log!.createdAt } : null;
}

sellerRequestsRouter.get('/', async (req, res) => {
  const rows = await prisma.sellerListingRequest.findMany({
    where: scopeWhere(req),
    orderBy: { createdAt: 'desc' },
    include: { property: { select: { id: true, status: true, slug: true } } },
  });
  const docs = await prisma.document.findMany({
    where: {
      firmId: firmScope(req.user!).firmId,
      ownerType: 'SELLER_REQUEST',
      ownerId: { in: rows.map((r) => r.id) },
    },
    select: { ...docSummary, ownerId: true },
    orderBy: { createdAt: 'asc' },
  });
  const agents = new Map(
    (
      await prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.agentId))] } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    ).map((a) => [a.id, a]),
  );
  res.json({
    data: rows.map(({ photoKeys, sellerPhone: _p, sellerEmail: _e, ...r }) => ({
      ...r,
      photoCount: photoKeys.length,
      agent: agents.get(r.agentId) ?? null,
      documents: Object.values(currentByType(docs.filter((d) => d.ownerId === r.id))),
    })),
  });
});

sellerRequestsRouter.get('/:id', async (req, res) => {
  const r = await findRequest(req, req.params.id);
  const property = await prisma.property.findUnique({
    where: { sellerRequestId: r.id },
    select: {
      id: true,
      status: true,
      slug: true,
      title: true,
      description: true,
      barangay: true,
      city: true,
      badges: { select: { type: true, validUntil: true } },
    },
  });
  const docs = await documentsOf(r);
  const { photoKeys, ...rest } = r;
  res.json({
    ...rest,
    agent: await agentOf(r.agentId),
    isAgent: r.agentId === req.user!.id,
    photos: photoKeys.map((_k, i) => `/api/v1/seller-requests/${r.id}/photos/${i}`),
    property,
    rejection: await lastRejection(property?.id),
    documents: docs,
    current: currentByType(docs),
  });
});

/** Seller's photos, after the scope check. Redirects to a short-lived storage link. */
sellerRequestsRouter.get('/:id/photos/:index', async (req, res) => {
  const r = await findRequest(req, req.params.id);
  const key = r.photoKeys[Number(req.params.index)];
  if (!key) throw notFoundError();
  res.redirect(302, await presignedGet(key));
});

sellerRequestsRouter.post('/:id/accept', async (req, res) => {
  const r = await findRequest(req, req.params.id);
  assertAgent(req, r);
  assertStatus(r, ['NEW'], 'accepted');
  await prisma.$transaction(async (tx) => {
    await tx.sellerListingRequest.update({ where: { id: r.id }, data: { status: 'ACCEPTED' } });
    await audit(
      req,
      {
        action: 'SELLER_REQUEST_ACCEPTED',
        entityType: 'SellerListingRequest',
        entityId: r.id,
        before: { status: r.status },
        after: { status: 'ACCEPTED' },
      },
      tx,
    );
  });
  res.json({ status: 'ACCEPTED' });
});

const declineBody = z.object({
  reason: z.string().trim().min(5, 'Say why, so your company admin has a record.').max(500),
});

sellerRequestsRouter.post('/:id/decline', async (req, res) => {
  const { reason } = declineBody.parse(req.body);
  const r = await findRequest(req, req.params.id);
  assertAgent(req, r);
  assertStatus(r, ['NEW', 'ACCEPTED', 'DOCUMENTS_IN_PROGRESS'], 'declined');
  await prisma.$transaction(async (tx) => {
    await tx.sellerListingRequest.update({ where: { id: r.id }, data: { status: 'DECLINED' } });
    await audit(
      req,
      {
        action: 'SELLER_REQUEST_DECLINED',
        entityType: 'SellerListingRequest',
        entityId: r.id,
        before: { status: r.status },
        after: { status: 'DECLINED', reason },
      },
      tx,
    );
  });
  res.json({ status: 'DECLINED' });
});

const docBody = z.object({ declaredType: z.enum(LISTING_DOCS) });

/** Agent uploads one listing document; Module 1 reads it in the background. */
sellerRequestsRouter.post('/:id/documents', singleFile('file'), async (req, res) => {
  const { declaredType } = docBody.parse(req.body);
  const file = requireDocumentFile(req.file);
  const r = await findRequest(req, String(req.params.id));
  assertAgent(req, r);
  // Under review too: the broker may reject one document and ask for a better copy.
  assertStatus(r, ['ACCEPTED', 'DOCUMENTS_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW'], 'given documents');

  const existing = currentByType(await documentsOf(r))[declaredType];
  if (existing) {
    throw new HttpError(
      409,
      'ALREADY_UPLOADED',
      existing.reviewStatus === 'APPROVED'
        ? 'The broker already approved this document.'
        : 'This document is already uploaded. If it is wrong, ask your broker to reject it, then upload the right one.',
    );
  }

  const storageKey = objectKey(r.firmId, 'seller-requests', r.id, file.mime);
  await putObject(storageKey, file.buffer, file.mime);
  const doc = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        firmId: r.firmId,
        ownerType: 'SELLER_REQUEST',
        ownerId: r.id,
        declaredType: declaredType as DocType,
        storageKey,
        mimeType: file.mime,
        sizeBytes: file.size,
        sha256: file.sha256,
        uploadedById: req.user!.id,
      },
    });
    if (r.status === 'ACCEPTED') {
      await tx.sellerListingRequest.update({
        where: { id: r.id },
        data: { status: 'DOCUMENTS_IN_PROGRESS' },
      });
    }
    await audit(
      req,
      {
        action: 'LISTING_DOCUMENT_UPLOADED',
        entityType: 'SellerListingRequest',
        entityId: r.id,
        after: { documentId: d.id, type: declaredType },
      },
      tx,
    );
    return d;
  });
  queueDocument(doc.id);
  res.status(201).json({ id: doc.id, aiStatus: doc.aiStatus, reviewStatus: doc.reviewStatus });
});

const submitBody = z.object({
  title: z.string().trim().min(8, 'Give the listing a descriptive title.').max(120),
  description: z.string().trim().max(4000).optional(),
  barangay: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  // Required: every live listing must be findable on the public map.
  location: z.object(
    { lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) },
    {
      required_error: 'Place the map pin on the property.',
      invalid_type_error: 'Place the map pin on the property.',
    },
  ),
});

const slugify = (s: string) =>
  `${s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)}-${randomBytes(3).toString('hex')}`;

/**
 * Agent sends the listing to the firm's broker (SPEC §7.6). Needs all four documents read by
 * Module 1. Creates the Property on the first submission; a resubmission after a rejection
 * reuses it.
 */
sellerRequestsRouter.post('/:id/submit', async (req, res) => {
  const body = submitBody.parse(req.body);
  const r = await findRequest(req, req.params.id);
  assertAgent(req, r);
  assertStatus(r, ['DOCUMENTS_IN_PROGRESS'], 'submitted');

  const current = currentByType(await documentsOf(r));
  const missing = LISTING_DOCS.filter((t) => !current[t]);
  if (missing.length) {
    throw new HttpError(409, 'DOCUMENTS_MISSING', 'Upload all four documents first.', { missing });
  }
  if (Object.values(current).some((d) => d.aiStatus === 'QUEUED' || d.aiStatus === 'PROCESSING')) {
    throw new HttpError(409, 'STILL_READING', 'Wait until every document has been read.');
  }
  const flagged = Object.values(current).some((d) =>
    ((d.flags ?? []) as unknown as DocFlag[]).some((f) => f.severity !== 'INFO'),
  );
  const status = flagged ? 'NEEDS_ATTENTION' : 'PENDING_REVIEW';

  const existing = await prisma.property.findUnique({ where: { sellerRequestId: r.id } });
  const property = await prisma.$transaction(async (tx) => {
    const data = {
      title: body.title,
      description: body.description ?? null,
      barangay: body.barangay,
      city: body.city,
      type: r.propertyType,
      price: r.askingPrice,
      lotAreaSqm: r.lotAreaSqm,
      floorAreaSqm: r.floorAreaSqm,
      status,
    } as const;
    const p = existing
      ? await tx.property.update({ where: { id: existing.id }, data })
      : await tx.property.create({
          data: {
            ...data,
            firmId: r.firmId,
            source: 'INDIVIDUAL_SELLER',
            sellerRequestId: r.id,
            assignedAgentId: r.agentId, // all inquiries go to the seller's chosen agent (§7.2)
            slug: slugify(body.title),
            photos: { create: r.photoKeys.map((key, sort) => ({ key, sort })) },
          },
        });
    await tx.sellerListingRequest.update({
      where: { id: r.id },
      data: { status: 'SUBMITTED_FOR_REVIEW' },
    });
    await audit(
      req,
      {
        action: 'LISTING_SUBMITTED',
        entityType: 'Property',
        entityId: p.id,
        before: { status: existing?.status ?? null },
        after: { status, sellerRequestId: r.id },
      },
      tx,
    );
    return p;
  });
  await setPoint('Property', property.id, body.location);
  res.json({ propertyId: property.id, status });
});
