import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { Check, Copy, Mail } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { formatPeso } from '@trustlisto/shared';
import { Field, FormError } from '../../components/Form';
import { Badge, Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { PAID_BY, ratingLink, useClosing, type Closing, type ClosingItem } from '../../lib/closing';

const day = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

/** Closing & transfer (SPEC §11): the tax estimate and the consultant's checklist. */
export function ClosingCard({
  clientId,
  buyer,
}: {
  clientId: string;
  buyer: { fullName: string; email: string | null };
}) {
  const q = useClosing(clientId);
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (json: Record<string, unknown>) =>
      api<Closing>(`/clients/${clientId}/closing`, { method: 'PUT', json }),
    onSuccess: (d) => {
      qc.setQueryData(['closing', clientId], d);
      qc.invalidateQueries({ queryKey: ['clients'] });
      if (d.ratingToken) setToken(d.ratingToken);
    },
  });
  if (!q.data) return null;
  const c = q.data;

  return (
    <>
      <Card>
        <CardHeader
          title="Closing and transfer"
          description="An estimate to check with the BIR and the city treasurer before anyone pays."
          action={
            c.clientStatus === 'COMPLETED' ? (
              <Badge>Completed</Badge>
            ) : c.clientStatus === 'CLOSING' ? (
              <Badge tone="info">In closing</Badge>
            ) : undefined
          }
        />
        <Estimate c={c} />
        {c.canEdit && <EstimateForm c={c} save={save} />}
        <Checklist c={c} save={save} />
      </Card>
      {c.clientStatus === 'COMPLETED' && (
        <RatingCard clientId={clientId} c={c} token={token} setToken={setToken} buyer={buyer} />
      )}
    </>
  );
}

type Save = UseMutationResult<Closing, Error, Record<string, unknown>>;

