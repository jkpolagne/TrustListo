import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { requireRole } from '../../middleware/auth';

/** Firm settings (SPEC §13 GET/PUT /settings/firm). CompanyAdmin edits; Broker reads. */
export const settingsRouter = Router();

const select = {
  name: true,
  loanRatePct: true,
  loanTermYears: true,
  loanDownpaymentPct: true,
  loanIncomeRatioPct: true,
} as const;

const asNumbers = (f: {
  name: string;
  loanRatePct: unknown;
  loanTermYears: number;
  loanDownpaymentPct: unknown;
  loanIncomeRatioPct: unknown;
}) => ({
  name: f.name,
  loanRatePct: Number(f.loanRatePct),
  loanTermYears: f.loanTermYears,
  loanDownpaymentPct: Number(f.loanDownpaymentPct),
  loanIncomeRatioPct: Number(f.loanIncomeRatioPct),
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
