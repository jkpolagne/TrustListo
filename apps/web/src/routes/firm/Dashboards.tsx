import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  StatCard,
} from '../../components/ui';
import { useState } from 'react';
import { SaleFlow, TaskList, WaitingList } from '../../components/office/Work';
import { useMe } from '../../lib/auth';
import { useClients } from '../../lib/clients';
import { useCommissions } from '../../lib/commissions';
import { useLeads, useVisits } from '../../lib/leads';
import { useSellerRequests } from '../../lib/sellers';
import { adminWork, consultantWork, stages } from '../../lib/work';
import { aiSummary, docTypeName, useReviewQueue, type QueuedDocument } from '../../lib/reviews';
import { credentialState, fullName, useTeam, type TeamMember } from '../../lib/team';

const greet = (name?: string) => (name ? `Good to see you, ${name}` : 'Overview');

type Row = {
  person: Pick<TeamMember, 'firstName' | 'lastName' | 'role'>;
  c: TeamMember['credentials'][number];
};

/** Credentials grouped by what someone needs to do about them. */
function credentialWork(people: TeamMember[]) {
  const rows = people.flatMap((p) =>
    p.credentials.map((c) => ({ person: p, c, state: credentialState(c) })),
  );
  return {
    review: rows.filter((r) => r.state === 'review' || r.state === 'attention'),
    expired: rows.filter((r) => r.state === 'expired'),
    reading: rows.filter((r) => r.state === 'reading'),
    verified: rows.filter((r) => r.state === 'verified'),
  };
}

