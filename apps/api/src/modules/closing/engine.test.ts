import { describe, expect, it } from 'vitest';
import { allDone, applyTicks, computeClosing, emptyChecklist, CLOSING_CODES } from './engine';

const rates = { cgtRatePct: 6, dstRatePct: 1.5, transferTaxRatePct: 0.5 };

describe('closing estimate (§11)', () => {
  it('applies the default rates to the selling price', () => {
    const c = computeClosing({ sellingPrice: 2_650_000, rates });
    expect(c.taxBase).toBe(2_650_000);
    expect(c.taxBaseOverride).toBe(false);
    expect(c.lines.map((l) => [l.code, l.amount, l.paidBy])).toEqual([
      ['CGT', 159_000, 'SELLER'], // 6%
      ['DST', 39_750, 'BUYER'], // 1.5%
      ['TRANSFER_TAX', 13_250, 'BUYER'], // 0.5%
    ]);
    expect(c.totals).toEqual({ BUYER: 53_000, SELLER: 159_000 });
  });

  it('uses the tax base override (e.g. a higher zonal value) and adds the registration fee', () => {
    const c = computeClosing({
      sellingPrice: 1_000_000,
      taxBase: 1_200_000,
      registrationFee: 8_765.43,
      rates,
    });
    expect(c.taxBase).toBe(1_200_000);
    expect(c.taxBaseOverride).toBe(true);
    expect(c.lines.find((l) => l.code === 'CGT')!.amount).toBe(72_000);
    expect(c.lines.find((l) => l.code === 'REGISTRATION_FEE')).toMatchObject({
      amount: 8_765.43,
      ratePct: null,
      paidBy: 'BUYER',
    });
    expect(c.totals.BUYER).toBe(18_000 + 6_000 + 8_765.43);
  });

  it('rounds each line to the centavo', () => {
    const c = computeClosing({ sellingPrice: 1_234_567.89, rates });
    expect(c.lines.find((l) => l.code === 'DST')!.amount).toBe(18_518.52); // 18518.518…
    expect(c.lines.find((l) => l.code === 'TRANSFER_TAX')!.amount).toBe(6_172.84); // 6172.839…
  });

  it('ignores a zero or empty override', () => {
    expect(computeClosing({ sellingPrice: 500_000, taxBase: 0, rates }).taxBaseOverride).toBe(
      false,
    );
    expect(computeClosing({ sellingPrice: 500_000, taxBase: null, rates }).taxBase).toBe(500_000);
  });
});

describe('closing checklist (§11)', () => {
  it('records who ticked what and when, and reports only real changes', () => {
    const now = new Date('2026-11-11T02:00:00Z');
    const { checklist, changed } = applyTicks(
      emptyChecklist(),
      [
        { code: 'DEED_SIGNED', done: true },
        { code: 'KEYS_TURNED_OVER', done: false }, // already not done: no change
      ],
      'u1',
      now,
    );
    expect(changed).toEqual([{ code: 'DEED_SIGNED', done: true }]);
    expect(checklist.find((i) => i.code === 'DEED_SIGNED')).toMatchObject({
      done: true,
      doneAt: now.toISOString(),
      doneById: 'u1',
    });
    const undone = applyTicks(checklist, [{ code: 'DEED_SIGNED', done: false }], 'u1');
    expect(undone.checklist.find((i) => i.code === 'DEED_SIGNED')).toMatchObject({
      done: false,
      doneAt: null,
      doneById: null,
    });
  });

  it('is complete only when every item is done', () => {
    const almost = applyTicks(
      emptyChecklist(),
      CLOSING_CODES.slice(1).map((code) => ({ code, done: true })),
      'u1',
    ).checklist;
    expect(allDone(almost)).toBe(false);
    expect(
      allDone(applyTicks(almost, [{ code: CLOSING_CODES[0], done: true }], 'u1').checklist),
    ).toBe(true);
  });
});
