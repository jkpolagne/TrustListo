import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';

/** Firm settings (SPEC §13 GET/PUT /settings/firm). CompanyAdmin edits; Broker reads. */
export const settingsRouter = Router();

const select = {
  name: true,
  loanRatePct: true,
  loanTermYears: true,
  loanDownpaymentPct: true,
  loanIncomeRatioPct: true,
  withholdingPct: true,
} as const;

const asNumbers = (f: {
  name: string;
  loanRatePct: unknown;
  loanTermYears: number;
  loanDownpaymentPct: unknown;
  loanIncomeRatioPct: unknown;
  withholdingPct: unknown;
}) => ({
  name: f.name,
  loanRatePct: Number(f.loanRatePct),
  loanTermYears: f.loanTermYears,
  loanDownpaymentPct: Number(f.loanDownpaymentPct),
  loanIncomeRatioPct: Number(f.loanIncomeRatioPct),
  withholdingPct: Number(f.withholdingPct),
});

settingsRouter.get('/firm', requireRole('COMPANY_ADMIN', 'BROKER'), async (req, res) => {
  const firm = await prisma.firm.findUniqueOrThrow({
    where: { id: firmScope(req.user!).firmId },
    select,
  });
  res.json(asNumbers(firm));
});

const body = z.object({
  loanRatePct: z.coerce
    .number()
    .min(0, 'Rate can’t be negative.')
    .max(30, 'Use a rate of 30% or less.'),
  loanTermYears: z.coerce.number().int().min(1).max(40, 'Use a term of 40 years or less.'),
  loanDownpaymentPct: z.coerce.number().min(0).max(90, 'Use a downpayment of 90% or less.'),
  loanIncomeRatioPct: z.coerce.number().min(5).max(60, 'Use an income share between 5% and 60%.'),
  // OPEN-6: withheld from each commission share on vouchers.
  withholdingPct: z.coerce
    .number()
    .min(0)
    .max(35, 'Use a withholding rate of 35% or less.')
    .optional(),
});

settingsRouter.put('/firm', requireRole('COMPANY_ADMIN'), async (req, res) => {
  const data = body.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const before = await prisma.firm.findUniqueOrThrow({ where: { id: firmId }, select });
  const after = await prisma.firm.update({ where: { id: firmId }, data, select });
  const { name: _n1, ...b } = asNumbers(before);
  const { name: _n2, ...a } = asNumbers(after);
  await audit(req, {
    action: 'FIRM_SETTINGS_UPDATED',
    entityType: 'Firm',
    entityId: firmId,
    before: b,
    after: a,
  });
  res.json(asNumbers(after));
});

// ───────────── Commission splits and templates (SPEC §10.2–10.3, §13) ─────────────

const readers = requireRole('COMPANY_ADMIN', 'BROKER');
const num = (v: unknown) => Number(v);

settingsRouter.get('/commission-splits', readers, async (req, res) => {
  const rows = await prisma.commissionSplitConfig.findMany({ where: firmScope(req.user!) });
  res.json({
    data: rows.map((r) => ({
      handledBy: r.handledBy,
      brokerPct: num(r.brokerPct),
      salesManagerPct: num(r.salesManagerPct),
      salesPersonPct: num(r.salesPersonPct),
    })),
  });
});

const splitBody = z
  .array(
    z.object({
      handledBy: z.enum(['SALES_MANAGER', 'SALES_PERSON']),
      brokerPct: z.coerce.number().min(0).max(100),
      salesManagerPct: z.coerce.number().min(0).max(100),
      salesPersonPct: z.coerce.number().min(0).max(100),
    }),
  )
  .min(1)
  .refine(
    (rows) =>
      rows.every((r) => Math.abs(r.brokerPct + r.salesManagerPct + r.salesPersonPct - 100) < 1e-6),
    {
      message: 'Each split must add up to 100%.',
    },
  )
  .refine((rows) => rows.every((r) => r.handledBy !== 'SALES_MANAGER' || r.salesPersonPct === 0), {
    message: "A sales manager's own deal has no salesperson share.",
  });

