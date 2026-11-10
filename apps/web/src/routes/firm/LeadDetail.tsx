import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { ButtonLink, Card, CardHeader, EmptyState } from '../../components/ui';
import { api } from '../../lib/api';
import { useMe } from '../../lib/auth';
import {
  CIVIL_STATUS,
  LEAD_STATUS,
  NATURE_OF_WORK,
  PAYMENT_PREF,
  useLead,
  type LeadDetail as Detail,
  type LeadStatus,
  type Visit,
} from '../../lib/leads';
import { basePath } from '../../lib/paths';
import { ConvertLead } from './ConvertLead';
import { LeadStatusBadge } from './Leads';
import { VisitStatusBadge } from './Visits';

const when = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const MOVABLE: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'LOST'];

export function LeadDetail() {
  const { id = '' } = useParams();
  const { data: me } = useMe();
  const q = useLead(id);
  if (!me || q.isPending) return null;
  const back = { to: `${basePath(me.role)}/leads`, label: 'Leads' };
  if (q.isError || !q.data) return <PageHeader title="Lead not found" back={back} />;
  const l = q.data;

  return (
    <>
      <PageHeader
        title={l.buyerName}
        intro={`Inquired about ${l.property?.title ?? 'a listing'} on ${when.format(new Date(l.createdAt))}${
          l.source === 'REFERRAL' ? ', through a referral link' : ''
        }.`}
        back={back}
        actions={<LeadStatusBadge status={l.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Buyer" />
            <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Mobile</dt>
              <dd>
                <a
                  href={`tel:${l.buyerPhone}`}
                  className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                >
                  <Phone aria-hidden className="size-3.5" /> {l.buyerPhone}
                </a>
              </dd>
              {l.buyerEmail && (
                <>
                  <dt className="text-muted">Email</dt>
                  <dd className="font-medium">{l.buyerEmail}</dd>
                </>
              )}
              <dt className="text-muted">Work</dt>
              <dd className="font-medium">{NATURE_OF_WORK[l.natureOfWork]}</dd>
              <dt className="text-muted">Would pay by</dt>
              <dd className="font-medium">{PAYMENT_PREF[l.paymentPref]}</dd>
              <dt className="text-muted">Civil status</dt>
              <dd className="font-medium">{CIVIL_STATUS[l.civilStatus]}</dd>
              {l.consultant && l.consultant.id !== me.id && (
                <>
                  <dt className="text-muted">Handled by</dt>
                  <dd className="font-medium">
                    {l.consultant.firstName} {l.consultant.lastName}
                  </dd>
                </>
              )}
            </dl>
            {l.message && (
              <p className="mt-4 rounded-lg bg-canvas px-3 py-2.5 text-sm leading-relaxed">
                “{l.message}”
              </p>
            )}
            {l.property && (
              <a
                href={`/properties/${l.property.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
              >
                Open the listing
              </a>
            )}
          </Card>
          <Card>
            <CardHeader title="Visits" />
            {l.visits.length === 0 ? (
              <EmptyState>No visits yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {l.visits.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {when.format(new Date(v.scheduledAt))}
                      </p>
                      {v.declineReason && <p className="text-xs text-flag">{v.declineReason}</p>}
                    </div>
                    <VisitStatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          {l.isMine && l.status !== 'RESERVED' ? (
            <>
              <UpdateStatus l={l} />
              {l.status !== 'LOST' && <ConvertLead l={l} role={me.role} />}
              {l.status !== 'LOST' && <ScheduleVisit l={l} />}
            </>
          ) : (
            <Card>
              <p className="text-sm text-muted">
                {l.status === 'RESERVED'
                  ? 'This buyer reserved and is now a client.'
                  : 'Only the consultant handling this lead can update it.'}
              </p>
              {l.clientId && (
                <ButtonLink
                  to={`${basePath(me.role)}/clients/${l.clientId}`}
                  variant="secondary"
                  className="mt-3"
                >
                  Open client
                </ButtonLink>
              )}
              {l.lostReason && (
                <p className="mt-2 text-sm">
                  <span className="font-semibold">Lost because:</span> {l.lostReason}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function UpdateStatus({ l }: { l: Detail }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<LeadStatus>(l.status);
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api(`/inquiries/${l.id}`, { method: 'PATCH', json: { status, reason: reason || undefined } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
  return (
    <Card>
      <CardHeader title="Where this lead stands" />
      {l.lostReason && l.status === 'LOST' && (
        <p className="mb-4 text-sm">
          <span className="font-semibold">Lost because:</span> {l.lostReason}
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Status" htmlFor="lead-status">
          <select
            id="lead-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          >
            {MOVABLE.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS[s]}
              </option>
            ))}
          </select>
        </Field>
        {status === 'LOST' && l.status !== 'LOST' && (
          <Field label="Why was it lost?" htmlFor="lost-reason" hint="Kept in the activity log.">
            <textarea
              id="lost-reason"
              className="input"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        )}
        <FormError error={save.error} />
        <PrimaryButton pending={save.isPending || status === l.status}>Save status</PrimaryButton>
      </form>
      <p className="mt-4 text-xs text-muted">
        When the buyer pays the reservation, use &ldquo;The buyer reserved&rdquo; below.
      </p>
    </Card>
  );
}

function ScheduleVisit({ l }: { l: Detail }) {
  const qc = useQueryClient();
  const [at, setAt] = useState('');
  const [notes, setNotes] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const schedule = useMutation({
    mutationFn: () =>
      api<Visit>('/visits', {
        json: {
          inquiryId: l.id,
          scheduledAt: new Date(at).toISOString(),
          notes: notes || undefined,
        },
      }),
    onSuccess: (v) => {
      setWarnings(
        (v.warnings ?? []).map((w) =>
          w.message.replace(/at (\S+),/, (_m, iso) => `at ${when.format(new Date(iso))},`),
        ),
      );
      setAt('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['visits'] });
    },
  });
  return (
    <Card>
      <CardHeader
        title="Schedule a visit"
        description="Your company admin approves it before it's confirmed."
      />
      <form
        className="space-y-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          schedule.mutate();
        }}
      >
        <Field label="Date and time" htmlFor="visit-at">
          <input
            id="visit-at"
            type="datetime-local"
            className="input"
            required
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </Field>
        <Field label="Notes (optional)" htmlFor="visit-notes" hint='e.g. "Meet at the model house"'>
          <input
            id="visit-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <FormError error={schedule.error} />
        {schedule.isSuccess && (
          <p className="text-sm" role="status">
            Visit sent for approval.
            {warnings.map((w) => (
              <span key={w} className="mt-1 block text-flag">
                {w}
              </span>
            ))}
          </p>
        )}
        <PrimaryButton pending={schedule.isPending}>Request visit</PrimaryButton>
      </form>
    </Card>
  );
}
