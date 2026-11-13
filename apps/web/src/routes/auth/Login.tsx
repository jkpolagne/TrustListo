import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { ROLE_HOME, ROLE_LABEL, type Role } from '@trustlisto/shared';
import { Logo } from '../../components/Logo';
import { ApiError, api } from '../../lib/api';
import { useMe, useSignIn } from '../../lib/auth';

type DemoAccount = { email: string; role: Role; name: string; firm: string | null };

// Accounts that exist after `pnpm db:reset:starter`. Used only if the API list can't load.
const STARTER_ACCOUNTS: DemoAccount[] = [
  { email: 'superadmin@trustlisto.test', role: 'SUPER_ADMIN', name: 'Platform admin', firm: null },
  { email: 'admin@advench.test', role: 'COMPANY_ADMIN', name: 'Andrea Villanueva', firm: 'Advench Realty' },
  { email: 'broker1@advench.test', role: 'BROKER', name: 'Bernardo Reyes', firm: 'Advench Realty' },
  { email: 'admin@bicolprime.test', role: 'COMPANY_ADMIN', name: 'Teresa Lim', firm: 'Bicol Prime Realty' },
  { email: 'broker@bicolprime.test', role: 'BROKER', name: 'Gilbert Fernandez', firm: 'Bicol Prime Realty' },
];
const DEMO_PASSWORD = 'Password123!';

/** Every active account (development only), so staff added during the demo show up here. */
function useDemoAccounts() {
  return useQuery({
    queryKey: ['demo-accounts'],
    queryFn: () => api<DemoAccount[]>('/auth/demo-accounts'),
    enabled: import.meta.env.DEV,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export function Login() {
  const me = useMe();
  const signIn = useSignIn();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (me.data) return <Navigate to={ROLE_HOME[me.data.role]} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { role } = await signIn.mutateAsync({ email, password });
    const next = params.get('next');
    // Only follow same-site paths.
    navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : ROLE_HOME[role], {
      replace: true,
    });
  }

  const error =
    signIn.error instanceof ApiError
      ? signIn.error.message
      : signIn.error
        ? 'Sign-in failed. Check your connection and try again.'
        : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas/50 px-5 py-6 sm:px-10">
      <Link to="/" aria-label="TrustListo home" className="self-start">
        <Logo className="h-11" />
      </Link>

      <main className="mx-auto my-auto w-full max-w-md py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="mt-2 text-muted">
            Sign in to your <span className="font-semibold text-graphite">TrustListo</span> firm
            account
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-flag"
            >
              <CircleAlert aria-hidden className="size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@yourfirm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              className={`input rounded-xl! px-4! py-3! ${error ? 'border-flag/40!' : ''}`}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                className={`input rounded-xl! py-3! pr-12! pl-4! ${error ? 'border-flag/40!' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-1.5 my-auto grid size-9 place-items-center rounded-lg text-muted hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="size-5" />
                ) : (
                  <Eye aria-hidden className="size-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={signIn.isPending}
            className="mt-3 w-full rounded-xl bg-ink px-6 py-3.5 font-semibold text-paper transition-colors hover:bg-graphite disabled:opacity-60"
          >
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Buyers and sellers don't need an account.{' '}
          <Link to="/properties" className="font-semibold text-ink hover:underline">
            Browse homes
          </Link>
        </p>

        {import.meta.env.DEV && (
          <DemoAccounts
            selected={email}
            onPick={(addr) => {
              setEmail(addr);
              setPassword(DEMO_PASSWORD);
              signIn.reset();
            }}
          />
        )}
      </main>
    </div>
  );
}

function DemoAccounts({ selected, onPick }: { selected: string; onPick: (email: string) => void }) {
  const q = useDemoAccounts();
  const accounts = q.data ?? STARTER_ACCOUNTS;

  // Group by firm, platform admin first.
  const groups = new Map<string, DemoAccount[]>();
  for (const a of accounts) {
    const key = a.firm ?? 'TrustListo platform';
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  return (
    <section aria-labelledby="demo-accounts" className="mt-10">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <h2 id="demo-accounts" className="text-sm text-muted">
          Demo accounts
        </h2>
        <span className="h-px flex-1 bg-line" />
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        Click one to fill the form, then Sign in. Password: {DEMO_PASSWORD}
      </p>

      <div className="mt-4 space-y-4">
        {[...groups].map(([firm, list]) => (
          <div key={firm}>
            <p className="mb-1.5 px-1 text-xs font-semibold text-muted">{firm}</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {list.map((a) => {
                const active = a.email === selected;
                return (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => onPick(a.email)}
                      aria-pressed={active}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-ink bg-paper'
                          : 'border-line bg-paper hover:border-rule hover:bg-canvas'
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold">
                        {a.role === 'SUPER_ADMIN' ? ROLE_LABEL[a.role] : a.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {a.role === 'SUPER_ADMIN' ? a.email : `${ROLE_LABEL[a.role]} · ${a.email}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