/** New splits apply to deals converted from now on; existing deals keep their snapshot. */
settingsRouter.put('/commission-splits', requireRole('COMPANY_ADMIN'), async (req, res) => {
  const rows = splitBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.commissionSplitConfig.upsert({
        where: { firmId_handledBy: { firmId, handledBy: r.handledBy } },
        create: { firmId, ...r },
        update: r,
      });
    }
    await audit(
      req,
      { action: 'COMMISSION_SPLITS_UPDATED', entityType: 'Firm', entityId: firmId, after: rows },
      tx,
    );
  });
  res.json({ data: rows });
});

settingsRouter.get('/commission-templates', readers, async (req, res) => {
  const rows = await prisma.commissionTemplate.findMany({
    where: firmScope(req.user!),
    include: {
      developer: { select: { id: true, name: true } },
      tranches: { orderBy: { sequence: 'asc' } },
    },
    orderBy: [{ developerId: 'asc' }, { paymentMethod: 'asc' }],
  });
  res.json({
    data: rows.map((t) => ({
      id: t.id,
      developer: t.developer,
      paymentMethod: t.paymentMethod,
      grossRatePct: num(t.grossRatePct),
      requiresTransmittal: t.requiresTransmittal,
      tranches: t.tranches.map((x) => ({
        id: x.id,
        sequence: x.sequence,
        label: x.label,
        sharePct: num(x.sharePct),
        trigger: x.trigger,
        triggerValue: x.triggerValue === null ? null : num(x.triggerValue),
        requiredStage: x.requiredStage,
      })),
    })),
  });
});

const templateBody = z.object({
  grossRatePct: z.coerce.number().min(0).max(20, 'Use a gross rate of 20% or less.'),
  tranches: z.array(
    z.object({
      id: z.string(),
      sharePct: z.coerce.number().min(0).max(100),
      triggerValue: z.coerce.number().min(0).max(100).nullable(),
    }),
  ),
});

/** Edits a template (e.g. the OPEN-5/OPEN-8 placeholders). Applies to deals converted later. */
settingsRouter.put('/commission-templates/:id', requireRole('COMPANY_ADMIN'), async (req, res) => {
  const body = templateBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const t = await prisma.commissionTemplate.findFirst({
    where: { id: String(req.params.id), firmId },
    include: { tranches: true },
  });
  if (!t) throw notFoundError();
  const fixed = t.tranches.filter((x) => x.trigger !== 'MONTHLY');
  const total = fixed.reduce(
    (s, x) => s + (body.tranches.find((b) => b.id === x.id)?.sharePct ?? num(x.sharePct)),
    0,
  );
  if (fixed.length && Math.abs(total - 100) > 1e-6) {
    throw new HttpError(400, 'SHARES_NOT_100', 'Tranche shares must add up to 100%.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.commissionTemplate.update({
      where: { id: t.id },
      data: { grossRatePct: body.grossRatePct },
    });
    for (const b of body.tranches) {
      if (!t.tranches.some((x) => x.id === b.id))
        throw new HttpError(400, 'UNKNOWN_TRANCHE', 'Unknown tranche.');
      await tx.commissionTemplateTranche.update({
        where: { id: b.id },
        data: { sharePct: b.sharePct, triggerValue: b.triggerValue },
      });
    }
    await audit(
      req,
      {
        action: 'COMMISSION_TEMPLATE_UPDATED',
        entityType: 'CommissionTemplate',
        entityId: t.id,
        before: {
          grossRatePct: num(t.grossRatePct),
          tranches: t.tranches.map((x) => ({
            id: x.id,
            sharePct: num(x.sharePct),
            triggerValue: x.triggerValue === null ? null : num(x.triggerValue),
          })),
        },
        after: body,
      },
      tx,
    );
  });
  res.json({ updated: true });
});
