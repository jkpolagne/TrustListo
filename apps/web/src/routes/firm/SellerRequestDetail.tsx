import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Upload } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { errorText, Field, FormError, PrimaryButton } from '../../components/Form';
import { LocationPicker } from '../../components/LocationPicker';
import { Badge, Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useMe } from '../../lib/auth';
import { BADGE_INFO, TYPE_LABEL } from '../../lib/marketplace';
import { aiSummary, docTypeName } from '../../lib/reviews';
import {
  LISTING_DOC_HELP,
  LISTING_DOCS,
  useSellerRequest,
  type ListingDoc,
  type RequestDocument,
  type SellerRequestDetail as Detail,
} from '../../lib/sellers';
import { RequestStatusBadge, sellersPath } from './SellerRequests';

const peso = (v: string) => formatPeso(v).replace(/\.00$/, '');

export function SellerRequestDetail() {
  const { id = '' } = useParams();
  const { data: me } = useMe();
  const q = useSellerRequest(id);
  if (!me || q.isPending) return null;
  const back = { to: sellersPath(me.role), label: 'Seller requests' };
  if (q.isError || !q.data) {
    return <PageHeader title="Request not found" back={back} />;
  }
  const r = q.data;
  const canUpload =
    r.isAgent && ['ACCEPTED', 'DOCUMENTS_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW'].includes(r.status);

  return (
    <>
      <PageHeader
        title={`Property of ${r.sellerName}`}
        intro={`${TYPE_LABEL[r.propertyType]} in ${r.locationText}`}
        back={back}
        actions={<RequestStatusBadge status={r.status} />}
      />

      {r.rejection && r.status === 'DOCUMENTS_IN_PROGRESS' && (
        <div className="mb-6 rounded-2xl bg-flag-pale px-5 py-4 text-sm text-flag" role="status">
          <span className="font-semibold">Your broker sent this listing back: </span>
          {r.rejection.reason} Fix it, then submit again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Documents"
              description="All four are read automatically, then approved by your broker."
            />
            <ul className="divide-y divide-line">
              {LISTING_DOCS.map((t) => (
                <DocumentRow
                  key={t}
                  request={r}
                  type={t}
                  doc={r.current[t]}
                  canUpload={canUpload}
                />
              ))}
            </ul>
          </Card>
          <SellerCard r={r} />
        </div>

        <div className="space-y-6">
          <NextStep r={r} />
        </div>
      </div>
    </>
  );
}

function SellerCard({ r }: { r: Detail }) {
  return (
    <Card>
      <CardHeader title="What the seller told us" />
      <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
        <dt className="text-muted">Seller</dt>
        <dd className="font-medium">{r.sellerName}</dd>
        <dt className="text-muted">Mobile</dt>
        <dd>
          <a href={`tel:${r.sellerPhone}`} className="font-medium underline underline-offset-2">
            {r.sellerPhone}
          </a>
        </dd>
        {r.sellerEmail && (
          <>
            <dt className="text-muted">Email</dt>
            <dd className="font-medium">{r.sellerEmail}</dd>
          </>
        )}
        <dt className="text-muted">Asking price</dt>
        <dd className="font-medium">{peso(r.askingPrice)}</dd>
        {r.lotAreaSqm && (
          <>
            <dt className="text-muted">Lot area</dt>
            <dd className="font-medium">{Number(r.lotAreaSqm)} sqm</dd>
          </>
        )}
        {r.floorAreaSqm && (
          <>
            <dt className="text-muted">Floor area</dt>
            <dd className="font-medium">{Number(r.floorAreaSqm)} sqm</dd>
          </>
        )}
      </dl>
      {r.photos.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {r.photos.map((src, i) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noreferrer">
                <img
                  src={src}
                  alt={`Seller photo ${i + 1}`}
                  className="size-24 rounded-lg object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DocState({ doc }: { doc: RequestDocument }) {
  if (doc.reviewStatus === 'APPROVED') return <Badge tone="verified">Broker approved</Badge>;
  const s = aiSummary(doc);
  if (s.tone === 'info') return <Badge tone="info">Being read</Badge>;
  if (s.tone === 'danger') return <Badge tone="danger">Flagged</Badge>;
  return <Badge>Read, waiting for broker</Badge>;
}

function DocumentRow({
  request,
  type,
  doc,
  canUpload,
}: {
  request: Detail;
  type: ListingDoc;
  doc: RequestDocument | undefined;
  canUpload: boolean;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('declaredType', type);
      body.append('file', file);
      return api(`/seller-requests/${request.id}/documents`, { method: 'POST', body });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-requests'] }),
  });
  // A rejected copy doesn't count; show why so the agent can bring a better one.
  const rejected = !doc
    ? [...request.documents]
        .reverse()
        .find((d) => d.declaredType === type && d.reviewStatus === 'REJECTED')
    : undefined;
  const summary = doc ? aiSummary(doc) : null;

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{docTypeName(type)}</p>
        <p className="text-xs text-muted">{LISTING_DOC_HELP[type]}</p>
        {doc && summary?.tone === 'danger' && (
          <p className="mt-1.5 text-sm text-flag">{summary.text}</p>
        )}
        {rejected && (
          <p className="mt-1.5 text-sm text-flag">
            Broker rejected the last copy: {rejected.reviewNote ?? 'no reason given'}
          </p>
        )}
        {upload.error && <p className="mt-1.5 text-sm text-flag">{errorText(upload.error)}</p>}
      </div>
      <div className="flex items-center gap-2">
        {doc ? (
          <>
            <DocState doc={doc} />
            <DocumentLink id={doc.id} />
          </>
        ) : canUpload ? (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={upload.isPending}
              onClick={() => input.current?.click()}
            >
              <Upload aria-hidden className="size-3.5" />
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </>
        ) : (
          <Badge>Not uploaded</Badge>
        )}
      </div>
    </li>
  );
}

/** Opens the uploaded file through a short-lived link. */
function DocumentLink({ id }: { id: string }) {
  const open = useMutation({
    mutationFn: () => api<{ url: string }>(`/documents/${id}/url`),
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
  });
  return (
    <button
      type="button"
      onClick={() => open.mutate()}
      aria-label="Open file"
      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
    >
      <ExternalLink aria-hidden className="size-4" />
    </button>
  );
}

function NextStep({ r }: { r: Detail }) {
  if (r.status === 'NEW')
    return r.isAgent ? (
      <Respond r={r} />
    ) : (
      <Info
        title="Waiting for the agent"
        body={`${agentName(r)} hasn't answered this request yet.`}
      />
    );
  if (r.status === 'DECLINED')
    return (
      <Info
        title="Declined"
        body="The agent declined this request. The reason is in the activity log."
      />
    );
  if (r.status === 'SUBMITTED_FOR_REVIEW') {
    return (
      <Info
        title="With the broker"
        body="Your broker checks each document, then approves or sends back the listing. It goes live only after approval."
      />
    );
  }
  if (r.status === 'LISTED' && r.property) {
    return (
      <Card>
        <CardHeader title="Live on TrustListo" />
        {r.property.badges.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {r.property.badges.map((b) => (
              <li key={b.type}>
                <Badge tone="verified">{BADGE_INFO[b.type].name}</Badge>
              </li>
            ))}
          </ul>
        )}
        <a
          href={`/properties/${r.property.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
        >
          See the public page <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </Card>
    );
  }
  return r.isAgent ? (
    <Submit r={r} />
  ) : (
    <Info title="Collecting documents" body={`${agentName(r)} is uploading the documents.`} />
  );
}

const agentName = (r: Detail) =>
  r.agent ? `${r.agent.firstName} ${r.agent.lastName}` : 'The agent';

function Info({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </Card>
  );
}

function Respond({ r }: { r: Detail }) {
  const qc = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const done = () => qc.invalidateQueries({ queryKey: ['seller-requests'] });
  const accept = useMutation({
    mutationFn: () => api(`/seller-requests/${r.id}/accept`, { method: 'POST' }),
    onSuccess: done,
  });
  const decline = useMutation({
    mutationFn: () => api(`/seller-requests/${r.id}/decline`, { json: { reason } }),
    onSuccess: done,
  });

  return (
    <Card>
      <CardHeader
        title="Will you take this listing?"
        description={`Call ${r.sellerName} first if you need to. Accepting lets you upload the documents.`}
      />
      {declining ? (
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            decline.mutate();
          }}
        >
          <Field
            label="Why are you declining?"
            htmlFor="reason"
            hint="Kept in your firm's activity log."
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
          <FormError error={decline.error} />
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={decline.isPending}>
              {decline.isPending ? 'Declining…' : 'Decline request'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
            {accept.isPending ? 'Accepting…' : 'Accept request'}
          </Button>
          <Button variant="secondary" onClick={() => setDeclining(true)}>
            Decline
          </Button>
          <FormError error={accept.error} />
        </div>
      )}
    </Card>
  );
}

function Submit({ r }: { r: Detail }) {
  const qc = useQueryClient();
  const [barangay, city] = r.locationText.split(',').map((s) => s.trim());
  const [form, setForm] = useState({
    title: r.property?.title ?? '',
    description: r.property?.description ?? '',
    barangay: r.property?.barangay ?? barangay ?? '',
    city: r.property?.city ?? city ?? 'Naga City',
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const submit = useMutation({
    mutationFn: () =>
      api(`/seller-requests/${r.id}/submit`, {
        json: { ...form, description: form.description || undefined, location },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-requests'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const uploaded = LISTING_DOCS.filter((t) => r.current[t]).length;
  const reading = LISTING_DOCS.some((t) => {
    const d = r.current[t];
    return d && (d.aiStatus === 'QUEUED' || d.aiStatus === 'PROCESSING');
  });
  const ready = uploaded === 4 && !reading;

  return (
    <Card>
      <CardHeader
        title="Send to your broker"
        description={
          ready
            ? 'Write how the listing should read. Flagged documents can still be sent; your broker decides.'
            : `Upload all four documents first (${uploaded} of 4${reading ? ', still reading' : ''}).`
        }
      />
      <form
        className="space-y-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <Field label="Listing title" htmlFor="l-title" hint='e.g. "Corner lot near Naga Cathedral"'>
          <input
            id="l-title"
            className="input"
            required
            minLength={8}
            value={form.title}
            onChange={set('title')}
          />
        </Field>
        <Field label="Description" htmlFor="l-desc">
          <textarea
            id="l-desc"
            className="input"
            rows={4}
            value={form.description}
            onChange={set('description')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Barangay" htmlFor="l-brgy">
            <input
              id="l-brgy"
              className="input"
              required
              value={form.barangay}
              onChange={set('barangay')}
            />
          </Field>
          <Field label="City" htmlFor="l-city">
            <input
              id="l-city"
              className="input"
              required
              value={form.city}
              onChange={set('city')}
            />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Map pin</p>
          <LocationPicker value={location} onChange={setLocation} />
          <p className="mt-1.5 text-xs text-muted">
            Required. Click where the property is, so buyers find it on the map.
          </p>
        </div>
        <FormError error={submit.error} />
        <PrimaryButton pending={submit.isPending || !ready || !location}>
          {submit.isPending ? 'Sending…' : r.rejection ? 'Send again' : 'Send to broker'}
        </PrimaryButton>
      </form>
    </Card>
  );
}
