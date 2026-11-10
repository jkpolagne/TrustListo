// M8 acceptance (SPEC §15): commission scenarios on the pure engine (§10.2–10.4).
import type { CommissionStatus, PaymentKind, TrancheTrigger } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  agingBucket,
  docsComplete,
  grossCommissionCents,
  milestoneReached,
  nextStatus,
  sharesCents,
  splitFor,
  trancheAmountsCents,
  type PaidContext,
} from './engine';

type Def = {
  share: number;
  trigger: TrancheTrigger;
  value?: number;
  stage: 'RESERVATION' | 'FINANCING';
};

/** Runs one deal through the state machine and returns each tranche's status. */
function run(
  defs: Def[],
  ctx: PaidContext,
  docs: { reservation: boolean; financing: boolean },
  opts: { transmittal: boolean; confirmed?: boolean; prev?: CommissionStatus[] },
) {
  const items = [
    {
      required: true,
      stage: 'RESERVATION' as const,
      status: docs.reservation ? ('VERIFIED' as const) : ('UPLOADED' as const),
    },
    {
      required: true,
      stage: 'FINANCING' as const,
      status: docs.financing ? ('VERIFIED' as const) : ('MISSING' as const),
    },
  ];
  return defs.map((d, i) =>
    nextStatus(
      {
        status: opts.prev?.[i] ?? 'WAITING',
        requiresTransmittal: opts.transmittal,
        transmittalConfirmed: !!opts.confirmed,
        hasVoucher: false,
      },
      milestoneReached(d.trigger, d.value ?? null, ctx),
      docsComplete(items, d.stage),
    ),
  );
}

const pay = (kind: PaymentKind, amount: number) => ({
  kind,
  amount,
  paidAt: new Date('2026-11-01'),
});

describe('scenario 1: developer cash sale (20% + 80% on full payment, transmittal; OPEN-7)', () => {
  const defs: Def[] = [
    { share: 20, trigger: 'FULL_PAYMENT', stage: 'RESERVATION' },
    { share: 80, trigger: 'FULL_PAYMENT', stage: 'RESERVATION' },
  ];
  const gross = grossCommissionCents(2_450_000, 5);

  it('splits the gross 20/80 to the centavo', () => {
    expect(gross).toBe(12_250_000); // ₱122,500.00
    expect(trancheAmountsCents(gross, [20, 80])).toEqual([2_450_000, 9_800_000]);
  });
  it('waits for full payment, blocks on documents, then waits for the transmittal', () => {
    const reserved = { tcp: 2_450_000, downpayment: null, payments: [pay('RESERVATION', 20_000)] };
    expect(
      run(defs, reserved, { reservation: true, financing: true }, { transmittal: true }),
    ).toEqual(['WAITING', 'WAITING']);
    const paid = { ...reserved, payments: [...reserved.payments, pay('FULL_CASH', 2_430_000)] };
    expect(
      run(defs, paid, { reservation: false, financing: false }, { transmittal: true }),
    ).toEqual(['BLOCKED', 'BLOCKED']);
    expect(run(defs, paid, { reservation: true, financing: false }, { transmittal: true })).toEqual(
      ['AWAITING_TRANSMITTAL', 'AWAITING_TRANSMITTAL'],
    );
    expect(
      run(
        defs,
        paid,
        { reservation: true, financing: false },
        { transmittal: true, confirmed: true },
      ),
    ).toEqual(['READY_FOR_RELEASE', 'READY_FOR_RELEASE']);
  });
});

describe('scenario 2: in-house, 100% at 50% of TCP paid', () => {
  const defs: Def[] = [{ share: 100, trigger: 'TCP_PERCENT_PAID', value: 50, stage: 'FINANCING' }];
  const ctx = (paid: number) => ({
    tcp: 1_000_000,
    downpayment: null,
    payments: [pay('RESERVATION', 20_000), pay('IN_HOUSE_INSTALLMENT', paid - 20_000)],
  });

  it('is reached at exactly 50%, not a peso before', () => {
    expect(
      run(defs, ctx(499_999), { reservation: true, financing: true }, { transmittal: true }),
    ).toEqual(['WAITING']);
    expect(
      run(defs, ctx(500_000), { reservation: true, financing: true }, { transmittal: true }),
    ).toEqual(['AWAITING_TRANSMITTAL']);
  });
  it('payment done, docs missing → BLOCKED; docs done, payment not → WAITING (§10.4)', () => {
    expect(
      run(defs, ctx(600_000), { reservation: true, financing: false }, { transmittal: true }),
    ).toEqual(['BLOCKED']);
    expect(
      run(defs, ctx(100_000), { reservation: true, financing: true }, { transmittal: true }),
    ).toEqual(['WAITING']);
  });
});

