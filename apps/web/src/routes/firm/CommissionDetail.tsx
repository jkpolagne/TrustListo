import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Plus, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { errorText, Field, FormError } from '../../components/Form';
import { Avatar, Badge, Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useMe } from '../../lib/auth';
import { METHOD } from '../../lib/clients';
import {
  PAYEE_ROLE,
  STAGE,
  statusText,
  daysSince,
  statusTone,
  triggerText,
  useCommission,
  useVoucher,
  type CommissionDetail as Detail,
  type Signature,
  type Tranche,
  type Voucher,
} from '../../lib/commissions';
import { basePath } from '../../lib/paths';

type Me = NonNullable<ReturnType<typeof useMe>['data']>;

const peso = (v: string | number) => formatPeso(v);
const day = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
const stamp = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const ONE_PESO = 1;

export function CommissionDetail() {
  const { id = '' } = useParams();
  const { data: me } = useMe();
  const q = useCommission(id);
  if (!me || q.isPending) return null;
  const all = me.role === 'COMPANY_ADMIN' || me.role === 'BROKER';
  const base = basePath(me.role);
  const back = { to: `${base}/commissions`, label: all ? 'Commissions' : 'My commissions' };
  if (q.isError || !q.data) return <PageHeader title="Commission not found" back={back} />;
  const d = q.data;

  return (
    <>
      <PageHeader
        title={d.client?.fullName ?? 'Commission'}
        intro={`${d.client?.property?.title ?? 'Property'}. ${d.client ? METHOD[d.client.paymentMethod] : ''}.`}
        back={back}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ol className="min-w-0 space-y-6" aria-label="Tranches">
          {d.tranches.map((t) => (
            <li key={t.id}>
              <TrancheCard t={t} d={d} me={me} base={base} />
            </li>
          ))}
        </ol>
        <div className="space-y-6">
          <Split d={d} me={me} base={base} />
        </div>
      </div>
    </>
  );
}

