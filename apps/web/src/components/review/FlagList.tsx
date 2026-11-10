import type { DocFlag } from '../../lib/reviews';

const LEAD: Record<DocFlag['severity'], string> = {
  BLOCKER: 'Blocking issue',
  WARNING: 'Check this',
  INFO: 'Note',
};

/** The AI's flags, most serious first. Blocking issues need an override note to approve. */
export function FlagList({ flags }: { flags: DocFlag[] }) {
  const order = { BLOCKER: 0, WARNING: 1, INFO: 2 } as const;
  const sorted = [...flags].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className="space-y-2">
      {sorted.map((f, i) => (
        <li
          key={i}
          className={`rounded-lg px-3 py-2.5 text-sm leading-snug ${
            f.severity === 'BLOCKER'
              ? 'bg-flag-pale text-flag'
              : f.severity === 'WARNING'
                ? 'border-l-2 border-flag/50 bg-canvas'
                : 'bg-canvas text-muted'
          }`}
        >
          <span className="font-semibold">{LEAD[f.severity]}: </span>
          {f.message}
        </li>
      ))}
    </ul>
  );
}