function Estimate({ c }: { c: Closing }) {
  const k = c.computation;
  return (
    <div>
      <table className="w-full text-sm">
        <caption className="sr-only">Estimated closing costs</caption>
        <tbody className="divide-y divide-line">
          {k.lines.map((l) => (
            <tr key={l.code}>
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                {l.label}
                <span className="block text-xs font-normal text-muted">
                  {l.ratePct === null
                    ? 'Registry of Deeds schedule'
                    : `${l.ratePct}% of the tax base`}
                  , {PAID_BY[l.paidBy].toLowerCase()} usually pays
                </span>
              </th>
              <td className="py-2 text-right tabular-nums">{formatPeso(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink">
            <th scope="row" className="pt-2.5 text-left font-bold">
              Buyer pays about
            </th>
            <td className="pt-2.5 text-right font-bold tabular-nums">
              {formatPeso(k.totals.BUYER)}
            </td>
          </tr>
          <tr>
            <th scope="row" className="pt-1 text-left font-bold">
              Seller pays about
            </th>
            <td className="pt-1 text-right font-bold tabular-nums">
              {formatPeso(k.totals.SELLER)}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {k.taxBaseOverride
          ? `Taxes use a tax base of ${formatPeso(k.taxBase)} entered by the consultant, not the ${formatPeso(k.sellingPrice)} selling price.`
          : `Taxes use the ${formatPeso(k.sellingPrice)} selling price. The BIR uses the zonal or assessed value instead when it's higher.`}
      </p>
    </div>
  );
}

function EstimateForm({ c, save }: { c: Closing; save: Save }) {
  const k = c.computation;
  const [form, setForm] = useState({ sellingPrice: '', taxBase: '', registrationFee: '' });
  useEffect(() => {
    setForm({
      sellingPrice: String(k.sellingPrice),
      taxBase: k.taxBaseOverride ? String(k.taxBase) : '',
      registrationFee: k.registrationFee === null ? '' : String(k.registrationFee),
    });
  }, [k.sellingPrice, k.taxBase, k.taxBaseOverride, k.registrationFee]);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  return (
    <form
      className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate({
          sellingPrice: Number(form.sellingPrice),
          taxBase: num(form.taxBase),
          registrationFee: num(form.registrationFee),
        });
      }}
    >
      <Field label="Selling price (₱)" htmlFor="cl-price">
        <input
          id="cl-price"
          className="input tabular-nums"
          inputMode="decimal"
          required
          value={form.sellingPrice}
          onChange={set('sellingPrice')}
        />
      </Field>
      <Field
        label="Tax base (₱)"
        htmlFor="cl-base"
        hint="If the zonal or assessed value is higher."
      >
        <input
          id="cl-base"
          className="input tabular-nums"
          inputMode="decimal"
          placeholder="Same as price"
          value={form.taxBase}
          onChange={set('taxBase')}
        />
      </Field>
      <Field label="Registration fee (₱)" htmlFor="cl-fee" hint="From the Registry of Deeds.">
        <input
          id="cl-fee"
          className="input tabular-nums"
          inputMode="decimal"
          placeholder="Not known yet"
          value={form.registrationFee}
          onChange={set('registrationFee')}
        />
      </Field>
      <div className="sm:col-span-3">
        <FormError error={save.error} />
        <Button type="submit" variant="secondary" disabled={save.isPending} className="mt-1">
          {save.isPending ? 'Saving…' : 'Save estimate'}
        </Button>
      </div>
    </form>
  );
}

function Checklist({ c, save }: { c: Closing; save: Save }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const done = c.checklist.filter((i) => i.done).length;
  const left = c.checklist.length - done;

  function toggle(item: ClosingItem) {
    if (!item.done && left === 1) {
      setConfirming(item.code); // the last tick completes the sale (OPEN-9)
      return;
    }
    save.mutate({ items: [{ code: item.code, done: !item.done }] });
  }

  return (
    <section className="mt-6 border-t border-line pt-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Transfer steps</h3>
        <p className="text-xs font-semibold text-muted tabular-nums">
          {done} of {c.checklist.length} done
        </p>
      </div>
      <ul className="divide-y divide-line">
        {c.checklist.map((item) => (
          <li key={item.code} className="py-2.5">
            <label
              className={`flex items-start gap-3 ${c.canEdit ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-ink"
                checked={item.done || confirming === item.code}
                disabled={!c.canEdit || save.isPending}
                onChange={() => toggle(item)}
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${item.done ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
                {item.done && item.doneAt && (
                  <span className="block text-xs text-muted">
                    {item.doneBy ?? 'Done'}, {day.format(new Date(item.doneAt))}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {confirming && (
        <div
          role="alertdialog"
          aria-labelledby="complete-title"
          className="mt-3 rounded-xl bg-canvas p-4"
        >
          <p id="complete-title" className="text-sm font-semibold">
            This is the last step. Mark the sale completed?
          </p>
          <p className="mt-1 text-sm text-graphite">
            The closing record becomes final and the buyer&rsquo;s rating link is created.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate(
                  { items: [{ code: confirming, done: true }] },
                  { onSettled: () => setConfirming(null) },
                )
              }
            >
              {save.isPending ? 'Completing…' : 'Complete the sale'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Not yet
            </Button>
          </div>
        </div>
      )}
      {save.error && !confirming && (
        <p role="alert" className="mt-2 text-sm text-flag">
          {save.error.message}
        </p>
      )}
    </section>
  );
}

/** The buyer's one-time rating link (§12). The full link is shown once; it can be re-issued. */
function RatingCard({
  clientId,
  c,
  token,
  setToken,
  buyer,
}: {
  clientId: string;
  c: Closing;
  token: string | null;
  setToken: (t: string) => void;
  buyer: { fullName: string; email: string | null };
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const issue = useMutation({
    mutationFn: () =>
      api<{ ratingToken: string }>(`/clients/${clientId}/rating-link`, { method: 'POST' }),
    onSuccess: (d) => {
      setToken(d.ratingToken);
      qc.invalidateQueries({ queryKey: ['closing', clientId] });
    },
  });
  const link = token ? ratingLink(token) : null;
  const first = buyer.fullName.split(' ')[0];
  const mail = link
    ? `mailto:${buyer.email ?? ''}?subject=${encodeURIComponent('How did we do?')}&body=${encodeURIComponent(
        `Hi ${first},\n\nCongratulations on your new home. Could you rate how we did? It takes a minute:\n\n${link}\n\nThank you.`,
      )}`
    : null;

  return (
    <Card>
      <CardHeader
        title="Buyer's rating"
        description="Send the buyer a one-time link. It works once and expires after 30 days."
      />
      {c.rating ? (
        <p className="text-sm">
          <span className="font-bold">Rated {c.rating.stars} of 5</span>{' '}
          <span className="text-muted">on {day.format(new Date(c.rating.createdAt))}.</span>
        </p>
      ) : link ? (
        <div className="space-y-3">
          <p className="text-sm text-graphite">
            Copy this link now. For the buyer&rsquo;s privacy it isn&rsquo;t stored, so it
            can&rsquo;t be shown again.
          </p>
          <input
            readOnly
            aria-label="Rating link"
            className="input text-xs"
            value={link}
            onFocus={(e) => e.target.select()}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              {copied ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Copy aria-hidden className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <a
              href={mail!}
              className="inline-flex items-center gap-2 rounded-lg border border-rule px-4 py-2.5 text-sm font-semibold hover:bg-canvas"
            >
              <Mail aria-hidden className="size-4" />
              {buyer.email ? 'Email it' : 'Write an email'}
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-graphite">
            {c.ratingLink && new Date(c.ratingLink.expiresAt) > new Date()
              ? `A link was created and works until ${day.format(new Date(c.ratingLink.expiresAt))}. If the buyer lost it, create a new one; the old link stops working.`
              : 'The last link has expired. Create a new one to send.'}
          </p>
          {c.canIssueLink && (
            <Button variant="secondary" disabled={issue.isPending} onClick={() => issue.mutate()}>
              {issue.isPending ? 'Creating…' : 'Create a new link'}
            </Button>
          )}
          <FormError error={issue.error} />
        </div>
      )}
    </Card>
  );
}