describe('scenario 3: Camella bank/Pag-IBIG 30/30/30/10 (OPEN-8 placeholders 30% and 60% of DP)', () => {
  const defs: Def[] = [
    { share: 30, trigger: 'DP_PERCENT_PAID', value: 30, stage: 'RESERVATION' },
    { share: 30, trigger: 'DP_PERCENT_PAID', value: 60, stage: 'RESERVATION' },
    { share: 30, trigger: 'DP_FULLY_PAID', stage: 'FINANCING' },
    { share: 10, trigger: 'LOAN_RELEASED', stage: 'FINANCING' },
  ];
  const dp = 245_000;
  const at = (dpPaid: number, released = false) => ({
    tcp: 2_450_000,
    downpayment: dp,
    payments: [
      pay('RESERVATION', 20_000),
      pay('DOWNPAYMENT', dpPaid - 20_000),
      ...(released ? [pay('LOAN_RELEASE', 2_205_000)] : []),
    ],
  });
  const all = { reservation: true, financing: true };

  it('releases each tranche as the downpayment grows, the retention after the loan', () => {
    expect(run(defs, at(73_499), all, { transmittal: true })).toEqual([
      'WAITING',
      'WAITING',
      'WAITING',
      'WAITING',
    ]);
    expect(run(defs, at(73_500), all, { transmittal: true })[0]).toBe('AWAITING_TRANSMITTAL'); // 30% of DP
    expect(run(defs, at(147_000), all, { transmittal: true }).slice(0, 2)).toEqual([
      'AWAITING_TRANSMITTAL',
      'AWAITING_TRANSMITTAL',
    ]);
    expect(run(defs, at(245_000), all, { transmittal: true })).toEqual([
      'AWAITING_TRANSMITTAL',
      'AWAITING_TRANSMITTAL',
      'AWAITING_TRANSMITTAL',
      'WAITING',
    ]);
    expect(run(defs, at(245_000, true), all, { transmittal: true })[3]).toBe(
      'AWAITING_TRANSMITTAL',
    );
  });
  it('the reservation counts toward the downpayment; financing docs gate the third tranche', () => {
    expect(
      run(defs, at(245_000), { reservation: true, financing: false }, { transmittal: true }),
    ).toEqual(['AWAITING_TRANSMITTAL', 'AWAITING_TRANSMITTAL', 'BLOCKED', 'WAITING']);
  });
  it('puts the rounding remainder on the last tranche', () => {
    const gross = grossCommissionCents(2_333_333, 4.5); // ₱104,999.99 (rounded)
    const parts = trancheAmountsCents(gross, [30, 30, 30, 10]);
    expect(parts.reduce((s, c) => s + c, 0)).toBe(gross);
    expect(parts.slice(0, 3)).toEqual([3_150_000, 3_150_000, 3_150_000]);
    expect(parts[3]).toBe(gross - 9_450_000);
  });
});

describe('scenario 4: private spot cash (100% on full payment, no transmittal)', () => {
  const defs: Def[] = [{ share: 100, trigger: 'FULL_PAYMENT', stage: 'RESERVATION' }];
  it('goes straight to ready for release once paid and docs verified', () => {
    const ctx = {
      tcp: 3_600_000,
      downpayment: null,
      payments: [pay('RESERVATION', 50_000), pay('FULL_CASH', 3_550_000)],
    };
    expect(run(defs, ctx, { reservation: true, financing: false }, { transmittal: false })).toEqual(
      ['READY_FOR_RELEASE'],
    );
  });
});

describe('state machine rules (§10.4)', () => {
  it('only moves forward, except docs reverting pulls an un-vouchered tranche back to BLOCKED', () => {
    const base = { requiresTransmittal: true, transmittalConfirmed: true, hasVoucher: false };
    expect(nextStatus({ ...base, status: 'READY_FOR_RELEASE' }, true, false)).toBe('BLOCKED');
    expect(
      nextStatus({ ...base, status: 'READY_FOR_RELEASE', hasVoucher: true }, true, false),
    ).toBe('READY_FOR_RELEASE');
    expect(nextStatus({ ...base, status: 'RELEASED' }, false, false)).toBe('RELEASED');
    expect(nextStatus({ ...base, status: 'BLOCKED' }, true, true)).toBe('READY_FOR_RELEASE');
  });
  it('ages awaiting-transmittal tranches into buckets (§10.6)', () => {
    const now = new Date('2026-11-08');
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
    expect([10, 31, 75, 120].map((d) => agingBucket(daysAgo(d), now))).toEqual([
      '0–30',
      '31–60',
      '61–90',
      '90+',
    ]);
  });
});

describe('split (§10.2, OPEN-5 placeholders)', () => {
  it('a salesperson’s deal pays broker, their manager and them; amounts add up exactly', () => {
    const people = splitFor(
      { id: 'sp', role: 'SALES_PERSON', managerId: 'sm', brokerId: null },
      { id: 'sm', brokerId: 'b' },
      { brokerPct: 20, salesManagerPct: 20, salesPersonPct: 60 },
    );
    expect(people.map((p) => `${p.role}:${p.pct}`)).toEqual([
      'BROKER:20',
      'SALES_MANAGER:20',
      'SALES_PERSON:60',
    ]);
    const shares = sharesCents(2_450_001, people);
    expect(shares.reduce((s, c) => s + c, 0)).toBe(2_450_001);
  });
  it('a manager’s own deal pays the broker and the manager only', () => {
    const people = splitFor(
      { id: 'sm', role: 'SALES_MANAGER', managerId: null, brokerId: 'b' },
      null,
      { brokerPct: 30, salesManagerPct: 70, salesPersonPct: 0 },
    );
    expect(people.map((p) => p.userId)).toEqual(['b', 'sm']);
  });
});
