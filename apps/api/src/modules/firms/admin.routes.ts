import { Router } from 'express';
import { paging } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';

/**
 * SuperAdmin routes. Firm records and counts only, never a firm's clients, documents
 * or commissions (SPEC §2 rule 5).
 */
export const adminRouter = Router();
adminRouter.use(requireRole('SUPER_ADMIN'));

adminRouter.get('/firms', async (_req, res) => {
  const [firms, listingCounts] = await Promise.all([
    prisma.firm.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    }),
    prisma.property.groupBy({ by: ['firmId'], where: { status: 'LIVE' }, _count: true }),
  ]);
  const live = new Map(listingCounts.map((c) => [c.firmId, c._count]));
  res.json({
    data: firms.map(({ _count, ...f }) => ({
      ...f,
      userCount: _count.users,
      liveListingCount: live.get(f.id) ?? 0,
    })),
  });
});

// Platform-level activity only (rows with no firm).
adminRouter.get('/logs', async (req, res) => {
  const { page, pageSize, skip, take } = paging(req.query);
  const where = { firmId: null };
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ data, page, pageSize, total });
});
