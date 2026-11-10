import type { CommissionTranche, Prisma } from '@prisma/client';
import type { Request } from 'express';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import {
  docsComplete,
  grossCommissionCents,
  milestoneReached,
  nextStatus,
  paidByMonth,
  splitFor,
  toCents,
  toPesos,
  trancheAmountsCents,
  type SplitPerson,
} from './engine';

type Tx = Prisma.TransactionClient;

export type SplitSnapshot = {
  handledBy: 'SALES_MANAGER' | 'SALES_PERSON';
  grossRatePct: number;
  people: SplitPerson[];
};

/** The commission template for a deal: the developer's for its payment method, or the private-sale one. */
async function templateFor(tx: Tx, firmId: string, developerId: string | null, method: string) {
  return tx.commissionTemplate.findFirst({
    where: { firmId, developerId, paymentMethod: method as never },
    include: { tranches: { orderBy: { sequence: 'asc' } } },
  });
}

/**
 * Creates the deal's commission at conversion (SPEC §10.1): gross from the template, the split
 * snapshotted from the firm's config, and one tranche per template row — each carrying a copy
 * of its rules, so editing the template later never changes this deal.
 * Returns null when the firm has no template for this developer and payment method.
 */
export async function createCommission(tx: Tx, clientId: string) {
  const client = await tx.client.findUniqueOrThrow({ where: { id: clientId } });
  const property = await tx.property.findUniqueOrThrow({
    where: { id: client.propertyId },
    select: { project: { select: { developerId: true } } },
  });
  const developerId =
    client.saleType === 'PRIVATE_SALE' ? null : (property.project?.developerId ?? null);
  const template = await templateFor(tx, client.firmId, developerId, client.paymentMethod);
  if (!template) return null;

  const handler = await tx.user.findUniqueOrThrow({ where: { id: client.consultantId } });
  const handledBy = handler.role === 'SALES_MANAGER' ? 'SALES_MANAGER' : 'SALES_PERSON';
  const config = await tx.commissionSplitConfig.findUnique({
    where: { firmId_handledBy: { firmId: client.firmId, handledBy } },
  });
  if (!config) return null;
  const manager = handler.managerId
    ? await tx.user.findUnique({
        where: { id: handler.managerId },
        select: { id: true, brokerId: true },
      })
    : null;
  const people = splitFor(
    { id: handler.id, role: handledBy, managerId: handler.managerId, brokerId: handler.brokerId },
    manager,
    {
      brokerPct: Number(config.brokerPct),
      salesManagerPct: Number(config.salesManagerPct),
      salesPersonPct: Number(config.salesPersonPct),
    },
  );
  const gross = grossCommissionCents(client.tcp.toString(), template.grossRatePct.toString());
  const fixed = template.tranches.filter((t) => t.trigger !== 'MONTHLY');
  const amounts = trancheAmountsCents(
    gross,
    fixed.map((t) => t.sharePct.toString()),
  );
  const snapshot: SplitSnapshot = {
    handledBy,
    grossRatePct: Number(template.grossRatePct),
    people,
  };

  return tx.commission.create({
    data: {
      firmId: client.firmId,
      clientId: client.id,
      templateId: template.id,
      grossAmount: toPesos(gross),
      splitSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      tranches: {
        create: fixed.map((t, i) => ({
          firmId: client.firmId,
          sequence: t.sequence,
          label: t.label,
          amount: toPesos(amounts[i]!),
          trigger: t.trigger,
          triggerValue: t.triggerValue,
          requiredStage: t.requiredStage,
          requiresTransmittal: template.requiresTransmittal,
        })),
      },
    },
  });
}

/**
 * Re-checks a deal's tranches against both gates (SPEC §10.4). Called when a payment is
 * confirmed, a requirement item changes, or a transmittal is confirmed. Every status change is
 * audited (rule 11). Safe to call any time.
 */
