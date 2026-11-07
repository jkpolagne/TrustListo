/**
 * Loan calculator (SPEC §7.4). Pure functions shared by web and api.
 * Estimates only — never a loan approval.
 */

/** Fallback assumptions until firm-editable settings exist (shown on screen as assumptions). */
export const LOAN_DEFAULTS = {
  annualRatePct: 6.25, // Pag-IBIG-like
  years: 30,
  downpaymentPct: 10,
  incomeRatioPct: 35, // share of gross monthly income that may go to amortization
} as const;

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Monthly payment for a fully amortizing loan.
 * M = P·r(1+r)^n / ((1+r)^n − 1), r = annualRate/12, n = years×12. If r = 0, M = P/n.
 */
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return round2(principal / n);
  const f = Math.pow(1 + r, n);
  return round2((principal * r * f) / (f - 1));
}

/**
 * Largest loan a monthly budget can carry.
 * maxLoan = M·((1+r)^n − 1) / (r(1+r)^n). If r = 0, maxLoan = M·n.
 */
export function maxLoanFromBudget(monthly: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (monthly <= 0 || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return round2(monthly * n);
  const f = Math.pow(1 + r, n);
  return round2((monthly * (f - 1)) / (r * f));
}

/** maxPrice = maxLoan / (1 − dp%). */
export function maxPriceFromLoan(maxLoan: number, downpaymentPct: number): number {
  const dp = downpaymentPct / 100;
  if (dp >= 1) return 0;
  return round2(maxLoan / (1 - dp));
}

/** Monthly budget from gross income and the allowed share of income. */
export function budgetFromIncome(grossMonthlyIncome: number, incomeRatioPct: number): number {
  return round2((grossMonthlyIncome * incomeRatioPct) / 100);
}

export interface PaymentEstimate {
  price: number;
  downpayment: number;
  loanAmount: number;
  monthly: number;
  totalPaid: number;
  totalInterest: number;
}

/** Everything the "payment from price" view shows. */
export function estimateFromPrice(
  price: number,
  downpaymentPct: number,
  annualRatePct: number,
  years: number,
): PaymentEstimate {
  const downpayment = round2((price * downpaymentPct) / 100);
  const loanAmount = round2(price - downpayment);
  const monthly = monthlyPayment(loanAmount, annualRatePct, years);
  const totalPaid = round2(monthly * Math.round(years * 12));
  return {
    price,
    downpayment,
    loanAmount,
    monthly,
    totalPaid,
    totalInterest: round2(Math.max(0, totalPaid - loanAmount)),
  };
}

export interface AffordabilityEstimate {
  monthlyBudget: number;
  maxLoan: number;
  maxPrice: number;
}

/** Everything the "what can I afford" view shows. */
export function estimateAffordable(
  monthlyBudget: number,
  downpaymentPct: number,
  annualRatePct: number,
  years: number,
): AffordabilityEstimate {
  const maxLoan = maxLoanFromBudget(monthlyBudget, annualRatePct, years);
  return { monthlyBudget, maxLoan, maxPrice: maxPriceFromLoan(maxLoan, downpaymentPct) };
}
