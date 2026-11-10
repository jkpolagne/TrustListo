import type { Document, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getObjectBytes } from '../../lib/storage';
import { computeFlags, effectiveType, type CheckContext } from './checks';
import { classify } from './classify';
import { extract } from './extractors';
import { runOcr } from './ocr';
import { enqueue } from './queue';
import { suggestFrom, type AiSuggestion, type DocFlag, type Extracted } from './types';

/**
 * Module 1 pipeline (SPEC §8.1): OCR → classify → extract → cross-check → flags → suggestion.
 *
 * THE RULE: AI reads and flags, a broker approves. Nothing in this module writes APPROVED;
 * the only outcomes are NEEDS_ATTENTION and READY_FOR_REVIEW (see AiSuggestion).
 */

/** States a broker hasn't decided yet. Listed positively so this module never names the approved state. */
const UNDECIDED = ['PENDING_AI', 'NEEDS_ATTENTION', 'READY_FOR_REVIEW'] as const;
const isDecided = (s: string) => !(UNDECIDED as readonly string[]).includes(s);

/** Upload endpoints call this; the request returns while the document is read in the background. */
export function queueDocument(documentId: string): void {
  enqueue(() => processDocument(documentId));
}

export async function processDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || isDecided(doc.reviewStatus)) return;
  await prisma.document.update({ where: { id: doc.id }, data: { aiStatus: 'PROCESSING' } });

  let ocr: Awaited<ReturnType<typeof runOcr>> | null = null;
  try {
    ocr = await runOcr(await getObjectBytes(doc.storageKey), doc.mimeType);
    if (ocr.text.replace(/\s/g, '').length < 10) ocr = null; // blank or unreadable image
  } catch (e) {
    console.error(`[docai] OCR failed for ${doc.id}:`, (e as Error).message);
  }

  // A failed read still goes to the broker: OCR failure never blocks manual review (SPEC §14).
  const detected = ocr ? classify(ocr.text).type : null;
  const typeForRules = doc.declaredType ?? detected ?? 'UNKNOWN';
  const extracted = ocr ? extract(typeForRules, ocr) : {};

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      aiStatus: ocr ? 'DONE' : 'FAILED',
      ocrText: ocr?.text ?? null,
      ocrConfidence: ocr?.confidence ?? null,
      detectedType: detected,
      extracted: extracted as Prisma.InputJsonValue,
    },
  });
  await applyChecks(updated);

  // A newly read title changes what the tax declaration and seller ID are compared against.
  if (typeForRules === 'LAND_TITLE' && isListingOwner(doc.ownerType)) {
    const siblings = await prisma.document.findMany({
      where: {
        firmId: doc.firmId,
        ownerType: doc.ownerType,
        ownerId: doc.ownerId,
        id: { not: doc.id },
        aiStatus: { in: ['DONE', 'FAILED'] },
        reviewStatus: { in: ['NEEDS_ATTENTION', 'READY_FOR_REVIEW'] },
      },
    });
    for (const s of siblings) await applyChecks(s);
  }
}

/** Recomputes flags from what's stored and updates the AI suggestion. No OCR. */
export async function applyChecks(doc: Document): Promise<AiSuggestion | null> {
  if (isDecided(doc.reviewStatus)) return null;
  const flags = await flagsFor(doc, (doc.extracted ?? {}) as Extracted);
  const suggestion = suggestFrom(flags);
  await prisma.document.update({
    where: { id: doc.id },
    data: { flags: flags as unknown as Prisma.InputJsonValue, reviewStatus: suggestion },
  });
  await syncOwner(doc, suggestion);
  return suggestion;
}

/** Flags for a document given (possibly broker-corrected) field values. */
export async function flagsFor(doc: Document, extracted: Extracted): Promise<DocFlag[]> {
  return computeFlags(extracted, await loadContext(doc));
}

const isListingOwner = (t: Document['ownerType']) => t === 'SELLER_REQUEST' || t === 'PROPERTY';

