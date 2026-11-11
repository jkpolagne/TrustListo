import { useState } from 'react';
import { formatPeso, ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Card, CardHeader, EmptyState, StatCard } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { METHOD, type PaymentMethod } from '../../lib/clients';
import { CLIENT_STATUS, thisMonth, usePipeline, useSummary } from '../../lib/closing';
import { LEAD_STATUS, type LeadStatus } from '../../lib/leads';

const peso = (v: number) => formatPeso(v).replace(/\.00$/, '');
const monthName = (m: string) =>
  new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${m}-01T00:00:00Z`),
  );

const FUNNEL: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'RESERVED'];
const CLIENT_ORDER = ['ACTIVE', 'CLOSING', 'COMPLETED', 'CANCELLED'] as const;

/**
 * Reports (SPEC §10.6): the month's sales and the pipeline. Admin and broker see the firm; a
 * sales manager sees their own team.
 */
export function Reports() {
  const { data: me } = useMe();
  const [month, setMonth] = useState(thisMonth());
  const [consultantId, setConsultantId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const summary = useSummary(month);
  const pipeline = usePipeline({ consultantId, paymentMethod });
  // The unfiltered list of people, for the filter menu.
  const everyone = usePipeline({});
  if (!me) return null;
  const team = me.role === 'SALES_MANAGER';
  const s = summary.data;
  const p = pipeline.data;

  return (
    <>
      <PageHeader
        title="Reports"
        intro={
          team
            ? 'Your team’s sales and pipeline.'
            : `Sales and pipeline for ${me.firm?.name ?? 'your firm'}.`
        }
        actions={
          <label className="flex items-center gap-2 text-sm font-semibold">
            Month
            <input
              type="month"
              className="input w-auto"
              value={month}
              max={thisMonth()}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </label>
        }
      />

      <h2 className="sr-only">{monthName(month)}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Reserved in ${monthName(month)}`}
          value={s?.reserved.count ?? '–'}
          hint={s ? `${peso(s.reserved.totalTcp)} in contract prices` : undefined}
        />
        <StatCard label="New leads" value={s?.newLeads ?? '–'} />
        <StatCard label="Sales completed" value={s?.completed ?? '–'} />
        <StatCard
          label="Commissions released"
          value={s ? peso(s.released.total) : '–'}
          hint={s ? `${s.released.count} tranche${s.released.count === 1 ? '' : 's'}` : undefined}
        />
      </div>

      <Card className="mt-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Pipeline today</h2>
            <p className="mt-0.5 text-sm text-muted">
              Every lead and client, by where they are now.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Consultant"
              className="input w-auto"
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
            >
              <option value="">Everyone</option>
              {everyone.data?.team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
            <select
              aria-label="Payment method"
              className="input w-auto"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">Any payment method</option>
              {(Object.keys(METHOD) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {METHOD[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="mb-2 text-sm font-bold">Leads</h3>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
          {FUNNEL.map((st) => (
            <li
              key={st}
              className="flex items-baseline justify-between gap-3 bg-paper px-4 py-3 sm:block"
            >
              <p className="text-xs font-medium text-muted">{LEAD_STATUS[st]}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{p?.leads[st] ?? 0}</p>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">
          {p?.leads.LOST ?? 0} lost. Reserved leads became clients.
        </p>

        <h3 className="mt-6 mb-2 text-sm font-bold">Clients</h3>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {CLIENT_ORDER.map((st) => (
            <div key={st} className="bg-paper px-4 py-3">
              <dt className="text-xs font-medium text-muted">{CLIENT_STATUS[st]}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{p?.clients[st] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-6" padded={false}>
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <CardHeader
            title={team ? 'My team' : 'Team performance'}
            description="Reserved counts this month; completed counts all time."
          />
        </div>
        {!p?.team.length ? (
          <div className="px-5 pb-5 sm:px-6">
            <EmptyState>No consultants match these filters.</EmptyState>
          </div>
        ) : (
          <>
            {/* Phones: one block per person, so no column is hidden off-screen. */}
            <ul className="divide-y divide-line border-t border-line sm:hidden">
              {p.team.map((t) => (
                <li key={t.id} className="px-5 py-3">
                  <p className="text-sm font-semibold">
                    {t.firstName} {t.lastName}
                    {t.id === me.id && <span className="font-normal text-muted"> (you)</span>}
                  </p>
                  <p className="text-xs text-muted">{ROLE_LABEL[t.role]}</p>
                  <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                    {(
                      [
                        ['Open leads', t.openLeads],
                        ['Active', t.activeClients],
                        ['Reserved', t.reservedThisMonth],
                        ['Completed', t.completed],
                      ] as const
                    ).map(([label, n]) => (
                      <div key={label} className="rounded-lg bg-canvas px-1 py-1.5">
                        <dt className="text-[0.6875rem] text-muted">{label}</dt>
                        <dd className="font-bold tabular-nums">{n}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-xl text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs text-muted">
                    <th className="px-5 py-2.5 font-medium sm:px-6">Consultant</th>
                    <th className="px-3 py-2.5 text-right font-medium">Open leads</th>
                    <th className="px-3 py-2.5 text-right font-medium">Active clients</th>
                    <th className="px-3 py-2.5 text-right font-medium">Reserved this month</th>
                    <th className="px-5 py-2.5 text-right font-medium sm:px-6">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {p.team.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-3 sm:px-6">
                        <p className="font-semibold">
                          {t.firstName} {t.lastName}
                          {t.id === me.id && <span className="font-normal text-muted"> (you)</span>}
                        </p>
                        <p className="text-xs text-muted">{ROLE_LABEL[t.role]}</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{t.openLeads}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{t.activeClients}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {t.reservedThisMonth}
                        {t.reservedThisMonth > 0 && (
                          <span className="block text-xs text-muted">
                            {peso(t.reservedTcpThisMonth)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums sm:px-6">
                        {t.completed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
