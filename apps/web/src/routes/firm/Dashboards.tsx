import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { useMe } from '../../lib/auth';
import { credentialState, fullName, useTeam, type TeamMember } from '../../lib/team';

const greet = (name?: string) => (name ? `Good to see you, ${name}` : 'Overview');

/** Credentials grouped by what someone needs to do about them. */
function credentialWork(people: TeamMember[]) {
  const rows = people.flatMap((p) =>
    p.credentials.map((c) => ({ person: p, c, state: credentialState(c) })),
  );
  return {
    review: rows.filter((r) => r.state === 'review' || r.state === 'attention'),
    expired: rows.filter((r) => r.state === 'expired'),
    reading: rows.filter((r) => r.state === 'reading'),
  };
}

function WorkList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { person: TeamMember; c: TeamMember['credentials'][number] }[];
}) {
  return (
    <section className="max-w-3xl">
      <h2 className="text-lg font-bold">
        {title} <span className="font-normal text-graphite tabular-nums">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 border-t-2 border-ink pt-3 text-graphite">{empty}</p>
      ) : (
        <ul className="mt-2 border-t-2 border-ink">
          {rows.map(({ person, c }) => (
            <li
              key={c.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-3"
            >
              <span className="font-semibold">{fullName(person)}</span>
              <CredentialBadge credential={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminHome() {
  const { data: me } = useMe();
  const team = useTeam();
  const work = team.data ? credentialWork(team.data) : null;
  const count = (role: TeamMember['role']) =>
    team.data?.filter((p) => p.role === role && p.isActive).length ?? 0;

  return (
    <>
      <PageHeader
        title={greet(me?.firstName)}
        intro={me?.firm ? `Here's what needs attention at ${me.firm.name}.` : undefined}
      />
      {team.data && (
        <p className="mb-10 max-w-3xl text-lg">
          {count('BROKER')} brokers, {count('SALES_MANAGER')} sales managers and{' '}
          {count('SALES_PERSON')} salespersons are active.{' '}
          <Link to="/admin/team" className="font-semibold underline underline-offset-4">
            See the team
          </Link>
        </p>
      )}
      {work && (
        <div className="space-y-10">
          <WorkList
            title="Expired credentials"
            empty="No expired credentials."
            rows={work.expired}
          />
          <WorkList
            title="Waiting for a broker"
            empty="Nothing is waiting for a broker."
            rows={work.review}
          />
        </div>
      )}
    </>
  );
}

export function BrokerHome() {
  const { data: me } = useMe();
  const team = useTeam();
  const work = team.data ? credentialWork(team.data) : null;

  return (
    <>
      <PageHeader
        title="Review queue"
        intro={`Credentials that need your decision${me?.firm ? ` at ${me.firm.name}` : ''}. Only a licensed broker can approve them.`}
      />
      {work && (
        <div className="space-y-10">
          <WorkList title="Ready for your review" empty="Your queue is clear." rows={work.review} />
          <WorkList title="Expired" empty="No expired credentials." rows={work.expired} />
        </div>
      )}
    </>
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
      {team.data && (
        <div className="space-y-10">
          <WorkList
            title="Team credentials that expired"
            empty="None of your team's credentials have expired."
            rows={work.expired}
          />
          <WorkList
            title="Team credentials under review"
            empty="Nothing from your team is under review."
            rows={[...work.review, ...work.reading]}
          />
        </div>
      )}
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
      <section className="max-w-xl">
        <h2 className="text-lg font-bold">Your credentials</h2>
        <ul className="mt-2 border-t-2 border-ink">
          {me.credentials.length === 0 && (
            <li className="py-3 text-graphite">
              None on file. Ask your company admin to upload your DHSUD registration.
            </li>
          )}
          {me.credentials.map((c) => (
            <li key={c.id} className="border-b border-rule py-3">
              <CredentialBadge credential={c} />
            </li>
          ))}
        </ul>
        {!verified && (
          <p className="mt-3 text-sm text-graphite">
            Buyers see a verified badge on your profile once a broker approves a current credential.
          </p>
        )}
      </section>
      {me.referralCode && (
        <section className="mt-10 max-w-xl">
          <h2 className="text-lg font-bold">Your referral code</h2>
          <p className="font-display mt-2 text-3xl tracking-wide">{me.referralCode}</p>
          <p className="mt-1 text-sm text-graphite">
            Buyers who inquire with your code are assigned to you.
          </p>
        </section>
      )}
    </>
  );
}
