import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { HealthResponse } from '@trustlisto/shared';
import { api } from '../../lib/api';
import { Logo } from '../Logo';

const nav = [
  { to: '/properties', label: 'Browse homes' },
  { to: '/about-badges', label: 'What badges mean' },
];

export function PublicLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-[1000] border-b border-line bg-paper/90 backdrop-blur">
        <div
          className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-8 ${wide ? 'max-w-[1600px]' : 'max-w-6xl'}`}
        >
          <Link to="/" aria-label="TrustListo home">
            <Logo className="h-10 sm:h-12" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `hidden rounded-lg px-3 py-2 sm:inline-block ${isActive ? 'bg-canvas' : 'hover:bg-canvas'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/properties" className="rounded-lg px-3 py-2 hover:bg-canvas sm:hidden">
              Browse
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-rule px-3.5 py-2 transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              Firm sign-in
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-2xl">TrustListo</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper/70">
              A shared marketplace for licensed real-estate brokerages in Naga City, Camarines Sur.
              Badges reflect documents reviewed by a firm's licensed broker, not a government
              database check.
            </p>
          </div>
          {import.meta.env.DEV && <SystemStatus />}
        </div>
      </footer>
    </div>
  );
}

/** Dev-only: shows whether the API and database are reachable. */
function SystemStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<HealthResponse>('/health'),
    retry: false,
  });
  const ok = health.data?.db === true;
  return (
    <p className="flex items-center gap-2 text-sm text-paper/70">
      <span aria-hidden className={`size-2 rounded-full ${ok ? 'bg-gold' : 'bg-flag'}`} />
      {health.isPending
        ? 'Checking API'
        : ok
          ? 'API and database online'
          : 'API unreachable. Run pnpm dev and pnpm db:up.'}
    </p>
  );
}
