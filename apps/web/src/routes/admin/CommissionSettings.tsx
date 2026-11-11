import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, FormError, FormSuccess } from '../../components/Form';
import { Badge, Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { METHOD, type PaymentMethod } from '../../lib/clients';
import { triggerText, type Stage, type TrancheTrigger } from '../../lib/commissions';

/* Commission settings (SPEC §10.2–10.3). Changes apply to deals converted from now on. */

type Split = {
  handledBy: 'SALES_MANAGER' | 'SALES_PERSON';
  brokerPct: number;
  salesManagerPct: number;
  salesPersonPct: number;
};

type Template = {
  id: string;
  developer: { id: string; name: string } | null;
  paymentMethod: PaymentMethod;
  grossRatePct: number;
  requiresTransmittal: boolean;
  tranches: {
    id: string;
    sequence: number;
    label: string;
    sharePct: number;
    trigger: TrancheTrigger;
    triggerValue: number | null;
    requiredStage: Stage;
  }[];
};

type FirmSettings = Record<string, number | string> & { withholdingPct: number };

const HAS_VALUE: TrancheTrigger[] = ['TCP_PERCENT_PAID', 'DP_PERCENT_PAID'];
const near100 = (n: number) => Math.abs(n - 100) < 1e-6;

export function CommissionSettings() {
  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">Commissions</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        The starting values are placeholders. Replace them with the rates you agreed with each
        developer. Changes apply to deals converted from now on; existing deals keep theirs.
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Splits />
        <Withholding />
      </div>
      <Templates />
    </div>
  );
}

function Withholding() {
  const qc = useQueryClient();
  const firm = useQuery({
    queryKey: ['settings', 'firm'],
    queryFn: () => api<FirmSettings>('/settings/firm'),
  });
  const [pct, setPct] = useState('');
  useEffect(() => {
    if (firm.data) setPct(String(firm.data.withholdingPct));
  }, [firm.data]);
  const save = useMutation({
    mutationFn: () => {
      const { name: _name, ...rest } = firm.data!;
      return api<FirmSettings>('/settings/firm', {
        method: 'PUT',
        json: { ...rest, withholdingPct: Number(pct) },
      });
    },
    onSuccess: (d) => qc.setQueryData(['settings', 'firm'], d),
  });
  return (
    <Card className="self-start">
      <CardHeader title="Withholding tax" />
      <form
        className="space-y-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field
          label="Taken from each share"
          htmlFor="withholding"
          hint="Shown on every voucher. The broker can add other deductions."
        >
          <div className="relative">
            <input
              id="withholding"
              type="number"
              step="any"
              min={0}
              max={35}
              required
              className="input pr-10 tabular-nums"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
              %
            </span>
          </div>
        </Field>
        <FormError error={save.error} />
        {save.isSuccess && <FormSuccess>Saved.</FormSuccess>}
        <Button type="submit" disabled={save.isPending || !firm.data}>
          {save.isPending ? 'Saving…' : 'Save rate'}
        </Button>
      </form>
    </Card>
  );
}

const SPLIT_ROWS = [
  { handledBy: 'SALES_PERSON', title: 'A salesperson handles the client' },
  { handledBy: 'SALES_MANAGER', title: 'A sales manager handles the client' },
] as const;
const SPLIT_COLS = [
  ['brokerPct', 'Broker'],
  ['salesManagerPct', 'Sales manager'],
  ['salesPersonPct', 'Salesperson'],
] as const;