function PersonList({
  rows,
  empty,
  linkTo,
}: {
  rows: Row[];
  empty: string;
  linkTo?: (r: Row) => string;
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="-mx-2 divide-y divide-line">
      {rows.map((r) => {
        const inner = (
          <>
            <Avatar first={r.person.firstName} last={r.person.lastName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{fullName(r.person)}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABEL[r.person.role]}</p>
            </div>
            <CredentialBadge credential={r.c} />
            {linkTo && <ChevronRight aria-hidden className="size-4 text-muted" />}
          </>
        );
        return (
          <li key={r.c.id}>
            {linkTo ? (
              <Link
                to={linkTo(r)}
                className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-canvas"
              >
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-2 py-3">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** All the lists the Overview pages read. Each list is already scoped to the user's role. */
function useWorkData() {
  const leads = useLeads();
  const visits = useVisits();
  const clients = useClients();
  const commissions = useCommissions();
  const sellers = useSellerRequests();
  const team = useTeam();
  return {
    ready: !leads.isPending && !clients.isPending && !commissions.isPending,
    leads: leads.data,
    visits: visits.data,
    clients: clients.data,
    commissions: commissions.data?.data,
    sellers: sellers.data,
    team: team.data,
  };
}

/** CompanyAdmin: approvals, transmittals and people, with every deal's stage on top. */
export function AdminHome() {
  const { data: me } = useMe();
  const data = useWorkData();
  if (!me) return null;
  const input = { me, base: '/admin', ...data };
  const work = adminWork(input);
  const active = data.team?.filter((p) => p.isActive && p.role !== 'COMPANY_ADMIN').length ?? 0;

  return (
    <>
      <PageHeader
        title={greet(me.firstName)}
        intro={
          me.firm
            ? `What needs you at ${me.firm.name} today. Consultants handle buyers; you approve visits, add transmittals and keep the team's licenses current.`
            : undefined
        }
        actions={<ButtonLink to="/admin/team/new">Add consultant</ButtonLink>}
      />
      <SaleFlow stages={stages(input, 'all')} title="Where every deal is" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        {data.ready ? (
          <TaskList
            tasks={work.tasks}
            empty="Nothing needs you right now. Visit requests and transmittals show up here."
          />
        ) : (
          <div />
        )}
        <div className="space-y-6">
          <WaitingList items={work.waiting} />
          <Card>
            <CardHeader title="Team" />
            <p className="text-3xl font-bold tabular-nums">{active}</p>
            <p className="text-sm text-muted">active brokers and consultants</p>
            <ButtonLink to="/admin/team" variant="secondary" className="mt-4 w-full">
              Open team
            </ButtonLink>
          </Card>
        </div>
      </div>
    </>
  );
}

export function BrokerHome() {
  const { data: me } = useMe();
  const queue = useReviewQueue();
  const team = useTeam();
  const work = team.data ? credentialWork(team.data) : null;
  const items = queue.data?.credentials ?? [];
  const docs = queue.data?.documents ?? [];
  const listings = queue.data?.listings ?? [];
  const ready = items.filter((c) => c.status !== 'PENDING_AI');
  const docsReady = docs.filter((d) => d.reviewStatus !== 'PENDING_AI');
  const checking = items.length - ready.length + docs.length - docsReady.length;
  const attention =
    ready.filter((c) => c.status === 'NEEDS_ATTENTION').length +
    docsReady.filter((d) => d.reviewStatus === 'NEEDS_ATTENTION').length;

  return (
    <>
      <PageHeader
        title="Review queue"
        intro={`Documents and credentials waiting for your decision${me?.firm ? ` at ${me.firm.name}` : ''}. The AI reads and flags them; only a licensed broker approves.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Waiting for you"
          value={ready.length + docsReady.length}
          hint={attention ? `${attention} flagged by the AI` : undefined}
        />
        <StatCard label="Being read by the AI" value={checking} />
        <StatCard
          label="Expired credentials"
          value={work?.expired.length ?? 0}
          tone={work?.expired.length ? 'danger' : undefined}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {listings.length > 0 && (
            <Card>
              <CardHeader
                title="Listings waiting to go live"
                description="Seller listings your agents sent. Approve the documents, then publish."
              />
              <ul className="-mx-2 divide-y divide-line">
                {listings.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/broker/reviews/listings/${l.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-canvas"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{l.title}</p>
                        <p className="text-xs text-muted">
                          {l.sellerRequest?.sellerName}, {l.barangay}. {l.documentsApproved} of{' '}
                          {l.documentsTotal} documents approved.
                        </p>
                      </div>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader
              title="Listing and project documents"
              description="Licenses to sell and seller documents, grouped by property. Oldest first."
            />
            <DocumentGroups docs={docs} />
          </Card>
          <Card>
            <CardHeader title="Consultant credentials" description="Oldest first." />
            <PersonList
              rows={ready.map((c) => ({ person: c.user, c }))}
              empty="No credentials are waiting."
              linkTo={(r) => `/broker/reviews/credentials/${r.c.id}`}
            />
          </Card>
        </div>
        <div className="space-y-6 self-start">
          <CommissionWork />
          <Card>
            <CardHeader title="Expired" />
            <PersonList rows={work?.expired ?? []} empty="No expired credentials." />
          </Card>
        </div>
      </div>
    </>
  );
}

/** Commission work for the broker: vouchers to prepare or sign, and old transmittals (§10.6). */
function CommissionWork() {
  const q = useCommissions();
  const tranches = q.data?.data.flatMap((c) => c.tranches) ?? [];
  const toVoucher = tranches.filter((t) => t.status === 'READY_FOR_RELEASE' && !t.voucher).length;
  const toSign = tranches.filter(
    (t) => t.status === 'READY_FOR_RELEASE' && t.voucher && !t.voucher.brokerSignedAt,
  ).length;
  const overdue = q.data?.awaiting.filter((a) => a.bucket === '90+').length ?? 0;
  return (
    <Card>
      <CardHeader title="Commissions" />
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Ready for your voucher</dt>
          <dd className="font-bold tabular-nums">{toVoucher}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Vouchers for you to sign</dt>
          <dd className="font-bold tabular-nums">{toSign}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Transmittals over 90 days</dt>
          <dd className={`font-bold tabular-nums ${overdue ? 'text-flag' : ''}`}>{overdue}</dd>
        </div>
      </dl>
      <ButtonLink to="/broker/commissions" variant="secondary" className="mt-4 w-full">
        Open commissions
      </ButtonLink>
    </Card>
  );
}

/** Queue documents grouped by what they're for: one project, or one seller's property. */
function DocumentGroups({ docs }: { docs: QueuedDocument[] }) {
  if (docs.length === 0) return <EmptyState>No documents are waiting.</EmptyState>;
  const groups = new Map<string, QueuedDocument[]>();
  for (const d of docs) groups.set(d.ownerId, [...(groups.get(d.ownerId) ?? []), d]);
  return (
    <div className="space-y-5">
      {[...groups.values()].map((group) => {
        const owner = group[0]!.owner;
        return (
          <section key={group[0]!.ownerId}>
            <h3 className="text-sm font-bold">{owner.title}</h3>
            {owner.subtitle && <p className="text-xs text-muted">{owner.subtitle}</p>}
            <ul className="-mx-2 mt-1.5 divide-y divide-line">
              {group.map((d) => {
                const s = aiSummary(d);
                return (
                  <li key={d.id}>
                    <Link
                      to={`/broker/reviews/documents/${d.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-canvas"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{docTypeName(d.declaredType)}</p>
                        <p
                          className={`truncate text-xs ${s.tone === 'danger' ? 'text-flag' : 'text-muted'}`}
                        >
                          {s.text}
                        </p>
                      </div>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Sales Manager: their own deals' work, plus a view of their team. */
export function ManagerHome() {
  const { data: me } = useMe();
  const data = useWorkData();
  if (!me) return null;
  const input = { me, base: '/manager', ...data };
  const work = consultantWork(input);
  const mine = data.team?.filter((p) => p.id !== me.id) ?? [];
  const creds = credentialWork(mine);
  const newLeads = (id: string) =>
    data.leads?.filter((l) => l.consultantId === id && l.status === 'NEW').length ?? 0;

  return (
    <>
      <PageHeader
        title={greet(me.firstName)}
        intro={`Your own buyers first, then your team of ${mine.length}.`}
        actions={
          <ButtonLink to="/manager/reports" variant="secondary">
            Team report
          </ButtonLink>
        }
      />
      <SaleFlow stages={stages(input, 'all')} title="Where your team's deals are" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        {data.ready ? (
          <TaskList
            tasks={work.tasks}
            empty="Nothing of yours needs you right now. New leads and vouchers to sign show up here."
          />
        ) : (
          <div />
        )}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Your team" description="New leads each person hasn't called yet." />
            {mine.length === 0 ? (
              <EmptyState>No salespeople report to you yet.</EmptyState>
            ) : (
              <ul className="-mx-2 divide-y divide-line">
                {mine.map((p) => {
                  const n = newLeads(p.id);
                  const expired = creds.expired.some((r) => r.person.id === p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-2 py-2.5">
                      <Avatar first={p.firstName} last={p.lastName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{fullName(p)}</p>
                        <p className={`text-xs ${expired ? 'text-flag' : 'text-muted'}`}>
                          {expired ? 'License expired' : ROLE_LABEL[p.role]}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${n ? '' : 'text-muted'}`}>
                        {n} new
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <WaitingList items={work.waiting} />
          {me.referralCode && <ReferralCard code={me.referralCode} />}
        </div>
      </div>
    </>
  );
}

/** Sales Person: their buyers, from new lead to completed sale. */
export function SalespersonHome() {
  const { data: me } = useMe();
  const data = useWorkData();
  if (!me) return null;
  const input = { me, base: '/salesperson', ...data };
  const work = consultantWork(input);
  const verified = me.credentials.some((c) => credentialState(c) === 'verified');

  return (
    <>
      <PageHeader
        title={greet(me.firstName)}
        intro={
          me.firm ? `Your buyers at ${me.firm.name}, and what to do next for each.` : undefined
        }
      />
      {!verified && (
        <p
          role="status"
          className="mb-6 rounded-xl bg-flag-pale px-4 py-3 text-sm font-medium text-flag"
        >
          Buyers can&rsquo;t pick you yet: you need a current license approved by a broker. Ask your
          company admin to upload your DHSUD registration.
        </p>
      )}
      <SaleFlow stages={stages(input, 'mine')} title="Where your deals are" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        {data.ready ? (
          <TaskList
            tasks={work.tasks}
            empty="You're up to date. New leads appear here as soon as a buyer inquires."
          />
        ) : (
          <div />
        )}
        <div className="space-y-6">
          <WaitingList items={work.waiting} />
          {me.referralCode && <ReferralCard code={me.referralCode} />}
          {me.credentials.length > 0 && (
            <Card>
              <CardHeader title="Your credentials" />
              <ul className="flex flex-wrap gap-2">
                {me.credentials.map((c) => (
                  <li key={c.id}>
                    <CredentialBadge credential={c} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/** The consultant's referral code (§10.7), with a one-click copy. */
function ReferralCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <CardHeader
        title="Your referral code"
        description="Share a listing with this code and the buyer is assigned to you. Each listing in Listings has a copy-link button."
      />
      <div className="flex items-center gap-2">
        <p className="rounded-xl bg-canvas px-4 py-2.5 text-xl font-bold tracking-wider tabular-nums select-all">
          {code}
        </p>
        <Button
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </Card>
  );
}
