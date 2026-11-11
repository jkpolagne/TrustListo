import type { DocOwner, Document, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { FIELD_LABELS, REQUIRED } from '../docai/extractors';
import { flagsFor } from '../docai/pipeline';
import type { DocFlag, Extracted } from '../docai/types';
import { evaluateClient } from '../commissions/service';
import { grantLtsBadges, refreshListingBadges } from './badges';

/**
 * Broker review of documents other than consultant credentials: Licenses to Sell and
 * individual-seller listing documents (SPEC §8.6). Mounted at /reviews/documents, behind the
 * BROKER-only guard of the reviews router (rule 1: only a broker approves).
 */
export const documentReviewsRouter = Router();

const REVIEWABLE = ['READY_FOR_REVIEW', 'NEEDS_ATTENTION'] as const;

export const documentSummary = {
  id: true,
  ownerType: true,
  ownerId: true,
  declaredType: true,
  detectedType: true,
  aiStatus: true,
  reviewStatus: true,
  flags: true,
  createdAt: true,
} as const satisfies Prisma.DocumentSelect;

type OwnerInfo = {
  kind: 'PROJECT' | 'LISTING' | 'CLIENT' | 'OTHER';
  title: string;
  subtitle: string;
};

/** What the document is for, in words the broker recognizes. */
export async function ownerOf(d: { ownerType: DocOwner; ownerId: string }): Promise<OwnerInfo> {
  if (d.ownerType === 'PROJECT') {
    const p = await prisma.project.findUnique({
      where: { id: d.ownerId },
      select: { name: true, locationText: true, developer: { select: { name: true } } },
    });
    return {
      kind: 'PROJECT',
      title: p?.name ?? 'Project',
      subtitle: p ? `${p.developer.name} · ${p.locationText}` : '',
    };
  }
  if (d.ownerType === 'SELLER_REQUEST' || d.ownerType === 'PROPERTY') {
    const req =
      d.ownerType === 'SELLER_REQUEST'
        ? await prisma.sellerListingRequest.findUnique({ where: { id: d.ownerId } })
        : (
            await prisma.property.findUnique({
              where: { id: d.ownerId },
              select: { sellerRequest: true },
            })
          )?.sellerRequest;
    return {
      kind: 'LISTING',
      title: req ? `Property of ${req.sellerName}` : 'Seller listing',
      subtitle: req?.locationText ?? '',
    };
  }
  if (d.ownerType === 'CLIENT') {
    const c = await prisma.client.findUnique({
      where: { id: d.ownerId },
      select: { fullName: true, propertyId: true },
    });
    const p = c
      ? await prisma.property.findUnique({ where: { id: c.propertyId }, select: { title: true } })
      : null;
    return {
      kind: 'CLIENT',
      title: c ? `Buyer: ${c.fullName}` : 'Buyer',
      subtitle: p?.title ?? '',
    };
  }
  return { kind: 'OTHER', title: d.ownerType, subtitle: '' };
}

/**
 * Not reviewed by the broker in this queue: credentials (own screen, listed with their holder)
 * payment receipts (the uploader confirms the amount, §8.3) and developer transmittals (the
 * CompanyAdmin confirms the amount on the commission, §10.4).
 */
const NOT_IN_QUEUE = ['CREDENTIAL', 'PAYMENT', 'TRANSMITTAL'] as const;

/** Review-queue rows for documents, oldest first. */
export async function documentQueue(firmId: string) {
  const docs = await prisma.document.findMany({
    where: {
      firmId,
      ownerType: { notIn: [...NOT_IN_QUEUE] },
      reviewStatus: { in: [...REVIEWABLE, 'PENDING_AI'] },
    },
    select: documentSummary,
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(docs.map(async (d) => ({ ...d, owner: await ownerOf(d) })));
}

async function findDocument(firmId: string, docId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: docId, firmId, ownerType: { notIn: [...NOT_IN_QUEUE] } },
  });
  if (!doc) throw notFoundError();
  return doc;
}

