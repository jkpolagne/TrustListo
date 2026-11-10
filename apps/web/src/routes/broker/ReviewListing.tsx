import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, PrimaryButton } from '../../components/Form';
import { Badge, Button, ButtonLink, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { BADGE_INFO, TYPE_LABEL, type BadgeType } from '../../lib/marketplace';
import { aiSummary, docTypeName } from '../../lib/reviews';
import { useListingReview, type ListingReview } from '../../lib/sellers';

const back = { to: '/broker', label: 'Review queue' };
const peso = (v: string) => formatPeso(v).replace(/\.00$/, '');

/**
 * Broker's decision on an individual seller listing (SPEC §7.6). The listing can go live only
 * when all four documents are approved, title included (decided OPEN-2).
 */
export function ReviewListing() {
  const { id = '' } = useParams();
  const q = useListingReview(id);
  if (q.isPending) return null;
  if (q.isError || !q.data) {
    return (
      <>
        <PageHeader title="Listing not found" back={back} />
        <ButtonLink to="/broker" variant="secondary">
          Back to the review queue
        </ButtonLink>
      </>
    );
  }
  const l = q.data;
  const approved = l.documents.filter((d) => d.document?.reviewStatus === 'APPROVED').length;
  const underReview = l.status === 'PENDING_REVIEW' || l.status === 'NEEDS_ATTENTION';

  return (
    <>
      <PageHeader
        title={l.title}
        intro={`${TYPE_LABEL[l.type]} in ${l.barangay}, ${l.city}. Seller: ${l.seller.name}.`}
        back={back}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Documents"
              description={`${approved} of 4 approved. Open each one to check it against what the AI read.`}
            />
            <ul className="-mx-2 divide-y divide-line">
              {l.documents.map(({ type, document: d }) => {
                const s = d ? aiSummary(d) : null;
                return (
                  <li key={type}>
                    {d ? (
                      <Link
                        to={`/broker/reviews/documents/${d.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-canvas"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{docTypeName(type)}</p>
                          {d.reviewStatus !== 'APPROVED' && (
                            <p
                              className={`truncate text-xs ${s?.tone === 'danger' ? 'text-flag' : 'text-muted'}`}
                            >
                              {s?.text}
                            </p>
                          )}
                        </div>
                        {d.reviewStatus === 'APPROVED' ? (
                          <Badge tone="verified">Approved</Badge>
                        ) : (
                          <Badge tone={s?.tone === 'danger' ? 'danger' : 'neutral'}>
                            Needs your review
                          </Badge>
                        )}
                        <ChevronRight aria-hidden className="size-4 text-muted" />
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-2 py-3">
                        <p className="text-sm font-semibold">{docTypeName(type)}</p>
                        <Badge tone="danger">Not uploaded</Badge>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Listing" />
            <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Asking price</dt>
              <dd className="font-medium">{peso(l.price)}</dd>
              {l.lotAreaSqm && (
                <>
                  <dt className="text-muted">Lot area</dt>
                  <dd className="font-medium">{Number(l.lotAreaSqm)} sqm</dd>
                </>
              )}
              <dt className="text-muted">Agent</dt>
              <dd className="font-medium">
                {l.agent ? `${l.agent.firstName} ${l.agent.lastName}` : '—'}
              </dd>
              <dt className="text-muted">Seller</dt>
              <dd className="font-medium">
                {l.seller.name}, {l.seller.phone}
              </dd>
            </dl>
            {l.description && (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{l.description}</p>
            )}
            {l.photos.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {l.photos.map((src, i) => (
                  <li key={src}>
                    <img
                      src={src}
                      alt={`Listing photo ${i + 1}`}
                      className="size-24 rounded-lg object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          {underReview ? <Decide l={l} ready={approved === 4} /> : <Outcome l={l} />}
        </div>
      </div>
    </>
  );
}

function Outcome({ l }: { l: ListingReview }) {
  return (
    <Card>
      <h2 className="text-base font-bold">{l.status === 'LIVE' ? 'Live' : 'Not under review'}</h2>
      {l.badges.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {l.badges.map((b) => (
            <li key={b.type}>
              <Badge tone="verified">{BADGE_INFO[b.type as BadgeType].name}</Badge>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink to="/broker" variant="secondary" className="mt-4">
        Back to the review queue
      </ButtonLink>
    </Card>
  );
}

function Decide({ l, ready }: { l: ListingReview; ready: boolean }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const done = () => {
    qc.invalidateQueries({ queryKey: ['reviews'] });
    qc.invalidateQueries({ queryKey: ['public'] });
  };
  const approve = useMutation({
    mutationFn: () => api(`/reviews/properties/${l.id}/approve`, { method: 'POST' }),
    onSuccess: done,
  });
  const reject = useMutation({
    mutationFn: () => api(`/reviews/properties/${l.id}/reject`, { json: { reason } }),
    onSuccess: done,
  });

  return (
    <Card>
      <CardHeader
        title="Put this listing live?"
        description={
          ready
            ? 'All four documents are approved. Approving publishes it with the badges those documents earn.'
            : 'Approve all four documents first. Without a verified title, a listing cannot go live.'
        }
      />
      {rejecting ? (
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            reject.mutate();
          }}
        >
          <Field
            label="What should the agent fix?"
            htmlFor="reason"
            hint="The agent sees this on the request."
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
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={reject.isPending}>
              {reject.isPending ? 'Sending back…' : 'Send back to agent'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            approve.mutate();
          }}
        >
          <FormError error={approve.error} />
          <div className="flex flex-wrap gap-2">
            <PrimaryButton pending={approve.isPending || !ready}>
              {approve.isPending ? 'Publishing…' : 'Approve and publish'}
            </PrimaryButton>
            <Button type="button" variant="secondary" onClick={() => setRejecting(true)}>
              Send back
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
