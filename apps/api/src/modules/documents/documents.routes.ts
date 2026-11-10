import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { presignedGet } from '../../lib/storage';
import { notFoundError } from '../../middleware/errorHandler';
import { consultantScope } from '../leads/scope';

export const documentsRouter = Router();

/**
 * Who may open which document. Extended per owner type as modules land.
 * CREDENTIAL: CompanyAdmin uploads them, Broker reviews them (SPEC §5.2).
 * PROJECT (License to Sell): CompanyAdmin uploads, Broker reviews.
 * SELLER_REQUEST / PROPERTY: Broker reviews; CompanyAdmin sees all listings; the seller's
 * chosen agent sees their own.
 * CLIENT / PAYMENT (buyer documents and receipts): CompanyAdmin and Broker see all; consultants
 * see those of buyers in their scope (own, or team for a Sales Manager).
 */
const VIEWERS: Partial<Record<string, string[]>> = {
  CREDENTIAL: ['COMPANY_ADMIN', 'BROKER'],
  PROJECT: ['COMPANY_ADMIN', 'BROKER'],
  SELLER_REQUEST: ['COMPANY_ADMIN', 'BROKER'],
  PROPERTY: ['COMPANY_ADMIN', 'BROKER'],
  CLIENT: ['COMPANY_ADMIN', 'BROKER'],
  PAYMENT: ['COMPANY_ADMIN', 'BROKER'],
};

async function findViewable(req: Express.Request, id: string) {
  const { firmId } = firmScope(req.user!);
  const doc = await prisma.document.findFirst({ where: { id, firmId } });
  if (!doc) throw notFoundError();
  if (VIEWERS[doc.ownerType]?.includes(req.user!.role)) return doc;
  // The seller's chosen agent sees the documents they work on (SPEC §5.2 "own").
  if (doc.ownerType === 'SELLER_REQUEST') {
    const own = await prisma.sellerListingRequest.count({
      where: { id: doc.ownerId, firmId, agentId: req.user!.id },
    });
    if (own) return doc;
  }
  if (doc.ownerType === 'CLIENT' || doc.ownerType === 'PAYMENT') {
    const scope = await consultantScope(req.user!);
    // A receipt belongs to a Payment, or — before conversion — to the lead (Inquiry).
    const clientId =
      doc.ownerType === 'CLIENT'
        ? doc.ownerId
        : (await prisma.payment.findFirst({ where: { id: doc.ownerId, firmId } }))?.clientId;
    const inScope = clientId
      ? await prisma.client.count({ where: { ...scope, id: clientId } })
      : await prisma.inquiry.count({ where: { ...scope, id: doc.ownerId } });
    if (inScope) return doc;
  }
  // Out of scope or not allowed → 404, so other firms can't probe for IDs (SPEC §5.3).
  throw notFoundError();
}

/** Status of a document, polled by the uploader while Module 1 reads it (SPEC §8.1). */
documentsRouter.get('/:id', async (req, res) => {
  const doc = await findViewable(req, req.params.id);
  res.json({
    id: doc.id,
    ownerType: doc.ownerType,
    declaredType: doc.declaredType,
    detectedType: doc.detectedType,
    mimeType: doc.mimeType,
    aiStatus: doc.aiStatus,
    reviewStatus: doc.reviewStatus,
    flags: doc.flags ?? [],
    extracted: doc.extracted ?? {},
    ocrConfidence: doc.ocrConfidence,
    reviewNote: doc.reviewNote,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
  });
});

// Short-lived link, issued only after the scope check (SPEC §5.3).
documentsRouter.get('/:id/url', async (req, res) => {
  const doc = await findViewable(req, req.params.id);
  res.json({ url: await presignedGet(doc.storageKey), mimeType: doc.mimeType, expiresIn: 300 });
});
