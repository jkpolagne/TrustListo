import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPeso, type Role } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { errorText, Field, FormError, PrimaryButton } from '../../components/Form';
import { Badge, Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useMe } from '../../lib/auth';
import {
  EMPLOYMENT,
  ITEM_STATUS,
  METHOD,
  PAYMENT_KIND,
  needsEmployment,
  useClient,
  type ClientDetail as Detail,
  type ClientPayment,
  type EmploymentType,
  type PaymentKind,
  type PaymentMethod,
  type RequirementItem,
} from '../../lib/clients';
import { CIVIL_STATUS } from '../../lib/leads';
import { basePath } from '../../lib/paths';
import { aiSummary } from '../../lib/reviews';
import { useClosing } from '../../lib/closing';
import { useCommissions } from '../../lib/commissions';
import { ClosingCard } from './ClientClosing';

const peso = (v: string | number) => formatPeso(v).replace(/\.00$/, '');
const day = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
const WHOSE = { BUYER: '', SPOUSE: 'Spouse', REPRESENTATIVE: 'Representative' } as const;

export function ClientDetail() {
  const { id = '' } = useParams();
  const { data: me } = useMe();
  const q = useClient(id);
  if (!me || q.isPending) return null;
  const back = { to: `${basePath(me.role)}/clients`, label: 'Clients' };
  if (q.isError || !q.data) return <PageHeader title="Client not found" back={back} />;
  const c = q.data;
  const confirmed = c.payments.filter((p) => p.confirmed).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader
        title={c.fullName}
        intro={`${c.property?.title ?? 'Property'}. Reserved ${day.format(new Date(c.reservationPaidAt))}.`}
        back={back}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <Checklist c={c} role={me.role} />
          <ClosingCard clientId={c.id} buyer={{ fullName: c.fullName, email: c.email }} />
        </div>
        <div className="space-y-6">
          <ClientNextStep c={c} base={basePath(me.role)} />
          <Card>
            <dl className="grid grid-cols-[8.5rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Contract price</dt>
              <dd className="font-semibold tabular-nums">{peso(c.tcp)}</dd>
              <dt className="text-muted">Paid so far</dt>
              <dd className="font-semibold tabular-nums">{peso(confirmed)}</dd>
              <dt className="text-muted">Pays by</dt>
              <dd className="font-medium">{METHOD[c.paymentMethod]}</dd>
              <dt className="text-muted">Civil status</dt>
              <dd className="font-medium">{CIVIL_STATUS[c.civilStatus]}</dd>
              {c.employmentType && (
                <>
                  <dt className="text-muted">Employment</dt>
                  <dd className="font-medium">{EMPLOYMENT[c.employmentType]}</dd>
                </>
              )}
              <dt className="text-muted">Mobile</dt>
              <dd>
                <a href={`tel:${c.phone}`} className="font-medium underline underline-offset-2">
                  {c.phone}
                </a>
              </dd>
              {c.consultant && c.consultant.id !== me.id && (
                <>
                  <dt className="text-muted">Handled by</dt>
                  <dd className="font-medium">
                    {c.consultant.firstName} {c.consultant.lastName}
                  </dd>
                </>
              )}
            </dl>
          </Card>
          <Payments c={c} />
          {c.isMine && (c.status === 'ACTIVE' || c.status === 'CLOSING') && <BuyingDetails c={c} />}
        </div>
      </div>
    </>
  );
}

/**
 * Where this sale is and what comes next (§9–§11): documents → payments and commission →
 * closing → rating. Links to the deal's commission, which this page otherwise doesn't show.
 */
