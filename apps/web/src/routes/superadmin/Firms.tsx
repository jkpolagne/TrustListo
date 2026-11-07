import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/AppShell';
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

  return (
    <>
      <PageHeader
        title="Firms"
        intro="Brokerages on TrustListo. You see each firm's status and size, never its clients, documents or commissions."
      />
      {firms.isError && <p className="text-flag">{firms.error.message}</p>}
      {firms.data && (
        <div className="max-w-4xl overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b-2 border-ink text-sm">
              <tr>
                <th className="py-2 pr-4 font-semibold">Firm</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 text-right font-semibold">Users</th>
                <th className="py-2 pr-4 text-right font-semibold">Live listings</th>
                <th className="py-2 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {firms.data.map((f) => (
                <tr key={f.id} className="border-b border-rule">
                  <td className="py-3 pr-4 font-semibold">{f.name}</td>
                  <td
                    className={`py-3 pr-4 ${f.status === 'SUSPENDED' ? 'font-semibold text-flag' : ''}`}
                  >
                    {f.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{f.userCount}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{f.liveListingCount}</td>
                  <td className="py-3 tabular-nums text-graphite">
                    {joined.format(new Date(f.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
