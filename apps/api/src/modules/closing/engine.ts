/**
 * Closing & transfer estimate (SPEC §11) as pure functions, in centavos.
 * BIR taxes on the higher of selling price, zonal value or assessor's FMV; zonal value is out of
 * scope, so the base is the selling price unless the consultant enters a tax base override.
 * This is an estimate to verify with the BIR and the LGU, never a tax engine.
 */

export const CLOSING_ITEMS = [
  { code: 'DEED_SIGNED', label: 'Deed of sale signed' },
  { code: 'CGT_DST_PAID', label: 'Capital gains tax and documentary stamp tax paid' },
  { code: 'ECAR_OBTAINED', label: 'Tax clearance (eCAR) obtained' },
  { code: 'TRANSFER_TAX_PAID', label: 'Local transfer tax paid' },
  { code: 'TITLE_TRANSFERRED', label: 'Title transferred to the buyer' },
  { code: 'TAX_DEC_ISSUED', label: 'New tax declaration issued' },
  { code: 'KEYS_TURNED_OVER', label: 'Keys turned over' },
] as const;

export type ClosingItemCode = (typeof CLOSING_ITEMS)[number]['code'];
export const CLOSING_CODES = CLOSING_ITEMS.map((i) => i.code) as [
  ClosingItemCode,
  ...ClosingItemCode[],
];

export type ChecklistItem = {
  code: ClosingItemCode;
  label: string;
  done: boolean;
  doneAt: string | null;
  doneById: string | null;
};

export type Rates = { cgtRatePct: number; dstRatePct: number; transferTaxRatePct: number };
export type Payer = 'BUYER' | 'SELLER';

export type ClosingLine = {
  code: 'CGT' | 'DST' | 'TRANSFER_TAX' | 'REGISTRATION_FEE';
  label: string;
  ratePct: number | null; // null: entered by hand (Registry of Deeds schedule)
  amount: number; // pesos, to the centavo
  paidBy: Payer;
};

export type Computation = {
  sellingPrice: number;
  taxBase: number; // what the rates were applied to
  taxBaseOverride: boolean;
  registrationFee: number | null;
  rates: Rates;
  lines: ClosingLine[];
  totals: Record<Payer, number>;
};

const cents = (pesos: number) => Math.round(pesos * 100);
const pesos = (c: number) => c / 100;

export function computeClosing(input: {
  sellingPrice: number;
  taxBase?: number | null;
  registrationFee?: number | null;
  rates: Rates;
}): Computation {
  const override = input.taxBase !== null && input.taxBase !== undefined && input.taxBase > 0;
  const baseCents = cents(override ? input.taxBase! : input.sellingPrice);
  const pct = (rate: number) => pesos(Math.round((baseCents * rate) / 100));
  const lines: ClosingLine[] = [
    {
      code: 'CGT',
      label: 'Capital gains tax',
      ratePct: input.rates.cgtRatePct,
      amount: pct(input.rates.cgtRatePct),
      paidBy: 'SELLER',
    },
    {
      code: 'DST',
      label: 'Documentary stamp tax',
      ratePct: input.rates.dstRatePct,
      amount: pct(input.rates.dstRatePct),
      paidBy: 'BUYER',
    },
    {
      code: 'TRANSFER_TAX',
      label: 'Local transfer tax',
      ratePct: input.rates.transferTaxRatePct,
      amount: pct(input.rates.transferTaxRatePct),
      paidBy: 'BUYER',
    },
  ];
  if (input.registrationFee !== null && input.registrationFee !== undefined) {
    lines.push({
      code: 'REGISTRATION_FEE',
      label: 'Registration fee',
      ratePct: null,
      amount: pesos(cents(input.registrationFee)),
      paidBy: 'BUYER',
    });
  }
  const total = (who: Payer) =>
    pesos(lines.filter((l) => l.paidBy === who).reduce((s, l) => s + cents(l.amount), 0));
  return {
    sellingPrice: pesos(cents(input.sellingPrice)),
    taxBase: pesos(baseCents),
    taxBaseOverride: override,
    registrationFee:
      input.registrationFee === null || input.registrationFee === undefined
        ? null
        : pesos(cents(input.registrationFee)),
    rates: input.rates,
    lines,
    totals: { BUYER: total('BUYER'), SELLER: total('SELLER') },
  };
}

export const emptyChecklist = (): ChecklistItem[] =>
  CLOSING_ITEMS.map((i) => ({ ...i, done: false, doneAt: null, doneById: null }));

/** Applies ticks; returns the new list and which items actually changed (for the audit log). */
export function applyTicks(
  list: ChecklistItem[],
  ticks: { code: ClosingItemCode; done: boolean }[],
  userId: string,
  now = new Date(),
): { checklist: ChecklistItem[]; changed: { code: ClosingItemCode; done: boolean }[] } {
  const changed: { code: ClosingItemCode; done: boolean }[] = [];
  const checklist = list.map((item) => {
    const t = ticks.find((x) => x.code === item.code);
    if (!t || t.done === item.done) return item;
    changed.push({ code: item.code, done: t.done });
    return t.done
      ? { ...item, done: true, doneAt: now.toISOString(), doneById: userId }
      : { ...item, done: false, doneAt: null, doneById: null };
  });
  return { checklist, changed };
}

export const allDone = (list: ChecklistItem[]) =>
  CLOSING_CODES.every((code) => list.find((i) => i.code === code)?.done);
