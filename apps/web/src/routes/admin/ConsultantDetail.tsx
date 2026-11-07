import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { api } from '../../lib/api';
import {
  CREDENTIAL_NAME,
  fullName,
  useInvalidateTeam,
  useMember,
  useTeam,
  type Credential,
  type TeamMember,
} from '../../lib/team';

const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function ConsultantDetail() {
  const { id = '' } = useParams();
  const member = useMember(id);

  if (member.isPending) return null;
  if (member.isError || !member.data) {
    return (
      <>
        <PageHeader title="Consultant not found" />
        <Link to="/admin/team" className="font-semibold underline underline-offset-4">
          Back to team
        </Link>
      </>
    );
  }
  const m = member.data;

  return (
    <>
      <Link to="/admin/team" className="text-sm font-semibold underline-offset-4 hover:underline">
        Team
      </Link>
      <PageHeader
        title={fullName(m)}
        intro={`${ROLE_LABEL[m.role]}${m.isActive ? '' : ', deactivated'}. Referral code ${m.referralCode ?? 'none'}.`}
      />
      <div className="grid max-w-5xl gap-14 lg:grid-cols-2">
        <div className="space-y-12">
          <Details member={m} />
          <ActiveSwitch member={m} />
        </div>
        <Credentials member={m} />
      </div>
    </>
  );
}

function Details({ member }: { member: TeamMember }) {
  const team = useTeam();
  const invalidate = useInvalidateTeam();
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone ?? '',
    reportsTo: member.managerId ?? member.brokerId ?? '',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const supervisorRole =
    member.role === 'SALES_PERSON'
      ? 'SALES_MANAGER'
      : member.role === 'SALES_MANAGER'
        ? 'BROKER'
        : null;
  const supervisors = (team.data ?? []).filter((p) => p.role === supervisorRole && p.isActive);

  const save = useMutation({
    mutationFn: () =>
      api<TeamMember>(`/users/${member.id}`, {
        method: 'PATCH',
        json: {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || null,
          ...(member.role === 'SALES_PERSON' && { managerId: form.reportsTo }),
          ...(member.role === 'SALES_MANAGER' && { brokerId: form.reportsTo }),
        },
      }),
    onSuccess: invalidate,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <section>
      <h2 className="text-xl font-bold">Details</h2>
      <form onSubmit={submit} className="mt-4 space-y-5">
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
        <Field label="Email" htmlFor="email" hint="Email can't be changed here.">
          <input id="email" className="input bg-stone" value={member.email} readOnly />
        </Field>
        <Field label="Mobile number" htmlFor="phone">
          <input
            id="phone"
            type="tel"
            className="input"
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>
        {supervisorRole && (
          <Field
            label={`Reports to (${ROLE_LABEL[supervisorRole].toLowerCase()})`}
            htmlFor="reportsTo"
          >
            <select
              id="reportsTo"
              className="input"
              required
              value={form.reportsTo}
              onChange={set('reportsTo')}
            >
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {fullName(s)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <FormError error={save.error} />
        {save.isSuccess && (
          <p role="status" className="text-sm font-semibold">
            Saved.
          </p>
        )}
        <PrimaryButton pending={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </PrimaryButton>
      </form>
    </section>
  );
}

function ActiveSwitch({ member }: { member: TeamMember }) {
  const invalidate = useInvalidateTeam();
  const toggle = useMutation({
    mutationFn: () =>
      api(`/users/${member.id}`, { method: 'PATCH', json: { isActive: !member.isActive } }),
    onSuccess: invalidate,
  });

  return (
    <section className="border-t border-rule pt-6">
      <h2 className="text-xl font-bold">{member.isActive ? 'Deactivate' : 'Reactivate'}</h2>
      <p className="mt-2 max-w-md text-graphite">
        {member.isActive
          ? `${member.firstName} won't be able to sign in, and is removed from buyer-facing pickers. Their records stay.`
          : `${member.firstName} will be able to sign in again.`}
      </p>
      <div className="mt-4 space-y-3">
        <FormError error={toggle.error} />
        <button
          onClick={() => {
            if (!member.isActive || confirm(`Deactivate ${fullName(member)}?`)) toggle.mutate();
          }}
          disabled={toggle.isPending}
          className={`border-2 px-5 py-2.5 font-semibold disabled:opacity-60 ${
            member.isActive ? 'border-flag text-flag hover:bg-flag hover:text-paper' : 'border-ink'
          }`}
        >
          {member.isActive ? `Deactivate ${member.firstName}` : `Reactivate ${member.firstName}`}
        </button>
      </div>
    </section>
  );
}

function Credentials({ member }: { member: TeamMember }) {
  const invalidate = useInvalidateTeam();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<Credential['type']>(
    member.role === 'BROKER' ? 'PRC_LICENSE' : 'DHSUD_REGISTRATION',
  );
  const [number, setNumber] = useState('');

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('numberEntered', number);
      const file = fileRef.current?.files?.[0];
      if (file) fd.append('file', file);
      return api<Credential>(`/users/${member.id}/credentials`, { method: 'POST', body: fd });
    },
    onSuccess: () => {
      setNumber('');
      if (fileRef.current) fileRef.current.value = '';
      invalidate();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    upload.mutate();
  }

  return (
    <section>
      <h2 className="text-xl font-bold">Credentials</h2>
      <ul className="mt-3 border-t-2 border-ink">
        {member.credentials.length === 0 && (
          <li className="py-3 text-graphite">None uploaded yet.</li>
        )}
        {member.credentials.map((c) => (
          <li key={c.id} className="border-b border-rule py-3">
            <CredentialBadge credential={c} />
            <p className="mt-0.5 text-sm text-graphite">
              No. {c.numberEntered}
              {c.createdAt && `, uploaded ${date.format(new Date(c.createdAt))}`}
            </p>
            {c.status === 'REJECTED' && c.rejectReason && (
              <p className="mt-1 text-sm">
                <span className="font-semibold">Broker's reason:</span> {c.rejectReason}
              </p>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-8 space-y-5 border-2 border-ink p-5">
        <h3 className="font-bold">Upload a credential</h3>
        <Field label="Type" htmlFor="ctype">
          <select
            id="ctype"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as Credential['type'])}
          >
            {(['PRC_LICENSE', 'DHSUD_REGISTRATION'] as const).map((t) => (
              <option key={t} value={t}>
                {CREDENTIAL_NAME[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Number on the document" htmlFor="cnum">
          <input
            id="cnum"
            className="input"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </Field>
        <Field label="Scan or photo" htmlFor="cfile" hint="PDF, JPG, PNG or WebP, up to 10 MB.">
          <input
            id="cfile"
            ref={fileRef}
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:border-2 file:border-ink file:bg-paper file:px-3 file:py-1.5 file:font-semibold"
          />
        </Field>
        <FormError error={upload.error} />
        {upload.isSuccess && (
          <p role="status" className="text-sm font-semibold">
            Uploaded. It's checked automatically, then goes to a broker for approval.
          </p>
        )}
        <PrimaryButton pending={upload.isPending}>
          {upload.isPending ? 'Uploading…' : 'Upload credential'}
        </PrimaryButton>
      </form>
    </section>
  );
}