function ClientNextStep({ c, base }: { c: Detail; base: string }) {
  const commissions = useCommissions();
  const closing = useClosing(c.id);
  const deal = commissions.data?.data.find((x) => x.clientId === c.id);
  const required = c.requirements.filter((r) => r.required);
  const missing = required.filter((r) => r.status === 'MISSING' || r.status === 'NEEDS_ATTENTION');
  const withBroker = required.filter((r) => r.status === 'UPLOADED');
  const stepsLeft = closing.data?.checklist.filter((i) => !i.done).length ?? 7;
  const first = c.fullName.split(' ')[0];

  let title: string;
  let body: string;
  if (c.status === 'COMPLETED') {
    title = 'Sale completed';
    body = closing.data?.rating
      ? `${first} rated this sale ${closing.data.rating.stars} of 5.`
      : `Send ${first} the rating link below so other buyers can see how you did.`;
  } else if (c.status === 'CLOSING') {
    title = 'Finish the transfer';
    body = `${stepsLeft} of 7 transfer steps left. Tick each one as it happens; the last completes the sale.`;
  } else if (missing.length) {
    title = c.isMine
      ? `Upload ${missing.length} document${missing.length === 1 ? '' : 's'}`
      : `${missing.length} document${missing.length === 1 ? '' : 's'} missing`;
    body = `Commissions are released only after a broker verifies the buyer's documents.${
      withBroker.length ? ` ${withBroker.length} more already with the broker.` : ''
    }`;
  } else if (withBroker.length) {
    title = 'Documents are with the broker';
    body = `${withBroker.length} waiting for verification. Nothing to do until the broker reviews them.`;
  } else {
    title = 'Record payments as they come in';
    body = `Upload each receipt below. When the property is ready to transfer, start the closing steps.`;
  }

  return (
    <section aria-labelledby="client-next" className="rounded-2xl bg-ink p-5 text-paper sm:p-6">
      <p className="text-sm font-medium text-paper/70">Next step</p>
      <h2 id="client-next" className="mt-1 text-lg leading-snug font-bold">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-paper/80">{body}</p>
      {deal && (
        <Link
          to={`${base}/commissions/${deal.id}`}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Open the commission
        </Link>
      )}
    </section>
  );
}

function ItemBadge({ item }: { item: RequirementItem }) {
  const tone =
    item.status === 'VERIFIED'
      ? 'verified'
      : item.status === 'NEEDS_ATTENTION'
        ? 'danger'
        : item.status === 'MISSING'
          ? 'neutral'
          : 'info';
  const reading =
    item.document &&
    (item.document.aiStatus === 'QUEUED' || item.document.aiStatus === 'PROCESSING');
  return <Badge tone={tone}>{reading ? 'Being read' : ITEM_STATUS[item.status]}</Badge>;
}

