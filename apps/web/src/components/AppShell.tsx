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
type NavGroup = { title?: string; items: NavItem[] };

/** A sale's pages, in the order the work happens: lead → visit → client → commission. */
const sales = (base: string, commissions: string): NavGroup => ({
  title: 'Sales',
  items: [
    { to: `${base}/leads`, label: 'Leads', icon: UserRoundSearch },
    { to: `${base}/visits`, label: 'Visits', icon: CalendarDays },
    { to: `${base}/clients`, label: 'Clients', icon: Contact },
    { to: `${base}/commissions`, label: commissions, icon: Receipt },
  ],
});
const listings = (base: string): NavGroup => ({
  title: 'Listings',
  items: [
    { to: `${base}/listings`, label: 'Listings', icon: Home },
    { to: `${base}/sellers`, label: 'Seller requests', icon: Inbox },
  ],
});

// Only screens that exist. Grouped so the menu reads as the work: sales, listings, the firm.
export const NAV: Record<Role, NavGroup[]> = {
  SUPER_ADMIN: [{ items: [{ to: '/superadmin', label: 'Firms', icon: Building2, end: true }] }],
  COMPANY_ADMIN: [
    { items: [{ to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true }] },
    sales('/admin', 'Commissions'),
    listings('/admin'),
    {
      title: 'Your firm',
      items: [
        { to: '/admin/team', label: 'Team', icon: Users },
        { to: '/admin/reports', label: 'Reports', icon: ChartColumn },
        { to: '/admin/activity', label: 'Activity log', icon: History },
        { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
      ],
    },
  ],
  BROKER: [
    { items: [{ to: '/broker', label: 'Review queue', icon: ClipboardCheck, end: true }] },
    sales('/broker', 'Commissions'),
    listings('/broker'),
    {
      title: 'Your firm',
      items: [
        { to: '/broker/team', label: 'Team', icon: Users },
        { to: '/broker/reports', label: 'Reports', icon: ChartColumn },
        { to: '/broker/activity', label: 'Activity log', icon: History },
      ],
    },
  ],
  SALES_MANAGER: [
    { items: [{ to: '/manager', label: 'Overview', icon: LayoutDashboard, end: true }] },
    sales('/manager', 'My commissions'),
    listings('/manager'),
    {
      title: 'Your team',
      items: [
        { to: '/manager/team', label: 'My team', icon: Users },
        { to: '/manager/reports', label: 'Reports', icon: ChartColumn },
      ],
    },
  ],
  SALES_PERSON: [
    { items: [{ to: '/salesperson', label: 'Overview', icon: LayoutDashboard, end: true }] },
    sales('/salesperson', 'My commissions'),
    listings('/salesperson'),
  ],
};

export function AppShell() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!me) return null;

  const groups: NavGroup[] = [
    ...NAV[me.role],
    { items: [{ to: '/account', label: 'Account', icon: Settings }] },
  ];

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

      <nav aria-label="Main" className="-mx-1 mt-5 flex-1 overflow-y-auto px-1">
        {groups.map((g, gi) => (
          <div key={g.title ?? gi} className={gi ? 'mt-4' : ''}>
            {g.title && (
              <p className="mb-1 px-3 text-xs font-semibold text-muted" id={`nav-${gi}`}>
                {g.title}
              </p>
            )}
            <ul
              className="flex flex-col gap-0.5"
              aria-labelledby={g.title ? `nav-${gi}` : undefined}
            >
              {g.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-ink text-paper'
                          : 'text-graphite hover:bg-canvas hover:text-ink'
                      }`
                    }
                  >
                    <Icon aria-hidden className="size-4.5" strokeWidth={2} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
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