/** Field rows for the review screen: required fields first, then anything else that was read. */
function fieldRows(doc: Document) {
  const extracted = (doc.extracted ?? {}) as Extracted;
  const type = doc.declaredType ?? doc.detectedType ?? 'UNKNOWN';
  const required = REQUIRED[type] ?? [];
  const keys = [...new Set([...required, ...Object.keys(extracted)])];
  return keys.map((key) => ({
    key,
    label: FIELD_LABELS[key] ?? key,
    required: required.includes(key),
    value: extracted[key]?.value ?? null,
    confidence: extracted[key]?.confidence ?? 0,
    edited: extracted[key]?.edited ?? false,
    aiValue: extracted[key]?.aiValue ?? null,
  }));
}

function assertReviewable(status: string) {
  if (!(REVIEWABLE as readonly string[]).includes(status)) {
    throw new HttpError(
      409,
      'NOT_REVIEWABLE',
      status === 'PENDING_AI'
        ? 'This document is still being read. Try again in a moment.'
        : 'This document was already decided.',
    );
  }
}

documentReviewsRouter.get('/:id', async (req, res) => {
  const doc = await findDocument(firmScope(req.user!).firmId, req.params.id);
  const siblings = await prisma.document.findMany({
    where: {
      firmId: doc.firmId,
      ownerType: doc.ownerType,
      ownerId: doc.ownerId,
      id: { not: doc.id },
    },
    select: documentSummary,
    orderBy: { createdAt: 'asc' },
  });
  const reviewer = doc.reviewedById
    ? await prisma.user.findUnique({
        where: { id: doc.reviewedById },
        select: { firstName: true, lastName: true },
      })
    : null;
  res.json({
    id: doc.id,
    ownerType: doc.ownerType,
    declaredType: doc.declaredType,
    detectedType: doc.detectedType,
    mimeType: doc.mimeType,
    aiStatus: doc.aiStatus,
    reviewStatus: doc.reviewStatus,
    ocrText: doc.ocrText,
    ocrConfidence: doc.ocrConfidence,
    flags: (doc.flags ?? []) as DocFlag[],
    fields: fieldRows(doc),
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt,
    reviewer,
    createdAt: doc.createdAt,
    owner: await ownerOf(doc),
    siblings,
  });
});

const approveBody = z.object({
  // Broker corrections to what the AI read, { fieldKey: newValue }. Every change is audited.
  fields: z.record(z.string().max(60), z.string().trim().max(300).nullable()).optional(),
  overrideNote: z.string().trim().max(500).optional(),
});

