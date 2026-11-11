import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, FormError, FormSuccess } from '../../components/Form';
import { Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';

type FirmSettings = Record<string, number | string>;

const RATES = [
  ['cgtRatePct', 'Capital gains tax', 'Usually the seller’s. BIR rate is 6%.'],
  ['dstRatePct', 'Documentary stamp tax', 'Usually the buyer’s. BIR rate is 1.5%.'],
  ['transferTaxRatePct', 'Local transfer tax', 'Check the city’s current rate.'],
] as const;

/** Default rates for the closing estimate (SPEC §11). Each deal keeps the rates it was saved with. */
export function ClosingRates() {
  const qc = useQueryClient();
  const firm = useQuery({
    queryKey: ['settings', 'firm'],
    queryFn: () => api<FirmSettings>('/settings/firm'),
  });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (firm.data) setForm(Object.fromEntries(RATES.map(([k]) => [k, String(firm.data[k])])));
  }, [firm.data]);
  const save = useMutation({
    mutationFn: () => {
      const { name: _name, ...rest } = firm.data!;
      return api<FirmSettings>('/settings/firm', {
        method: 'PUT',
        json: { ...rest, ...Object.fromEntries(RATES.map(([k]) => [k, Number(form[k])])) },
      });
    },
    onSuccess: (d) => qc.setQueryData(['settings', 'firm'], d),
  });

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">Closing estimate</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Rates for the transfer-cost estimate on each completed sale. Consultants tell buyers to
        confirm them with the BIR and the city. Saved estimates keep the rates they used.
      </p>
      <Card className="mt-5">
        <CardHeader title="Tax rates" />
        <form
          className="space-y-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {RATES.map(([k, label, hint]) => (
              <Field key={k} label={label} htmlFor={k} hint={hint}>
                <div className="relative">
                  <input
                    id={k}
                    type="number"
                    step="any"
                    min={0}
                    required
                    className="input pr-8 tabular-nums"
                    value={form[k] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
                    %
                  </span>
                </div>
              </Field>
            ))}
          </div>
          <FormError error={save.error} />
          {save.isSuccess && <FormSuccess>Saved. New estimates use these rates.</FormSuccess>}
          <Button type="submit" disabled={save.isPending || !firm.data}>
            {save.isPending ? 'Saving…' : 'Save rates'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
