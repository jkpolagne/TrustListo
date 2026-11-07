import { describe, expect, it } from 'vitest';
import {
  budgetFromIncome,
  estimateAffordable,
  estimateFromPrice,
  maxLoanFromBudget,
  maxPriceFromLoan,
  monthlyPayment,
} from './loan';

// Test vectors (SPEC §7.4, §14). Expected values computed independently with the
// standard amortization formula (cross-checked by plugging max-loan results back into
// monthlyPayment) and rounded to centavos.
describe('monthlyPayment', () => {
  it.each([
    // principal, rate %, years, expected monthly
    [1_000_000, 6.25, 30, 6157.17],
    [1_935_000, 6.25, 30, 11914.13],
    [2_000_000, 7.5, 20, 16111.86],
    [500_000, 14, 5, 11634.13],
    [100_000, 12, 1, 8884.88],
  ])('P=%d at %d%% for %d yrs → %d', (p, rate, years, expected) => {
    expect(monthlyPayment(p, rate, years)).toBeCloseTo(expected, 2);
  });

  it('handles a zero interest rate (r = 0 → P/n)', () => {
    expect(monthlyPayment(1_200_000, 0, 10)).toBe(10000);
  });

  it('returns 0 for no loan or no term', () => {
    expect(monthlyPayment(0, 6, 30)).toBe(0);
    expect(monthlyPayment(1_000_000, 6, 0)).toBe(0);
  });
});

describe('maxLoanFromBudget', () => {
  it('is the inverse of monthlyPayment', () => {
    const m = monthlyPayment(1_500_000, 6.25, 30);
    expect(maxLoanFromBudget(m, 6.25, 30)).toBeCloseTo(1_500_000, -1);
  });

  it.each([
    [10_000, 6.25, 30, 1_624_122.24],
    [20_000, 7.5, 20, 2_482_642.62],
  ])('budget %d at %d%% for %d yrs → %d', (m, rate, years, expected) => {
    expect(maxLoanFromBudget(m, rate, years)).toBeCloseTo(expected, 0);
  });

  it('handles r = 0 (M·n)', () => {
    expect(maxLoanFromBudget(10_000, 0, 10)).toBe(1_200_000);
  });
});

describe('affordability', () => {
  it('maxPrice = maxLoan / (1 − dp%)', () => {
    expect(maxPriceFromLoan(900_000, 10)).toBe(1_000_000);
    expect(maxPriceFromLoan(900_000, 100)).toBe(0);
  });

  it('budget from income', () => {
    expect(budgetFromIncome(40_000, 35)).toBe(14_000);
  });

  it('estimateAffordable chains the steps', () => {
    const e = estimateAffordable(10_000, 10, 6.25, 30);
    expect(e.maxLoan).toBeCloseTo(1_624_122.24, 2);
    expect(e.maxPrice).toBeCloseTo(1_624_122.24 / 0.9, 1);
  });
});

describe('estimateFromPrice', () => {
  it('splits downpayment and loan, and totals interest', () => {
    const e = estimateFromPrice(2_150_000, 10, 6.25, 30);
    expect(e.downpayment).toBe(215_000);
    expect(e.loanAmount).toBe(1_935_000);
    expect(e.monthly).toBeCloseTo(11914.13, 2);
    expect(e.totalPaid).toBeCloseTo(11914.13 * 360, 0);
    expect(e.totalInterest).toBeCloseTo(e.totalPaid - e.loanAmount, 2);
  });
});
