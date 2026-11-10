import type { Visit, VisitStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { consultantScope, isConsultant } from './scope';

/**
 * Property visits (SPEC §10.8, rule 10): consultants schedule visits for their own leads;
 * the CompanyAdmin approves or declines. After the date the consultant marks it completed or
 * a no-show. Rescheduling keeps the old visit (RESCHEDULED) and links a new PENDING one.
 */
export const visitsRouter = Router();
visitsRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON'));

const HOUR = 60 * 60 * 1000;
const OPEN: VisitStatus[] = ['PENDING', 'APPROVED'];

async function withContext(rows: Visit[]) {
  const [props, people, leads] = await Promise.all([
    prisma.property.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.propertyId))] } },
      select: { id: true, title: true, slug: true, barangay: true, city: true },
    }),
    prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.consultantId))] } },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
    prisma.inquiry.findMany({
      where: { id: { in: rows.map((r) => r.inquiryId).filter((x): x is string => !!x) } },
      select: { id: true, buyerName: true, buyerPhone: true },
    }),
  ]);
  const p = new Map(props.map((x) => [x.id, x]));
  const u = new Map(people.map((x) => [x.id, x]));
  const l = new Map(leads.map((x) => [x.id, x]));
  return rows.map((r) => ({
    ...r,
    property: p.get(r.propertyId) ?? null,
    consultant: u.get(r.consultantId) ?? null,
    lead: r.inquiryId ? (l.get(r.inquiryId) ?? null) : null,
  }));
}

/** Other open visits of the same consultant within an hour (SPEC §10.8 clash warning). */
async function clashes(firmId: string, consultantId: string, at: Date, exceptId?: string) {
  const near = await prisma.visit.findMany({
    where: {
      firmId,
      consultantId,
      status: { in: OPEN },
      id: exceptId ? { not: exceptId } : undefined,
      scheduledAt: { gt: new Date(at.getTime() - HOUR), lt: new Date(at.getTime() + HOUR) },
    },
    select: { id: true, scheduledAt: true },
  });
  return near.map((v) => ({
    visitId: v.id,
    message: `You already have a visit at ${v.scheduledAt.toISOString()}, less than an hour apart.`,
  }));
}

visitsRouter.get('/', async (req, res) => {
  const q = z
    .object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() })
    .parse(req.query);
  const rows = await prisma.visit.findMany({
    where: {
      ...(await consultantScope(req.user!)),
      scheduledAt: { gte: q.from, lte: q.to },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 1000,
  });
  res.json({ data: await withContext(rows) });
});

const createBody = z.object({
  inquiryId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
});

visitsRouter.post('/', async (req, res) => {
  const body = createBody.parse(req.body);
  if (!isConsultant(req.user!.role)) {
    throw new HttpError(403, 'FORBIDDEN', 'Consultants schedule visits for their own leads.');
  }
  const firmId = req.user!.firmId!;
  const lead = await prisma.inquiry.findFirst({
    where: { id: body.inquiryId, firmId, consultantId: req.user!.id },
  });
  if (!lead) throw notFoundError();
  if (lead.status === 'LOST' || lead.status === 'RESERVED') {
    throw new HttpError(409, 'LEAD_CLOSED', 'This lead is closed; reopen it before scheduling.');
  }
  if (body.scheduledAt.getTime() < Date.now()) {
    throw new HttpError(400, 'PAST_DATE', 'Pick a date and time in the future.');
  }
  const visit = await prisma.$transaction(async (tx) => {
    const v = await tx.visit.create({
      data: {
        firmId,
        propertyId: lead.propertyId,
        consultantId: req.user!.id,
        inquiryId: lead.id,
        scheduledAt: body.scheduledAt,
        notes: body.notes || null,
      },
    });
    await audit(
      req,
      {
        action: 'VISIT_REQUESTED',
        entityType: 'Visit',
        entityId: v.id,
        after: { status: 'PENDING', scheduledAt: v.scheduledAt.toISOString(), inquiryId: lead.id },
      },
      tx,
    );
    return v;
  });
  const [out] = await withContext([visit]);
  res
    .status(201)
    .json({ ...out, warnings: await clashes(firmId, req.user!.id, visit.scheduledAt, visit.id) });
});

