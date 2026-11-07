import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { api } from '../../lib/api';
import { useCredentialReview, useDocumentUrl, type CredentialReview } from '../../lib/reviews';
import { CREDENTIAL_NAME, fullName } from '../../lib/team';

export function ReviewCredential() {
  const { id = '' } = useParams();
  const review = useCredentialReview(id);
  const docUrl = useDocumentUrl(review.data?.document?.id);

  if (review.isPending) return null;
  if (review.isError || !review.data) {
    return (
      <>
        <PageHeader title="Credential not found" />
        <Link to="/broker" className="font-semibold underline underline-offset-4">
          Back to the review queue
        </Link>
      </>
    );
  }
  const c = review.data;
  const decided = c.status === 'APPROVED' || c.status === 'REJECTED';

  return (
    <>
      <Link to="/broker" className="text-sm font-semibold underline-offset-4 hover:underline">
        Review queue
      </Link>
      <PageHeader
        title={`${CREDENTIAL_NAME[c.type]} for ${fullName(c.user)}`}
        intro={`${ROLE_LABEL[c.user.role]}, ${c.user.email}`}
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,1fr)]">
        {/* Document */}
        <section aria-label="Document" className="min-w-0">
          {!c.document && (
            <p className="text-graphite">No file was uploaded with this credential.</p>
          )}
          {docUrl.data &&
            (docUrl.data.mimeType === 'application/pdf' ? (
              <iframe
                src={docUrl.data.url}
                title="Credential document"
                className="h-[75vh] w-full border-2 border-ink"
              />
            ) : (
              <a href={docUrl.data.url} target="_blank" rel="noreferrer" title="Open full size">
                <img
                  src={docUrl.data.url}
                  alt={`${CREDENTIAL_NAME[c.type]} uploaded for ${fullName(c.user)}`}
                  className="w-full border-2 border-ink"
                />
              </a>
            ))}
          {docUrl.data && (
            <a
              href={docUrl.data.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            >
              Open full size
            </a>
          )}
        </section>

        {/* Decision */}
        <section aria-label="Decision" className="space-y-8">
          <AutomaticCheck review={c} />
          {decided ? (
            <div className="border-t-2 border-ink pt-4">
              <CredentialBadge credential={c} />
              {c.rejectReason && <p className="mt-2 text-sm">Reason: {c.rejectReason}</p>}
            </div>
          ) : (
            <Decide review={c} />
          )}
        </section>
      </div>
    </>
  );
}

function AutomaticCheck({ review }: { review: CredentialReview }) {
  const flags = review.document?.flags ?? [];
  const pending = review.status === 'PENDING_AI';
  return (
    <div className="border-t-2 border-ink pt-4">
      <h2 className="font-bold">Automatic check</h2>
      {pending && <p className="mt-1 text-graphite">Still checking this file…</p>}
      {!pending && flags.length === 0 && <p className="mt-1 text-graphite">No problems found.</p>}
      {flags.length > 0 && (
        <ul className="mt-2 space-y-2">
          {flags.map((f, i) => (
            <li
              key={i}
              className={`border-l-4 pl-3 ${f.severity === 'BLOCKER' ? 'border-flag' : 'border-ink'}`}
            >
              <span
                className={`text-sm font-semibold ${f.severity === 'BLOCKER' ? 'text-flag' : ''}`}
              >
                {f.severity === 'BLOCKER'
                  ? 'Blocking issue'
                  : f.severity === 'WARNING'
                    ? 'Check this'
                    : 'Note'}
              </span>
              <p className="text-sm">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-graphite">
        The automatic check doesn't read text from the document yet. Compare the name, number and
        expiry date with the file yourself.
      </p>
    </div>
  );
}

function Decide({ review }: { review: CredentialReview }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [number, setNumber] = useState(review.numberEntered);
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const hasBlocker = (review.document?.flags ?? []).some((f) => f.severity === 'BLOCKER');

  const done = () => {
    // Drop the decided item from the queue right away, then refresh from the server.
    qc.setQueryData<{ credentials: CredentialReview[] }>(['reviews', 'queue'], (q) =>
      q ? { credentials: q.credentials.filter((c) => c.id !== review.id) } : q,
    );
    qc.invalidateQueries({ queryKey: ['reviews'] });
    qc.invalidateQueries({ queryKey: ['users'] });
    navigate('/broker');
  };
  const approve = useMutation({
    mutationFn: () =>
      api(`/reviews/credentials/${review.id}/approve`, {
        json: { expiresAt, numberEntered: number, overrideNote: note || undefined },
      }),
    onSuccess: done,
  });
  const reject = useMutation({
    mutationFn: () => api(`/reviews/credentials/${review.id}/reject`, { json: { reason } }),
    onSuccess: done,
  });

  const disabled = review.status === 'PENDING_AI';

  return (
    <>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          approve.mutate();
        }}
        className="space-y-5 border-2 border-ink p-5"
      >
        <h2 className="font-bold">Approve</h2>
        <Field
          label="Number on the document"
          htmlFor="num"
          hint="Correct it if the admin typed it wrong."
        >
          <input
            id="num"
            className="input"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </Field>
        <Field label="Valid until" htmlFor="exp" hint="As printed on the document.">
          <input
            id="exp"
            type="date"
            className="input"
            required
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </Field>
        {hasBlocker && (
          <Field label="Why approve despite the blocking issue?" htmlFor="note">
            <textarea
              id="note"
              className="input"
              rows={3}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        )}
        <FormError error={approve.error} />
        <PrimaryButton pending={approve.isPending || disabled}>
          {approve.isPending ? 'Approving…' : 'Approve credential'}
        </PrimaryButton>
      </form>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          reject.mutate();
        }}
        className="space-y-4"
      >
        <h2 className="font-bold">Reject</h2>
        <Field
          label="Reason"
          htmlFor="reason"
          hint="The company admin sees this so they can fix it."
        >
          <textarea
            id="reason"
            className="input"
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <FormError error={reject.error} />
        <button
          type="submit"
          disabled={reject.isPending || disabled}
          className="border-2 border-flag px-5 py-2.5 font-semibold text-flag hover:bg-flag hover:text-paper disabled:opacity-60"
        >
          {reject.isPending ? 'Rejecting…' : 'Reject credential'}
        </button>
      </form>
    </>
  );
}
