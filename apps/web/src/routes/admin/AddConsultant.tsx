import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { api } from '../../lib/api';
import { fullName, useInvalidateTeam, useTeam, type TeamMember } from '../../lib/team';

type ConsultantRole = 'BROKER' | 'SALES_MANAGER' | 'SALES_PERSON';

const ROLES: { value: ConsultantRole; label: string; reportsTo?: string }[] = [
  { value: 'SALES_PERSON', label: 'Salesperson', reportsTo: 'Sales manager' },
  { value: 'SALES_MANAGER', label: 'Sales manager', reportsTo: 'Broker' },
  { value: 'BROKER', label: 'Broker' },
];

export function AddConsultant() {
  const team = useTeam();
  const invalidate = useInvalidateTeam();
  const [role, setRole] = useState<ConsultantRole>('SALES_PERSON');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    reportsTo: '',
  });
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

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  if (create.data) {
    const { user, temporaryPassword } = create.data;
    return (
      <>
        <PageHeader title={`${fullName(user)} was added`} />
        <div className="max-w-xl border-2 border-ink p-6">
          <p className="font-semibold">Temporary password</p>
          <p className="font-display mt-1 text-3xl tracking-wide break-all select-all">
            {temporaryPassword}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-graphite">
            Give this to {user.firstName} privately, with their email {user.email}. It won't be
            shown again. They should change it after signing in.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to={`/admin/team/${user.id}`}
            className="bg-ink px-5 py-3 font-semibold text-paper hover:bg-graphite"
          >
            Upload their credential
          </Link>
          <button
            onClick={() => {
              create.reset();
              setForm({ firstName: '', lastName: '', email: '', phone: '', reportsTo: '' });
            }}
            className="border-2 border-ink px-5 py-2.5 font-semibold"
          >
            Add another
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add a consultant"
        intro="They'll sign in with their email and a temporary password."
      />
      <form onSubmit={submit} className="max-w-xl space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Role</legend>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`cursor-pointer border-2 border-ink px-4 py-2 font-semibold has-focus-visible:outline-3 has-focus-visible:outline-gold ${
                  role === r.value ? 'bg-ink text-paper' : ''
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

        <div className="grid gap-6 sm:grid-cols-2">
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

        <FormError error={create.error} />
        <div className="flex items-center gap-5">
          <PrimaryButton pending={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add consultant'}
          </PrimaryButton>
          <Link to="/admin/team" className="font-semibold underline-offset-4 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
