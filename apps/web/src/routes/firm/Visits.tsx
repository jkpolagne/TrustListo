import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/AppShell';
import { errorText } from '../../components/Form';
import { Badge, Button, Card, CardHeader, EmptyState } from '../../components/ui';
import { api } from '../../lib/api';
import type { Me } from '@trustlisto/shared';
import { useMe } from '../../lib/auth';
import { VISIT_STATUS, useVisits, type Visit, type VisitStatus } from '../../lib/leads';
import { basePath, isConsultantRole } from '../../lib/paths';

const time = new Intl.DateTimeFormat('en-PH', { timeStyle: 'short' });
const dayLong = new Intl.DateTimeFormat('en-PH', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const monthName = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ACTIVE: VisitStatus[] = ['PENDING', 'APPROVED', 'COMPLETED', 'NO_SHOW'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const tone =
    status === 'PENDING'
      ? 'info'
      : status === 'DECLINED' || status === 'NO_SHOW'
        ? 'danger'
        : 'neutral';
  return <Badge tone={tone}>{VISIT_STATUS[status]}</Badge>;
}

/**
 * Visits (SPEC §10.8): month calendar and day list. Consultants request visits from a lead;
 * the CompanyAdmin approves or declines (rule 10); the broker and managers read.
 */
export function Visits() {
  const { data: me } = useMe();
  const visits = useVisits();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const m = new Map<string, Visit[]>();
    for (const v of visits.data ?? []) {
      if (!ACTIVE.includes(v.status)) continue; // moved, cancelled and declined stay off the grid
      const k = dayKey(new Date(v.scheduledAt));
      m.set(k, [...(m.get(k) ?? []), v]);
    }
    return m;
  }, [visits.data]);

  if (!me) return null;
  const isAdmin = me.role === 'COMPANY_ADMIN';
  const pending = (visits.data ?? []).filter((v) => v.status === 'PENDING');
  const dayVisits = (visits.data ?? []).filter(
    (v) => dayKey(new Date(v.scheduledAt)) === dayKey(selected),
  );

  // Calendar cells: leading blanks, then each day of the month.
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array(first).fill(null),
    ...Array.from(
      { length: days },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
    ),
  ];

  return (
    <>
      <PageHeader
        title="Visits"
        intro={
          isAdmin
            ? 'Approve or decline the visits your consultants request.'
            : isConsultantRole(me.role)
              ? 'Request visits from a lead; your company admin approves them.'
              : 'Property visits scheduled by your firm.'
        }
      />
      {isAdmin && pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title={`Waiting for your approval (${pending.length})`}
            description="Soonest first."
          />
          <ul className="divide-y divide-line">
            {pending.map((v) => (
              <VisitRow key={v.id} v={v} me={me} showDate />
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,1fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">{monthName.format(month)}</h2>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
              >
                <ChevronRight aria-hidden className="size-4" />
              </button>
            </div>
          </div>
          <div
            className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted"
            aria-hidden
          >
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const list = byDay.get(dayKey(d)) ?? [];
              const isSel = dayKey(d) === dayKey(selected);
              const isToday = dayKey(d) === dayKey(today);
              const hasPending = list.some((v) => v.status === 'PENDING');
              return (
                <button
                  key={dayKey(d)}
                  type="button"
                  onClick={() => setSelected(d)}
                  aria-pressed={isSel}
                  aria-label={`${dayLong.format(d)}, ${list.length} visit${list.length === 1 ? '' : 's'}`}
                  className={`flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-sm transition-colors sm:aspect-auto sm:h-16 ${
                    isSel ? 'bg-ink text-paper' : 'hover:bg-canvas'
                  }`}
                >
                  <span
                    className={`tabular-nums ${isToday && !isSel ? 'font-bold underline underline-offset-4' : ''}`}
                  >
                    {d.getDate()}
                  </span>
                  {list.length > 0 && (
                    <span
                      className={`mt-1 rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums ${isSel ? 'bg-paper text-ink' : hasPending ? 'bg-[#eef1f6] text-[#334155]' : 'bg-canvas text-ink'}`}
                    >
                      {list.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            The number on a day is how many visits are booked. Declined, moved and cancelled visits
            aren't counted.
          </p>
        </Card>

        <Card>
          <CardHeader title={dayLong.format(selected)} />
          {dayVisits.length === 0 ? (
            <EmptyState>No visits on this day.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {dayVisits.map((v) => (
                <VisitRow key={v.id} v={v} me={me} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function VisitRow({ v, me, showDate }: { v: Visit; me: Me; showDate?: boolean }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<null | 'decline' | 'move'>(null);
  const [reason, setReason] = useState('');
  const [newAt, setNewAt] = useState('');
  const update = useMutation({
    mutationFn: (body: { status: VisitStatus; reason?: string; scheduledAt?: string }) =>
      api(`/visits/${v.id}`, { method: 'PATCH', json: body }),
    onSuccess: () => {
      setMode(null);
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
  const isAdmin = me.role === 'COMPANY_ADMIN';
  const mine = v.consultantId === me.id;
  const open = v.status === 'PENDING' || v.status === 'APPROVED';
  const past = new Date(v.scheduledAt).getTime() < Date.now();
  const leadLink = v.lead ? `${basePath(me.role)}/leads/${v.lead.id}` : null;

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {showDate ? `${dayLong.format(new Date(v.scheduledAt))}, ` : ''}
            {time.format(new Date(v.scheduledAt))}
          </p>
          <p className="text-sm">{v.property?.title}</p>
          <p className="text-xs text-muted">
            {leadLink ? (
              <Link to={leadLink} className="underline underline-offset-2">
                {v.lead?.buyerName}
              </Link>
            ) : (
              v.lead?.buyerName
            )}
            {v.consultant && !mine && ` with ${v.consultant.firstName} ${v.consultant.lastName}`}
          </p>
          {v.notes && <p className="mt-1 text-xs text-muted">{v.notes}</p>}
          {v.declineReason && <p className="mt-1 text-xs text-flag">Declined: {v.declineReason}</p>}
        </div>
        <VisitStatusBadge status={v.status} />
      </div>

      {mode === 'decline' && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            update.mutate({ status: 'DECLINED', reason });
          }}
        >
          <input
            aria-label="Reason for declining"
            className="input min-w-0 flex-1"
            required
            placeholder="Why can't it go ahead?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" variant="danger" disabled={update.isPending}>
            Decline
          </Button>
        </form>
      )}
      {mode === 'move' && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            update.mutate({ status: 'RESCHEDULED', scheduledAt: new Date(newAt).toISOString() });
          }}
        >
          <input
            aria-label="New date and time"
            type="datetime-local"
            className="input min-w-0 flex-1"
            required
            value={newAt}
            onChange={(e) => setNewAt(e.target.value)}
          />
          <Button type="submit" disabled={update.isPending}>
            Move visit
          </Button>
        </form>
      )}

      {mode === null && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isAdmin && v.status === 'PENDING' && (
            <>
              <Button
                className="px-3 py-1.5 text-xs"
                disabled={update.isPending}
                onClick={() => update.mutate({ status: 'APPROVED' })}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                onClick={() => setMode('decline')}
              >
                Decline
              </Button>
            </>
          )}
          {mine && v.status === 'APPROVED' && past && (
            <>
              <Button
                className="px-3 py-1.5 text-xs"
                disabled={update.isPending}
                onClick={() => update.mutate({ status: 'COMPLETED' })}
              >
                Visit done
              </Button>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={update.isPending}
                onClick={() => update.mutate({ status: 'NO_SHOW' })}
              >
                Buyer didn’t come
              </Button>
            </>
          )}
          {mine && open && !past && (
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={() => setMode('move')}
            >
              Move
            </Button>
          )}
          {(mine || isAdmin) && open && (
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              disabled={update.isPending}
              onClick={() => update.mutate({ status: 'CANCELLED' })}
            >
              Cancel visit
            </Button>
          )}
        </div>
      )}
      {update.error && <p className="mt-2 text-xs text-flag">{errorText(update.error)}</p>}
    </li>
  );
}
