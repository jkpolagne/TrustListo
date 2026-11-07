import { useQuery } from '@tanstack/react-query';
import type { HealthResponse } from '@trustlisto/shared';
import { BrokerSeal } from '../../components/BrokerSeal';
import { Logo } from '../../components/Logo';
import { VerifiedDocument } from '../../components/VerifiedDocument';
import { api } from '../../lib/api';

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

const badges = [
  {
    name: 'Ownership verified',
    meaning: "The seller's name matches the registered owner on the title.",
  },
  { name: 'Title clean', meaning: 'No mortgage, lien or adverse claim is annotated on the title.' },
  { name: 'Taxes current', meaning: 'Real property tax receipts are up to date.' },
  {
    name: 'License to sell',
    meaning: "The developer's DHSUD license to sell for the project is valid.",
  },
  { name: 'PRC licensed', meaning: "The consultant's PRC license was checked and hasn't expired." },
  {
    name: 'DHSUD registered',
    meaning: "The consultant's DHSUD registration was checked and hasn't expired.",
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" aria-label="TrustListo home">
          <Logo className="h-12 sm:h-14" />
        </a>
        <nav className="text-sm font-semibold">
          <a href="#how" className="underline-offset-4 hover:underline">
            How listings are checked
          </a>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-16 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.6rem)] leading-[0.98]">
              Every home here was checked by a licensed broker.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-graphite">
              TrustListo reads each listing's title and tax papers, flags anything that doesn't add
              up, and leaves the final call to a licensed broker. Browse homes from Naga City
              brokerages, see what was checked, and send an inquiry. No account needed.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#how"
                className="inline-flex items-center bg-ink px-6 py-3.5 font-semibold text-paper hover:bg-graphite"
              >
                See how listings are checked
              </a>
            </div>
          </div>
          <VerifiedDocument />
        </section>

        {/* How verification works — a real sequence, so it's numbered */}
        <section id="how" className="scroll-mt-6 bg-stone">
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
                  <h3 className="mt-4 text-xl font-bold leading-snug">{s.title}</h3>
                  <p className="mt-2 max-w-[22rem] leading-relaxed text-graphite">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Badge glossary */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div className="max-w-md">
              <BrokerSeal size={72} />
              <h2 className="font-display mt-6 text-[clamp(1.9rem,3.6vw,2.75rem)] leading-tight">
                What the badges mean
              </h2>
              <p className="mt-4 leading-relaxed text-graphite">
                A badge appears only after a broker approves the document behind it. Badges reflect
                documents reviewed by the listing firm. They aren't a confirmation from the Registry
                of Deeds, BIR, PRC or DHSUD.
              </p>
            </div>
            <dl className="border-t-2 border-ink">
              {badges.map((b) => (
                <div
                  key={b.name}
                  className="grid gap-1 border-b border-rule py-5 sm:grid-cols-[13rem_1fr] sm:gap-6"
                >
                  <dt className="flex items-center gap-2.5 font-bold">
                    <span aria-hidden className="size-3 rounded-full bg-gold ring-2 ring-ink" />
                    {b.name}
                  </dt>
                  <dd className="leading-relaxed text-graphite">{b.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-2xl">TrustListo</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper/70">
              A shared marketplace for licensed real-estate brokerages in Naga City, Camarines Sur.
            </p>
          </div>
          {import.meta.env.DEV && <SystemStatus />}
        </div>
      </footer>
    </div>
  );
}

/** Dev-only: shows whether the API and database are reachable. */
function SystemStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<HealthResponse>('/health'),
    retry: false,
  });
  const ok = health.data?.db === true;
  return (
    <p className="flex items-center gap-2 text-sm text-paper/70">
      <span aria-hidden className={`size-2 rounded-full ${ok ? 'bg-gold' : 'bg-flag'}`} />
      {health.isPending
        ? 'Checking API'
        : ok
          ? 'API and database online'
          : 'API unreachable. Run pnpm dev and pnpm db:up.'}
    </p>
  );
}
