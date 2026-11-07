import { useMutation } from '@tanstack/react-query';
import { Star, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatPeso, monthlyPayment } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Field, FormError, FormSuccess, PrimaryButton } from '../../components/Form';
import { LocationPicker } from '../../components/LocationPicker';
import { Button, Card, CardHeader, EmptyState } from '../../components/ui';
import { api } from '../../lib/api';
import {
  ltsState,
  useInvalidateCatalog,
  useProjects,
  useUnit,
  type UnitDetail,
} from '../../lib/catalog';
import {
  METHOD_LABEL,
  TYPE_LABEL,
  type PaymentMethod,
  type PropertyType,
} from '../../lib/marketplace';
import { StatusBadge } from '../firm/Listings';

const back = { to: '/admin/listings', label: 'Listings' };
const peso = (v: string | number) => formatPeso(v).replace(/\.00$/, '');

export function UnitEditor() {
  const { id } = useParams();
  const unit = useUnit(id);

  if (id && unit.isPending) return null;
  if (id && (unit.isError || !unit.data)) return <PageHeader title="Unit not found" back={back} />;

  return (
    <>
      <PageHeader
        title={unit.data ? unit.data.title : 'Add a unit'}
        intro={
          unit.data
            ? unit.data.project?.name
            : 'Save the details first, then add photos and payment options.'
        }
        back={back}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Details unit={unit.data} />
          {unit.data && <Photos unit={unit.data} />}
          {unit.data && <Quotations unit={unit.data} />}
        </div>
        {unit.data && (
          <div className="lg:sticky lg:top-8 lg:self-start">
            <Publish unit={unit.data} />
          </div>
        )}
      </div>
    </>
  );
}

const numOrEmpty = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '' : String(Number(v));

