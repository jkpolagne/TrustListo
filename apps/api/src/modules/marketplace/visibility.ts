import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * What the public may see (SPEC §7.1): LIVE listings of ACTIVE firms. Developer units also
 * need their project's License to Sell approved and unexpired — checked on read, so an LTS
 * that expires overnight hides its units immediately (SPEC §7.5 prototype rule).
 */
export async function publicPropertyWhere(now = new Date()): Promise<Prisma.PropertyWhereInput> {
  const activeFirms = await prisma.firm.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });
  return {
    status: 'LIVE',
    firmId: { in: activeFirms.map((f) => f.id) },
    OR: [
      { source: 'INDIVIDUAL_SELLER' },
      { project: { ltsStatus: 'APPROVED', ltsExpiresAt: { gte: now } } },
    ],
  };
}

/** Badges whose validity hasn't ended (expired badges are hidden, SPEC §8.7). */
export const validBadges = (now = new Date()) =>
  ({
    where: { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
    select: { type: true, validUntil: true },
  }) satisfies Prisma.Property$badgesArgs;

export const photoUrl = (photoId: string) => `/api/v1/public/photos/${photoId}`;
