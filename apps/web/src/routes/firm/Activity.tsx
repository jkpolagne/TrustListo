import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ROLE_LABEL, type Paginated, type Role } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { api } from '../../lib/api';

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { firstName: string; lastName: string; role: Role } | null;
}

// Plain-language names for audit actions. Unknown actions fall back to a readable form.
const ACTION_LABEL: Record<string, string> = {
  LOGIN: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in attempt',
  PASSWORD_CHANGED: 'Changed their password',
};
const actionLabel = (a: string) =>
  ACTION_LABEL[a] ?? a.charAt(0) + a.slice(1).toLowerCase().replaceAll('_', ' ');

const when = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const PAGE_SIZE = 25;

export function Activity() {
  const [page, setPage] = useState(1);
  const log = useQuery({
    queryKey: ['audit', page],
    queryFn: () => api<Paginated<AuditRow>>(`/audit?page=${page}&pageSize=${PAGE_SIZE}`),
    placeholderData: (prev) => prev,
  });
  const pages = log.data ? Math.max(1, Math.ceil(log.data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="Activity log"
        intro="Every sign-in, approval, rejection, signature and status change in your firm. Entries can't be edited or deleted."
      />
      {log.isError && <p className="text-flag">{log.error.message}</p>}
      {log.data && log.data.data.length === 0 && <p className="text-graphite">No activity yet.</p>}
      {log.data && log.data.data.length > 0 && (
        <div className="max-w-3xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-ink">
              <tr>
                <th className="py-2 pr-4 font-semibold">When</th>
                <th className="py-2 pr-4 font-semibold">Who</th>
                <th className="py-2 font-semibold">What</th>
              </tr>
            </thead>
            <tbody>
              {log.data.data.map((r) => (
                <tr key={r.id} className="border-b border-rule align-top">
                  <td className="py-3 pr-4 whitespace-nowrap tabular-nums text-graphite">
                    {when.format(new Date(r.createdAt))}
                  </td>
                  <td className="py-3 pr-4">
                    {r.actor ? (
                      <>
                        <span className="font-semibold">
                          {r.actor.firstName} {r.actor.lastName}
                        </span>
                        <span className="block text-graphite">{ROLE_LABEL[r.actor.role]}</span>
                      </>
                    ) : (
                      <span className="text-graphite">System</span>
                    )}
                  </td>
                  <td className="py-3">{actionLabel(r.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 flex items-center gap-4 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-2 border-ink px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Newer
            </button>
            <span className="tabular-nums text-graphite">
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="border-2 border-ink px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Older
            </button>
          </div>
        </div>
      )}
    </>
  );
}
