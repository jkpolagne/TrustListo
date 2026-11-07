import { Bath, BedDouble, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { BADGE_INFO, TYPE_LABEL, placeLine, type ListingCard } from '../../lib/marketplace';
import { Badge } from '../ui';
import { PropertyArt } from './PropertyArt';

const area = (v: string | null) =>
  v && Number(v) > 0 ? `${Number(v).toLocaleString('en-PH')} sq m` : null;

export function PropertyCard({ p }: { p: ListingCard }) {
  const size = area(p.floorAreaSqm) ?? area(p.lotAreaSqm);
  return (
    <Link
      to={`/properties/${p.slug}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {p.photo ? (
          <img
            src={p.photo}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <PropertyArt type={p.type} />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-paper/95 px-2.5 py-1 text-xs font-semibold">
          {TYPE_LABEL[p.type]}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xl font-bold tabular-nums">{formatPeso(p.price).replace(/\.00$/, '')}</p>
        <h3 className="mt-0.5 line-clamp-1 font-semibold">{p.title}</h3>
        <p className="line-clamp-1 text-sm text-muted">{placeLine(p)}</p>

        {(p.bedrooms || p.bathrooms || size) && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-graphite">
            {!!p.bedrooms && (
              <span className="inline-flex items-center gap-1.5">
                <BedDouble aria-hidden className="size-4" /> {p.bedrooms} bed
              </span>
            )}
            {!!p.bathrooms && (
              <span className="inline-flex items-center gap-1.5">
                <Bath aria-hidden className="size-4" /> {p.bathrooms} bath
              </span>
            )}
            {size && (
              <span className="inline-flex items-center gap-1.5">
                <Ruler aria-hidden className="size-4" /> {size}
              </span>
            )}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {p.badges.map((b) => (
            <Badge key={b.type} tone="verified">
              {BADGE_INFO[b.type].name}
            </Badge>
          ))}
          <span className="ml-auto truncate text-xs text-muted">{p.firm?.name}</span>
        </div>
      </div>
    </Link>
  );
}
