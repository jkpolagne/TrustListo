import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Badge, Card, CardHeader, EmptyState, StatCard } from '../../components/ui';
import { useMe } from '../../lib/auth';
import {
  BUCKETS,
  STATUS,
  STATUS_ORDER,
  daysSince,
  shareOf,
  statusText,
  statusTone,
  useCommissions,
  type CommissionRow,
  type Tranche,
  type TrancheStatus,
} from '../../lib/commissions';
import { basePath } from '../../lib/paths';

const peso = (v: string | number) => formatPeso(v).replace(/\.00$/, '');

type Row = { c: CommissionRow; t: Tranche; amount: number };

/** List order: what someone can act on first, released last. */
const PRIORITY: TrancheStatus[] = [
  'READY_FOR_RELEASE',
  'AWAITING_TRANSMITTAL',
  'BLOCKED',
  'WAITING',
  'RELEASED',
];

/**
 * Commissions (SPEC §10.6). Admin and broker see every deal, with the transmittal aging the
 * broker follows up on; consultants see the tranches they're paid from, at their own share.
 */
export function Commissions() {
  const { data: me } = useMe();
  const q = useCommissions();
  const [filter, setFilter] = useState<TrancheStatus | 'ALL'>('ALL');
  if (!me) return null;
  const all = me.role === 'COMPANY_ADMIN' || me.role === 'BROKER';
  const base = basePath(me.role);

  const rows: Row[] = (q.data?.data ?? []).flatMap((c) =>
    c.tranches.map((t) => ({
      c,
      t,
      amount: all ? Number(t.amount) : shareOf(t.amount, c.splitSnapshot.people, me.id),
    })),
  );
  const sum = (s: TrancheStatus[]) =>
    rows.filter((r) => s.includes(r.t.status)).reduce((x, r) => x + r.amount, 0);
  const count = (s: TrancheStatus) => rows.filter((r) => r.t.status === s).length;
  const unvouchered = rows.filter((r) => r.t.status === 'READY_FOR_RELEASE' && !r.t.voucher);
  const signing = count('READY_FOR_RELEASE') - unvouchered.length;
  const shown = rows
    .filter((r) => filter === 'ALL' || r.t.status === filter)
    .sort(
      (a, b) =>
        PRIORITY.indexOf(a.t.status) - PRIORITY.indexOf(b.t.status) ||
        (a.c.client?.fullName ?? '').localeCompare(b.c.client?.fullName ?? '') ||
        a.t.sequence - b.t.sequence,
    );

  return (
    <>
      <PageHeader
        title={all ? 'Commissions' : 'My commissions'}
        intro={
          all
            ? 'Every tranche moves once the buyer has paid and a broker has verified their documents. Payouts happen outside TrustListo; a signed voucher records them.'
            : 'Your share of each deal, before withholding tax. A tranche is released once the broker and every payee sign its voucher.'
        }
      />

      {q.isPending ? null : rows.length === 0 ? (
        <Card>
          <EmptyState>
            {all
              ? 'No commissions yet. One is created when a lead is converted to a client.'
              : 'No commissions yet. They appear when one of your leads becomes a client.'}
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {all ? (
              <>
                <StatCard
                  label="Ready for a voucher"
                  value={unvouchered.length}
                  hint={
                    signing
                      ? `${signing} more waiting for signatures`
                      : peso(unvouchered.reduce((x, r) => x + r.amount, 0))
                  }
                />
                <StatCard
                  label="Waiting for transmittal"
                  value={count('AWAITING_TRANSMITTAL')}
                  hint={peso(sum(['AWAITING_TRANSMITTAL']))}
                />
                <StatCard
                  label="Documents missing"
                  value={count('BLOCKED')}
                  tone={count('BLOCKED') ? 'danger' : undefined}
                  hint="Paid, but not yet verified"
                />
                <StatCard
                  label="Expected payouts"
                  value={peso(sum(STATUS_ORDER.filter((s) => s !== 'RELEASED')))}
                  hint={`${peso(sum(['RELEASED']))} released so far`}
                />
              </>
            ) : (
              <>
                <StatCard label="Released to you" value={peso(sum(['RELEASED']))} />
                <StatCard
                  label="Ready or nearly ready"
                  value={peso(sum(['READY_FOR_RELEASE', 'AWAITING_TRANSMITTAL']))}
                />
                <StatCard
                  label="Held by missing documents"
                  value={peso(sum(['BLOCKED']))}
                  tone={count('BLOCKED') ? 'danger' : undefined}
                />
                <StatCard label="Waiting for payment" value={peso(sum(['WAITING']))} />
              </>
            )}
          </div>

          {all && <Aging rows={rows} base={base} />}

          <Card className="mt-6" padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3 sm:px-6">
              <h2 className="text-base font-bold">Tranches</h2>
              <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
                {(['ALL', ...STATUS_ORDER] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={filter === s}
                    onClick={() => setFilter(s)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      filter === s ? 'bg-ink text-paper' : 'bg-canvas text-graphite hover:text-ink'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : STATUS[s]}
                    <span className="ml-1 tabular-nums opacity-70">
                      {s === 'ALL' ? rows.length : count(s)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {shown.length === 0 ? (
              <div className="px-5 pb-5 sm:px-6">
                <EmptyState>No tranches with this status.</EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {shown.map(({ c, t, amount }) => (
                  <li key={t.id}>
                    <Link
                      to={`${base}/commissions/${c.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {c.client?.fullName ?? 'Client'}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {t.label}, {c.client?.property?.title ?? 'property'}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums sm:hidden">
                          {peso(amount)}
                        </p>
                      </div>
                      <p className="hidden text-sm font-semibold tabular-nums sm:block">
                        {peso(amount)}
                      </p>
                      <Badge tone={statusTone(t.status)}>{statusText(t)}</Badge>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/** Tranches waiting for the developer's transmittal, by age (§10.6). The oldest need a follow-up. */
function Aging({ rows, base }: { rows: Row[]; base: string }) {
  const waiting = rows
    .filter((r) => r.t.status === 'AWAITING_TRANSMITTAL' && r.t.awaitingSince)
    .map((r) => ({ ...r, days: daysSince(r.t.awaitingSince!) }))
    .sort((a, b) => b.days - a.days);
  const bucketOf = (d: number) => (d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3);
  const counts = BUCKETS.map((_, i) => waiting.filter((w) => bucketOf(w.days) === i).length);

  return (
    <Card className="mt-6">
      <CardHeader
        title="Waiting for the developer's transmittal"
        description={
          waiting.length
            ? 'Days since the buyer paid and the documents were verified. Follow up with the developer on the oldest.'
            : undefined
        }
      />
      {waiting.length === 0 ? (
        <EmptyState>Nothing is waiting for a transmittal.</EmptyState>
      ) : (
        <dl className="grid grid-cols-4 overflow-hidden rounded-xl border border-line">
          {BUCKETS.map((b, i) => (
            <div
              key={b}
              className={`border-line px-3 py-3 sm:px-4 ${i ? 'border-l' : ''} ${
                i === 3 && counts[i] ? 'bg-flag-pale' : ''
              }`}
            >
              <dt className="text-xs font-medium text-muted">{b} days</dt>
              <dd
                className={`mt-1 text-2xl font-bold tabular-nums ${i === 3 && counts[i] ? 'text-flag' : ''}`}
              >
                {counts[i]}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {waiting.length > 0 && (
        <ul className="-mx-2 mt-4 divide-y divide-line">
          {waiting.slice(0, 6).map((w) => (
            <li key={w.t.id}>
              <Link
                to={`${base}/commissions/${w.c.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-canvas"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{w.c.client?.fullName}</p>
                  <p className="truncate text-xs text-muted">
                    {w.t.label}, {w.c.client?.property?.title}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${w.days > 90 ? 'text-flag' : 'text-graphite'}`}
                >
                  {w.days} {w.days === 1 ? 'day' : 'days'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
