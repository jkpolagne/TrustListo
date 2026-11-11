import {
  Building2,
  ClipboardCheck,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  Users,
  X,
  CalendarDays,
  Contact,
  Inbox,
  Receipt,
  ChartColumn,
  UserRoundSearch,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABEL, type Role } from '@trustlisto/shared';
import { useMe, useSignOut } from '../lib/auth';
import { Logo } from './Logo';
import { Avatar } from './ui';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

// Only screens that exist.
export const NAV: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [{ to: '/superadmin', label: 'Firms', icon: Building2, end: true }],
  COMPANY_ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/listings', label: 'Listings', icon: Home },
    { to: '/admin/leads', label: 'Leads', icon: UserRoundSearch },
    { to: '/admin/visits', label: 'Visits', icon: CalendarDays },
    { to: '/admin/clients', label: 'Clients', icon: Contact },
    { to: '/admin/commissions', label: 'Commissions', icon: Receipt },
    { to: '/admin/reports', label: 'Reports', icon: ChartColumn },
    { to: '/admin/sellers', label: 'Seller requests', icon: Inbox },
    { to: '/admin/team', label: 'Team', icon: Users },
    { to: '/admin/activity', label: 'Activity log', icon: History },
    { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
  ],
  BROKER: [
    { to: '/broker', label: 'Review queue', icon: ClipboardCheck, end: true },
    { to: '/broker/listings', label: 'Listings', icon: Home },
    { to: '/broker/leads', label: 'Leads', icon: UserRoundSearch },
    { to: '/broker/visits', label: 'Visits', icon: CalendarDays },
    { to: '/broker/clients', label: 'Clients', icon: Contact },
    { to: '/broker/commissions', label: 'Commissions', icon: Receipt },
    { to: '/broker/reports', label: 'Reports', icon: ChartColumn },
    { to: '/broker/sellers', label: 'Seller requests', icon: Inbox },
    { to: '/broker/team', label: 'Team', icon: Users },
    { to: '/broker/activity', label: 'Activity log', icon: History },
  ],
  SALES_MANAGER: [
    { to: '/manager', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/manager/team', label: 'My team', icon: Users },
    { to: '/manager/listings', label: 'Listings', icon: Home },
    { to: '/manager/leads', label: 'Leads', icon: UserRoundSearch },
    { to: '/manager/visits', label: 'Visits', icon: CalendarDays },
    { to: '/manager/clients', label: 'Clients', icon: Contact },
    { to: '/manager/commissions', label: 'My commissions', icon: Receipt },
    { to: '/manager/reports', label: 'Reports', icon: ChartColumn },
    { to: '/manager/sellers', label: 'Seller requests', icon: Inbox },
  ],
  SALES_PERSON: [
    { to: '/salesperson', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/salesperson/listings', label: 'Listings', icon: Home },
    { to: '/salesperson/leads', label: 'Leads', icon: UserRoundSearch },
    { to: '/salesperson/visits', label: 'Visits', icon: CalendarDays },
    { to: '/salesperson/clients', label: 'Clients', icon: Contact },
    { to: '/salesperson/commissions', label: 'My commissions', icon: Receipt },
    { to: '/salesperson/sellers', label: 'Seller requests', icon: Inbox },
  ],
};

export function AppShell() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!me) return null;

  const items: NavItem[] = [...NAV[me.role], { to: '/account', label: 'Account', icon: Settings }];

  async function handleSignOut() {
    await signOut.mutateAsync();
    navigate('/login', { replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-1">
        <Link to="/" aria-label="TrustListo home">
          <Logo className="h-10" />
        </Link>
      </div>
      <div className="mx-1 mt-6 rounded-xl bg-canvas px-3 py-2.5">
        <p className="text-xs font-medium text-muted">Workspace</p>
        <p className="truncate text-sm font-bold">{me.firm?.name ?? 'TrustListo platform'}</p>
      </div>

      <nav aria-label="Main" className="mt-5 flex flex-1 flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive ? 'bg-ink text-paper' : 'text-graphite hover:bg-canvas hover:text-ink'
              }`
            }
          >
            <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 flex items-center gap-3 border-t border-line px-1 pt-4">
        <Avatar first={me.firstName} last={me.lastName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {me.firstName} {me.lastName}
          </p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[me.role]}</p>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-paper p-4 lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
        <Logo className="h-8" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-10 place-items-center rounded-lg hover:bg-canvas"
        >
          <Menu aria-hidden className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-paper p-4 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg hover:bg-canvas"
            >
              <X aria-hidden className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  intro,
  actions,
  back,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-block text-sm font-semibold text-muted hover:text-ink"
        >
          ‹ {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
          {intro && <p className="mt-1 text-sm leading-relaxed text-muted">{intro}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