documentReviewsRouter.post('/:id/approve', async (req, res) => {
  const body = approveBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const doc = await findDocument(firmId, req.params.id);
  assertReviewable(doc.reviewStatus);

  // Apply the corrections, keeping the AI's reading next to each changed value.
  const extracted = { ...((doc.extracted ?? {}) as Extracted) };
  const allowed = new Set(fieldRows(doc).map((f) => f.key));
  const edits: { field: string; from: string | null; to: string | null }[] = [];
  for (const [key, raw] of Object.entries(body.fields ?? {})) {
    if (!allowed.has(key)) throw new HttpError(400, 'UNKNOWN_FIELD', `Unknown field "${key}".`);
    const to = raw === '' ? null : raw;
    const before = extracted[key];
    if ((before?.value ?? null) === to) continue;
    edits.push({ field: key, from: before?.value ?? null, to });
    extracted[key] = {
      value: to,
      confidence: 100,
      edited: true,
      aiValue: before?.edited ? (before.aiValue ?? null) : (before?.value ?? null),
    };
  }

  // Re-run the checks on the corrected values: fixing a misread can clear a flag.
  const flags = await flagsFor(doc, extracted);
  if (flags.some((f) => f.severity === 'BLOCKER') && !body.overrideNote) {
    throw new HttpError(
      400,
      'OVERRIDE_NOTE_REQUIRED',
      'Explain why you are approving despite the blocking issue.',
      { flags },
    );
  }

  const isLts = doc.ownerType === 'PROJECT' && doc.declaredType === 'LICENSE_TO_SELL';
  let ltsExpiry: Date | null = null;
  if (isLts) {
    const raw = extracted.expiryDate?.value;
    ltsExpiry = raw ? new Date(`${raw}T23:59:59`) : null;
    if (!ltsExpiry || Number.isNaN(ltsExpiry.getTime())) {
      throw new HttpError(
        400,
        'EXPIRY_REQUIRED',
        'Enter the expiry date printed on the license (YYYY-MM-DD).',
      );
    }
    if (ltsExpiry < new Date()) {
      throw new HttpError(
        400,
        'EXPIRED',
        'This license has expired. Reject it and ask for a current one.',
      );
    }
  }

  const now = new Date();
  const brokerId = req.user!.id;
  const badges = await prisma.$transaction(async (tx) => {
    const approved = await tx.document.update({
      where: { id: doc.id },
      data: {
        extracted: extracted as Prisma.InputJsonValue,
        flags: flags as unknown as Prisma.InputJsonValue,
        reviewStatus: 'APPROVED',
        reviewedById: brokerId,
        reviewedAt: now,
        reviewNote: body.overrideNote ?? null,
      },
    });
    let granted: string[];
    if (isLts) {
      await tx.project.update({
        where: { id: doc.ownerId },
        data: {
          ltsDocumentId: doc.id,
          ltsNumber: extracted.ltsNumber?.value ?? null,
          ltsExpiresAt: ltsExpiry,
          ltsStatus: 'APPROVED',
        },
      });
      await grantLtsBadges(tx, doc.ownerId, brokerId, ltsExpiry!);
      granted = ['LTS_VERIFIED'];
    } else if (doc.ownerType === 'CLIENT') {
      // Buyer document: the broker's approval verifies its checklist item (OPEN-3, rule 9 gate).
      await tx.requirementItem.updateMany({
        where: { firmId: doc.firmId, documentId: doc.id },
        data: { status: 'VERIFIED', verifiedById: brokerId, verifiedAt: now },
      });
      granted = [];
    } else {
      granted = await refreshListingBadges(tx, approved, brokerId, now);
    }
    await audit(
      req,
      {
        action: 'DOCUMENT_APPROVED',
        entityType: 'Document',
        entityId: doc.id,
        before: { reviewStatus: doc.reviewStatus },
        after: {
          reviewStatus: 'APPROVED',
          type: doc.declaredType,
          flags: flags.map((f) => f.code),
          badges: granted,
          ...(edits.length ? { edits } : {}),
          ...(body.overrideNote ? { overrideNote: body.overrideNote } : {}),
        },
      },
      tx,
    );
    return granted;
  });
  if (doc.ownerType === 'CLIENT') await evaluateClient(doc.ownerId, req); // docs gate (§10.4)
  res.json({ id: doc.id, reviewStatus: 'APPROVED', badges });
});

const rejectBody = z.object({
  reason: z.string().trim().min(5, 'Give the reason so the uploader knows what to fix.').max(500),
});

documentReviewsRouter.post('/:id/reject', async (req, res) => {
  const { reason } = rejectBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const doc = await findDocument(firmId, req.params.id);
  assertReviewable(doc.reviewStatus);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const rejected = await tx.document.update({
      where: { id: doc.id },
      data: {
        reviewStatus: 'REJECTED',
        reviewedById: req.user!.id,
        reviewedAt: now,
        reviewNote: reason,
      },
    });
    if (doc.ownerType === 'PROJECT') {
      // Rejecting a renewal leaves an already-approved license in place.
      await tx.project.updateMany({
        where: { id: doc.ownerId, firmId, ltsStatus: { not: 'APPROVED' } },
        data: { ltsStatus: 'REJECTED' },
      });
    } else if (doc.ownerType === 'CLIENT') {
      // The consultant must upload a better copy; the item goes back to missing.
      await tx.requirementItem.updateMany({
        where: { firmId: doc.firmId, documentId: doc.id },
        data: { status: 'MISSING', documentId: null },
      });
    } else {
      await refreshListingBadges(tx, rejected, req.user!.id, now);
    }
    await audit(
      req,
      {
        action: 'DOCUMENT_REJECTED',
        entityType: 'Document',
        entityId: doc.id,
        before: { reviewStatus: doc.reviewStatus },
        after: { reviewStatus: 'REJECTED', type: doc.declaredType, reason },
      },
      tx,
    );
  });
  if (doc.ownerType === 'CLIENT') await evaluateClient(doc.ownerId, req); // docs gate (§10.4)
  res.json({ id: doc.id, reviewStatus: 'REJECTED' });
});
