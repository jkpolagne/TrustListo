import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABEL } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { CredentialBadge } from '../../components/CredentialBadge';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { Avatar, Badge, Button, ButtonLink, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { DocumentViewer } from '../../components/review/DocumentViewer';
import { FieldSheet } from '../../components/review/FieldSheet';
import { FlagList } from '../../components/review/FlagList';
import { OcrTranscript } from '../../components/review/OcrTranscript';
import { useCredentialReview, type CredentialReview, type FieldRow } from '../../lib/reviews';
import { CREDENTIAL_NAME, fullName } from '../../lib/team';

const back = { to: '/broker', label: 'Review queue' };

export function ReviewCredential() {
  const { id = '' } = useParams();
  const review = useCredentialReview(id);
  const [highlight, setHighlight] = useState<string | null>(null);

  if (review.isPending) return null;
  if (review.isError || !review.data) {
    return (
      <>
        <PageHeader title="Credential not found" back={back} />
        <ButtonLink to="/broker" variant="secondary">
          Back to the review queue
        </ButtonLink>
      </>
    );
  }
  const c = review.data;
  const decided = c.status === 'APPROVED' || c.status === 'REJECTED';

  return (
    <>
      <PageHeader title={`Review ${CREDENTIAL_NAME[c.type]}`} back={back} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)]">
        <DocumentViewer
          documentId={c.document?.id}
          alt={`${CREDENTIAL_NAME[c.type]} uploaded for ${fullName(c.user)}`}
          below={
            c.document &&
            c.status !== 'PENDING_AI' && (
              <OcrTranscript
                text={c.document.ocrText}
                confidence={c.document.ocrConfidence}
                highlight={highlight}
              />
            )
          }
        />

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar first={c.user.firstName} last={c.user.lastName} />
              <div className="min-w-0">
                <p className="font-bold">{fullName(c.user)}</p>
                <p className="truncate text-sm text-muted">
                  {ROLE_LABEL[c.user.role]}, {c.user.email}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-[8rem_1fr] gap-y-2 border-t border-line pt-4 text-sm">
              <dt className="text-muted">Credential</dt>
              <dd className="font-medium">{CREDENTIAL_NAME[c.type]}</dd>
              <dt className="text-muted">Number entered</dt>
              <dd className="font-mono font-medium">{c.numberEntered}</dd>
              <dt className="text-muted">Status</dt>
              <dd>
                <CredentialBadge credential={c} showName={false} />
              </dd>
            </dl>
          </Card>

          <AutomaticCheck review={c} onFocusValue={setHighlight} />
          {decided ? (
            c.rejectReason && (
              <Card>
                <p className="text-sm">
                  <span className="font-semibold">Reason:</span> {c.rejectReason}
                </p>
              </Card>
            )
          ) : (
            <Decide review={c} />
          )}
        </div>
      </div>
    </>
  );
}

const CREDENTIAL_FIELDS: [key: string, label: string][] = [
  ['fullName', 'Name'],
  ['registrationNumber', 'Registration no.'],
  ['validUntil', 'Valid until'],
];

function AutomaticCheck({
  review,
  onFocusValue,
}: {
  review: CredentialReview;
  onFocusValue: (v: string | null) => void;
}) {
  const flags = review.document?.flags ?? [];
  const pending = review.status === 'PENDING_AI';
  const extracted = review.document?.extracted ?? {};
  const rows: FieldRow[] = CREDENTIAL_FIELDS.map(([key, label]) => ({
    key,
    label,
    required: true,
    value: extracted[key]?.value ?? null,
    confidence: extracted[key]?.confidence ?? 0,
    edited: false,
    aiValue: null,
  }));
  return (
    <Card>
      <CardHeader
        title="Automatic check"
        action={
          pending ? (
            <Badge tone="info">Checking</Badge>
          ) : flags.length ? (
            <Badge tone="danger">
              {flags.length} issue{flags.length > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge>No issues</Badge>
          )
        }
      />
      {pending ? (
        <p className="text-sm text-muted">
          The AI is reading this file. It takes a few seconds; this page updates by itself.
        </p>
      ) : (
        <>
          {flags.length > 0 && (
            <div className="mb-5">
              <FlagList flags={flags} />
            </div>
          )}
          <p className="mb-3 text-sm text-muted">
            What the AI read. Compare it with the file before you decide.
          </p>
          <FieldSheet
            fields={rows}
            values={{}}
            readOnly
            onChange={() => {}}
            onFocusValue={onFocusValue}
          />
        </>
      )}
    </Card>
  );
}

function Decide({ review }: { review: CredentialReview }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [number, setNumber] = useState(review.numberEntered);
  // Start from the expiry the AI read; the broker confirms it against the file.
  const [expiresAt, setExpiresAt] = useState(review.document?.extracted?.validUntil?.value ?? '');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const hasBlocker = (review.document?.flags ?? []).some((f) => f.severity === 'BLOCKER');

  const done = () => {
    // Drop the decided item from the queue right away, then refresh from the server.
    qc.setQueryData<{ credentials: CredentialReview[] }>(['reviews', 'queue'], (q) =>
      q ? { ...q, credentials: q.credentials.filter((c) => c.id !== review.id) } : q,
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
    <Card>
      <div
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1"
        role="tablist"
        aria-label="Decision"
      >
        {(['approve', 'reject'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m ? 'bg-paper shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {m === 'approve' ? 'Approve' : 'Reject'}
          </button>
        ))}
      </div>

      {mode === 'approve' ? (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            approve.mutate();
          }}
          className="space-y-4"
        >
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
          <Field
            label="Valid until"
            htmlFor="exp"
            hint="Filled in from what the AI read. Check it against the document."
          >
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
      ) : (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            reject.mutate();
          }}
          className="space-y-4"
        >
          <Field
            label="Reason"
            htmlFor="reason"
            hint="The company admin sees this so they can fix it."
          >
            <textarea
              id="reason"
              className="input"
              rows={4}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <FormError error={reject.error} />
          <Button type="submit" variant="danger" disabled={reject.isPending || disabled}>
            {reject.isPending ? 'Rejecting…' : 'Reject credential'}
          </Button>
        </form>
      )}
    </Card>
  );
}