/** Who gets what share (§10.2). It depends on who handles the client, not how the lead came in. */
function Splits() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['settings', 'splits'],
    queryFn: () => api<{ data: Split[] }>('/settings/commission-splits').then((r) => r.data),
  });
  const [form, setForm] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    if (!q.data) return;
    setForm(
      Object.fromEntries(
        SPLIT_ROWS.map(({ handledBy }) => {
          const r = q.data.find((x) => x.handledBy === handledBy);
          return [handledBy, Object.fromEntries(SPLIT_COLS.map(([k]) => [k, String(r?.[k] ?? 0)]))];
        }),
      ),
    );
  }, [q.data]);
  const save = useMutation({
    mutationFn: () =>
      api('/settings/commission-splits', {
        method: 'PUT',
        json: SPLIT_ROWS.map(({ handledBy }) => ({
          handledBy,
          ...Object.fromEntries(SPLIT_COLS.map(([k]) => [k, Number(form[handledBy]?.[k] ?? 0)])),
        })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'splits'] }),
  });
  const total = (h: string) => SPLIT_COLS.reduce((s, [k]) => s + Number(form[h]?.[k] || 0), 0);
  const ok = SPLIT_ROWS.every(({ handledBy }) => near100(total(handledBy)));

  return (
    <Card>
      <CardHeader
        title="Commission split"
        description="Each row adds up to 100%. A salesperson's manager always gets the manager's share."
      />
      <form
        className="space-y-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {SPLIT_ROWS.map(({ handledBy, title }) => {
          const t = total(handledBy);
          return (
            <fieldset key={handledBy}>
              <legend className="mb-2 flex w-full items-baseline justify-between gap-2 text-sm font-semibold">
                {title}
                <span
                  className={`text-xs font-semibold tabular-nums ${near100(t) ? 'text-muted' : 'text-flag'}`}
                >
                  {t}% of 100%
                </span>
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {SPLIT_COLS.map(([k, label]) => {
                  const locked = handledBy === 'SALES_MANAGER' && k === 'salesPersonPct';
                  const id = `${handledBy}-${k}`;
                  return (
                    <div key={k}>
                      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          id={id}
                          type="number"
                          step="any"
                          min={0}
                          max={100}
                          required
                          disabled={locked}
                          className="input pr-8 tabular-nums disabled:bg-canvas disabled:text-muted"
                          value={locked ? '0' : (form[handledBy]?.[k] ?? '')}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              [handledBy]: { ...f[handledBy], [k]: e.target.value },
                            }))
                          }
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
                          %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <FormError error={save.error} />
        {save.isSuccess && <FormSuccess>Saved. New deals use this split.</FormSuccess>}
        <Button type="submit" disabled={save.isPending || !ok}>
          {save.isPending ? 'Saving…' : 'Save split'}
        </Button>
      </form>
    </Card>
  );
}

/** Milestone templates per developer and payment method (§10.3). */
function Templates() {
  const q = useQuery({
    queryKey: ['settings', 'templates'],
    queryFn: () => api<{ data: Template[] }>('/settings/commission-templates').then((r) => r.data),
  });
  const rows = [...(q.data ?? [])].sort(
    (a, b) =>
      (a.developer?.name ?? '~').localeCompare(b.developer?.name ?? '~') ||
      METHOD[a.paymentMethod].localeCompare(METHOD[b.paymentMethod]),
  );
  return (
    <Card className="mt-6" padded={false}>
      <div className="p-5 sm:p-6">
        <CardHeader
          title="Milestones by developer"
          description="How much commission each deal earns, and when each part is released."
        />
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {rows.map((t) => (
          <TemplateRow key={t.id} t={t} />
        ))}
      </ul>
    </Card>
  );
}

