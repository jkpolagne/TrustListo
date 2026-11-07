import { BrokerSeal } from '../../components/BrokerSeal';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ButtonLink } from '../../components/ui';
import { BADGE_INFO, type BadgeType } from '../../lib/marketplace';

const steps = [
  [
    'The firm uploads the document',
    'A title, tax declaration, tax receipt, license to sell, or a consultant’s license.',
  ],
  [
    'TrustListo reads it and points out problems',
    "Names that don't match, expired dates, missing pages. It never approves anything by itself.",
  ],
  [
    'A licensed broker decides',
    'Only a PRC-licensed broker can approve. Their name and the date are recorded with every decision.',
  ],
] as const;

/** SPEC §7.1 /about-badges: what a badge means, in plain language. */
export function AboutBadges() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <BrokerSeal size={72} />
        <h1 className="font-display mt-6 text-[clamp(2rem,5vw,3rem)] leading-tight">
          What a badge means
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-graphite">
          A badge means a document was uploaded, read by TrustListo, and reviewed by a licensed
          broker. It is not a check against a government database.
        </p>

        <ol className="mt-10 space-y-4">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-4 rounded-2xl bg-canvas p-5">
              <span className="font-display grid size-10 shrink-0 place-items-center rounded-full bg-ink text-paper">
                {i + 1}
              </span>
              <div>
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-graphite">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-14 text-2xl font-bold">Listing badges</h2>
        <div className="mt-5 space-y-4">
          {(Object.keys(BADGE_INFO) as BadgeType[]).map((b) => (
            <div key={b} className="rounded-2xl border border-line p-5">
              <p className="flex items-center gap-2 font-bold">
                <span aria-hidden className="size-2.5 rounded-full bg-gold" />
                {BADGE_INFO[b].name}
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                <span className="font-semibold">Means: </span>
                {BADGE_INFO[b].means}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                <span className="font-semibold">Doesn't mean: </span>
                {BADGE_INFO[b].doesNotMean}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold">Consultant badges</h2>
        <div className="mt-5 rounded-2xl border border-line p-5 text-sm leading-relaxed">
          <p>
            <span className="font-semibold">PRC licensed</span> and{' '}
            <span className="font-semibold">DHSUD registered</span> mean a broker checked the
            consultant's license or registration and it hasn't expired. Expired badges disappear on
            their own.
          </p>
        </div>

        <div className="mt-12 rounded-2xl bg-ink p-6 text-paper">
          <p className="font-bold">Before you pay anything</p>
          <p className="mt-1 text-sm leading-relaxed text-paper/75">
            Ask for a certified true copy of the title from the Registry of Deeds, and pay only
            through official developer or firm channels with an official receipt.
          </p>
        </div>

        <ButtonLink to="/properties" className="mt-10">
          Browse verified homes
        </ButtonLink>
      </div>
    </PublicLayout>
  );
}
