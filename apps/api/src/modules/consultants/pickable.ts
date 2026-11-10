import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Who may appear in a public picker (SPEC §7.3). Active Sales Managers and Sales Persons of
 * active firms, and — decided for OPEN-1 — only with a broker-approved, unexpired
 * PRC/DHSUD credential. Brokers and CompanyAdmins never appear.
 */
export function pickableConsultantWhere(now = new Date()): Prisma.UserWhereInput {
  return {
    role: { in: ['SALES_MANAGER', 'SALES_PERSON'] },
    isActive: true,
    firm: { status: 'ACTIVE' },
    credentials: { some: { status: 'APPROVED', expiresAt: { gte: now } } },
  };
}

/** Fisher–Yates with crypto.randomInt, fresh on every call; never sorted by rating (§7.3). */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const cardSelect = (now: Date) =>
  ({
    id: true,
    firstName: true,
    lastName: true,
    role: true,
    bio: true,
    firm: { select: { name: true, slug: true } },
    credentials: {
      where: { status: 'APPROVED', expiresAt: { gte: now } },
      select: { type: true, expiresAt: true },
    },
  }) satisfies Prisma.UserSelect;

/**
 * Public card for each consultant: name, firm, verified credentials, average rating (or
 * none yet), and completed sales recorded on TrustListo.
 */
export async function consultantCards(where: Prisma.UserWhereInput, now = new Date()) {
  const users = await prisma.user.findMany({ where, select: cardSelect(now) });
  const ids = users.map((u) => u.id);
  const [ratings, sales] = await Promise.all([
    prisma.rating.groupBy({
      by: ['consultantId'],
      where: { consultantId: { in: ids } },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    prisma.client.groupBy({
      by: ['consultantId'],
      where: { consultantId: { in: ids }, status: 'COMPLETED' },
      _count: { _all: true },
    }),
  ]);
  const rating = new Map(ratings.map((r) => [r.consultantId, r]));
  const sold = new Map(sales.map((s) => [s.consultantId, s._count._all]));
  return users.map(({ credentials, ...u }) => {
    const r = rating.get(u.id);
    return {
      ...u,
      badges: [...new Set(credentials.map((c) => c.type))],
      rating: r
        ? { average: Math.round((r._avg.stars ?? 0) * 10) / 10, count: r._count._all }
        : null,
      completedSales: sold.get(u.id) ?? 0,
    };
  });
}
