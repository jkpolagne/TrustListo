import type {
  CommissionStatus,
  PaymentKind,
  RequirementStage,
  ReqItemStatus,
  TrancheTrigger,
} from '@prisma/client';

/**
 * Commission rules (SPEC §10.2–10.4) as pure functions: no database, so the four acceptance
 * scenarios (cash developer sale, in-house 50%, Camella 30/30/30/10, private spot cash) are
 * tested exactly, and the manuscript can quote them.
 *
 * All money is handled in centavos (integers) to avoid floating-point drift.
 */

export const toCents = (pesos: number | string) => Math.round(Number(pesos) * 100);
export const toPesos = (cents: number) => cents / 100;

/** grossCommission = TCP × grossRatePct / 100 (§10.2), to the centavo. */
export function grossCommissionCents(tcp: number | string, grossRatePct: number | string): number {
  return Math.round((toCents(tcp) * Number(grossRatePct)) / 100);
}

/**
 * Tranche amounts from their shares. Each is rounded to the centavo; the rounding remainder
 * goes on the last tranche so the tranches always add up to the gross exactly (§10.2).
 */
export function trancheAmountsCents(grossCents: number, sharePcts: (number | string)[]): number[] {
  const amounts = sharePcts.map((p) => Math.round((grossCents * Number(p)) / 100));
  const totalShare = sharePcts.reduce<number>((s, p) => s + Number(p), 0);
  const target = Math.round((grossCents * totalShare) / 100);
  if (amounts.length) amounts[amounts.length - 1]! += target - amounts.reduce((s, a) => s + a, 0);
  return amounts;
}

// ───────────── Split (§10.2) ─────────────

export type SplitPerson = {
  userId: string;
  role: 'BROKER' | 'SALES_MANAGER' | 'SALES_PERSON';
  pct: number;
};

/**
 * Who shares the commission. Depends on who handles the client (not on organic vs referral).
 * A Sales Person's manager always gets the manager's cut.
 */
export function splitFor(
  handler: {
    id: string;
    role: 'SALES_MANAGER' | 'SALES_PERSON';
    managerId: string | null;
    brokerId: string | null;
  },
  manager: { id: string; brokerId: string | null } | null,
  config: { brokerPct: number; salesManagerPct: number; salesPersonPct: number },
): SplitPerson[] {
  const brokerId =
    handler.role === 'SALES_MANAGER' ? handler.brokerId : (manager?.brokerId ?? null);
  const people: SplitPerson[] = [];
  if (brokerId) people.push({ userId: brokerId, role: 'BROKER', pct: config.brokerPct });
  if (handler.role === 'SALES_MANAGER') {
    people.push({ userId: handler.id, role: 'SALES_MANAGER', pct: config.salesManagerPct });
  } else {
    if (manager)
      people.push({ userId: manager.id, role: 'SALES_MANAGER', pct: config.salesManagerPct });
    people.push({ userId: handler.id, role: 'SALES_PERSON', pct: config.salesPersonPct });
  }
  return people.filter((p) => p.pct > 0);
}

/** Per-person shares of a tranche; the remainder goes to the last person (amounts add up exactly). */
export function sharesCents(amountCents: number, people: SplitPerson[]): number[] {
  return trancheAmountsCents(
    amountCents,
    people.map((p) => p.pct),
  );
}

// ───────────── Gate 1: payment milestone (§10.3) ─────────────

export type PaidContext = {
  tcp: number;
  /** Required downpayment; null when the deal has none (cash). */
  downpayment: number | null;
  /** Confirmed payments only (§10.4). */
  payments: { kind: PaymentKind; amount: number; paidAt: Date }[];
};

/** Payments that count toward the downpayment: the reservation and downpayment installments. */
const DP_KINDS: PaymentKind[] = ['RESERVATION', 'DOWNPAYMENT'];
const ONE_PESO = 1;

export function totals(ctx: PaidContext) {
  const paid = ctx.payments.reduce((s, p) => s + p.amount, 0);
  const dpPaid = ctx.payments
    .filter((p) => DP_KINDS.includes(p.kind))
    .reduce((s, p) => s + p.amount, 0);
  return { paid, dpPaid };
}