const patchBody = z.object({
  status: z.enum(['APPROVED', 'DECLINED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED']),
  reason: z.string().trim().max(500).optional(),
  scheduledAt: z.coerce.date().optional(), // new time, for RESCHEDULED
});

visitsRouter.patch('/:id', async (req, res) => {
  const body = patchBody.parse(req.body);
  const user = req.user!;
  const visit = await prisma.visit.findFirst({
    where: { ...(await consultantScope(user)), id: req.params.id },
  });
  if (!visit) throw notFoundError();
  const mine = visit.consultantId === user.id;
  const isAdmin = user.role === 'COMPANY_ADMIN';
  const from = (...allowed: VisitStatus[]) => {
    if (!allowed.includes(visit.status)) {
      throw new HttpError(
        409,
        'WRONG_STATUS',
        `A ${visit.status.toLowerCase()} visit can't be changed this way.`,
      );
    }
  };
  const deny = (msg: string) => {
    throw new HttpError(403, 'FORBIDDEN', msg);
  };

  switch (body.status) {
    case 'APPROVED':
    case 'DECLINED':
      if (!isAdmin) deny('Only your company admin approves or declines visits.');
      from('PENDING');
      if (body.status === 'DECLINED' && (body.reason?.length ?? 0) < 3) {
        throw new HttpError(400, 'REASON_REQUIRED', 'Say why the visit is declined.');
      }
      break;
    case 'COMPLETED':
    case 'NO_SHOW':
      if (!mine) deny('Only the consultant who made the visit can record how it went.');
      from('APPROVED');
      if (visit.scheduledAt.getTime() > Date.now()) {
        throw new HttpError(409, 'NOT_YET', 'Record the outcome after the visit time.');
      }
      break;
    case 'CANCELLED':
      if (!mine && !isAdmin) deny('Only the consultant or the company admin can cancel.');
      from('PENDING', 'APPROVED');
      break;
    case 'RESCHEDULED':
      if (!mine) deny('Only the consultant who made the visit can reschedule it.');
      from('PENDING', 'APPROVED');
      if (!body.scheduledAt || body.scheduledAt.getTime() < Date.now()) {
        throw new HttpError(400, 'PAST_DATE', 'Pick a new date and time in the future.');
      }
      break;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: visit.id },
      data: {
        status: body.status,
        ...(body.status === 'APPROVED' || body.status === 'DECLINED'
          ? { decidedById: user.id, declineReason: body.status === 'DECLINED' ? body.reason : null }
          : {}),
      },
    });
    let next: Visit | null = null;
    if (body.status === 'RESCHEDULED') {
      next = await tx.visit.create({
        data: {
          firmId: visit.firmId,
          propertyId: visit.propertyId,
          consultantId: visit.consultantId,
          inquiryId: visit.inquiryId,
          clientId: visit.clientId,
          scheduledAt: body.scheduledAt!,
          notes: visit.notes,
          rescheduledFromId: visit.id,
        },
      });
    }
    // An approved visit moves the lead to "visit scheduled" if it wasn't further along.
    if (body.status === 'APPROVED' && visit.inquiryId) {
      await tx.inquiry.updateMany({
        where: { id: visit.inquiryId, status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] } },
        data: { status: 'VISIT_SCHEDULED' },
      });
    }
    await audit(
      req,
      {
        action: `VISIT_${body.status}`,
        entityType: 'Visit',
        entityId: visit.id,
        before: { status: visit.status },
        after: {
          status: body.status,
          ...(body.reason ? { reason: body.reason } : {}),
          ...(next ? { newVisitId: next.id, scheduledAt: next.scheduledAt.toISOString() } : {}),
        },
      },
      tx,
    );
    return next ?? updated;
  });
  const [out] = await withContext([result]);
  res.json({
    ...out,
    warnings:
      body.status === 'RESCHEDULED'
        ? await clashes(visit.firmId, visit.consultantId, result.scheduledAt, result.id)
        : [],
  });
});
