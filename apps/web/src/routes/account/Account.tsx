import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { ApiError, api } from '../../lib/api';
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

  const err = change.error instanceof ApiError ? change.error : null;
  const fieldIssue =
    err?.code === 'VALIDATION_FAILED' && Array.isArray(err.details)
      ? (err.details[0] as { message?: string })?.message
      : null;

  return (
    <>
      <PageHeader title="Account" />
      <dl className="mb-12 grid max-w-xl grid-cols-[8rem_1fr] gap-y-2 border-t-2 border-ink pt-4">
        <dt className="text-graphite">Name</dt>
        <dd className="font-semibold">
          {me.firstName} {me.lastName}
        </dd>
        <dt className="text-graphite">Email</dt>
        <dd>{me.email}</dd>
        <dt className="text-graphite">Role</dt>
        <dd>{ROLE_LABEL[me.role]}</dd>
        {me.firm && (
          <>
            <dt className="text-graphite">Firm</dt>
            <dd>{me.firm.name}</dd>
          </>
        )}
      </dl>

      <h2 className="text-xl font-bold">Change password</h2>
      <form onSubmit={submit} className="mt-4 max-w-sm space-y-4">
        <div>
          <label htmlFor="cur" className="mb-1.5 block text-sm font-semibold">
            Current password
          </label>
          <input
            id="cur"
            type="password"
            autoComplete="current-password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="new" className="mb-1.5 block text-sm font-semibold">
            New password
          </label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            aria-describedby="new-hint"
            className="input"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
          />
          <p id="new-hint" className="mt-1 text-sm text-graphite">
            At least 10 characters, with a letter and a number.
          </p>
        </div>
        {change.isError && (
          <p role="alert" className="border-l-4 border-flag bg-flag/5 px-3 py-2 text-sm text-flag">
            {fieldIssue ?? change.error.message}
          </p>
        )}
        {change.isSuccess && (
          <p role="status" className="text-sm font-semibold">
            Password changed.
          </p>
        )}
        <button
          type="submit"
          disabled={change.isPending}
          className="bg-ink px-5 py-3 font-semibold text-paper hover:bg-graphite disabled:opacity-60"
        >
          {change.isPending ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </>
  );
}
