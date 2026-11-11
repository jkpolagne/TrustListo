import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../env';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../middleware/errorHandler';
import { hashToken } from './tokens';

/**
 * Buyer rating page (SPEC §12): no account, just the one-time link. 1–5 stars and an optional
 * comment, one rating per completed client. Shows only what the buyer needs to recognise the sale.
 */
export const ratingsPublicRouter = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many tries. Wait a few minutes and try again.' },
    });
  },
});
ratingsPublicRouter.use('/ratings', limiter);

async function usableToken(raw: string) {
  const t = await prisma.ratingToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!t)
    throw new HttpError(
      404,
      'LINK_NOT_FOUND',
      'This rating link isn’t valid. Ask your agent for a new one.',
    );
  if (t.usedAt)
    throw new HttpError(
      410,
      'ALREADY_RATED',
      'Thank you. A rating was already sent with this link.',
    );
  if (t.expiresAt < new Date())
    throw new HttpError(
      410,
      'LINK_EXPIRED',
      'This rating link has expired. Ask your agent for a new one.',
    );
  return t;
}

ratingsPublicRouter.get('/ratings/:token', async (req, res) => {
  const t = await usableToken(req.params.token);
  const [consultant, firm, client] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: t.consultantId },
      select: { firstName: true, lastName: true },
    }),
    prisma.firm.findUniqueOrThrow({ where: { id: t.firmId }, select: { name: true } }),
    prisma.client.findUniqueOrThrow({ where: { id: t.clientId }, select: { propertyId: true } }),
  ]);
  const property = await prisma.property.findUnique({
    where: { id: client.propertyId },
    select: { title: true },
  });
  res.json({ consultant, firm, property, expiresAt: t.expiresAt });
});

const body = z.object({
  stars: z.coerce
    .number()
    .int()
    .min(1, 'Choose from 1 to 5 stars.')
    .max(5, 'Choose from 1 to 5 stars.'),
  comment: z.string().trim().max(500).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Agree to the privacy notice to send your rating.' }),
  }),
  website: z.string().max(0).optional(), // honeypot
});

ratingsPublicRouter.post('/ratings/:token', async (req, res) => {
  const b = body.parse(req.body);
  const t = await usableToken(req.params.token);
  await prisma.$transaction(async (tx) => {
    // Claim the token first so two submits can't both count.
    const claimed = await tx.ratingToken.updateMany({
      where: { id: t.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new HttpError(
        410,
        'ALREADY_RATED',
        'Thank you. A rating was already sent with this link.',
      );
    const r = await tx.rating.create({
      data: {
        consultantId: t.consultantId,
        clientId: t.clientId,
        stars: b.stars,
        comment: b.comment || null,
      },
    });
    await audit(
      null,
      {
        firmId: t.firmId,
        actorId: null, // the buyer has no account
        action: 'RATING_SUBMITTED',
        entityType: 'Rating',
        entityId: r.id,
        after: { stars: b.stars, consultantId: t.consultantId },
      },
      tx,
    );
  });
  res.status(201).json({ thanks: true });
});