export function milestoneReached(
  trigger: TrancheTrigger,
  value: number | null,
  ctx: PaidContext,
): boolean {
  const { paid, dpPaid } = totals(ctx);
  switch (trigger) {
    case 'ON_RESERVATION':
      return ctx.payments.some((p) => p.kind === 'RESERVATION');
    case 'FULL_PAYMENT':
      return paid >= ctx.tcp - ONE_PESO;
    case 'TCP_PERCENT_PAID':
      return ctx.tcp > 0 && (paid / ctx.tcp) * 100 >= (value ?? 100) - 1e-9;
    case 'DP_PERCENT_PAID':
      return !!ctx.downpayment && (dpPaid / ctx.downpayment) * 100 >= (value ?? 100) - 1e-9;
    case 'DP_FULLY_PAID':
      return !!ctx.downpayment && dpPaid >= ctx.downpayment - ONE_PESO;
    case 'LOAN_RELEASED':
      return ctx.payments.some((p) => p.kind === 'LOAN_RELEASE');
    case 'MONTHLY':
      return true; // a monthly tranche exists only for a month with payments
  }
}

// ───────────── Gate 2: documents (§10.4) ─────────────

const STAGE_ORDER: Record<RequirementStage, number> = { RESERVATION: 0, FINANCING: 1 };

/** Every required item with stage ≤ requiredStage is VERIFIED or WAIVED. */
export function docsComplete(
  items: { required: boolean; stage: RequirementStage; status: ReqItemStatus }[],
  requiredStage: RequirementStage,
): boolean {
  return items
    .filter((i) => i.required && STAGE_ORDER[i.stage] <= STAGE_ORDER[requiredStage])
    .every((i) => i.status === 'VERIFIED' || i.status === 'WAIVED');
}

// ───────────── State machine (§10.4) ─────────────

export type TrancheState = {
  status: CommissionStatus;
  requiresTransmittal: boolean;
  transmittalConfirmed: boolean;
  hasVoucher: boolean;
};

/**
 * Next status of one tranche:
 *   milestone not reached → WAITING; reached but docs incomplete → BLOCKED;
 *   both → AWAITING_TRANSMITTAL (if the template needs one and it isn't confirmed) or READY_FOR_RELEASE.
 * Statuses move forward only, except that losing document completeness moves an un-vouchered
 * tranche back to BLOCKED. Vouchered and RELEASED tranches never move back.
 */
export function nextStatus(t: TrancheState, milestone: boolean, docs: boolean): CommissionStatus {
  if (t.status === 'RELEASED' || t.hasVoucher) return t.status;
  let computed: CommissionStatus;
  if (!milestone) computed = 'WAITING';
  else if (!docs) computed = 'BLOCKED';
  else if (t.requiresTransmittal && !t.transmittalConfirmed) computed = 'AWAITING_TRANSMITTAL';
  else computed = 'READY_FOR_RELEASE';

  const rank: Record<CommissionStatus, number> = {
    WAITING: 0,
    BLOCKED: 1,
    AWAITING_TRANSMITTAL: 2,
    READY_FOR_RELEASE: 3,
    RELEASED: 4,
  };
  if (rank[computed] >= rank[t.status]) return computed;
  // Backward moves: only the documents gate can pull a tranche back (to BLOCKED).
  if (computed === 'BLOCKED') return 'BLOCKED';
  return t.status;
}

/** Aging buckets for tranches awaiting a transmittal (§10.6). */
export function agingBucket(since: Date, now = new Date()): '0–30' | '31–60' | '61–90' | '90+' {
  const days = Math.floor((now.getTime() - since.getTime()) / 86_400_000);
  return days <= 30 ? '0–30' : days <= 60 ? '31–60' : days <= 90 ? '61–90' : '90+';
}

/** Months (YYYY-MM) with confirmed payments, and how much was paid in each (Futura MONTHLY). */
export function paidByMonth(payments: PaidContext['payments']): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of payments) {
    const k = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
    m.set(k, (m.get(k) ?? 0) + p.amount);
  }
  return m;
}
