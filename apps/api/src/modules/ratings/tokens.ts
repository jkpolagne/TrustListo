import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { audit } from '../../lib/audit';

/** One-time rating links (SPEC §12): random token, stored only as a SHA-256 hash, 30 days, single use. */
export const RATING_LINK_DAYS = 30;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Creates (or replaces) the client's rating link and returns the raw token. The raw token is
 * shown once to the consultant, who sends it to the buyer; issuing again invalidates the old one.
 */
export async function issueRatingToken(
  tx: Prisma.TransactionClient,
  req: Request,
  client: { id: string; firmId: string; consultantId: string },
): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + RATING_LINK_DAYS * 86_400_000);
  await tx.ratingToken.upsert({
    where: { clientId: client.id },
    create: {
      firmId: client.firmId,
      clientId: client.id,
      consultantId: client.consultantId,
      tokenHash: hashToken(token),
      expiresAt,
    },
    update: { tokenHash: hashToken(token), expiresAt, usedAt: null },
  });
  await audit(
    req,
    {
      action: 'RATING_LINK_ISSUED',
      entityType: 'Client',
      entityId: client.id,
      after: { expiresAt: expiresAt.toISOString() }, // never the token itself
    },
    tx,
  );
  return token;
}