function Details({ unit }: { unit?: UnitDetail }) {
  const navigate = useNavigate();
  const projects = useProjects();
  const invalidate = useInvalidateCatalog();
  const [form, setForm] = useState({
    projectId: unit?.projectId ?? '',
    title: unit?.title ?? '',
    type: (unit?.type ?? 'HOUSE_AND_LOT') as PropertyType,
    price: numOrEmpty(unit?.price),
    lotAreaSqm: numOrEmpty(unit?.lotAreaSqm),
    floorAreaSqm: numOrEmpty(unit?.floorAreaSqm),
    bedrooms: numOrEmpty(unit?.bedrooms),
    bathrooms: numOrEmpty(unit?.bathrooms),
    barangay: unit?.barangay ?? '',
    description: unit?.description ?? '',
  });
  const [location, setLocation] = useState(unit?.location ?? null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // New units start at the project's pin.
  useEffect(() => {
    if (unit || location) return;
    const p = projects.data?.find((x) => x.id === form.projectId);
    if (p?.location) setLocation(p.location);
  }, [form.projectId, projects.data, unit, location]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        price: Number(form.price),
        description: form.description || undefined,
        barangay: form.barangay || undefined,
        location,
      };
      return unit
        ? api<UnitDetail>(`/catalog/properties/${unit.id}`, { method: 'PATCH', json: body })
        : api<UnitDetail>('/catalog/properties', { json: body });
    },
    onSuccess: (saved) => {
      invalidate();
      if (!unit) navigate(`/admin/listings/${saved.id}`, { replace: true });
    },
  });

  return (
    <Card>
      <CardHeader title="Details" />
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" htmlFor="u-project">
            <select
              id="u-project"
              className="input"
              required
              value={form.projectId}
              onChange={set('projectId')}
            >
              <option value="">Choose…</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.developer.name})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type" htmlFor="u-type">
            <select id="u-type" className="input" value={form.type} onChange={set('type')}>
              {(Object.entries(TYPE_LABEL) as [PropertyType, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Unit or model name"
          htmlFor="u-title"
          hint='e.g. "Ella Model" or "Corner lot, Block 4"'
        >
          <input
            id="u-title"
            className="input"
            required
            value={form.title}
            onChange={set('title')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Total contract price (₱)" htmlFor="u-price">
            <input
              id="u-price"
              type="number"
              min={0}
              className="input"
              required
              value={form.price}
              onChange={set('price')}
            />
          </Field>
          <Field label="Lot area (sq m)" htmlFor="u-lot">
            <input
              id="u-lot"
              type="number"
              min={0}
              step="any"
              className="input"
              value={form.lotAreaSqm}
              onChange={set('lotAreaSqm')}
            />
          </Field>
          <Field label="Floor area (sq m)" htmlFor="u-floor">
            <input
              id="u-floor"
              type="number"
              min={0}
              step="any"
              className="input"
              value={form.floorAreaSqm}
              onChange={set('floorAreaSqm')}
            />
          </Field>
          <Field label="Bedrooms" htmlFor="u-bed">
            <input
              id="u-bed"
              type="number"
              min={0}
              className="input"
              value={form.bedrooms}
              onChange={set('bedrooms')}
            />
          </Field>
          <Field label="Bathrooms" htmlFor="u-bath">
            <input
              id="u-bath"
              type="number"
              min={0}
              className="input"
              value={form.bathrooms}
              onChange={set('bathrooms')}
            />
          </Field>
          <Field label="Barangay" htmlFor="u-brgy">
            <input id="u-brgy" className="input" value={form.barangay} onChange={set('barangay')} />
          </Field>
        </div>
        <Field label="Description" htmlFor="u-desc">
          <textarea
            id="u-desc"
            rows={4}
            className="input"
            value={form.description}
            onChange={set('description')}
          />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Map pin</p>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
        <FormError error={save.error} />
        {save.isSuccess && unit && <FormSuccess>Saved.</FormSuccess>}
        <PrimaryButton pending={save.isPending}>
          {save.isPending ? 'Saving…' : unit ? 'Save changes' : 'Save and continue'}
        </PrimaryButton>
      </form>
    </Card>
  );
}

function Photos({ unit }: { unit: UnitDetail }) {
  const invalidate = useInvalidateCatalog();
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', f);
        await api(`/catalog/properties/${unit.id}/photos`, { method: 'POST', body: fd });
      }
    },
    onSettled: () => {
      if (fileRef.current) fileRef.current.value = '';
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (photoId: string) => api(`/catalog/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const cover = useMutation({
    mutationFn: (photoId: string) => api(`/catalog/photos/${photoId}/cover`, { method: 'POST' }),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader
        title="Photos"
        description="The first photo is the cover. Location data inside photos is removed when they're uploaded."
        action={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-[#262624] has-focus-visible:ring-2 has-focus-visible:ring-gold">
            <Upload aria-hidden className="size-4" />
            {upload.isPending ? 'Uploading…' : 'Add photos'}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => e.target.files?.length && upload.mutate(e.target.files)}
            />
          </label>
        }
      />
      <FormError error={upload.error ?? remove.error} />
      {unit.photos.length === 0 ? (
        <EmptyState>No photos yet. Listings with photos get more inquiries.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {unit.photos.map((ph, i) => (
            <li
              key={ph.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-canvas"
            >
              <img src={ph.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-paper/95 px-2 py-0.5 text-xs font-semibold">
                  Cover
                </span>
              )}
              <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                {i > 0 && (
                  <button
                    onClick={() => cover.mutate(ph.id)}
                    className="grid size-8 place-items-center rounded-lg bg-paper/95 hover:bg-paper"
                    title="Make cover"
                  >
                    <Star aria-hidden className="size-4" />
                    <span className="sr-only">Make photo {i + 1} the cover</span>
                  </button>
                )}
                <button
                  onClick={() => confirm('Delete this photo?') && remove.mutate(ph.id)}
                  className="grid size-8 place-items-center rounded-lg bg-paper/95 text-flag hover:bg-paper"
                  title="Delete"
                >
                  <Trash2 aria-hidden className="size-4" />
                  <span className="sr-only">Delete photo {i + 1}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Quotations({ unit }: { unit: UnitDetail }) {
  const invalidate = useInvalidateCatalog();
  const price = Number(unit.price);
  const blank = {
    label: '',
    paymentMethod: 'PAG_IBIG' as PaymentMethod,
    reservationFee: '20000',
    downpaymentPct: '10',
    dpTermMonths: '12',
    interestRatePct: '6.25',
    loanTermYears: '30',
    notes: '',
  };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Suggested numbers from the shared formula; the admin enters the developer's actual figures.
  const dpTotal = (price * Number(form.downpaymentPct)) / 100;
  const loanAmount = Math.max(0, price - dpTotal);
  const monthlyDp =
    Number(form.dpTermMonths) > 0
      ? Math.max(0, (dpTotal - Number(form.reservationFee)) / Number(form.dpTermMonths))
      : 0;
  const amort = monthlyPayment(
    loanAmount,
    Number(form.interestRatePct),
    Number(form.loanTermYears),
  );

  const add = useMutation({
    mutationFn: () =>
      api(`/catalog/properties/${unit.id}/quotations`, {
        json: {
          ...form,
          monthlyDp: Math.round(monthlyDp * 100) / 100,
          loanAmount,
          monthlyAmortization: loanAmount > 0 ? amort : undefined,
          notes: form.notes || undefined,
        },
      }),
    onSuccess: () => {
      setForm(blank);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (qid: string) => api(`/catalog/quotations/${qid}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardHeader
        title="Payment options"
        description="The developer's sample computations, shown to buyers next to the calculator."
      />
      {unit.loanQuotations.length > 0 && (
        <ul className="mb-5 divide-y divide-line rounded-xl border border-line">
          {unit.loanQuotations.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold">{q.label}</p>
                <p className="text-xs text-muted">
                  {METHOD_LABEL[q.paymentMethod]}, {Number(q.downpaymentPct)}% down
                  {q.monthlyAmortization && `, ${peso(q.monthlyAmortization)}/month`}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => remove.mutate(q.id)}
                aria-label={`Delete ${q.label}`}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          add.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label" htmlFor="q-label" hint='e.g. "Pag-IBIG 30 yrs"'>
            <input
              id="q-label"
              className="input"
              required
              value={form.label}
              onChange={set('label')}
            />
          </Field>
          <Field label="Payment method" htmlFor="q-method">
            <select
              id="q-method"
              className="input"
              value={form.paymentMethod}
              onChange={set('paymentMethod')}
            >
              {(Object.entries(METHOD_LABEL) as [PaymentMethod, string][]).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-5">
          <Field label="Reservation (₱)" htmlFor="q-res">
            <input
              id="q-res"
              type="number"
              min={0}
              className="input"
              value={form.reservationFee}
              onChange={set('reservationFee')}
            />
          </Field>
          <Field label="Down (%)" htmlFor="q-dp">
            <input
              id="q-dp"
              type="number"
              min={0}
              max={100}
              step="any"
              className="input"
              value={form.downpaymentPct}
              onChange={set('downpaymentPct')}
            />
          </Field>
          <Field label="Down term (mo)" htmlFor="q-dpm">
            <input
              id="q-dpm"
              type="number"
              min={0}
              className="input"
              value={form.dpTermMonths}
              onChange={set('dpTermMonths')}
            />
          </Field>
          <Field label="Rate (%/yr)" htmlFor="q-rate">
            <input
              id="q-rate"
              type="number"
              min={0}
              step="any"
              className="input"
              value={form.interestRatePct}
              onChange={set('interestRatePct')}
            />
          </Field>
          <Field label="Term (yrs)" htmlFor="q-yrs">
            <input
              id="q-yrs"
              type="number"
              min={0}
              className="input"
              value={form.loanTermYears}
              onChange={set('loanTermYears')}
            />
          </Field>
        </div>
        <p className="rounded-lg bg-canvas px-3 py-2.5 text-sm tabular-nums">
          Downpayment {peso(Math.round(monthlyDp))}/month for {form.dpTermMonths} months, then a
          loan of {peso(loanAmount)} at about{' '}
          <span className="font-semibold">{peso(amort)}/month</span>.
        </p>
        <FormError error={add.error} />
        <PrimaryButton pending={add.isPending}>Add payment option</PrimaryButton>
      </form>
    </Card>
  );
}

function Publish({ unit }: { unit: UnitDetail }) {
  const invalidate = useInvalidateCatalog();
  const publish = useMutation({
    mutationFn: () =>
      api(`/catalog/properties/${unit.id}/${unit.status === 'LIVE' ? 'unpublish' : 'publish'}`, {
        method: 'POST',
      }),
    onSuccess: invalidate,
  });
  const lts = unit.project ? ltsState(unit.project) : 'missing';
  const canPublish = lts === 'valid' || lts === 'expiring';

  return (
    <Card>
      <CardHeader title="Marketplace" action={<StatusBadge status={unit.status} />} />
      <ul className="mb-4 space-y-1.5 text-sm">
        <Check ok={canPublish}>Project License to Sell approved and valid</Check>
        <Check ok={unit.photos.length > 0}>At least one photo (recommended)</Check>
        <Check ok={unit.loanQuotations.length > 0}>Payment options (recommended)</Check>
      </ul>
      <FormError error={publish.error} />
      {unit.status === 'LIVE' ? (
        <div className="flex flex-wrap gap-2">
          <a
            href={`/properties/${unit.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-rule px-4 py-2.5 text-sm font-semibold hover:bg-canvas"
          >
            View public page
          </a>
          <Button variant="danger" disabled={publish.isPending} onClick={() => publish.mutate()}>
            Unpublish
          </Button>
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={!canPublish || publish.isPending}
          onClick={() => publish.mutate()}
        >
          {publish.isPending ? 'Publishing…' : 'Publish to marketplace'}
        </Button>
      )}
    </Card>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${ok ? 'bg-ink text-paper' : 'border border-rule'}`}
      >
        {ok ? '✓' : ''}
      </span>
      <span className={ok ? '' : 'text-muted'}>
        <span className="sr-only">{ok ? 'Done: ' : 'Not yet: '}</span>
        {children}
      </span>
    </li>
  );
}
