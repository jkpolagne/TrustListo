import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@trustlisto/shared';
import { api } from '../../lib/api';

// M0 placeholder. Replaced by the marketplace in M3.
export function Home() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<HealthResponse>('/health'),
    retry: false,
  });

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold text-emerald-700">TrustListo</h1>
      <p className="mt-2 text-slate-600">Verified real-estate listings in Naga City.</p>
      <div className="mt-6 rounded-lg border p-4 text-sm">
        <span className="font-medium">System status: </span>
        {health.isPending && 'checking…'}
        {health.isError && <span className="text-red-600">API unreachable</span>}
        {health.data && (
          <span className="text-emerald-700">
            API ok · database {health.data.db ? 'ok' : 'down'} · PostGIS {health.data.postgis}
          </span>
        )}
      </div>
    </main>
  );
}
