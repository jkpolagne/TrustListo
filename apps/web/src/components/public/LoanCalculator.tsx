import { useState } from 'react';
import {
  LOAN_DEFAULTS,
  budgetFromIncome,
  estimateAffordable,
  estimateFromPrice,
  formatPeso,
} from '@trustlisto/shared';

const peso = (n: number) => formatPeso(n).replace(/\.00$/, '');

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  prefix,
  step = 'any',
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  prefix?: string;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={`input tabular-nums ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-14' : ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-2xl font-bold' : 'font-semibold'}`}>{value}</dd>
    </div>
  );
}

/**
 * Two estimates (SPEC §7.4): the monthly payment for this price, and the price range a budget
 * can carry. Uses the shared, tested formulas. Never presented as a loan approval.
 */
export function LoanCalculator({ price }: { price: number }) {
  const [mode, setMode] = useState<'payment' | 'afford'>('payment');
  const [listPrice, setListPrice] = useState(price);
  const [dp, setDp] = useState<number>(LOAN_DEFAULTS.downpaymentPct);
  const [rate, setRate] = useState<number>(LOAN_DEFAULTS.annualRatePct);
  const [years, setYears] = useState<number>(LOAN_DEFAULTS.years);
  const [income, setIncome] = useState(40000);
  const [ratio, setRatio] = useState<number>(LOAN_DEFAULTS.incomeRatioPct);

  const pay = estimateFromPrice(listPrice, dp, rate, years);
  const budget = budgetFromIncome(income, ratio);
  const afford = estimateAffordable(budget, dp, rate, years);
  const fits = afford.maxPrice >= price;

  return (
    <div className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <h2 className="text-lg font-bold">Loan calculator</h2>
      <div
        className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1"
        role="tablist"
        aria-label="Calculator"
      >
        {(
          [
            ['payment', 'Monthly payment'],
            ['afford', 'What I can afford'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m ? 'bg-paper shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {mode === 'payment' ? (
          <div className="sm:col-span-2">
            <NumberField
              id="lc-price"
              label="Price"
              prefix="₱"
              value={listPrice}
              onChange={setListPrice}
              step="1000"
            />
          </div>
        ) : (
          <>
            <NumberField
              id="lc-income"
              label="Gross monthly income"
              prefix="₱"
              value={income}
              onChange={setIncome}
              step="1000"
            />
            <NumberField
              id="lc-ratio"
              label="Share for the loan"
              suffix="%"
              value={ratio}
              onChange={setRatio}
            />
          </>
        )}
        <NumberField id="lc-dp" label="Downpayment" suffix="%" value={dp} onChange={setDp} />
        <NumberField
          id="lc-rate"
          label="Interest rate"
          suffix="% / yr"
          value={rate}
          onChange={setRate}
        />
        <NumberField
          id="lc-years"
          label="Loan term"
          suffix="years"
          value={years}
          onChange={setYears}
          step="1"
        />
      </div>

      <dl className="mt-5 rounded-xl bg-canvas px-4 py-3" aria-live="polite">
        {mode === 'payment' ? (
          <>
            <Row label="Estimated monthly payment" value={peso(pay.monthly)} strong />
            <Row label="Downpayment" value={peso(pay.downpayment)} />
            <Row label="Loan amount" value={peso(pay.loanAmount)} />
            <Row label="Total interest over the term" value={peso(pay.totalInterest)} />
          </>
        ) : (
          <>
            <Row label="Homes up to about" value={peso(afford.maxPrice)} strong />
            <Row label="Monthly budget for the loan" value={peso(budget)} />
            <Row label="Largest loan for that budget" value={peso(afford.maxLoan)} />
            <p className={`mt-1 text-sm font-semibold ${fits ? '' : 'text-flag'}`}>
              {fits ? 'This listing fits that budget.' : 'This listing is above that budget.'}
            </p>
          </>
        )}
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Estimate only, not a loan approval. Defaults assume {LOAN_DEFAULTS.annualRatePct}% a year
        over {LOAN_DEFAULTS.years} years with {LOAN_DEFAULTS.downpaymentPct}% down. Your bank,
        Pag-IBIG or the developer sets the actual terms.
      </p>
    </div>
  );
}
