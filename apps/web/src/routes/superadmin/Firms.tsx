import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/AppShell';
import { Badge, Card, StatCard } from '../../components/ui';
import { api } from '../../lib/api';

interface FirmRow {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  userCount: number;
  liveListingCount: number;
}

const joined = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function Firms() {
  const firms = useQuery({
    queryKey: ['admin', 'firms'],
    queryFn: () => api<{ data: FirmRow[] }>('/admin/firms').then((r) => r.data),
  });
  const rows = firms.data ?? [];
  const sum = (k: 'userCount' | 'liveListingCount') => rows.reduce((n, f) => n + f[k], 0);

  return (
    <>
      <PageHeader
        title="Firms"
        intro="Brokerages on TrustListo. You see each firm's status and size, never its clients, documents or commissions."
      />
      {firms.isError && <p className="text-flag">{firms.error.message}</p>}
      {firms.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Firms"
              value={rows.length}
              hint={`${rows.filter((f) => f.status === 'ACTIVE').length} active`}
            />
            <StatCard label="Users" value={sum('userCount')} />
            <StatCard label="Live listings" value={sum('liveListingCount')} />
          </div>
          <Card padded={false} className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Firm</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Users</th>
                    <th className="px-5 py-3 text-right font-semibold">Live listings</th>
                    <th className="px-5 py-3 text-right font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((f) => (
                    <tr key={f.id} className="hover:bg-canvas/60">
                      <td className="px-5 py-3.5 font-semibold">{f.name}</td>
                      <td className="px-5 py-3.5">
                        {f.status === 'ACTIVE' ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge tone="danger">Suspended</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{f.userCount}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{f.liveListingCount}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted">
                        {joined.format(new Date(f.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