function TemplateRow({ t }: { t: Template }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [gross, setGross] = useState(String(t.grossRatePct));
  const [rows, setRows] = useState(() =>
    t.tranches.map((x) => ({
      id: x.id,
      sharePct: String(x.sharePct),
      triggerValue: x.triggerValue === null ? '' : String(x.triggerValue),
    })),
  );
  const save = useMutation({
    mutationFn: () =>
      api(`/settings/commission-templates/${t.id}`, {
        method: 'PUT',
        json: {
          grossRatePct: Number(gross),
          tranches: rows.map((r) => ({
            id: r.id,
            sharePct: Number(r.sharePct),
            triggerValue: r.triggerValue === '' ? null : Number(r.triggerValue),
          })),
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'templates'] }),
  });
  const monthly = t.tranches.some((x) => x.trigger === 'MONTHLY');
  const shareTotal = t.tranches
    .filter((x) => x.trigger !== 'MONTHLY')
    .reduce((s, x) => s + Number(rows.find((r) => r.id === x.id)?.sharePct || 0), 0);
  const ok = monthly || near100(shareTotal);
  const summary = monthly ? 'Paid monthly' : t.tranches.map((x) => `${x.sharePct}%`).join(' / ');
  const panel = `tpl-${t.id}`;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-canvas sm:px-6"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {t.developer?.name ?? 'Private sale'}, {METHOD[t.paymentMethod].toLowerCase()}
          </p>
          <p className="truncate text-xs text-muted">
            {t.grossRatePct}% of the price, released {summary}
          </p>
        </div>
        {!t.requiresTransmittal && <Badge>No transmittal</Badge>}
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <form
          id={panel}
          className="space-y-4 px-5 pb-5 sm:px-6"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="max-w-48">
            <Field
              label="Commission"
              htmlFor={`${panel}-gross`}
              hint="Share of the contract price."
            >
              <div className="relative">
                <input
                  id={`${panel}-gross`}
                  type="number"
                  step="any"
                  min={0}
                  max={20}
                  required
                  className="input pr-8 tabular-nums"
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
                  %
                </span>
              </div>
            </Field>
          </div>
          <ol className="divide-y divide-line rounded-xl border border-line">
            {t.tranches.map((x, i) => {
              const r = rows[i]!;
              const set = (patch: Partial<typeof r>) =>
                setRows((all) => all.map((y, j) => (j === i ? { ...y, ...patch } : y)));
              return (
                <li
                  key={x.id}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_7rem_9rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{x.label}</p>
                    <p className="text-xs text-muted">
                      {triggerText(x.trigger, r.triggerValue === '' ? null : r.triggerValue)}
                      {x.requiredStage === 'FINANCING' ? ', financing documents verified' : ''}
                    </p>
                  </div>
                  {x.trigger === 'MONTHLY' ? (
                    <p className="text-xs text-muted sm:col-span-2">
                      Sized by what was paid each month.
                    </p>
                  ) : (
                    <>
                      <label className="text-xs font-medium text-muted">
                        Share
                        <span className="relative mt-1 block">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={100}
                            required
                            className="input pr-8 tabular-nums"
                            value={r.sharePct}
                            onChange={(e) => set({ sharePct: e.target.value })}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            %
                          </span>
                        </span>
                      </label>
                      {HAS_VALUE.includes(x.trigger) ? (
                        <label className="text-xs font-medium text-muted">
                          {x.trigger === 'TCP_PERCENT_PAID'
                            ? 'Of the price paid'
                            : 'Of the downpayment paid'}
                          <span className="relative mt-1 block">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              max={100}
                              required
                              className="input pr-8 tabular-nums"
                              value={r.triggerValue}
                              onChange={(e) => set({ triggerValue: e.target.value })}
                            />
                            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                              %
                            </span>
                          </span>
                        </label>
                      ) : (
                        <span aria-hidden />
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          {!monthly && (
            <p className={`text-xs font-semibold tabular-nums ${ok ? 'text-muted' : 'text-flag'}`}>
              Shares add up to {shareTotal}%{ok ? '' : '. They need to add up to 100%.'}
            </p>
          )}
          <FormError error={save.error} />
          {save.isSuccess && <FormSuccess>Saved. New deals use these milestones.</FormSuccess>}
          <Button type="submit" disabled={save.isPending || !ok}>
            {save.isPending ? 'Saving…' : 'Save milestones'}
          </Button>
        </form>
      )}
    </li>
  );
}
