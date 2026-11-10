import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { consultantScope } from './scope';

/**
 * Leads (SPEC §10.1, §5.2): CompanyAdmin and Broker read all; a Sales Manager works their own
 * and reads their team's; a Sales Person works their own. Only the assigned consultant moves a
 * lead along. Reserving (becoming a client) happens through conversion (M7), not here.
 */
export const inquiriesRouter = Router();
inquiriesRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON'));

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'RESERVED', 'LOST'] as const;

const leadSelect = {
  id: true,
  status: true,
  source: true,
  referralCode: true,
  buyerName: true,
  buyerPhone: true,
  buyerEmail: true,
  natureOfWork: true,
  paymentPref: true,
  civilStatus: true,
  message: true,
  consultantId: true,
  createdAt: true,
  updatedAt: true,
  propertyId: true,
} as const;

async function withContext<T extends { propertyId: string; consultantId: string }>(rows: T[]) {
  const [properties, people] = await Promise.all([
    prisma.property.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.propertyId))] } },
      select: { id: true, title: true, slug: true, source: true, status: true },
    }),
    prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.consultantId))] } },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ]);
  const p = new Map(properties.map((x) => [x.id, x]));
  const u = new Map(people.map((x) => [x.id, x]));
  return rows.map((r) => ({
    ...r,
    property: p.get(r.propertyId) ?? null,
    consultant: u.get(r.consultantId) ?? null,
  }));
}

inquiriesRouter.get('/', async (req, res) => {
  const status = z
    .enum(STATUSES)
    .optional()
    .parse(req.query.status || undefined);
  const rows = await prisma.inquiry.findMany({
    where: { ...(await consultantScope(req.user!)), ...(status ? { status } : {}) },
    select: leadSelect,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ data: await withContext(rows) });
});

async function findLead(req: Express.Request, id: string) {
  const lead = await prisma.inquiry.findFirst({
    where: { ...(await consultantScope(req.user!)), id },
    select: leadSelect,
  });
  if (!lead) throw notFoundError();
  return lead;
}

/** Why the lead was marked lost, from the audit trail. */
async function lostReason(id: string) {
  const log = await prisma.auditLog.findFirst({
    where: { entityType: 'Inquiry', entityId: id, action: 'LEAD_STATUS_CHANGED' },
    orderBy: { createdAt: 'desc' },
    select: { after: true },
  });
  const after = log?.after as { status?: string; reason?: string } | null;
  return after?.status === 'LOST' ? (after.reason ?? null) : null;
}

inquiriesRouter.get('/:id', async (req, res) => {
  const lead = await findLead(req, req.params.id);
  const [ctx] = await withContext([lead]);
  const visits = await prisma.visit.findMany({
    where: { firmId: req.user!.firmId!, inquiryId: lead.id },
    orderBy: { scheduledAt: 'desc' },
  });
  res.json({
    ...ctx,
    isMine: lead.consultantId === req.user!.id,
    lostReason: lead.status === 'LOST' ? await lostReason(lead.id) : null,
    clientId:
      (await prisma.client.findUnique({ where: { inquiryId: lead.id }, select: { id: true } }))
        ?.id ?? null,
    visits,
  });
});

const patchBody = z
  .object({
    status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'LOST']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.status !== 'LOST' || (b.reason?.length ?? 0) >= 3, {
    message: 'Say why the lead was lost.',
    path: ['reason'],
  });

inquiriesRouter.patch('/:id', async (req, res) => {
  const body = patchBody.parse(req.body);
  const lead = await findLead(req, req.params.id);
  if (lead.consultantId !== req.user!.id) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the consultant handling this lead can update it.');
  }
  if (lead.status === 'RESERVED') {
    throw new HttpError(409, 'ALREADY_CLIENT', 'This buyer already reserved and is now a client.');
  }
  if (lead.status === body.status) {
    res.json({ status: lead.status });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.inquiry.update({ where: { id: lead.id }, data: { status: body.status } });
    await audit(
      req,
      {
        action: 'LEAD_STATUS_CHANGED',
        entityType: 'Inquiry',
        entityId: lead.id,
        before: { status: lead.status },
        after: { status: body.status, ...(body.status === 'LOST' ? { reason: body.reason } : {}) },
      },
      tx,
    );
  });
  res.json({ status: body.status });
});