/** Who shares this deal, as snapshotted at conversion (§10.2). */
function Split({ d, me, base }: { d: Detail; me: Me; base: string }) {
  return (
    <Card className="self-start">
      <CardHeader
        title="Commission"
        description={`${d.splitSnapshot.grossRatePct}% of the ${peso(d.client?.tcp ?? 0)} contract price.`}
      />
      <p className="text-3xl font-bold tabular-nums">{peso(d.grossAmount)}</p>
      <ul className="mt-5 space-y-3 border-t border-line pt-4">
        {d.people.map((p) => (
          <li key={p.userId} className="flex items-center gap-3">
            <Avatar first={p.user?.firstName ?? '?'} last={p.user?.lastName ?? ''} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Former team member'}
                {p.userId === me.id && <span className="font-normal text-muted"> (you)</span>}
              </p>
              <p className="text-xs text-muted">{PAYEE_ROLE[p.role]}</p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{p.pct}%</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        The split was saved when the deal was converted. Later changes to the firm&rsquo;s split
        don&rsquo;t affect it.
      </p>
      {d.client && (
        <Link
          to={`${base}/clients/${d.client.id}`}
          className="mt-4 inline-block text-sm font-semibold underline underline-offset-2"
        >
          Open the buyer&rsquo;s checklist
        </Link>
      )}
    </Card>
  );
}

// ───────────── One tranche: the two gates, then transmittal, voucher, release (§10.4) ─────────────

type Step = { label: string; detail?: string; done: boolean; verified?: boolean };

function stepsOf(t: Tranche): Step[] {
  const steps: Step[] = [
    {
      label: triggerText(t.trigger, t.triggerValue),
      detail: t.milestoneReachedAt ? day.format(new Date(t.milestoneReachedAt)) : undefined,
      done: !!t.milestoneReachedAt,
    },
    {
      label: t.status === 'BLOCKED' ? 'Documents missing' : 'Documents verified',
      detail: t.docsCompleteAt ? day.format(new Date(t.docsCompleteAt)) : 'By a broker',
      done: !!t.docsCompleteAt,
      verified: true,
    },
  ];
  if (t.requiresTransmittal)
    steps.push({
      label: 'Developer transmittal',
      detail: t.transmittalAmount ? peso(t.transmittalAmount) : undefined,
      done: t.transmittalAmount !== null,
    });
  steps.push(
    {
      label: 'Broker signs voucher',
      detail: t.voucher?.brokerSignedAt
        ? day.format(new Date(t.voucher.brokerSignedAt))
        : undefined,
      done: !!t.voucher?.brokerSignedAt,
      verified: true,
    },
    {
      label: 'Released',
      detail: t.voucher?.releasedAt ? day.format(new Date(t.voucher.releasedAt)) : undefined,
      done: t.status === 'RELEASED',
    },
  );
  return steps;
}

function Track({ t }: { t: Tranche }) {
  const steps = stepsOf(t);
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Progress">
      {steps.map((s, i) => {
        const isCurrent = i === current;
        const blocked = isCurrent && t.status === 'BLOCKED' && i === 1;
        const marker = s.done
          ? s.verified
            ? 'bg-gold text-ink'
            : 'bg-ink text-paper'
          : blocked
            ? 'bg-flag-pale text-flag ring-2 ring-flag'
            : isCurrent
              ? 'bg-paper text-ink ring-2 ring-ink'
              : 'bg-canvas text-muted';
        return (
          <li
            key={s.label}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex min-w-0 flex-1 gap-3 sm:flex-col sm:gap-2"
          >
            <div className="flex items-center">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${marker}`}
              >
                {s.done ? <Check aria-hidden className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={`ml-2 hidden h-0.5 flex-1 rounded-full sm:block ${s.done ? 'bg-ink' : 'bg-line'}`}
                />
              )}
            </div>
            <div className="min-w-0 sm:pr-3">
              <p
                className={`text-sm leading-snug font-semibold ${s.done || isCurrent ? '' : 'text-muted'} ${blocked ? 'text-flag' : ''}`}
              >
                {s.label}
                <span className="sr-only">{s.done ? ' (done)' : isCurrent ? ' (next)' : ''}</span>
              </p>
              {s.detail && <p className="text-xs text-muted">{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TrancheCard({ t, d, me, base }: { t: Tranche; d: Detail; me: Me; base: string }) {
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{t.label}</h2>
          <p className="text-2xl font-bold tabular-nums">{peso(t.amount)}</p>
        </div>
        <Badge tone={statusTone(t.status)}>{statusText(t)}</Badge>
      </div>
      <Track t={t} />
      <div className="mt-5 border-t border-line pt-5">
        <NextStep t={t} d={d} me={me} base={base} />
      </div>
    </Card>
  );
}

/** What happens next for this tranche, and the action for whoever takes it. */
function NextStep({ t, d, me, base }: { t: Tranche; d: Detail; me: Me; base: string }) {
  const stage = STAGE[t.requiredStage ?? 'FINANCING'];
  switch (t.status) {
    case 'WAITING':
      return (
        <p className="text-sm text-graphite">
          Moves once the buyer has {triggerText(t.trigger, t.triggerValue).toLowerCase()}
          {t.docsCompleteAt
            ? '. Their documents are already verified.'
            : ` and a broker has verified the ${stage}.`}
        </p>
      );
    case 'BLOCKED':
      return (
        <div className="text-sm">
          <p className="font-semibold text-flag">The buyer has paid, but documents are missing.</p>
          <p className="mt-1 text-graphite">
            It moves once a broker verifies or waives the {stage}.{' '}
            {d.client && (
              <Link
                to={`${base}/clients/${d.client.id}`}
                className="font-semibold text-ink underline underline-offset-2"
              >
                See what&rsquo;s missing
              </Link>
            )}
          </p>
        </div>
      );
    case 'AWAITING_TRANSMITTAL':
      return me.role === 'COMPANY_ADMIN' ? (
        <Transmittal t={t} d={d} />
      ) : (
        <p className="text-sm text-graphite">
          Waiting {daysSince(t.awaitingSince ?? new Date().toISOString())} days for the
          developer&rsquo;s transmittal. The company admin uploads it when it arrives.
        </p>
      );
    case 'READY_FOR_RELEASE':
    case 'RELEASED':
      // The deal page always sends the full voucher.
      if (t.voucher)
        return <VoucherSlip id={t.voucher.id} fallback={t.voucher as Voucher} d={d} me={me} />;
      return me.role === 'BROKER' ? (
        <Deductions d={d} trancheId={t.id} />
      ) : (
        <p className="text-sm text-graphite">Ready. The broker prepares and signs the voucher.</p>
      );
  }
}

// ───────────── Transmittal (CompanyAdmin) ─────────────

function Transmittal({ t, d }: { t: Tranche; d: Detail }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const doc = d.transmittals.find((x) => x.id === t.transmittalDocumentId) ?? null;
  const reading = !!doc && (doc.aiStatus === 'QUEUED' || doc.aiStatus === 'PROCESSING');
  const read = doc?.extracted?.amount ?? null;
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (doc && !reading) setAmount(read?.value ?? '');
  }, [doc?.id, reading, read?.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => qc.invalidateQueries({ queryKey: ['commissions'] });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api(`/tranches/${t.id}/transmittal`, { method: 'POST', body });
    },
    onSuccess: refresh,
  });
  const confirm = useMutation({
    mutationFn: () =>
      api(`/tranches/${t.id}/transmittal/confirm`, {
        json: { amount: Number(amount), ...(note.trim() ? { note: note.trim() } : {}) },
      }),
    onSuccess: refresh,
  });
  const open = useMutation({
    mutationFn: () => api<{ url: string }>(`/documents/${doc!.id}/url`),
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
  });
  const differs = amount !== '' && Math.abs(Number(amount) - Number(t.amount)) > ONE_PESO;
  const flags = (doc?.flags ?? []).filter((f) => f.severity !== 'INFO');

  const picker = (
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
        disabled={upload.isPending}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden className="size-4" />
        {upload.isPending ? 'Uploading…' : doc ? 'Replace file' : 'Upload transmittal'}
      </Button>
    </>
  );

  if (!doc)
    return (
      <div className="space-y-3">
        <p className="text-sm text-graphite">
          Waiting {daysSince(t.awaitingSince ?? new Date().toISOString())} days. Upload the
          developer&rsquo;s transmittal when it arrives; TrustListo reads its amount and checks it
          against {peso(t.amount)}.
        </p>
        {picker}
        {upload.error && <p className="text-sm text-flag">{errorText(upload.error)}</p>}
      </div>
    );

  if (reading) return <p className="text-sm text-graphite">Reading the transmittal…</p>;

  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        confirm.mutate();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-graphite">
          {read?.value
            ? `The transmittal reads ${peso(read.value)} (${read.confidence}% sure). The tranche is ${peso(t.amount)}.`
            : `The amount couldn't be read. Type it from the file. The tranche is ${peso(t.amount)}.`}
        </p>
        <Button type="button" variant="ghost" onClick={() => open.mutate()}>
          <ExternalLink aria-hidden className="size-4" />
          Open file
        </Button>
      </div>
      {flags.map((f) => (
        <p key={f.code} className="rounded-lg bg-flag-pale px-3 py-2 text-sm text-flag">
          {f.message}
        </p>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount on the transmittal (₱)" htmlFor={`amt-${t.id}`}>
          <input
            id={`amt-${t.id}`}
            className="input tabular-nums"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {differs && (
          <Field
            label="Why is it different?"
            htmlFor={`note-${t.id}`}
            hint="Needed when it differs by more than ₱1. Kept in the activity log."
          >
            <input
              id={`note-${t.id}`}
              className="input"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        )}
      </div>
      <FormError error={confirm.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={confirm.isPending}>
          {confirm.isPending ? 'Confirming…' : 'Confirm amount'}
        </Button>
        {picker}
      </div>
    </form>
  );
}

// ───────────── Voucher (Broker prepares; broker, then each payee, signs) ─────────────

type Extra = { userId: string; label: string; amount: string };
const WITHHOLDING = /^Withholding tax/;

/** Extra deduction lines on top of the firm's automatic withholding (OPEN-6). */
function Deductions({
  d,
  trancheId,
  voucher,
  onDone,
}: {
  d: Detail;
  trancheId: string;
  voucher?: Voucher;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const firm = useQuery({
    queryKey: ['settings', 'firm'],
    queryFn: () => api<{ withholdingPct: number }>('/settings/firm'),
  });
  const [rows, setRows] = useState<Extra[]>(
    () =>
      voucher?.lines.flatMap((l) =>
        l.deductions
          .filter((x) => !WITHHOLDING.test(x.label))
          .map((x) => ({ userId: l.userId, label: x.label, amount: String(x.amount) })),
      ) ?? [],
  );
  const save = useMutation({
    mutationFn: () => {
      const json = { deductions: rows.map((r) => ({ ...r, amount: Number(r.amount) })) };
      return voucher
        ? api(`/vouchers/${voucher.id}`, { method: 'PATCH', json })
        : api(`/tranches/${trancheId}/voucher`, { json });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      onDone?.();
    },
  });
  const set = (i: number, patch: Partial<Extra>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pct = firm.data?.withholdingPct;

  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <h3 className="text-sm font-bold">
          {voucher ? 'Change deductions' : 'Prepare the voucher'}
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          {pct
            ? `${pct}% withholding tax is taken from each share automatically. Add anything else here.`
            : 'Add any deductions from a share here.'}
          {voucher && ' Saving clears every signature, so everyone signs again.'}
        </p>
      </div>
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_8rem_auto]">
              <select
                aria-label="From whose share"
                className="input"
                value={r.userId}
                onChange={(e) => set(i, { userId: e.target.value })}
              >
                {d.people.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.user ? `${p.user.firstName} ${p.user.lastName}` : PAYEE_ROLE[p.role]}
                  </option>
                ))}
              </select>
              <input
                aria-label="What it's for"
                className="input"
                required
                minLength={2}
                placeholder="e.g. Cash advance"
                value={r.label}
                onChange={(e) => set(i, { label: e.target.value })}
              />
              <input
                aria-label="Amount (₱)"
                className="input tabular-nums"
                inputMode="decimal"
                required
                placeholder="₱"
                value={r.amount}
                onChange={(e) => set(i, { amount: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove this deduction"
                onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                className="grid size-10 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <FormError error={save.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : voucher ? 'Save deductions' : 'Prepare voucher'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setRows((x) => [...x, { userId: d.people.at(-1)?.userId ?? '', label: '', amount: '' }])
          }
        >
          <Plus aria-hidden className="size-4" />
          Add a deduction
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function VoucherSlip({
  id,
  fallback,
  d,
  me,
}: {
  id: string;
  fallback: Voucher;
  d: Detail;
  me: Me;
}) {
  const vq = useVoucher(id);
  const v = vq.data ?? fallback;
  const [editing, setEditing] = useState(false);
  const valid = (v.consultantSignatures ?? []).filter((s) => s.hash === v.contentHash);
  const broker =
    v.brokerSignature && v.brokerSignature.hash === v.contentHash ? v.brokerSignature : null;
  const payees = v.lines.filter((l) => l.role !== 'BROKER');
  const brokerLine = v.lines.find((l) => l.role === 'BROKER');
  const released = !!v.releasedAt;
  const tampered = vq.data?.intact === false;

  const mine = valid.some((s) => s.userId === me.id);
  const canSign =
    !released &&
    !tampered &&
    (me.role === 'BROKER'
      ? !v.brokerSignedAt
      : payees.some((p) => p.userId === me.id) && !!v.brokerSignedAt && !mine);

  if (editing)
    return (
      <Deductions d={d} trancheId={v.trancheId} voucher={v} onDone={() => setEditing(false)} />
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Voucher {v.voucherNo}</h3>
        <p className="text-xs text-muted">Prepared {day.format(new Date(v.createdAt))}</p>
      </div>
      {tampered && (
        <p role="alert" className="rounded-lg bg-flag-pale px-3 py-2.5 text-sm text-flag">
          This voucher changed after it was prepared, so it can&rsquo;t be signed. The broker needs
          to save its deductions again.
        </p>
      )}

      {/* Phones: one block per payee, so no amount is hidden off-screen. */}
      <ul className="divide-y divide-line border-y border-line sm:hidden">
        {v.lines.map((l) => (
          <li key={l.userId} className="py-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{l.name}</p>
              <p className="font-semibold tabular-nums">{peso(l.net)}</p>
            </div>
            <p className="text-xs text-muted">
              {PAYEE_ROLE[l.role] ?? l.role}, {l.pct}% share of {peso(l.grossShare)}
            </p>
            {l.deductions.map((x, i) => (
              <p key={i} className="mt-0.5 flex justify-between gap-3 text-xs text-graphite">
                <span>{x.label}</span>
                <span className="tabular-nums">−{peso(x.amount)}</span>
              </p>
            ))}
          </li>
        ))}
        <li className="flex justify-between gap-3 py-3 text-sm font-bold">
          <span>Total to pay out</span>
          <span className="tabular-nums">{peso(v.totalNet)}</span>
        </li>
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-120 text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Payee</th>
              <th className="py-2 pr-3 text-right font-medium">Share</th>
              <th className="py-2 pr-3 font-medium">Deductions</th>
              <th className="py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {v.lines.map((l) => (
              <tr key={l.userId} className="align-top">
                <td className="py-2.5 pr-3">
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-xs text-muted">
                    {PAYEE_ROLE[l.role] ?? l.role}, {l.pct}%
                  </p>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{peso(l.grossShare)}</td>
                <td className="py-2.5 pr-3">
                  {l.deductions.length === 0 ? (
                    <span className="text-muted">None</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {l.deductions.map((x, i) => (
                        <li key={i} className="flex justify-between gap-3 text-xs">
                          <span className="text-graphite">{x.label}</span>
                          <span className="tabular-nums">−{peso(x.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{peso(l.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink">
              <td colSpan={3} className="pt-2.5 font-bold">
                Total to pay out
              </td>
              <td className="pt-2.5 text-right font-bold tabular-nums">{peso(v.totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold">Signatures</h4>
        <ol className="divide-y divide-line rounded-xl border border-line">
          <SignatureRow
            name={brokerLine?.name ?? 'Broker'}
            role="Broker, signs first"
            sig={broker}
            verified
          />
          {payees.map((p) => (
            <SignatureRow
              key={p.userId}
              name={p.name}
              role={PAYEE_ROLE[p.role] ?? p.role}
              sig={valid.find((s) => s.userId === p.userId) ?? null}
              waiting={!broker ? 'After the broker' : undefined}
            />
          ))}
        </ol>
      </div>

      {released ? (
        <p className="text-sm text-graphite">
          Released {day.format(new Date(v.releasedAt!))}. The payout itself is made outside
          TrustListo; this voucher is the record.
        </p>
      ) : (
        <>
          {canSign && <SignForm voucherId={v.id} me={me} />}
          {me.role === 'BROKER' && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Change deductions
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function SignatureRow({
  name,
  role,
  sig,
  verified,
  waiting,
}: {
  name: string;
  role: string;
  sig: Signature | null;
  verified?: boolean;
  waiting?: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted">{role}</p>
      </div>
      {sig ? (
        <div className="text-right">
          {verified ? <Badge tone="verified">Signed</Badge> : <Badge>Signed</Badge>}
          <p className="mt-1 text-xs text-muted">
            &ldquo;{sig.typedName}&rdquo;, {stamp.format(new Date(sig.signedAt))}
          </p>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted">{waiting ?? 'Not signed yet'}</p>
      )}
    </li>
  );
}

/** Simple electronic signature (§10.5): the signed-in person types their full name. */
function SignForm({ voucherId, me }: { voucherId: string; me: Me }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const full = `${me.firstName} ${me.lastName}`;
  const sign = useMutation({
    mutationFn: () => api(`/vouchers/${voucherId}/sign`, { json: { typedName: name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
  return (
    <form
      className="space-y-3 rounded-xl bg-canvas p-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        sign.mutate();
      }}
    >
      <Field
        label="Type your full name to sign"
        htmlFor={`sign-${voucherId}`}
        hint={`As “${full}”. Signing records your name, the time, your device and a fingerprint of this voucher. Any later change clears it.`}
      >
        <input
          id={`sign-${voucherId}`}
          className="input"
          autoComplete="off"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <FormError error={sign.error} />
      <Button type="submit" disabled={sign.isPending}>
        {sign.isPending ? 'Signing…' : 'Sign voucher'}
      </Button>
    </form>
  );
}
