import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { fullName, useTeam, type TeamMember } from '../../lib/team';

/** Firm hierarchy: broker → sales managers → salespersons (SPEC §5.1). */
export function Team({ title = 'Team' }: { title?: string }) {
  const team = useTeam();

  if (team.isPending) return <PageHeader title={title} />;
  if (team.isError) return <PageHeader title={title} intro={team.error.message} />;

  const people = team.data;
  const ids = new Set(people.map((p) => p.id));
  const admins = people.filter((p) => p.role === 'COMPANY_ADMIN');
  const brokers = people.filter((p) => p.role === 'BROKER');
  const managersOf = (brokerId: string | null) =>
    people.filter((p) => p.role === 'SALES_MANAGER' && p.brokerId === brokerId);
  // Managers whose broker isn't visible to this viewer (e.g. a manager viewing their own team).
  const topManagers = people.filter(
    (p) => p.role === 'SALES_MANAGER' && (!p.brokerId || !ids.has(p.brokerId)),
  );
  const salesOf = (managerId: string) =>
    people.filter((p) => p.role === 'SALES_PERSON' && p.managerId === managerId);

  return (
    <>
      <PageHeader
        title={title}
        intro="Each salesperson reports to a sales manager, and each sales manager to a broker."
      />

      {admins.length > 0 && (
        <section className="mb-10 max-w-4xl">
          <h2 className="mb-2 text-lg font-bold">Company admins</h2>
          <ul className="border-t-2 border-ink">
            {admins.map((a) => (
              <PersonRow key={a.id} person={a} />
            ))}
          </ul>
        </section>
      )}

      <ul className="max-w-4xl space-y-10">
        {brokers.map((b) => (
          <li key={b.id}>
            <ul className="border-t-2 border-ink">
              <PersonRow person={b} strong />
            </ul>
            <ManagerList managers={managersOf(b.id)} salesOf={salesOf} />
          </li>
        ))}
        {topManagers.length > 0 && (
          <li>
            <ManagerList managers={topManagers} salesOf={salesOf} flush />
          </li>
        )}
      </ul>
    </>
  );
}

function ManagerList({
  managers,
  salesOf,
  flush = false,
}: {
  managers: TeamMember[];
  salesOf: (id: string) => TeamMember[];
  flush?: boolean;
}) {
  if (managers.length === 0) return null;
  return (
    <ul
      className={
        flush ? 'border-t-2 border-ink' : 'ml-4 border-l-2 border-ink pl-4 sm:ml-6 sm:pl-6'
      }
    >
      {managers.map((m) => (
        <li key={m.id}>
          <ul>
            <PersonRow person={m} strong />
          </ul>
          {salesOf(m.id).length > 0 && (
            <ul className="ml-4 border-l border-rule pl-4 sm:ml-6 sm:pl-6">
              {salesOf(m.id).map((s) => (
                <PersonRow key={s.id} person={s} />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function PersonRow({ person, strong = false }: { person: TeamMember; strong?: boolean }) {
  return (
    <li className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div>
        <p className={strong ? 'font-bold' : 'font-semibold'}>
          {fullName(person)}
          {!person.isActive && (
            <span className="ml-2 text-sm font-normal text-flag">Deactivated</span>
          )}
        </p>
        <p className="text-sm text-graphite">
          {ROLE_LABEL[person.role]}, {person.email}
        </p>
      </div>
      <div className="flex flex-col gap-0.5 sm:items-end">
        {person.credentials.length === 0 && person.role !== 'COMPANY_ADMIN' && (
          <span className="text-sm text-graphite">No credential on file</span>
        )}
        {person.credentials.map((c) => (
          <CredentialBadge key={c.id} credential={c} />
        ))}
      </div>
    </li>
  );
}