async function loadContext(doc: Document): Promise<CheckContext> {
  const ctx: CheckContext = {
    today: new Date(),
    declaredType: doc.declaredType,
    detectedType: doc.detectedType,
    ocrFailed: doc.aiStatus === 'FAILED',
    duplicateFile: !!(await prisma.document.findFirst({
      where: { firmId: doc.firmId, sha256: doc.sha256, id: { not: doc.id } },
      select: { id: true },
    })),
  };

  if (doc.ownerType === 'CREDENTIAL') {
    const cred = await prisma.credential.findFirst({
      where: { id: doc.ownerId, firmId: doc.firmId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (cred) {
      ctx.credential = {
        holderName: `${cred.user.firstName} ${cred.user.lastName}`,
        numberEntered: cred.numberEntered,
      };
    }
  }

  if (doc.ownerType === 'PROJECT') {
    const project = await prisma.project.findFirst({
      where: { id: doc.ownerId, firmId: doc.firmId },
      include: { developer: { select: { name: true } } },
    });
    if (project) ctx.project = { name: project.name, developerName: project.developer.name };
  }

  if (doc.ownerType === 'CLIENT') {
    const item = await prisma.requirementItem.findFirst({
      where: { firmId: doc.firmId, documentId: doc.id },
      select: { appliesTo: true, clientId: true },
    });
    const client = item
      ? await prisma.client.findFirst({
          where: { id: item.clientId, firmId: doc.firmId },
          select: { fullName: true },
        })
      : null;
    if (item && client) ctx.client = { name: client.fullName, appliesTo: item.appliesTo };
  }

  if (doc.ownerType === 'TRANSMITTAL') {
    const tranche = await prisma.commissionTranche.findFirst({
      where: { id: doc.ownerId, firmId: doc.firmId },
      select: { amount: true },
    });
    if (tranche) ctx.transmittal = { expectedAmount: Number(tranche.amount) };
  }

  if (effectiveType(ctx) === 'PAYMENT_RECEIPT') {
    const or = ((doc.extracted ?? {}) as Extracted).orNumber?.value;
    if (or) {
      ctx.duplicateReceipt = !!(await prisma.document.findFirst({
        where: {
          firmId: doc.firmId,
          declaredType: 'PAYMENT_RECEIPT',
          id: { not: doc.id },
          reviewStatus: { not: 'REJECTED' },
          extracted: { path: ['orNumber', 'value'], equals: or },
        },
        select: { id: true },
      }));
    }
  }

  if (isListingOwner(doc.ownerType)) {
    const sellerName = await listingSellerName(doc);
    if (sellerName) {
      const title =
        effectiveType(ctx) === 'LAND_TITLE'
          ? null
          : await prisma.document.findFirst({
              where: {
                firmId: doc.firmId,
                ownerType: doc.ownerType,
                ownerId: doc.ownerId,
                declaredType: 'LAND_TITLE',
                aiStatus: 'DONE',
                reviewStatus: { not: 'REJECTED' },
              },
              orderBy: { createdAt: 'desc' },
            });
      const tf = (title?.extracted ?? {}) as Extracted;
      const area = Number(tf.areaSqm?.value);
      ctx.listing = {
        sellerName,
        titleOwner: tf.ownerName?.value ?? null,
        titleAreaSqm: Number.isFinite(area) && area > 0 ? area : null,
      };
    }
  }
  return ctx;
}

async function listingSellerName(doc: Document): Promise<string | null> {
  if (doc.ownerType === 'SELLER_REQUEST') {
    const req = await prisma.sellerListingRequest.findFirst({
      where: { id: doc.ownerId, firmId: doc.firmId },
      select: { sellerName: true },
    });
    return req?.sellerName ?? null;
  }
  const property = await prisma.property.findFirst({
    where: { id: doc.ownerId, firmId: doc.firmId },
    select: { sellerRequest: { select: { sellerName: true } } },
  });
  return property?.sellerRequest?.sellerName ?? null;
}

/** Mirrors the AI suggestion onto the record the document belongs to (never to APPROVED). */
async function syncOwner(doc: Document, suggestion: AiSuggestion): Promise<void> {
  if (doc.ownerType === 'CREDENTIAL') {
    await prisma.credential.updateMany({
      where: { id: doc.ownerId, documentId: doc.id, status: { in: [...UNDECIDED] } },
      data: { status: suggestion },
    });
  }
  if (doc.ownerType === 'PROJECT') {
    // A renewal upload must not hide units while the current license is still approved.
    await prisma.project.updateMany({
      where: { id: doc.ownerId, firmId: doc.firmId, ltsStatus: { in: [...UNDECIDED, 'REJECTED'] } },
      data: { ltsStatus: suggestion },
    });
  }
  if (doc.ownerType === 'CLIENT') {
    // Buyer checklist item: read cleanly → UPLOADED, flagged → NEEDS_ATTENTION.
    // Only a broker moves it to VERIFIED (decided OPEN-3).
    await prisma.requirementItem.updateMany({
      where: {
        firmId: doc.firmId,
        documentId: doc.id,
        status: { in: ['UPLOADED', 'NEEDS_ATTENTION'] },
      },
      data: { status: suggestion === 'NEEDS_ATTENTION' ? 'NEEDS_ATTENTION' : 'UPLOADED' },
    });
  }
}

/** Server start: the queue is in memory, so re-queue anything that was waiting when it stopped. */
export async function resumePendingDocuments(): Promise<number> {
  const pending = await prisma.document.findMany({
    where: { aiStatus: { in: ['QUEUED', 'PROCESSING'] }, reviewStatus: 'PENDING_AI' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  pending.forEach((d) => queueDocument(d.id));
  return pending.length;
}
