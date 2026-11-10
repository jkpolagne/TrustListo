import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { LISTING_DOCS } from '../sellers/requests.routes';
import { refreshListingBadges } from './badges';

/**
 * Broker decision on an individual seller listing (SPEC §7.6, §13 reviews/properties).
 * Mounted at /reviews/properties behind the BROKER-only guard (rule 1).
 * Decided for OPEN-2: a listing goes live only when its land title, tax declaration, RPT
 * receipt and seller ID are all broker-approved — no title, no listing.
 */
export const listingReviewsRouter = Router();

const UNDER_REVIEW = ['PENDING_REVIEW', 'NEEDS_ATTENTION'] as const;

async function findListing(firmId: string, id: string) {
  const p = await prisma.property.findFirst({
    where: { id, firmId, source: 'INDIVIDUAL_SELLER' },
    include: {
      sellerRequest: true,
      photos: { select: { id: true }, orderBy: { sort: 'asc' } },
      badges: { select: { type: true, validUntil: true } },
    },
  });
  if (!p?.sellerRequest) throw notFoundError();
  return { ...p, sellerRequest: p.sellerRequest };
}

async function listingDocuments(firmId: string, requestId: string) {
  const docs = await prisma.document.findMany({
    where: { firmId, ownerType: 'SELLER_REQUEST', ownerId: requestId },
    select: {
      id: true,
      declaredType: true,
      aiStatus: true,
      reviewStatus: true,
      flags: true,
      reviewNote: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  // The newest non-rejected document per type is the one that counts.
  const current = new Map<string, (typeof docs)[number]>();
  for (const d of docs) if (d.reviewStatus !== 'REJECTED') current.set(d.declaredType!, d);
  return LISTING_DOCS.map((type) => ({ type, document: current.get(type) ?? null }));
}

/** Listings waiting for the broker, for the review queue. */
export async function listingQueue(firmId: string) {
  const rows = await prisma.property.findMany({
    where: { firmId, source: 'INDIVIDUAL_SELLER', status: { in: [...UNDER_REVIEW] } },
    select: {
      id: true,
      title: true,
      status: true,
      barangay: true,
      city: true,
      updatedAt: true,
      sellerRequest: { select: { id: true, sellerName: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });
  return Promise.all(
    rows.map(async (r) => {
      const docs = await listingDocuments(firmId, r.sellerRequest!.id);
      return {
        ...r,
        documentsApproved: docs.filter((d) => d.document?.reviewStatus === 'APPROVED').length,
        documentsTotal: docs.length,
      };
    }),
  );
}

listingReviewsRouter.get('/:id', async (req, res) => {
  const { firmId } = firmScope(req.user!);
  const p = await findListing(firmId, req.params.id);
  const agent = p.assignedAgentId
    ? await prisma.user.findUnique({
        where: { id: p.assignedAgentId },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : null;
  const { sellerRequest: r, photos, ...property } = p;
  res.json({
    ...property,
    photos: photos.map((ph) => `/api/v1/catalog/photos/${ph.id}`),
    seller: {
      requestId: r.id,
      name: r.sellerName,
      phone: r.sellerPhone,
      email: r.sellerEmail,
      locationText: r.locationText,
      hasTitle: r.hasTitle,
      requestStatus: r.status,
    },
    agent,
    documents: await listingDocuments(firmId, r.id),
  });
});

listingReviewsRouter.post('/:id/approve', async (req, res) => {
  const { firmId } = firmScope(req.user!);
  const p = await findListing(firmId, req.params.id);
  if (!(UNDER_REVIEW as readonly string[]).includes(p.status)) {
    throw new HttpError(409, 'NOT_REVIEWABLE', 'This listing is not waiting for review.');
  }
  const docs = await listingDocuments(firmId, p.sellerRequest.id);
  const notApproved = docs
    .filter((d) => d.document?.reviewStatus !== 'APPROVED')
    .map((d) => d.type);
  if (notApproved.length) {
    throw new HttpError(
      409,
      'DOCUMENTS_NOT_APPROVED',
      'Approve all four documents first. A listing goes live only with a verified title, tax declaration, tax receipt and seller ID.',
      { notApproved },
    );
  }

  const now = new Date();
  const badges = await prisma.$transaction(async (tx) => {
    const titleDoc = await tx.document.findUniqueOrThrow({
      where: { id: docs.find((d) => d.type === 'LAND_TITLE')!.document!.id },
    });
    const earned = await refreshListingBadges(tx, titleDoc, req.user!.id, now);
    await tx.property.update({ where: { id: p.id }, data: { status: 'LIVE', publishedAt: now } });
    await tx.sellerListingRequest.update({
      where: { id: p.sellerRequest.id },
      data: { status: 'LISTED' },
    });
    await audit(
      req,
      {
        action: 'LISTING_APPROVED',
        entityType: 'Property',
        entityId: p.id,
        before: { status: p.status },
        after: { status: 'LIVE', badges: earned },
      },
      tx,
    );
    return earned;
  });
  res.json({ status: 'LIVE', badges });
});

const rejectBody = z.object({
  reason: z.string().trim().min(5, 'Tell the agent what to fix.').max(500),
});

/** Sends the listing back to the agent, who can fix documents and resubmit. */
listingReviewsRouter.post('/:id/reject', async (req, res) => {
  const { reason } = rejectBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const p = await findListing(firmId, req.params.id);
  if (!(UNDER_REVIEW as readonly string[]).includes(p.status)) {
    throw new HttpError(409, 'NOT_REVIEWABLE', 'This listing is not waiting for review.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.property.update({ where: { id: p.id }, data: { status: 'REJECTED' } });
    await tx.sellerListingRequest.update({
      where: { id: p.sellerRequest.id },
      data: { status: 'DOCUMENTS_IN_PROGRESS' },
    });
    await audit(
      req,
      {
        action: 'LISTING_REJECTED',
        entityType: 'Property',
        entityId: p.id,
        before: { status: p.status },
        after: { status: 'REJECTED', reason },
      },
      tx,
    );
  });
  res.json({ status: 'REJECTED' });
});
