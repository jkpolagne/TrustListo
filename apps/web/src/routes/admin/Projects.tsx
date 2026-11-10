import { useMutation } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { PageHeader } from '../../components/AppShell';
import { errorText, Field, FormError, PrimaryButton } from '../../components/Form';
import { LocationPicker } from '../../components/LocationPicker';
import { Badge, Button, Card, CardHeader, EmptyState } from '../../components/ui';
import { api } from '../../lib/api';
import {
  ltsState,
  useDevelopers,
  useInvalidateCatalog,
  useProjects,
  type Project,
} from '../../lib/catalog';

const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

function LtsBadge({ p }: { p: Project }) {
  const s = ltsState(p);
  const until = p.ltsExpiresAt ? date.format(new Date(p.ltsExpiresAt)) : '';
  if (s === 'valid') return <Badge tone="verified">License to sell until {until}</Badge>;
  if (s === 'expiring') return <Badge tone="danger">License to sell expires {until}</Badge>;
  if (s === 'expired') return <Badge tone="danger">License to sell expired {until}</Badge>;
  return <Badge>No approved license to sell</Badge>;
}

/** Where the latest License to Sell upload stands, in the admin's terms. */
function uploadState(p: Project): { text: string; tone: 'info' | 'neutral' | 'danger' } | null {
  const u = p.latestLts;
  if (!u || u.reviewStatus === 'APPROVED') return null;
  if (u.reviewStatus === 'PENDING_AI') return { text: 'New license is being read…', tone: 'info' };
  if (u.reviewStatus === 'REJECTED')
    return {
      text: `Broker rejected the upload: ${u.reviewNote ?? 'no reason given'}`,
      tone: 'danger',
    };
  const what = p.ltsStatus === 'APPROVED' ? 'Renewal' : 'License';
  const serious = (u.flags ?? []).filter((f) => f.severity !== 'INFO');
  return serious.length
    ? { text: `${what} waiting for the broker. Flagged: ${serious[0]!.message}`, tone: 'danger' }
    : { text: `${what} waiting for the broker.`, tone: 'neutral' };
}

/** One project: its license status, and uploading a new License to Sell for broker review. */
function ProjectRow({ p }: { p: Project }) {
  const invalidate = useInvalidateCatalog();
  const input = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api(`/catalog/projects/${p.id}/lts`, { method: 'POST', body });
    },
    onSuccess: invalidate,
  });
  const state = uploadState(p);
  const waiting =
    p.latestLts &&
    ['PENDING_AI', 'READY_FOR_REVIEW', 'NEEDS_ATTENTION'].includes(p.latestLts.reviewStatus);

  const status = upload.error ? errorText(upload.error) : state?.text;

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{p.name}</p>
        <p className="text-xs text-muted">
          {p.locationText}, {p._count.properties} unit{p._count.properties === 1 ? '' : 's'}
          {!p.location && ', no map pin'}
        </p>
        {status && (
          <p
            className={`mt-1 text-xs ${upload.error || state?.tone === 'danger' ? 'text-flag' : 'text-muted'}`}
            aria-live="polite"
          >
            {status}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LtsBadge p={p} />
        {!waiting && (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              id={`lts-${p.id}`}
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
              {upload.isPending
                ? 'Uploading…'
                : p.ltsStatus === 'APPROVED'
                  ? 'Upload renewal'
                  : 'Upload license to sell'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function Projects() {
  const developers = useDevelopers();
  const projects = useProjects();

  return (
    <>
      <PageHeader
        title="Developers and projects"
        intro="Units belong to a project, and projects to a developer your firm partners with."
        back={{ to: '/admin/listings', label: 'Listings' }}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {developers.data?.length === 0 && (
            <Card>
              <EmptyState>Add your first developer to get started.</EmptyState>
            </Card>
          )}
          {developers.data?.map((d) => {
            const own = (projects.data ?? []).filter((p) => p.developer.id === d.id);
            return (
              <Card key={d.id}>
                <CardHeader
                  title={d.name}
                  description={`${own.length} project${own.length === 1 ? '' : 's'}`}
                />
                {own.length === 0 ? (
                  <EmptyState>No projects yet.</EmptyState>
                ) : (
                  <ul className="divide-y divide-line">
                    {own.map((p) => (
                      <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                        <ProjectRow p={p} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
          <p className="text-sm text-muted">
            A License to Sell is read automatically, then approved by your broker. Once approved,
            every unit of the project shows "License to Sell Verified" and can go live.
          </p>
        </div>

        <div className="space-y-6">
          <AddDeveloper />
          <AddProject />
        </div>
      </div>
    </>
  );
}

function AddDeveloper() {
  const invalidate = useInvalidateCatalog();
  const [name, setName] = useState('');
  const add = useMutation({
    mutationFn: () => api('/catalog/developers', { json: { name } }),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });
  return (
    <Card>
      <CardHeader title="Add a developer" />
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          add.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Name" htmlFor="dev-name" hint='e.g. "Vista Land (Camella)"'>
          <input
            id="dev-name"
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <FormError error={add.error} />
        <PrimaryButton pending={add.isPending}>Add developer</PrimaryButton>
      </form>
    </Card>
  );
}

function AddProject() {
  const developers = useDevelopers();
  const invalidate = useInvalidateCatalog();
  const blank = { developerId: '', name: '', locationText: '' };
  const [form, setForm] = useState(blank);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const add = useMutation({
    mutationFn: () => api('/catalog/projects', { json: { ...form, location } }),
    onSuccess: () => {
      setForm(blank);
      setLocation(null);
      invalidate();
    },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Card>
      <CardHeader title="Add a project" />
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          add.mutate();
        }}
        className="space-y-4"
      >
        <Field label="Developer" htmlFor="p-dev">
          <select
            id="p-dev"
            className="input"
            required
            value={form.developerId}
            onChange={set('developerId')}
          >
            <option value="">Choose…</option>
            {developers.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project name" htmlFor="p-name">
          <input id="p-name" className="input" required value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Location" htmlFor="p-loc" hint="Barangay and city, as buyers would say it.">
          <input
            id="p-loc"
            className="input"
            required
            value={form.locationText}
            onChange={set('locationText')}
          />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Map pin</p>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
        <FormError error={add.error} />
        <PrimaryButton pending={add.isPending}>Add project</PrimaryButton>
      </form>
    </Card>
  );
}
