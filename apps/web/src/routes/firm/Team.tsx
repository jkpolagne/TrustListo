import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { Avatar, Badge, ButtonLink, Card, CardHeader } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { fullName, useTeam, type TeamMember } from '../../lib/team';

/** Firm hierarchy: broker → sales managers → salespersons (SPEC §5.1). */
export function Team({ title = 'Team' }: { title?: string }) {
  const team = useTeam();
  const isAdmin = useMe().data?.role === 'COMPANY_ADMIN';

  const header = (
    <PageHeader
      title={title}
      intro="Each salesperson reports to a sales manager, and each sales manager to a broker."
      actions={isAdmin && <ButtonLink to="/admin/team/new">Add consultant</ButtonLink>}
    />
  );
  if (team.isPending) return header;
  if (team.isError)
    return (
      <>
        {header}
        <p className="text-flag">{team.error.message}</p>
      </>
    );

  const people = team.data;
  const ids = new Set(people.map((p) => p.id));
  const admins = people.filter((p) => p.role === 'COMPANY_ADMIN');
  const brokers = people.filter((p) => p.role === 'BROKER');
  const managersOf = (brokerId: string) =>
    people.filter((p) => p.role === 'SALES_MANAGER' && p.brokerId === brokerId);
  // Managers whose broker isn't visible to this viewer (e.g. a manager viewing their own team).
  const topManagers = people.filter(
    (p) => p.role === 'SALES_MANAGER' && (!p.brokerId || !ids.has(p.brokerId)),
  );
  const salesOf = (managerId: string) =>
    people.filter((p) => p.role === 'SALES_PERSON' && p.managerId === managerId);

  return (
    <>
      {header}
      <div className="space-y-6">
        {brokers.map((b) => {
          const managers = managersOf(b.id);
          const size = managers.reduce((n, m) => n + 1 + salesOf(m.id).length, 0);
          return (
            <Card key={b.id} padded={false}>
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <PersonRow person={b} isAdmin={isAdmin} />
              </div>
              <div className="px-3 py-2 sm:px-4">
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted">
                  {size} {size === 1 ? 'person reports' : 'people report'} to {b.firstName}
                </p>
                <ManagerGroups managers={managers} salesOf={salesOf} isAdmin={isAdmin} />
              </div>
            </Card>
          );
        })}

        {topManagers.length > 0 && (
          <Card padded={false}>
            <div className="px-3 py-2 sm:px-4">
              <ManagerGroups managers={topManagers} salesOf={salesOf} isAdmin={isAdmin} />
            </div>
          </Card>
        )}

        {admins.length > 0 && (
          <Card>
            <CardHeader title="Company admins" />
            <ul className="divide-y divide-line">
              {admins.map((a) => (
                <li key={a.id} className="py-2">
                  <PersonRow person={a} isAdmin={false} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

function ManagerGroups({
  managers,
  salesOf,
  isAdmin,
}: {
  managers: TeamMember[];
  salesOf: (id: string) => TeamMember[];
  isAdmin: boolean;
}) {
  if (managers.length === 0) {
    return <p className="px-2 py-3 text-sm text-muted">No sales managers yet.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {managers.map((m) => (
        <li key={m.id} className="py-1">
          <div className="rounded-lg px-2 py-2">
            <PersonRow person={m} isAdmin={isAdmin} />
          </div>
          {salesOf(m.id).length > 0 && (
            <ul className="mb-2 ml-6 border-l-2 border-line pl-4 sm:ml-7">
              {salesOf(m.id).map((s) => (
                <li key={s.id} className="rounded-lg px-2 py-2">
                  <PersonRow person={s} isAdmin={isAdmin} small />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function PersonRow({
  person,
  isAdmin,
  small = false,
}: {
  person: TeamMember;
  isAdmin: boolean;
  small?: boolean;
}) {
  const linked = isAdmin && person.role !== 'COMPANY_ADMIN';
  const body = (
    <>
      <Avatar first={person.firstName} last={person.lastName} size={small ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {fullName(person)}
          {!person.isActive && <Badge tone="danger">Deactivated</Badge>}
        </p>
        <p className="truncate text-xs text-muted">
          {ROLE_LABEL[person.role]}, {person.email}
        </p>
      </div>
      <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
        {person.credentials.length === 0 && person.role !== 'COMPANY_ADMIN' && (
          <Badge>No credential</Badge>
        )}
        {latestPerType(person.credentials).map((c) => (
          <CredentialBadge key={c.id} credential={c} />
        ))}
      </div>
      {linked && <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />}
    </>
  );
  return linked ? (
    <Link
      to={`/admin/team/${person.id}`}
      className="-m-2 flex items-center gap-3 rounded-lg p-2 hover:bg-canvas"
    >
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3">{body}</div>
  );
}

/** Show only the newest credential of each type in lists; history lives on the detail page. */
function latestPerType(creds: TeamMember['credentials']) {
  const seen = new Set<string>();
  return creds.filter((c) => (seen.has(c.type) ? false : (seen.add(c.type), true)));
}