/** The buyer's requirements (SPEC §9), by stage. A broker verifies each upload (OPEN-3). */
function Checklist({ c, role }: { c: Detail; role: Role }) {
  const required = c.requirements.filter((r) => r.required);
  const extra = c.requirements.filter((r) => !r.required);
  const done = required.filter((r) => r.status === 'VERIFIED' || r.status === 'WAIVED').length;
  const stages = [
    ['RESERVATION', 'At reservation'],
    ['FINANCING', 'For financing'],
  ] as const;

  return (
    <Card>
      <CardHeader
        title="Requirements"
        description={`${done} of ${required.length} verified or waived. Only verified documents count toward releasing commissions.`}
      />
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        <div
          className="h-full rounded-full bg-gold"
          style={{ width: `${required.length ? (100 * done) / required.length : 0}%` }}
        />
      </div>
      {stages.map(([stage, title]) => {
        const items = required.filter((r) => r.stage === stage);
        if (!items.length) return null;
        return (
          <section key={stage} className="mb-6 last:mb-0">
            <h3 className="mb-2 text-sm font-bold">{title}</h3>
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <Item key={item.id} item={item} c={c} role={role} />
              ))}
            </ul>
          </section>
        );
      })}
      {extra.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-muted">No longer required</h3>
          <ul className="divide-y divide-line">
            {extra.map((item) => (
              <Item key={item.id} item={item} c={c} role={role} />
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

function Item({ item, c, role }: { item: RequirementItem; c: Detail; role: Role }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [waiving, setWaiving] = useState(false);
  const [reason, setReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['clients'] });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api(`/requirements/${item.id}/documents`, { method: 'POST', body });
    },
    onSuccess: refresh,
  });
  const waive = useMutation({
    mutationFn: () => api(`/requirements/${item.id}/waive`, { json: { reason } }),
    onSuccess: () => {
      setWaiving(false);
      refresh();
    },
  });
  const open = useMutation({
    mutationFn: () => api<{ url: string }>(`/documents/${item.documentId}/url`),
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
  });
  const final = item.status === 'VERIFIED' || item.status === 'WAIVED';
  const summary = item.document ? aiSummary(item.document) : null;
  const whose = WHOSE[item.appliesTo];

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {whose && <span className="text-muted">{whose}: </span>}
            {item.label.replace(/^(Spouse|Representative) /, '')}
          </p>
          {item.status === 'NEEDS_ATTENTION' && summary && (
            <p className="mt-0.5 text-xs text-flag">{summary.text}</p>
          )}
          {upload.error && <p className="mt-0.5 text-xs text-flag">{errorText(upload.error)}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <ItemBadge item={item} />
          {item.documentId && (
            <button
              type="button"
              aria-label="Open file"
              onClick={() => open.mutate()}
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
            >
              <ExternalLink aria-hidden className="size-4" />
            </button>
          )}
          {item.documentId && role === 'BROKER' && !final && (
            <Link
              to={`/broker/reviews/documents/${item.documentId}`}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold underline"
            >
              Review
            </Link>
          )}
          {c.isMine && !final && (
            <>
              <input
                ref={input}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = '';
                }}
              />
              <Button
                variant="secondary"
                className="px-2.5 py-1.5 text-xs"
                disabled={upload.isPending}
                onClick={() => input.current?.click()}
              >
                <Upload aria-hidden className="size-3.5" />
                {upload.isPending ? 'Uploading…' : item.documentId ? 'Replace' : 'Upload'}
              </Button>
            </>
          )}
          {role === 'BROKER' && !final && !waiving && (
            <Button
              variant="ghost"
              className="px-2.5 py-1.5 text-xs"
              onClick={() => setWaiving(true)}
            >
              Waive
            </Button>
          )}
        </div>
      </div>
      {waiving && (
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            waive.mutate();
          }}
        >
          <input
            aria-label="Why waive this document?"
            className="input min-w-0 flex-1"
            required
            placeholder="Why isn't it needed for this buyer?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" disabled={waive.isPending}>
            Waive
          </Button>
          <Button type="button" variant="ghost" onClick={() => setWaiving(false)}>
            Cancel
          </Button>
        </form>
      )}
    </li>
  );
}

/** Payments (SPEC §8.3): the receipt's amount is read, then confirmed by the consultant. */
function Payments({ c }: { c: Detail }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<PaymentKind>('DOWNPAYMENT');
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('kind', kind);
      body.append('file', file);
      return api(`/clients/${c.id}/payments`, { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
  return (
    <Card>
      <CardHeader title="Payments" description="A payment counts once its amount is confirmed." />
      <ul className="divide-y divide-line">
        {c.payments.map((p) => (
          <PaymentRow key={p.id} p={p} mine={c.isMine} />
        ))}
      </ul>
      {c.isMine && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <select
            aria-label="Kind of payment"
            className="input w-auto flex-1"
            value={kind}
            onChange={(e) => setKind(e.target.value as PaymentKind)}
          >
            {(Object.keys(PAYMENT_KIND) as PaymentKind[])
              .filter((k) => k !== 'RESERVATION')
              .map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_KIND[k]}
                </option>
              ))}
          </select>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            <Upload aria-hidden className="size-4" />
            {upload.isPending ? 'Uploading…' : 'Upload receipt'}
          </Button>
          {upload.error && <p className="w-full text-sm text-flag">{errorText(upload.error)}</p>}
        </div>
      )}
    </Card>
  );
}

