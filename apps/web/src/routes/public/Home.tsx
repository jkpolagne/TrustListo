import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrokerSeal } from '../../components/BrokerSeal';
import { PropertyCard } from '../../components/public/PropertyCard';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ButtonLink } from '../../components/ui';
import { VerifiedDocument } from '../../components/VerifiedDocument';
import { TYPE_LABEL, useListings, type PropertyType } from '../../lib/marketplace';

const steps = [
  {
    title: 'The agent uploads the documents',
    body: 'Title, tax declaration and tax receipts for a private sale. The license to sell for a developer project.',
  },
  {
    title: 'TrustListo reads them and flags problems',
    body: "A name that doesn't match the seller, an expired license, unpaid taxes. It points these out. It never approves anything.",
  },
  {
    title: 'A licensed broker decides',
    body: 'Only a PRC-licensed broker can approve a listing. Their name and the date are recorded with every decision.',
  },
];

export function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16 lg:pb-24">
        <div className="max-w-xl">
          <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.6rem)] leading-[0.98]">
            Every home here was checked by a licensed broker.
          </h1>
          <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-graphite">
            Browse homes from Naga City brokerages, see which documents were checked, and send an
            inquiry. No account needed.
          </p>
          <HeroSearch />
        </div>
        <VerifiedDocument />
      </section>

      <Newest />

      {/* How verification works — a real sequence, so it's numbered */}
      <section id="how" className="scroll-mt-20 bg-stone">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <h2 className="font-display max-w-2xl text-[clamp(1.9rem,3.6vw,2.75rem)] leading-tight">
            How a listing gets verified
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t-4 border-ink pt-5">
                <span className="font-display block text-5xl leading-none tabular-nums">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-xl leading-snug font-bold">{s.title}</h3>
                <p className="mt-2 max-w-88 leading-relaxed text-graphite">{s.body}</p>
              </li>
            ))}
          </ol>
          <Link
            to="/about-badges"
            className="mt-10 inline-flex items-center gap-3 font-semibold underline underline-offset-4"
          >
            <BrokerSeal size={36} /> What each badge means, and doesn't
          </Link>
        </div>
      </section>

      {/* For owners: the same checks apply to their listing */}
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <h2 className="font-display max-w-xl text-[clamp(1.9rem,3.6vw,2.75rem)] leading-tight">
            Selling your own lot or house?
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-graphite">
            Pick a licensed agent from any firm here. Their broker checks your title before the
            listing goes up, so buyers can see it's really yours.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <ButtonLink to="/list-your-property" className="px-6 py-3.5 text-base">
            List your property
          </ButtonLink>
          <p className="mt-3 text-sm text-muted">Free. You need the land title.</p>
        </div>
      </section>
    </PublicLayout>
  );
}

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState<PropertyType | ''>('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (type) p.set('type', type);
    navigate(`/properties${p.size ? `?${p}` : ''}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="mt-9 flex flex-col gap-2 rounded-2xl border border-line bg-paper p-2 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.3)] sm:flex-row"
    >
      <label htmlFor="hero-q" className="sr-only">
        Where do you want to live?
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <input
          id="hero-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Barangay, project or developer"
          className="w-full rounded-xl py-3 pr-3 pl-9 outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>
      <label htmlFor="hero-type" className="sr-only">
        Property type
      </label>
      <select
        id="hero-type"
        value={type}
        onChange={(e) => setType(e.target.value as PropertyType | '')}
        className="rounded-xl bg-canvas px-3 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <option value="">Any type</option>
        {(Object.entries(TYPE_LABEL) as [PropertyType, string][]).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-xl bg-ink px-6 py-3 font-semibold text-paper transition-colors hover:bg-[#262624]"
      >
        Find homes
      </button>
    </form>
  );
}

/** Newest live listings (SPEC §7.1: by date, never admin-picked). */
function Newest() {
  const listings = useListings({ sort: 'newest' }, 6);
  if (!listings.data || listings.data.data.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight">
          Newest listings
        </h2>
        <Link to="/properties" className="font-semibold underline underline-offset-4">
          See all {listings.data.total} homes
        </Link>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings.data.data.map((p) => (
          <PropertyCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
