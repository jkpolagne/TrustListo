import { useMutation } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { Field, FormError, FormSuccess, PrimaryButton } from '../../components/Form';
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
} from '../../components/ui';
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
const back = { to: '/admin/team', label: 'Team' };

export function ConsultantDetail() {
  const { id = '' } = useParams();
  const member = useMember(id);

  if (member.isPending) return null;
  if (member.isError || !member.data) {
    return (
      <>
        <PageHeader title="Consultant not found" back={back} />
        <ButtonLink to="/admin/team" variant="secondary">
          Back to team
        </ButtonLink>
      </>
    );
  }
  const m = member.data;

  return (
    <>
      <PageHeader title={fullName(m)} back={back} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar first={m.firstName} last={m.lastName} />
          <div className="flex-1">
            <p className="flex flex-wrap items-center gap-2 font-bold">
              {ROLE_LABEL[m.role]}
              {m.isActive ? <Badge>Active</Badge> : <Badge tone="danger">Deactivated</Badge>}
            </p>
            <p className="text-sm text-muted">{m.email}</p>
          </div>
          {m.referralCode && <ReferralCode member={m} />}
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
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
    <Card>
      <CardHeader title="Details" />
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
          <input id="email" className="input" value={member.email} readOnly />
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
        {save.isSuccess && <FormSuccess>Saved.</FormSuccess>}
        <PrimaryButton pending={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </PrimaryButton>
      </form>
    </Card>
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
    <Card>
      <CardHeader
        title={member.isActive ? 'Deactivate' : 'Reactivate'}
        description={
          member.isActive
            ? `${member.firstName} won't be able to sign in, and is removed from buyer-facing pickers. Their records stay.`
            : `${member.firstName} will be able to sign in again.`
        }
      />
      <div className="space-y-3">
        <FormError error={toggle.error} />
        <Button
          variant={member.isActive ? 'danger' : 'secondary'}
          disabled={toggle.isPending}
          onClick={() => {
            if (!member.isActive || confirm(`Deactivate ${fullName(member)}?`)) toggle.mutate();
          }}
        >
          {member.isActive ? `Deactivate ${member.firstName}` : `Reactivate ${member.firstName}`}
        </Button>
      </div>
    </Card>
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
    <div className="space-y-6">
      <Card>
        <CardHeader title="Credentials" description="Newest first." />
        {member.credentials.length === 0 ? (
          <EmptyState>None uploaded yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {member.credentials.map((c) => (
              <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{CREDENTIAL_NAME[c.type]}</p>
                  <CredentialBadge credential={c} showName={false} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  No. {c.numberEntered}
                  {c.createdAt && `, uploaded ${date.format(new Date(c.createdAt))}`}
                </p>
                {c.status === 'REJECTED' && c.rejectReason && (
                  <p className="mt-2 rounded-lg bg-flag-pale px-3 py-2 text-sm text-flag">
                    Broker's reason: {c.rejectReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Upload a credential"
          description="It's checked automatically, then a broker approves it."
        />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <Field label="Scan or photo" htmlFor="cfile" hint="PDF, JPG, PNG or WebP, up to 10 MB.">
            <input
              id="cfile"
              ref={fileRef}
              type="file"
              required
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="block w-full rounded-lg border border-dashed border-rule bg-canvas p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-paper"
            />
          </Field>
          <FormError error={upload.error} />
          {upload.isSuccess && (
            <FormSuccess>Uploaded. It will appear in the broker's queue shortly.</FormSuccess>
          )}
          <PrimaryButton pending={upload.isPending}>
            <Upload aria-hidden className="size-4" />
            {upload.isPending ? 'Uploading…' : 'Upload credential'}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}

/**
 * The consultant's referral code (SPEC §10.7). A new code stops old shared links from
 * crediting them, e.g. if a link ended up somewhere it shouldn't.
 */
function ReferralCode({ member }: { member: TeamMember }) {
  const invalidate = useInvalidateTeam();
  const [confirming, setConfirming] = useState(false);
  const regen = useMutation({
    mutationFn: () => api(`/users/${member.id}/referral-code`, { method: 'POST' }),
    onSuccess: () => {
      setConfirming(false);
      invalidate();
    },
  });
  return (
    <div className="text-right">
      <p className="text-xs text-muted">Referral code</p>
      <p className="font-mono font-semibold">{member.referralCode}</p>
      {confirming ? (
        <p className="mt-1 text-xs">
          Old links will stop crediting {member.firstName}.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
          >
            {regen.isPending ? 'Changing…' : 'Change it'}
          </button>{' '}
          <button
            type="button"
            className="text-muted underline"
            onClick={() => setConfirming(false)}
          >
            Keep
          </button>
        </p>
      ) : (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-muted underline hover:text-ink"
          onClick={() => setConfirming(true)}
        >
          New code
        </button>
      )}
      <FormError error={regen.error} />
    </div>
  );
}
