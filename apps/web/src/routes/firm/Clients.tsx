import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Card, EmptyState } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { METHOD, useClients } from '../../lib/clients';
import { basePath, isConsultantRole } from '../../lib/paths';

const peso = (v: string | number) => formatPeso(v).replace(/\.00$/, '');

/** Buyers who reserved (SPEC §10.1). Consultants see their own; managers their team; admin and broker all. */
export function Clients() {
  const { data: me } = useMe();
  const clients = useClients();
  if (!me) return null;
  const rows = clients.data ?? [];

  return (
    <>
      <PageHeader
        title="Clients"
        intro={
          isConsultantRole(me.role)
            ? 'Buyers who reserved. Collect each document on their checklist; your broker verifies them.'
            : "Every buyer who reserved, how much they've paid, and how far their documents are."
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>
              {clients.isPending
                ? 'Loading…'
                : 'No clients yet. A lead becomes a client when the buyer pays the reservation.'}
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((c) => {
              const pct = c.checklist.total
                ? Math.round((100 * c.checklist.done) / c.checklist.total)
                : 0;
              return (
                <li key={c.id}>
                  <Link
                    to={`${basePath(me.role)}/clients/${c.id}`}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 hover:bg-canvas"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{c.fullName}</p>
                      <p className="truncate text-sm text-muted">
                        {c.property?.title}. {METHOD[c.paymentMethod]}.
                        {c.consultant &&
                          c.consultant.id !== me.id &&
                          ` Handled by ${c.consultant.firstName} ${c.consultant.lastName}.`}
                      </p>
                    </div>
                    <div className="w-40 text-xs text-muted">
                      <p>
                        {c.checklist.done} of {c.checklist.total} documents done
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="w-36 text-right text-sm">
                      <p className="font-semibold tabular-nums">{peso(c.paid)}</p>
                      <p className="text-xs text-muted">paid of {peso(c.tcp)}</p>
                    </div>
                    <ChevronRight aria-hidden className="size-4 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
