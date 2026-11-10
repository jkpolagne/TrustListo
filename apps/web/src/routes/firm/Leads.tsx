import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/AppShell';
import { Badge, Card, EmptyState } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { LEAD_STATUS, PAYMENT_PREF, useLeads, type LeadStatus } from '../../lib/leads';
import { basePath, isConsultantRole } from '../../lib/paths';

const when = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

const FILTERS: { key: 'OPEN' | LeadStatus; label: string }[] = [
  { key: 'OPEN', label: 'Open' },
  { key: 'NEW', label: 'New' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'VISIT_SCHEDULED', label: 'Visit scheduled' },
  { key: 'LOST', label: 'Lost' },
];
const OPEN: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED'];

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge tone={status === 'NEW' ? 'info' : status === 'LOST' ? 'danger' : 'neutral'}>
      {LEAD_STATUS[status]}
    </Badge>
  );
}

/**
 * Leads dashboard (SPEC §10.1, §15 M6). A consultant sees their own inquiries; a sales
 * manager also sees their team's; the admin and broker see the whole firm.
 */
export function Leads() {
  const { data: me } = useMe();
  const leads = useLeads();
  const [filter, setFilter] = useState<'OPEN' | LeadStatus>('OPEN');
  if (!me) return null;
  const rows = (leads.data ?? []).filter((l) =>
    filter === 'OPEN' ? OPEN.includes(l.status) : l.status === filter,
  );
  const count = (k: 'OPEN' | LeadStatus) =>
    (leads.data ?? []).filter((l) => (k === 'OPEN' ? OPEN.includes(l.status) : l.status === k))
      .length;
  const showOwner = !isConsultantRole(me.role) || me.role === 'SALES_MANAGER';

  return (
    <>
      <PageHeader
        title="Leads"
        intro={
          isConsultantRole(me.role)
            ? 'Buyers who inquired through TrustListo. Call new leads quickly; the buyer is waiting for you.'
            : 'Every inquiry your firm received, and who is handling it.'
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter leads">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.key ? 'bg-ink text-paper' : 'bg-paper text-muted hover:text-ink'
            }`}
          >
            {f.label} <span className="tabular-nums opacity-70">{count(f.key)}</span>
          </button>
        ))}
      </div>
      <Card padded={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>
              {leads.isPending
                ? 'Loading…'
                : filter === 'OPEN'
                  ? 'No open leads. Share your referral links from Listings to get inquiries.'
                  : 'Nothing here.'}
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((l) => (
              <li key={l.id}>
                <Link
                  to={`${basePath(me.role)}/leads/${l.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-canvas"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {l.buyerName}
                      {l.source === 'REFERRAL' && (
                        <span className="ml-2 text-xs font-medium text-muted">
                          via a referral link
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {l.property?.title ?? 'Listing'}. Would pay by: {PAYMENT_PREF[l.paymentPref]}.
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    {showOwner && l.consultant && l.consultant.id !== me.id && (
                      <p>
                        {l.consultant.firstName} {l.consultant.lastName}
                      </p>
                    )}
                    <p>{when.format(new Date(l.createdAt))}</p>
                  </div>
                  <LeadStatusBadge status={l.status} />
                  <ChevronRight aria-hidden className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
