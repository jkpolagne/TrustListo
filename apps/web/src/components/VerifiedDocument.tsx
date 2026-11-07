import type { CSSProperties } from 'react';
import { BrokerSeal } from './BrokerSeal';

// Illustrative sample only — fictional names and numbers.
const checks = [
  { field: 'Registered owner', value: 'Maria L. Santos', result: "Matches the seller's ID" },
  { field: 'Lot area', value: '120 sq m', result: 'Matches the listing' },
  { field: 'Real property tax', value: 'Paid through 2026', result: 'Receipts are current' },
  { field: 'Encumbrances', value: 'None annotated', result: 'No liens or claims' },
];

const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
// Seal stamps after the last tick.
const SEAL_DELAY_MS = 500 + checks.length * 380 + 150;

export function VerifiedDocument() {
  return (
    <figure className="relative mx-auto w-full max-w-md">
      <div className="relative border-2 border-ink bg-paper px-6 pt-6 pb-32 shadow-[10px_10px_0_0_#000] sm:px-8">
        <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink pb-3">
          <p className="font-display text-lg leading-tight">Transfer Certificate of Title</p>
          <p className="shrink-0 text-sm tabular-nums text-graphite">No. T-48213</p>
        </div>

        <dl className="mt-1">
          {checks.map((c, i) => (
            <div
              key={c.field}
              className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-rule py-3"
            >
              <dt className="text-sm text-graphite">{c.field}</dt>
              <span
                aria-hidden
                className="anim-tick row-span-2 grid size-7 place-items-center self-center rounded-full bg-gold"
                style={delay(500 + i * 380)}
              >
                <svg viewBox="0 0 16 16" className="size-4">
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    fill="none"
                    stroke="#000"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <dd className="font-semibold">
                {c.value}
                <span className="block text-sm font-normal text-bronze">{c.result}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="absolute right-5 bottom-5 flex items-center gap-3 sm:right-7">
          <p
            className="anim-tick text-right text-xs leading-snug text-graphite"
            style={delay(SEAL_DELAY_MS + 250)}
          >
            Approved by
            <br />
            <span className="font-semibold text-ink">Bernardo Reyes</span>
            <br />
            PRC broker no. 0012345
          </p>
          <span className="anim-stamp block" style={delay(SEAL_DELAY_MS)}>
            <BrokerSeal size={104} />
          </span>
        </div>
      </div>

      <figcaption className="mt-5 text-sm text-graphite">
        Sample title with fictional details. The checks shown are the ones a broker reviews.
      </figcaption>
    </figure>
  );
}
