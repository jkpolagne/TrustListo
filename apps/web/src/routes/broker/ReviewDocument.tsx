import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { DocumentViewer } from '../../components/review/DocumentViewer';
import { FieldSheet } from '../../components/review/FieldSheet';
import { FlagList } from '../../components/review/FlagList';
import { OcrTranscript } from '../../components/review/OcrTranscript';
import { Badge, Button, ButtonLink, Card, CardHeader } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { aiSummary, docTypeName, useDocumentReview, type DocumentReview } from '../../lib/reviews';

const back = { to: '/broker', label: 'Review queue' };
const when = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

const BADGE_NAME: Record<string, string> = {
  LTS_VERIFIED: 'License to Sell Verified',
  OWNERSHIP_VERIFIED: 'Ownership Verified',
  TITLE_CLEAN: 'Title Clean',
  TAX_CURRENT: 'Tax Payments Current',
};

export function ReviewDocument() {
  const { id = '' } = useParams();
  const review = useDocumentReview(id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [highlight, setHighlight] = useState<string | null>(null);

  if (review.isPending) return null;
  if (review.isError || !review.data) {
    return (
      <>
        <PageHeader title="Document not found" back={back} />
        <ButtonLink to="/broker" variant="secondary">
          Back to the review queue
        </ButtonLink>
      </>
    );
  }
  const d = review.data;
  const reading = d.aiStatus === 'QUEUED' || d.aiStatus === 'PROCESSING';
  const decided = d.reviewStatus === 'APPROVED' || d.reviewStatus === 'REJECTED';
  const name = docTypeName(d.declaredType);

  return (
    <>
      <PageHeader
        title={`Review ${name.toLowerCase()}`}
        intro={`${d.owner.title}${d.owner.subtitle ? `, ${d.owner.subtitle}` : ''}`}
        back={back}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <DocumentViewer
            documentId={d.id}
            alt={`${name} for ${d.owner.title}`}
            below={
              !reading && (
                <OcrTranscript
                  text={d.ocrText}
                  confidence={d.ocrConfidence}
                  highlight={highlight}
                />
              )
            }
          />
        </div>

        <div className="space-y-6">
          <Verdict review={d} reading={reading} />
          {!reading && (
            <Card>
              <CardHeader
                title="What the AI read"
                description={
                  decided
                    ? undefined
                    : 'Compare each value with the file. Correct any misreading before you approve.'
                }
              />
              <FieldSheet
                fields={d.fields}
                values={values}
                readOnly={decided}
                onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
                onFocusValue={setHighlight}
              />
            </Card>
          )}
          {decided ? (
            <Decided review={d} />
          ) : (
            <Decide review={d} values={values} disabled={reading} />
          )}
          {d.siblings.length > 0 && <OtherDocuments review={d} />}
        </div>
      </div>
    </>
  );
}

function Verdict({ review, reading }: { review: DocumentReview; reading: boolean }) {
  const s = aiSummary(review);
  const detectedOther =
    review.detectedType && review.declaredType && review.detectedType !== review.declaredType;
  return (
    <Card>
      <CardHeader
        title="Automatic check"
        action={
          <Badge tone={s.tone}>
            {reading ? 'Being read' : s.tone === 'danger' ? 'Needs attention' : s.text}
          </Badge>
        }
      />
      {reading ? (
        <p className="text-sm text-muted">
          The AI is reading this file. It takes a few seconds; this page updates by itself.
        </p>
      ) : (
        <>
          {review.flags.length > 0 ? (
            <FlagList flags={review.flags} />
          ) : (
            <p className="text-sm text-muted">
              Nothing to flag. The AI only reads and compares; your approval is what verifies it.
            </p>
          )}
          {detectedOther && (
            <p className="mt-3 text-xs text-muted">
              Uploaded as {docTypeName(review.declaredType).toLowerCase()}, recognized as{' '}
              {docTypeName(review.detectedType).toLowerCase()}.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function OtherDocuments({ review }: { review: DocumentReview }) {
  return (
    <Card>
      <CardHeader
        title={
          review.owner.kind === 'PROJECT' ? 'Earlier uploads' : 'Other documents for this listing'
        }
      />
      <ul className="divide-y divide-line">
        {review.siblings.map((s) => {
          const sum = aiSummary(s);
          return (
            <li key={s.id}>
              <Link
                to={`/broker/reviews/documents/${s.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-canvas"
              >
                <span className="text-sm font-semibold">{docTypeName(s.declaredType)}</span>
                <StatusPill status={s.reviewStatus} fallback={sum} />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function StatusPill({
  status,
  fallback,
}: {
  status: string;
  fallback: ReturnType<typeof aiSummary>;
}) {
  if (status === 'APPROVED') return <Badge tone="verified">Approved</Badge>;
  if (status === 'REJECTED') return <Badge tone="danger">Rejected</Badge>;
  return (
    <Badge tone={fallback.tone}>
      {fallback.tone === 'danger' ? 'Needs attention' : fallback.text}
    </Badge>
  );
}

function Decided({ review }: { review: DocumentReview }) {
  const approved = review.reviewStatus === 'APPROVED';
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{approved ? 'Approved' : 'Rejected'}</h2>
        <Badge tone={approved ? 'verified' : 'danger'}>
          {approved ? 'Broker approved' : 'Rejected'}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted">
        {review.reviewer ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : 'A broker'}
        {review.reviewedAt ? `, ${when.format(new Date(review.reviewedAt))}` : ''}
      </p>
      {review.reviewNote && (
        <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm">
          <span className="font-semibold">{approved ? 'Override note' : 'Reason'}:</span>{' '}
          {review.reviewNote}
        </p>
      )}
      <ButtonLink to="/broker" variant="secondary" className="mt-4">
        Back to the review queue
      </ButtonLink>
    </Card>
  );
}

function Decide({
  review,
  values,
  disabled,
}: {
  review: DocumentReview;
  values: Record<string, string>;
  disabled: boolean;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [earned, setEarned] = useState<string[] | null>(null);

  // Only send what the broker actually changed.
  const edits = Object.fromEntries(
    Object.entries(values).filter(
      ([k, v]) => v !== (review.fields.find((f) => f.key === k)?.value ?? ''),
    ),
  );
  const approve = useMutation({
    mutationFn: () =>
      api<{ badges: string[] }>(`/reviews/documents/${review.id}/approve`, {
        json: { fields: edits, overrideNote: note || undefined },
      }),
    onSuccess: (r) => {
      setEarned(r.badges);
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
  const reject = useMutation({
    mutationFn: () => api(`/reviews/documents/${review.id}/reject`, { json: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });

  // The server re-checks corrected values; it asks for a note only if a blocker remains.
  const needsNote =
    review.flags.some((f) => f.severity === 'BLOCKER') ||
    (approve.error instanceof ApiError && approve.error.code === 'OVERRIDE_NOTE_REQUIRED');

  if (earned) {
    return (
      <Card>
        <h2 className="text-base font-bold">Approved</h2>
        <p className="mt-2 text-sm text-muted">
          {earned.length
            ? `The listing now shows: ${earned.map((b) => BADGE_NAME[b] ?? b).join(', ')}.`
            : 'No badge yet. Badges appear once the documents that earn them are all approved and agree.'}
        </p>
      </Card>
    );
  }

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
          {Object.keys(edits).length > 0 && (
            <p className="text-sm text-muted">
              Your{' '}
              {Object.keys(edits).length === 1
                ? 'correction'
                : `${Object.keys(edits).length} corrections`}{' '}
              will be saved with the approval and logged.
            </p>
          )}
          {needsNote && (
            <Field
              label="Why approve despite the blocking issue?"
              htmlFor="note"
              hint="Saved in the audit log with your approval."
            >
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
            {approve.isPending
              ? 'Approving…'
              : `Approve ${docTypeName(review.declaredType).toLowerCase()}`}
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
            hint="The uploader sees this so they know what to fix."
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
            {reject.isPending
              ? 'Rejecting…'
              : `Reject ${docTypeName(review.declaredType).toLowerCase()}`}
          </Button>
        </form>
      )}
    </Card>
  );
}