function PaymentRow({ p, mine }: { p: ClientPayment; mine: boolean }) {
  const qc = useQueryClient();
  const reading =
    p.document && (p.document.aiStatus === 'QUEUED' || p.document.aiStatus === 'PROCESSING');
  const ai = p.document?.extracted?.amount;
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');
  // Pre-fill from what the AI read, once it's read.
  useEffect(() => {
    if (reading || p.confirmed) return;
    setAmount((a) => a || (ai?.value ?? ''));
    setPaidAt(
      (d) =>
        d || (p.document?.extracted?.paymentDate?.value ?? new Date().toISOString().slice(0, 10)),
    );
  }, [reading, p.confirmed, ai?.value, p.document?.extracted?.paymentDate?.value]);
  const confirm = useMutation({
    mutationFn: () =>
      api(`/payments/${p.id}/confirm`, { json: { amount: Number(amount), paidAt } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
  const blocked = (p.document?.flags ?? []).filter((f) => f.severity === 'BLOCKER');

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{PAYMENT_KIND[p.kind]}</p>
        {p.confirmed ? (
          <p className="text-sm font-semibold tabular-nums">{peso(p.amount)}</p>
        ) : (
          <Badge tone={blocked.length ? 'danger' : 'info'}>
            {reading ? 'Being read' : blocked.length ? 'Flagged' : 'Confirm amount'}
          </Badge>
        )}
      </div>
      {p.confirmed && <p className="text-xs text-muted">Paid {day.format(new Date(p.paidAt))}</p>}
      {!p.confirmed &&
        !reading &&
        blocked.map((f, i) => (
          <p key={i} className="mt-1 text-xs text-flag">
            {f.message}
          </p>
        ))}
      {!p.confirmed && !reading && mine && !blocked.length && (
        <form
          className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            confirm.mutate();
          }}
        >
          <input
            aria-label="Amount (₱)"
            className="input"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            aria-label="Date paid"
            type="date"
            className="input"
            required
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
          <Button type="submit" disabled={confirm.isPending}>
            Confirm
          </Button>
          <p className="col-span-3 text-xs text-muted">
            {ai?.value
              ? `Read from the receipt (${ai.confidence}% sure). Check it before confirming.`
              : "Couldn't read the amount; type it from the receipt."}
          </p>
          {confirm.error && (
            <p className="col-span-3 text-xs text-flag">{errorText(confirm.error)}</p>
          )}
        </form>
      )}
    </li>
  );
}

/** Changing how the buyer pays or their civil status rebuilds the checklist (§9). */
function BuyingDetails({ c }: { c: Detail }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    paymentMethod: c.paymentMethod as PaymentMethod,
    civilStatus: c.civilStatus,
    employmentType: (c.employmentType ?? '') as EmploymentType | '',
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/clients/${c.id}`, {
        method: 'PATCH',
        json: { ...form, employmentType: form.employmentType || null },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
  const changed =
    form.paymentMethod !== c.paymentMethod ||
    form.civilStatus !== c.civilStatus ||
    (form.employmentType || null) !== c.employmentType;
  return (
    <Card>
      <CardHeader
        title="Buying details"
        description="Changing these updates the checklist. Uploaded documents are kept."
      />
      <form
        className="space-y-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Pays by" htmlFor="b-method">
          <select
            id="b-method"
            className="input"
            value={form.paymentMethod}
            onChange={(e) =>
              setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))
            }
          >
            {(Object.keys(METHOD) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Civil status" htmlFor="b-civil">
          <select
            id="b-civil"
            className="input"
            value={form.civilStatus}
            onChange={(e) =>
              setForm((f) => ({ ...f, civilStatus: e.target.value as Detail['civilStatus'] }))
            }
          >
            {Object.entries(CIVIL_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {needsEmployment(form.paymentMethod) && (
          <Field label="Employment" htmlFor="b-emp">
            <select
              id="b-emp"
              className="input"
              required
              value={form.employmentType}
              onChange={(e) =>
                setForm((f) => ({ ...f, employmentType: e.target.value as EmploymentType }))
              }
            >
              <option value="">Choose…</option>
              {(Object.keys(EMPLOYMENT) as EmploymentType[]).map((m) => (
                <option key={m} value={m}>
                  {EMPLOYMENT[m]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <FormError error={save.error} />
        <PrimaryButton pending={save.isPending || !changed}>
          Save and update checklist
        </PrimaryButton>
      </form>
    </Card>
  );
}
