import { List, Map as MapIcon, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListingMap } from '../../components/public/ListingMap';
import { PropertyCard } from '../../components/public/PropertyCard';
import { PublicLayout } from '../../components/public/PublicLayout';
import { Button } from '../../components/ui';
import {
  BADGE_INFO,
  METHOD_LABEL,
  TYPE_LABEL,
  useListings,
  useMarkers,
  type BadgeType,
  type Filters,
  type PaymentMethod,
  type PropertyType,
} from '../../lib/marketplace';

const FILTER_KEYS = [
  'q',
  'type',
  'minPrice',
  'maxPrice',
  'badge',
  'paymentMethod',
  'sort',
  'page',
  'bbox',
] as const;
const PRICE_STEPS = [1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000];

export function Properties({ initialView }: { initialView?: 'map' | 'list' }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') ?? initialView ?? 'list';
  const filters = Object.fromEntries(
    FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]).filter(([, v]) => v),
  ) as Filters;

  const set = (
    patch: Partial<Record<(typeof FILTER_KEYS)[number] | 'view', string | undefined>>,
  ) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page'); // any filter change → back to page 1
    setParams(next, { replace: true });
  };

  const listings = useListings(filters, 12);
  const markers = useMarkers(view === 'map' ? filters : { ...filters, bbox: undefined });
  const [pendingBbox, setPendingBbox] = useState<string | null>(null);
  const [q, setQ] = useState(filters.q ?? '');

  const total = listings.data?.total ?? 0;
  const page = Number(filters.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / 12));
  const active = FILTER_KEYS.filter((k) => k !== 'sort' && k !== 'page' && filters[k]).length;

  function search(e: FormEvent) {
    e.preventDefault();
    set({ q: q.trim() || undefined });
  }

  return (
    <PublicLayout wide>
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8">
        {/* Filters */}
        <form onSubmit={search} className="flex flex-wrap items-end gap-2" role="search">
          <div className="relative min-w-[16rem] flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <label htmlFor="q" className="sr-only">
              Search by place or project
            </label>
            <input
              id="q"
              className="input pl-9"
              placeholder="Barangay, project or developer"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select
            label="Type"
            value={filters.type}
            onChange={(v) => set({ type: v })}
            options={Object.entries(TYPE_LABEL) as [PropertyType, string][]}
            any="Any type"
          />
          <Select
            label="Max price"
            value={filters.maxPrice}
            onChange={(v) => set({ maxPrice: v })}
            options={PRICE_STEPS.map((p) => [
              String(p),
              `Up to ₱${(p / 1_000_000).toLocaleString()}M`,
            ])}
            any="Any price"
          />
          <Select
            label="Payment"
            value={filters.paymentMethod}
            onChange={(v) => set({ paymentMethod: v })}
            options={(Object.entries(METHOD_LABEL) as [PaymentMethod, string][]).filter(
              ([k]) => k !== 'DEFERRED_CASH',
            )}
            any="Any payment"
          />
          <Select
            label="Badge"
            value={filters.badge}
            onChange={(v) => set({ badge: v })}
            options={(Object.keys(BADGE_INFO) as BadgeType[]).map((b) => [b, BADGE_INFO[b].name])}
            any="Any badge"
          />
          <Button type="submit">Search</Button>
        </form>

        {/* Result bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            <span className="font-semibold text-ink tabular-nums">{total}</span>{' '}
            {total === 1 ? 'home' : 'homes'}
            {filters.bbox ? ' in this map area' : ' in Naga City and nearby'}
            {active > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setParams(view === 'map' ? { view: 'map' } : {}, { replace: true });
                }}
                className="ml-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-ink hover:bg-canvas"
              >
                <X aria-hidden className="size-3.5" /> Clear filters
              </button>
            )}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="sr-only">
              Sort
            </label>
            <select
              id="sort"
              className="input w-auto py-2"
              value={filters.sort ?? 'newest'}
              onChange={(e) =>
                set({ sort: e.target.value === 'newest' ? undefined : e.target.value })
              }
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
            <div className="inline-flex rounded-xl bg-canvas p-1" role="group" aria-label="View">
              {(
                [
                  ['list', 'List', List],
                  ['map', 'Map', MapIcon],
                ] as const
              ).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() =>
                    set({
                      view: v === 'list' ? undefined : 'map',
                      bbox: undefined,
                      page: filters.page,
                    })
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    view === v ? 'bg-paper shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon aria-hidden className="size-4" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'map' ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="relative">
              <ListingMap
                markers={markers.data ?? []}
                fit={!filters.bbox}
                onMove={(b) => setPendingBbox(b)}
                className="h-[72vh]"
              />
              {pendingBbox && pendingBbox !== filters.bbox && (
                <button
                  onClick={() => {
                    set({ bbox: pendingBbox });
                    setPendingBbox(null);
                  }}
                  className="absolute top-4 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper shadow-lg"
                >
                  Search this area
                </button>
              )}
            </div>
            <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
              {listings.data?.data.map((p) => (
                <PropertyCard key={p.id} p={p} />
              ))}
              {listings.data && total === 0 && <NoResults />}
              <Pager page={page} pages={pages} onPage={(n) => set({ page: String(n) })} />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {listings.data?.data.map((p) => (
                <PropertyCard key={p.id} p={p} />
              ))}
            </div>
            {listings.data && total === 0 && <NoResults />}
            <Pager page={page} pages={pages} onPage={(n) => set({ page: String(n) })} />
          </>
        )}
        {listings.isError && <p className="mt-6 text-flag">{listings.error.message}</p>}
      </div>
    </PublicLayout>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  any,
}: {
  label: string;
  value?: string;
  onChange: (v: T | undefined) => void;
  options: [T, string][];
  any: string;
}) {
  const id = `f-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        className="input w-auto"
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      >
        <option value="">{any}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (n: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-2">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="px-2 text-sm tabular-nums text-muted">
        Page {page} of {pages}
      </span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

function NoResults() {
  return (
    <div className="mt-6 rounded-2xl bg-canvas px-6 py-12 text-center">
      <p className="font-semibold">No homes match these filters.</p>
      <p className="mt-1 text-sm text-muted">
        Try a higher price, another type, or a wider map area.
      </p>
    </div>
  );
}
