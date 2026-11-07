import { useMutation } from '@tanstack/react-query';
import { Check, Copy } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { Button, ButtonLink, Card } from '../../components/ui';
import { api } from '../../lib/api';
import { fullName, useInvalidateTeam, useTeam, type TeamMember } from '../../lib/team';

type ConsultantRole = 'BROKER' | 'SALES_MANAGER' | 'SALES_PERSON';

const ROLES: { value: ConsultantRole; label: string; reportsTo?: string }[] = [
  { value: 'SALES_PERSON', label: 'Salesperson', reportsTo: 'Sales manager' },
  { value: 'SALES_MANAGER', label: 'Sales manager', reportsTo: 'Broker' },
  { value: 'BROKER', label: 'Broker' },
];

const blank = { firstName: '', lastName: '', email: '', phone: '', reportsTo: '' };

export function AddConsultant() {
  const team = useTeam();
  const invalidate = useInvalidateTeam();
  const [role, setRole] = useState<ConsultantRole>('SALES_PERSON');
  const [form, setForm] = useState(blank);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: () =>
      api<{ user: TeamMember; temporaryPassword: string }>('/users', {
        json: {
          role,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          managerId: role === 'SALES_PERSON' ? form.reportsTo || undefined : undefined,
          brokerId: role === 'SALES_MANAGER' ? form.reportsTo || undefined : undefined,
        },
      }),
    onSuccess: invalidate,
  });

  const supervisorRole =
    role === 'SALES_PERSON' ? 'SALES_MANAGER' : role === 'SALES_MANAGER' ? 'BROKER' : null;
  const supervisors = (team.data ?? []).filter((p) => p.role === supervisorRole && p.isActive);
  const current = ROLES.find((r) => r.value === role)!;
  const back = { to: '/admin/team', label: 'Team' };

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  if (create.data) {
    const { user, temporaryPassword } = create.data;
    return (
      <>
        <PageHeader title={`${fullName(user)} was added`} back={back} />
        <Card className="max-w-xl">
          <p className="text-sm font-semibold">Temporary password</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-canvas px-4 py-3 font-mono text-xl font-bold tracking-wider break-all select-all">
              {temporaryPassword}
            </code>
            <Button
              variant="secondary"
              type="button"
              aria-label="Copy password"
              onClick={() => {
                void navigator.clipboard?.writeText(temporaryPassword);
                setCopied(true);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Give this to {user.firstName} privately, with their email {user.email}. It won't be
            shown again. They should change it after signing in.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            <ButtonLink to={`/admin/team/${user.id}`}>Upload their credential</ButtonLink>
            <Button
              variant="secondary"
              onClick={() => {
                create.reset();
                setCopied(false);
                setForm(blank);
              }}
            >
              Add another
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add a consultant"
        intro="They'll sign in with their email and a temporary password."
        back={back}
      />
      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Role</legend>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-canvas p-1">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-gold ${
                    role === r.value ? 'bg-paper shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => {
                      setRole(r.value);
                      setForm((f) => ({ ...f, reportsTo: '' }));
                    }}
                    className="sr-only"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>

          {current.reportsTo && (
            <Field label={`Reports to (${current.reportsTo.toLowerCase()})`} htmlFor="reportsTo">
              <select
                id="reportsTo"
                className="input"
                required
                value={form.reportsTo}
                onChange={set('reportsTo')}
              >
                <option value="">Choose…</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName">
              <input
                id="firstName"
                className="input"
                required
                value={form.firstName}
                onChange={set('firstName')}
              />
            </Field>
            <Field label="Last name" htmlFor="lastName">
              <input
                id="lastName"
                className="input"
                required
                value={form.lastName}
                onChange={set('lastName')}
              />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                className="input"
                required
                value={form.email}
                onChange={set('email')}
              />
            </Field>
            <Field label="Mobile number (optional)" htmlFor="phone">
              <input
                id="phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={set('phone')}
              />
            </Field>
          </div>

          <FormError error={create.error} />
          <div className="flex items-center gap-2 border-t border-line pt-5">
            <PrimaryButton pending={create.isPending}>
              {create.isPending ? 'Adding…' : 'Add consultant'}
            </PrimaryButton>
            <ButtonLink to="/admin/team" variant="ghost">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </>
  );
}
