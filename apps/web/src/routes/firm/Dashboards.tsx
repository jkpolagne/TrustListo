import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { Avatar, ButtonLink, Card, CardHeader, EmptyState, StatCard } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { useCommissions } from '../../lib/commissions';
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

export function AdminHome() {
  const { data: me } = useMe();
  const team = useTeam();
  const work = team.data ? credentialWork(team.data) : null;
  const active = (role: TeamMember['role']) =>
    team.data?.filter((p) => p.role === role && p.isActive).length ?? 0;

  return (
    <>
      <PageHeader
        title={greet(me?.firstName)}
        intro={me?.firm ? `Here's what needs attention at ${me.firm.name}.` : undefined}
        actions={<ButtonLink to="/admin/team/new">Add consultant</ButtonLink>}
      />
      {work && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active consultants"
              value={active('BROKER') + active('SALES_MANAGER') + active('SALES_PERSON')}
              hint={`${active('BROKER')} brokers, ${active('SALES_MANAGER')} managers, ${active('SALES_PERSON')} sales`}
            />
            <StatCard label="Verified credentials" value={work.verified.length} tone="verified" />
            <StatCard
              label="Waiting for a broker"
              value={work.review.length + work.reading.length}
            />
            <StatCard
              label="Expired credentials"
              value={work.expired.length}
              tone={work.expired.length ? 'danger' : undefined}
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Expired credentials"
                description="Upload a current one for each person."
              />
              <PersonList rows={work.expired} empty="No expired credentials." />
            </Card>
            <Card>
              <CardHeader
                title="Waiting for a broker"
                description="A licensed broker approves these."
              />
              <PersonList rows={[...work.review, ...work.reading]} empty="Nothing is waiting." />
            </Card>
          </div>
        </>
      )}
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

export function ManagerHome() {
  const { data: me } = useMe();
  const team = useTeam();
  const mine = team.data?.filter((p) => p.id !== me?.id) ?? [];
  const work = credentialWork(mine);

  return (
    <>
      <PageHeader
        title={greet(me?.firstName)}
        intro={`You manage ${mine.length} salesperson${mine.length === 1 ? '' : 's'}.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team members" value={mine.length} />
        <StatCard label="Verified" value={work.verified.length} tone="verified" />
        <StatCard
          label="Expired"
          value={work.expired.length}
          tone={work.expired.length ? 'danger' : undefined}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Expired credentials" />
          <PersonList rows={work.expired} empty="None of your team's credentials have expired." />
        </Card>
        <Card>
          <CardHeader title="Under review" />
          <PersonList
            rows={[...work.review, ...work.reading]}
            empty="Nothing from your team is under review."
          />
        </Card>
      </div>
    </>
  );
}

export function SalespersonHome() {
  const { data: me } = useMe();
  if (!me) return null;
  const verified = me.credentials.some((c) => credentialState(c) === 'verified');

  return (
    <>
      <PageHeader
        title={greet(me.firstName)}
        intro={me.firm ? `Salesperson at ${me.firm.name}.` : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your credentials"
            description={
              verified
                ? undefined
                : 'Buyers see a verified badge once a broker approves a current credential.'
            }
          />
          {me.credentials.length === 0 ? (
            <EmptyState>
              None on file. Ask your company admin to upload your DHSUD registration.
            </EmptyState>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {me.credentials.map((c) => (
                <li key={c.id}>
                  <CredentialBadge credential={c} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        {me.referralCode && (
          <Card>
            <CardHeader
              title="Your referral code"
              description="Buyers who inquire with your code are assigned to you."
            />
            <p className="inline-block rounded-xl bg-canvas px-4 py-3 font-mono text-2xl font-bold tracking-wider select-all">
              {me.referralCode}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
