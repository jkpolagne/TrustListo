import { Check } from 'lucide-react';
import type { AgentCard } from '../../lib/sellers';

const CREDENTIAL = { PRC_LICENSE: 'PRC licensed', DHSUD_REGISTRATION: 'DHSUD registered' } as const;

/**
 * A verified consultant in a public picker (SPEC §7.3 card): name, firm, broker-verified
 * credentials (gold: a broker checked them), rating, completed sales. Selectable.
 */
export function ConsultantCard({
  c,
  selected,
  onSelect,
  showFirm = true,
}: {
  c: AgentCard;
  selected?: boolean;
  onSelect?: () => void;
  showFirm?: boolean;
}) {
  const body = (
    <>
      <span className="flex w-full items-start justify-between gap-3">
        <span>
          <span className="block font-bold">
            {c.firstName} {c.lastName}
          </span>
          <span className="block text-sm text-graphite">
            {c.role === 'SALES_MANAGER' ? 'Sales manager' : 'Salesperson'}
            {showFirm && c.firm ? `, ${c.firm.name}` : ''}
          </span>
        </span>
        {selected && (
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-paper">
            <Check aria-hidden className="size-4" />
          </span>
        )}
      </span>
      {c.badges.length > 0 && (
        <span className="mt-3 flex flex-wrap gap-1.5">
          {c.badges.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-pale px-2.5 py-0.5 text-xs font-semibold text-bronze"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-gold" />
              {CREDENTIAL[b]}
            </span>
          ))}
        </span>
      )}
      <span className="mt-3 block text-xs leading-relaxed text-muted">
        <span className="block">
          {c.rating
            ? `Rated ${c.rating.average.toFixed(1)} of 5 by ${c.rating.count} buyer${c.rating.count === 1 ? '' : 's'}`
            : 'New, no ratings yet'}
        </span>
        <span className="block">
          {c.completedSales} completed sale{c.completedSales === 1 ? '' : 's'} on TrustListo
        </span>
      </span>
    </>
  );
  const cls = `flex h-full w-full flex-col rounded-2xl border p-4 text-left transition-colors ${
    selected ? 'border-ink ring-1 ring-ink' : 'border-line'
  }`;
  return onSelect ? (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={onSelect}
      className={`${cls} hover:border-ink`}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
