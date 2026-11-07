import { Router } from 'express';
import { z } from 'zod';
import { paging } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { requireRole } from '../../middleware/auth';

export const auditRouter = Router();

const filters = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

// §5.2: audit trail is read-only for CompanyAdmin and Broker.
auditRouter.get('/', requireRole('COMPANY_ADMIN', 'BROKER'), async (req, res) => {
  const { entityType, entityId } = filters.parse(req.query);
  const { page, pageSize, skip, take } = paging(req.query);
  const where = { ...firmScope(req.user!), entityType, entityId };
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.auditLog.count({ where }),
  ]);
  const actorIds = [...new Set(data.map((d) => d.actorId).filter((x): x is string => !!x))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const byId = new Map(actors.map((a) => [a.id, a]));
  res.json({
    data: data.map((d) => ({ ...d, actor: d.actorId ? (byId.get(d.actorId) ?? null) : null })),
    page,
    pageSize,
    total,
  });
});