export async function evaluateClient(clientId: string, req: Request | null = null) {
  const commission = await prisma.commission.findUnique({
    where: { clientId },
    include: { tranches: { include: { voucher: { select: { id: true } } } } },
  });
  if (!commission) return [];
  const [client, payments, items, template] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: clientId } }),
    prisma.payment.findMany({ where: { clientId, confirmedById: { not: null } } }),
    prisma.requirementItem.findMany({ where: { clientId } }),
    prisma.commissionTemplate.findUnique({
      where: { id: commission.templateId },
      include: { tranches: true },
    }),
  ]);
  const ctx = {
    tcp: Number(client.tcp),
    downpayment: client.downpaymentAmount ? Number(client.downpaymentAmount) : null,
    payments: payments.map((p) => ({ kind: p.kind, amount: Number(p.amount), paidAt: p.paidAt })),
  };

  // Futura-style MONTHLY: one tranche per month with payments, sized by what was paid that month.
  const monthly = template?.tranches.find((t) => t.trigger === 'MONTHLY');
  if (monthly) {
    const have = new Set(commission.tranches.map((t) => t.periodMonth));
    let seq = Math.max(0, ...commission.tranches.map((t) => t.sequence));
    for (const [month, amount] of [...paidByMonth(ctx.payments)].sort()) {
      if (have.has(month)) continue;
      const cents = Math.round(
        (toCents(commission.grossAmount.toString()) * toCents(amount)) / toCents(ctx.tcp),
      );
      const t = await prisma.commissionTranche.create({
        data: {
          firmId: commission.firmId,
          commissionId: commission.id,
          sequence: ++seq,
          label: `Month ${month}`,
          amount: toPesos(cents),
          trigger: 'MONTHLY',
          requiredStage: monthly.requiredStage,
          requiresTransmittal: template!.requiresTransmittal,
          periodMonth: month,
        },
        include: { voucher: { select: { id: true } } },
      });
      commission.tranches.push(t);
    }
  }

  const changes: { trancheId: string; from: string; to: string }[] = [];
  const now = new Date();
  for (const t of commission.tranches) {
    const milestone = t.trigger
      ? milestoneReached(t.trigger, t.triggerValue ? Number(t.triggerValue) : null, ctx)
      : false;
    const docs = docsComplete(items, t.requiredStage ?? 'FINANCING');
    const status = nextStatus(
      {
        status: t.status,
        requiresTransmittal: t.requiresTransmittal,
        transmittalConfirmed: t.transmittalAmount !== null,
        hasVoucher: !!t.voucher,
      },
      milestone,
      docs,
    );
    const data: Partial<CommissionTranche> = {};
    if (milestone && !t.milestoneReachedAt) data.milestoneReachedAt = now;
    if (docs && !t.docsCompleteAt) data.docsCompleteAt = now;
    if (!docs && t.docsCompleteAt && !t.voucher) data.docsCompleteAt = null;
    if (status !== t.status) {
      data.status = status;
      if (status === 'AWAITING_TRANSMITTAL' && !t.awaitingSince) data.awaitingSince = now;
      changes.push({ trancheId: t.id, from: t.status, to: status });
    }
    if (Object.keys(data).length) {
      await prisma.commissionTranche.update({ where: { id: t.id }, data });
    }
  }
  for (const c of changes) {
    await audit(req, {
      firmId: commission.firmId,
      action: 'TRANCHE_STATUS_CHANGED',
      entityType: 'CommissionTranche',
      entityId: c.trancheId,
      before: { status: c.from },
      after: { status: c.to },
    });
  }
  return changes;
}

/** Re-evaluates the deal a document or item belongs to, if any (used by review hooks). */
export async function evaluateForItemDocument(documentId: string, req: Request | null) {
  const item = await prisma.requirementItem.findFirst({
    where: { documentId },
    select: { clientId: true },
  });
  if (item) await evaluateClient(item.clientId, req);
}
