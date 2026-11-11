import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { consultantScope } from '../leads/scope';

/**
 * Reports (SPEC §10.6, §13): monthly sales summary and the pipeline. CompanyAdmin and Broker see
 * the whole firm; a Sales Manager sees their own and their team's (same scope as leads).
 * Months follow Philippine time (UTC+8).
 */
export const reportsRouter = Router();
reportsRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER'));

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const METHODS = ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'] as const;

/** [start, end) of a YYYY-MM month in Manila time. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, '0');
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  return {
    start: new Date(`${month}-01T00:00:00+08:00`),
    end: new Date(`${next}-01T00:00:00+08:00`),
  };
}

export function currentMonth(now = new Date()): string {
  const manila = new Date(now.getTime() + 8 * 3_600_000);
  return `${manila.getUTCFullYear()}-${String(manila.getUTCMonth() + 1).padStart(2, '0')}`;
}

const summaryQuery = z.object({
  month: z.string().regex(MONTH, 'Use a month like 2026-11.').optional(),
});

reportsRouter.get('/summary', async (req, res) => {
  const month = summaryQuery.parse(req.query).month ?? currentMonth();
  const { start, end } = monthRange(month);
  const scope = await consultantScope(req.user!);
  const inMonth = { gte: start, lt: end };
  const scopedClients = await prisma.client.findMany({ where: scope, select: { id: true } });
  const clientIds = scopedClients.map((c) => c.id);

  const [reserved, newLeads, completed, vouchers] = await Promise.all([
    prisma.client.aggregate({
      where: { ...scope, reservationPaidAt: inMonth },
      _count: { _all: true },
      _sum: { tcp: true },
    }),
    prisma.inquiry.count({ where: { ...scope, createdAt: inMonth } }),
    // Completion has no column of its own; the audit log records the moment (rule 11).
    prisma.auditLog.count({
      where: {
        firmId: scope.firmId,
        action: 'CLIENT_STATUS_CHANGED',
        entityId: { in: clientIds },
        after: { path: ['status'], equals: 'COMPLETED' },
        createdAt: inMonth,
      },
    }),
    prisma.commissionVoucher.findMany({
      where: {
        firmId: scope.firmId,
        releasedAt: inMonth,
        tranche: { commission: { clientId: { in: clientIds } } },
      },
      select: { tranche: { select: { amount: true } } },
    }),
  ]);

  res.json({
    month,
    reserved: { count: reserved._count._all, totalTcp: Number(reserved._sum.tcp ?? 0) },
    newLeads,
    completed,
    released: {
      count: vouchers.length,
      total: vouchers.reduce((s, v) => s + Number(v.tranche.amount), 0),
    },
  });
});

const pipelineQuery = z.object({
  consultantId: z.string().max(40).optional(),
  paymentMethod: z.enum(METHODS).optional(),
});

reportsRouter.get('/pipeline', async (req, res) => {
  const q = pipelineQuery.parse(req.query);
  const scope = await consultantScope(req.user!);
  // A consultant filter only narrows the caller's own scope, never widens it.
  const consultantFilter: Prisma.StringFilter | undefined = q.consultantId
    ? scope.consultantId && !scope.consultantId.in.includes(q.consultantId)
      ? { in: [] }
      : { equals: q.consultantId }
    : scope.consultantId;
  const leadWhere: Prisma.InquiryWhereInput = {
    firmId: scope.firmId,
    consultantId: consultantFilter,
    ...(q.paymentMethod ? { paymentPref: q.paymentMethod } : {}),
  };
  const clientWhere: Prisma.ClientWhereInput = {
    firmId: scope.firmId,
    consultantId: consultantFilter,
    ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
  };

  const { start, end } = monthRange(currentMonth());
  const [leads, clients, people, leadsBy, clientsBy, reservedBy, completedBy] = await Promise.all([
    prisma.inquiry.groupBy({ by: ['status'], where: leadWhere, _count: { _all: true } }),
    prisma.client.groupBy({ by: ['status'], where: clientWhere, _count: { _all: true } }),
    prisma.user.findMany({
      where: {
        firmId: scope.firmId,
        role: { in: ['SALES_MANAGER', 'SALES_PERSON'] },
        isActive: true,
        ...(scope.consultantId ? { id: scope.consultantId } : {}),
      },
      select: { id: true, firstName: true, lastName: true, role: true, managerId: true },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.inquiry.groupBy({
      by: ['consultantId'],
      where: { ...leadWhere, status: { notIn: ['RESERVED', 'LOST'] } },
      _count: { _all: true },
    }),
    prisma.client.groupBy({
      by: ['consultantId'],
      where: { ...clientWhere, status: { in: ['ACTIVE', 'CLOSING'] } },
      _count: { _all: true },
    }),
    prisma.client.groupBy({
      by: ['consultantId'],
      where: { ...clientWhere, reservationPaidAt: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { tcp: true },
    }),
    prisma.client.groupBy({
      by: ['consultantId'],
      where: { ...clientWhere, status: 'COMPLETED' },
      _count: { _all: true },
    }),
  ]);
  const count = (rows: { consultantId: string; _count: { _all: number } }[], id: string) =>
    rows.find((r) => r.consultantId === id)?._count._all ?? 0;

  res.json({
    leads: Object.fromEntries(leads.map((r) => [r.status, r._count._all])),
    clients: Object.fromEntries(clients.map((r) => [r.status, r._count._all])),
    team: people
      .filter((p) => !q.consultantId || p.id === q.consultantId)
      .map((p) => ({
        ...p,
        openLeads: count(leadsBy, p.id),
        activeClients: count(clientsBy, p.id),
        reservedThisMonth: count(reservedBy, p.id),
        reservedTcpThisMonth: Number(
          reservedBy.find((r) => r.consultantId === p.id)?._sum.tcp ?? 0,
        ),
        completed: count(completedBy, p.id),
      })),
  });
});
