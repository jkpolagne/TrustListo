import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { estimateFromPrice, formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, FormSuccess, PrimaryButton } from '../../components/Form';
import { Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { CommissionSettings } from './CommissionSettings';

interface Settings {
  name: string;
  loanRatePct: number;
  loanTermYears: number;
  loanDownpaymentPct: number;
  loanIncomeRatioPct: number;
}

const fields: { key: keyof Omit<Settings, 'name'>; label: string; suffix: string; hint: string }[] =
  [
    {
      key: 'loanRatePct',
      label: 'Interest rate',
      suffix: '% / yr',
      hint: 'Pag-IBIG is often around 6%. Banks vary.',
    },
    { key: 'loanTermYears', label: 'Loan term', suffix: 'years', hint: 'Up to 40 years.' },
    {
      key: 'loanDownpaymentPct',
      label: 'Downpayment',
      suffix: '%',
      hint: 'Share of the price paid before the loan.',
    },
    {
      key: 'loanIncomeRatioPct',
      label: 'Income share for the loan',
      suffix: '%',
      hint: 'Used by "What I can afford". Lenders often cap this near 35%.',
    },
  ];

/** Loan calculator assumptions buyers see on this firm's listings (SPEC §7.4). */
export function FirmSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['settings', 'firm'],
    queryFn: () => api<Settings>('/settings/firm'),
  });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings.data)
      setForm(Object.fromEntries(fields.map((f) => [f.key, String(settings.data[f.key])])));
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      api<Settings>('/settings/firm', {
        method: 'PUT',
        json: Object.fromEntries(fields.map((f) => [f.key, Number(form[f.key])])),
      }),
    onSuccess: (d) => qc.setQueryData(['settings', 'firm'], d),
  });

  // Live preview on a sample ₱2,000,000 home.
  const preview = estimateFromPrice(
    2_000_000,
    Number(form.loanDownpaymentPct ?? 0),
    Number(form.loanRatePct ?? 0),
    Number(form.loanTermYears ?? 0),
  );

  return (
    <>
      <PageHeader
        title="Settings"
        intro="Loan calculator values buyers see on your listings, and how commissions are earned and split."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader
            title="Loan calculator"
            description="Starting values. Buyers can still change them."
          />
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint}>
                  <div className="relative">
                    <input
                      id={f.key}
                      type="number"
                      step="any"
                      min={0}
                      required
                      className="input pr-16 tabular-nums"
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
                      {f.suffix}
                    </span>
                  </div>
                </Field>
              ))}
            </div>
            <FormError error={save.error} />
            {save.isSuccess && (
              <FormSuccess>Saved. Buyers see the new values right away.</FormSuccess>
            )}
            <PrimaryButton pending={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </PrimaryButton>
          </form>
        </Card>

        <Card className="self-start">
          <CardHeader title="Preview" description="A ₱2,000,000 home with these values." />
          <p className="text-3xl font-bold tabular-nums">
            {formatPeso(preview.monthly).replace(/\.00$/, '')}
            <span className="text-sm font-medium text-muted"> /month</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {formatPeso(preview.downpayment).replace(/\.00$/, '')} down, loan of{' '}
            {formatPeso(preview.loanAmount).replace(/\.00$/, '')}.
          </p>
        </Card>
      </div>
      <CommissionSettings />
    </>
  );
}
