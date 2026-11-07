import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ROLE_LABEL, type Paginated, type Role } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Avatar, Badge, Button, Card, EmptyState } from '../../components/ui';
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
const ACTION: Record<string, { label: string; tone?: 'verified' | 'danger' }> = {
  LOGIN: { label: 'Signed in' },
  LOGIN_FAILED: { label: 'Failed sign-in attempt', tone: 'danger' },
  PASSWORD_CHANGED: { label: 'Changed their password' },
  USER_CREATED: { label: 'Added a consultant' },
  USER_UPDATED: { label: 'Edited a consultant' },
  USER_DEACTIVATED: { label: 'Deactivated a consultant', tone: 'danger' },
  USER_REACTIVATED: { label: 'Reactivated a consultant' },
  CREDENTIAL_UPLOADED: { label: 'Uploaded a credential' },
  CREDENTIAL_APPROVED: { label: 'Approved a credential', tone: 'verified' },
  CREDENTIAL_REJECTED: { label: 'Rejected a credential', tone: 'danger' },
};
const actionOf = (a: string) =>
  ACTION[a] ?? { label: a.charAt(0) + a.slice(1).toLowerCase().replaceAll('_', ' ') };

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
        intro="Every sign-in, approval, rejection and status change in your firm. Entries can't be edited or deleted."
      />
      {log.isError && <p className="text-flag">{log.error.message}</p>}
      {log.data && (
        <Card padded={false} className="overflow-hidden">
          {log.data.data.length === 0 ? (
            <div className="p-6">
              <EmptyState>No activity yet.</EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Person</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                    <th className="px-5 py-3 text-right font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {log.data.data.map((r) => {
                    const a = actionOf(r.action);
                    return (
                      <tr key={r.id} className="hover:bg-canvas/60">
                        <td className="px-5 py-3">
                          {r.actor ? (
                            <div className="flex items-center gap-3">
                              <Avatar first={r.actor.firstName} last={r.actor.lastName} size="sm" />
                              <div>
                                <p className="font-semibold">
                                  {r.actor.firstName} {r.actor.lastName}
                                </p>
                                <p className="text-xs text-muted">{ROLE_LABEL[r.actor.role]}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">System</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {a.tone ? <Badge tone={a.tone}>{a.label}</Badge> : a.label}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap tabular-nums text-muted">
                          {when.format(new Date(r.createdAt))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
            <span className="tabular-nums text-muted">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Newer
              </Button>
              <Button
                variant="secondary"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Older
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
