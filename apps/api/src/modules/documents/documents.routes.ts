import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { presignedGet } from '../../lib/storage';
import { notFoundError } from '../../middleware/errorHandler';

export const documentsRouter = Router();

/**
 * Who may open which document. Extended per owner type as modules land.
 * CREDENTIAL: CompanyAdmin uploads them, Broker reviews them (SPEC §5.2).
 */
const VIEWERS: Partial<Record<string, string[]>> = {
  CREDENTIAL: ['COMPANY_ADMIN', 'BROKER'],
};

// Short-lived link, issued only after the scope check (SPEC §5.3). Out of scope → 404.
documentsRouter.get('/:id/url', async (req, res) => {
  const { firmId } = firmScope(req.user!);
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, firmId } });
  if (!doc || !VIEWERS[doc.ownerType]?.includes(req.user!.role)) throw notFoundError();
  res.json({ url: await presignedGet(doc.storageKey), mimeType: doc.mimeType, expiresIn: 300 });
});
