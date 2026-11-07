import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ROLE_HOME } from '@trustlisto/shared';
import { BrokerSeal } from '../../components/BrokerSeal';
import { Logo } from '../../components/Logo';
import { ApiError } from '../../lib/api';
import { useMe, useSignIn } from '../../lib/auth';

// Seed accounts (SPEC §17). Shown only in development.
const demoAccounts = [
  ['superadmin@trustlisto.test', 'Platform admin'],
  ['admin@advench.test', 'Company admin, Advench'],
  ['broker1@advench.test', 'Broker, Advench'],
  ['sm1@advench.test', 'Sales manager, Advench'],
  ['sp1@advench.test', 'Salesperson, Advench'],
  ['admin@bicolprime.test', 'Company admin, Bicol Prime'],
] as const;

export function Login() {
  const me = useMe();
  const signIn = useSignIn();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link to="/" aria-label="TrustListo home" className="self-start">
          <Logo className="h-12" />
        </Link>

        <div className="my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-4xl leading-tight">Sign in to your firm</h1>
          <p className="mt-3 text-graphite">
            For brokers, consultants and company admins. Buyers and sellers don't need an account.
          </p>

          <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="border-l-4 border-flag bg-flag/5 px-3 py-2 text-sm text-flag"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={signIn.isPending}
              className="w-full bg-ink px-6 py-3.5 font-semibold text-paper hover:bg-graphite disabled:opacity-60"
            >
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-10 border-t border-rule pt-5">
              <p className="text-sm font-semibold">Demo accounts</p>
              <p className="text-sm text-graphite">Password for all: Password123!</p>
              <ul className="mt-3 space-y-1 text-sm">
                {demoAccounts.map(([addr, label]) => (
                  <li key={addr}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(addr);
                        setPassword('Password123!');
                      }}
                      className="text-left underline-offset-4 hover:underline"
                    >
                      {label}
                      <span className="text-graphite"> ({addr})</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden flex-col justify-end bg-ink p-12 text-paper lg:flex">
        <BrokerSeal size={88} />
        <p className="font-display mt-8 max-w-md text-3xl leading-tight">
          Only a licensed broker can approve a listing, a document or a credential.
        </p>
        <p className="mt-4 max-w-md text-paper/70">
          Every approval, rejection and signature is recorded with who made it and when.
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
