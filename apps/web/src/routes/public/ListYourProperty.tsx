import { useMutation } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { BrokerSeal } from '../../components/BrokerSeal';
import { ConsultantCard } from '../../components/public/ConsultantCard';
import { errorText } from '../../components/Form';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ButtonLink } from '../../components/ui';
import { api } from '../../lib/api';
import { TYPE_LABEL, type PropertyType } from '../../lib/marketplace';
import { useAgents, type AgentCard } from '../../lib/sellers';

const STEPS = ['Your property', 'Choose an agent', 'How to reach you'] as const;
const MAX_PHOTOS = 8;

type Form = {
  propertyType: PropertyType | '';
  barangay: string;
  city: string;
  lotAreaSqm: string;
  floorAreaSqm: string;
  askingPrice: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  consent: boolean;
  website: string; // honeypot, hidden from people
};

const blank: Form = {
  propertyType: '',
  barangay: '',
  city: 'Naga City',
  lotAreaSqm: '',
  floorAreaSqm: '',
  askingPrice: '',
  sellerName: '',
  sellerPhone: '',
  sellerEmail: '',
  consent: false,
  website: '',
};

/** SPEC §7.1 /list-your-property: seller form → agent picker (all firms) → consent → submit. */
export function ListYourProperty() {
  const [hasTitle, setHasTitle] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blank);
  const [photos, setPhotos] = useState<File[]>([]);
  const [agent, setAgent] = useState<AgentCard | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = useMutation({
    mutationFn: () => {
      const body = new FormData();
      for (const [k, v] of Object.entries(form)) body.append(k, String(v));
      body.append('hasTitle', 'true');
      body.append('agentId', agent!.id);
      photos.forEach((p) => body.append('photos', p));
      return api<{ id: string }>('/public/seller-requests', { method: 'POST', body });
    },
  });

  if (submit.isSuccess && agent) {
    return (
      <Shell>
        <BrokerSeal size={64} />
        <h1 className="font-display mt-6 text-[clamp(2rem,5vw,3rem)] leading-tight">
          Sent to {agent.firstName} {agent.lastName}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-graphite">
          {agent.firstName} of {agent.firm?.name} will call you at {form.sellerPhone} to talk about
          your property and collect your documents. Your listing goes live only after their firm's
          licensed broker checks the title, tax declaration, tax receipt and your ID.
        </p>
        <ButtonLink to="/properties" variant="secondary" className="mt-8">
          Browse homes
        </ButtonLink>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.02]">
        List your property
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-graphite">
        Choose a licensed agent to sell it for you. Before your listing goes live, their broker
        checks that you own it. Listing is free; you agree on the agent's fee with them.
      </p>

      {/* Asked first: without a title, nothing else matters (decided OPEN-2). */}
      <fieldset className="mt-10 rounded-2xl border border-line p-5 sm:p-6">
        <legend className="px-1 text-lg font-bold">Do you have the land title?</legend>
        <p className="mt-1 text-sm text-graphite">
          A TCT, OCT or condominium title (CCT), in your name or your family's.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            [true, 'Yes, I have the title'],
            [false, 'No title yet'],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={hasTitle === v}
              onClick={() => setHasTitle(v as boolean)}
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                hasTitle === v ? 'border-ink bg-ink text-paper' : 'border-rule hover:border-ink'
              }`}
            >
              {label as string}
            </button>
          ))}
        </div>
        {hasTitle === false && (
          <div className="mt-5 rounded-xl bg-canvas p-4 text-sm leading-relaxed">
            <p className="font-semibold">TrustListo can't list a property without a title yet.</p>
            <p className="mt-1 text-graphite">
              Every listing here shows that a licensed broker checked who owns it, and that check
              needs the title. Once your title is issued, come back and list it.{' '}
              <Link to="/about-badges" className="font-semibold underline underline-offset-2">
                How verification works
              </Link>
            </p>
          </div>
        )}
      </fieldset>

      {hasTitle && (
        <>
          <ol className="mt-10 grid grid-cols-3 gap-2" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === step ? 'step' : undefined}
                className={`border-t-4 pt-2 text-sm font-semibold ${
                  i <= step ? 'border-ink' : 'border-line text-muted'
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>{' '}
                <span className="hidden sm:inline">{s}</span>
              </li>
            ))}
          </ol>
          <h2 className="mt-6 text-2xl font-bold">{STEPS[step]}</h2>

          {step === 0 && (
            <PropertyStep
              form={form}
              set={set}
              photos={photos}
              setPhotos={setPhotos}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <AgentStep
              chosen={agent}
              onChoose={setAgent}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && agent && (
            <form
              className="mt-6 space-y-5"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                submit.mutate();
              }}
            >
              <Row label="Your full name" id="s-name">
                <input
                  id="s-name"
                  className="input"
                  required
                  autoComplete="name"
                  value={form.sellerName}
                  onChange={set('sellerName')}
                />
              </Row>
              <Row
                label="Mobile number"
                id="s-phone"
                hint="Your agent will call or text this number."
              >
                <input
                  id="s-phone"
                  className="input"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09171234567"
                  value={form.sellerPhone}
                  onChange={set('sellerPhone')}
                />
              </Row>
              <Row label="Email (optional)" id="s-email">
                <input
                  id="s-email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={form.sellerEmail}
                  onChange={set('sellerEmail')}
                />
              </Row>
              {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
              <input
                tabIndex={-1}
                aria-hidden
                autoComplete="off"
                className="hidden"
                value={form.website}
                onChange={set('website')}
                name="website"
              />

              <div className="rounded-xl bg-canvas p-4 text-sm">
                <p>
                  Sending to{' '}
                  <span className="font-semibold">
                    {agent.firstName} {agent.lastName}
                  </span>
                  , {agent.firm?.name}. {TYPE_LABEL[form.propertyType as PropertyType]} in{' '}
                  {form.barangay}, {form.city}, asking{' '}
                  {formatPeso(form.askingPrice || '0').replace(/\.00$/, '')}.
                </p>
              </div>

              <label className="flex items-start gap-3 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                  className="mt-1 size-4 accent-ink"
                />
                <span>
                  I agree that TrustListo and {agent.firm?.name} may use these details and photos to
                  contact me and to list this property, as allowed by the Data Privacy Act of 2012.
                  My details are not shown to the public.
                </span>
              </label>
              {submit.error && (
                <p className="text-sm text-flag" role="alert">
                  {errorText(submit.error)}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-rule px-5 py-3 text-sm font-semibold hover:border-ink"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"
                >
                  {submit.isPending ? 'Sending…' : `Send to ${agent.firstName}`}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">{children}</div>
    </PublicLayout>
  );
}

function Row({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function PropertyStep({
  form,
  set,
  photos,
  setPhotos,
  onNext,
}: {
  form: Form;
  set: (k: keyof Form) => (e: { target: { value: string } }) => void;
  photos: File[];
  setPhotos: (p: File[]) => void;
  onNext: () => void;
}) {
  const built = form.propertyType && form.propertyType !== 'LOT';
  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onNext();
      }}
    >
      <Row label="What kind of property?" id="p-type">
        <select
          id="p-type"
          className="input"
          required
          value={form.propertyType}
          onChange={set('propertyType')}
        >
          <option value="">Choose…</option>
          {(Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </Row>
      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Barangay" id="p-brgy">
          <input
            id="p-brgy"
            className="input"
            required
            value={form.barangay}
            onChange={set('barangay')}
          />
        </Row>
        <Row label="City or town" id="p-city">
          <input id="p-city" className="input" required value={form.city} onChange={set('city')} />
        </Row>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Lot area, sqm" id="p-lot" hint="As written on the title.">
          <input
            id="p-lot"
            className="input"
            inputMode="decimal"
            value={form.lotAreaSqm}
            onChange={set('lotAreaSqm')}
          />
        </Row>
        {built && (
          <Row label="Floor area, sqm" id="p-floor">
            <input
              id="p-floor"
              className="input"
              inputMode="decimal"
              value={form.floorAreaSqm}
              onChange={set('floorAreaSqm')}
            />
          </Row>
        )}
      </div>
      <Row label="Asking price, ₱" id="p-price">
        <input
          id="p-price"
          className="input"
          required
          inputMode="numeric"
          placeholder="3500000"
          value={form.askingPrice}
          onChange={set('askingPrice')}
        />
      </Row>

      <div>
        <p className="mb-1.5 text-sm font-semibold">Photos (optional, up to {MAX_PHOTOS})</p>
        <ul className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={`${p.name}-${i}`} className="relative">
              <img
                src={URL.createObjectURL(p)}
                alt={`Photo ${i + 1}`}
                className="size-24 rounded-lg object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-paper"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
          {photos.length < MAX_PHOTOS && (
            <li>
              <label className="grid size-24 cursor-pointer place-items-center rounded-lg border border-dashed border-rule text-muted hover:border-ink hover:text-ink">
                <ImagePlus aria-hidden className="size-6" />
                <span className="sr-only">Add photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    setPhotos(
                      [...photos, ...Array.from(e.target.files ?? [])].slice(0, MAX_PHOTOS),
                    );
                    e.target.value = '';
                  }}
                />
              </label>
            </li>
          )}
        </ul>
        <p className="mt-1.5 text-xs text-muted">
          Location data is removed from photos before they are stored.
        </p>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper"
      >
        Next: choose an agent
      </button>
    </form>
  );
}

function AgentStep({
  chosen,
  onChoose,
  onBack,
  onNext,
}: {
  chosen: AgentCard | null;
  onChoose: (a: AgentCard) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const agents = useAgents();
  const [shown, setShown] = useState(6);
  const list = agents.data ?? [];

  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed text-graphite">
        Every agent here has a license their broker verified. The order is random each time you open
        this page; no one pays to be listed first.
      </p>
      {agents.isPending && <p className="mt-6 text-sm text-muted">Loading agents…</p>}
      {agents.isError && <p className="mt-6 text-sm text-flag">{errorText(agents.error)}</p>}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {list.slice(0, shown).map((a) => (
          <li key={a.id}>
            <ConsultantCard c={a} selected={chosen?.id === a.id} onSelect={() => onChoose(a)} />
          </li>
        ))}
      </ul>
      {shown < list.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + 6)}
          className="mt-4 text-sm font-semibold underline underline-offset-4"
        >
          Show {Math.min(6, list.length - shown)} more agents
        </button>
      )}
      {agents.isSuccess && list.length === 0 && (
        <p className="mt-6 rounded-xl bg-canvas p-4 text-sm">
          No verified agents are available right now. Try again later.
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-rule px-5 py-3 text-sm font-semibold hover:border-ink"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!chosen}
          onClick={onNext}
          className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-40"
        >
          {chosen ? `Continue with ${chosen.firstName}` : 'Choose an agent to continue'}
        </button>
      </div>
    </div>
  );
}
