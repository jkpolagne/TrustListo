import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABEL, type Role } from '@trustlisto/shared';
import { useMe, useSignOut } from '../lib/auth';
import { Logo } from './Logo';

type NavItem = { to: string; label: string; end?: boolean };

// Only screens that exist. Later milestones add listings, leads, clients, commissions.
export const NAV: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [{ to: '/superadmin', label: 'Firms', end: true }],
  COMPANY_ADMIN: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/team', label: 'Team' },
    { to: '/admin/activity', label: 'Activity log' },
  ],
  BROKER: [
    { to: '/broker', label: 'Review queue', end: true },
    { to: '/broker/team', label: 'Team' },
    { to: '/broker/activity', label: 'Activity log' },
  ],
  SALES_MANAGER: [
    { to: '/manager', label: 'Overview', end: true },
    { to: '/manager/team', label: 'My team' },
  ],
  SALES_PERSON: [{ to: '/salesperson', label: 'Overview', end: true }],
};

export function AppShell() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!me) return null;

  const items = [...NAV[me.role], { to: '/account', label: 'Account' }];

  async function handleSignOut() {
    await signOut.mutateAsync();
    navigate('/login', { replace: true });
  }

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `px-3 py-2.5 font-semibold ${isActive ? 'bg-ink text-paper' : 'hover:bg-stone'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r-2 border-ink lg:flex lg:min-h-screen lg:flex-col lg:p-5">
        <Link to="/" aria-label="TrustListo home">
          <Logo className="h-11" />
        </Link>
        <div className="mt-8 border-y border-rule py-4">
          <p className="font-bold leading-tight">{me.firm?.name ?? 'TrustListo platform'}</p>
          <p className="mt-0.5 text-sm text-graphite">
            {me.firstName} {me.lastName}
            <br />
            {ROLE_LABEL[me.role]}
          </p>
        </div>
        <div className="mt-4 flex-1">{nav}</div>
        <button
          onClick={handleSignOut}
          className="self-start px-3 py-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b-2 border-ink px-4 py-3 lg:hidden">
        <Logo className="h-9" />
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="border-2 border-ink px-3 py-1.5 text-sm font-semibold"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </header>
      {open && (
        <div className="border-b-2 border-ink px-4 py-4 lg:hidden">
          <p className="mb-3 text-sm text-graphite">
            {me.firstName} {me.lastName}, {ROLE_LABEL[me.role]}
            {me.firm && ` at ${me.firm.name}`}
          </p>
          {nav}
          <button onClick={handleSignOut} className="mt-3 px-3 py-2 text-sm font-semibold">
            Sign out
          </button>
        </div>
      )}

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <h1 className="font-display text-[clamp(1.9rem,3.2vw,2.6rem)] leading-tight">{title}</h1>
      {intro && <p className="mt-2 leading-relaxed text-graphite">{intro}</p>}
    </header>
  );
}
