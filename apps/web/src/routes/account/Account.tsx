import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, FormSuccess, PrimaryButton } from '../../components/Form';
import { Avatar, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useMe } from '../../lib/auth';

export function Account() {
  const { data: me } = useMe();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const change = useMutation({
    mutationFn: () =>
      api<void>('/auth/change-password', { json: { currentPassword, newPassword } }),
    onSuccess: () => {
      setCurrent('');
      setNew('');
    },
  });

  if (!me) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    change.mutate();
  }

  return (
    <>
      <PageHeader title="Account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar first={me.firstName} last={me.lastName} />
            <div>
              <p className="font-bold">
                {me.firstName} {me.lastName}
              </p>
              <p className="text-sm text-muted">{me.email}</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-3 border-t border-line pt-5 text-sm">
            <dt className="text-muted">Role</dt>
            <dd className="font-medium">{ROLE_LABEL[me.role]}</dd>
            {me.firm && (
              <>
                <dt className="text-muted">Firm</dt>
                <dd className="font-medium">{me.firm.name}</dd>
              </>
            )}
            {me.referralCode && (
              <>
                <dt className="text-muted">Referral code</dt>
                <dd className="font-mono font-semibold">{me.referralCode}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Change password"
            description="At least 10 characters, with a letter and a number."
          />
          <form onSubmit={submit} className="space-y-4">
            <Field label="Current password" htmlFor="cur">
              <input
                id="cur"
                type="password"
                autoComplete="current-password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="New password" htmlFor="new">
              <input
                id="new"
                type="password"
                autoComplete="new-password"
                className="input"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
              />
            </Field>
            <FormError error={change.error} />
            {change.isSuccess && <FormSuccess>Password changed.</FormSuccess>}
            <PrimaryButton pending={change.isPending}>
              {change.isPending ? 'Changing…' : 'Change password'}
            </PrimaryButton>
          </form>
        </Card>
      </div>
    </>
  );
}
