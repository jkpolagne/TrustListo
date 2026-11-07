import { Bath, BedDouble, Building2, ChevronLeft, ChevronRight, MapPin, Ruler } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { BrokerSeal } from '../../components/BrokerSeal';
import { ListingMap } from '../../components/public/ListingMap';
import { LoanCalculator } from '../../components/public/LoanCalculator';
import { PropertyArt } from '../../components/public/PropertyArt';
import { PublicLayout } from '../../components/public/PublicLayout';
import { ButtonLink } from '../../components/ui';
import {
  BADGE_INFO,
  METHOD_LABEL,
  TYPE_LABEL,
  placeLine,
  useListing,
  type ListingDetail,
} from '../../lib/marketplace';

const peso = (v: string | number) => formatPeso(v).replace(/\.00$/, '');
const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function PropertyDetail() {
  const { slug = '' } = useParams();
  const listing = useListing(slug);

  if (listing.isPending) return <PublicLayout>{null}</PublicLayout>;
  if (listing.isError || !listing.data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-2xl font-bold">This listing isn't available</h1>
          <p className="mt-2 text-muted">It may have been sold or taken down by the firm.</p>
          <ButtonLink to="/properties" className="mt-6">
            Browse other homes
          </ButtonLink>
        </div>
      </PublicLayout>
    );
  }
  const p = listing.data;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <Link to="/properties" className="text-sm font-semibold text-muted hover:text-ink">
          ‹ All homes
        </Link>

        <Gallery p={p} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-10">
            {/* Summary */}
            <section>
              <p className="text-sm font-semibold text-muted">{TYPE_LABEL[p.type]}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">{p.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-muted">
                <MapPin aria-hidden className="size-4" />
                {placeLine(p)}, {p.province}
              </p>
              <p className="mt-4 text-3xl font-bold tabular-nums">{peso(p.price)}</p>
              <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                {!!p.bedrooms && <Spec icon={BedDouble}>{p.bedrooms} bedrooms</Spec>}
                {!!p.bathrooms && <Spec icon={Bath}>{p.bathrooms} bathrooms</Spec>}
                {p.floorAreaSqm && Number(p.floorAreaSqm) > 0 && (
                  <Spec icon={Ruler}>{Number(p.floorAreaSqm)} sq m floor</Spec>
                )}
                {p.lotAreaSqm && Number(p.lotAreaSqm) > 0 && (
                  <Spec icon={Ruler}>{Number(p.lotAreaSqm)} sq m lot</Spec>
                )}
              </ul>
              {p.description && (
                <p className="mt-5 max-w-prose leading-relaxed text-graphite">{p.description}</p>
              )}
            </section>

            {/* Verification */}
            <section>
              <h2 className="text-xl font-bold">What was checked</h2>
              {p.badges.length === 0 ? (
                <p className="mt-2 text-muted">
                  No documents for this listing have been verified yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {p.badges.map((b) => (
                    <li key={b.type} className="flex gap-4 rounded-2xl border border-line p-4">
                      <BrokerSeal size={44} className="shrink-0" />
                      <div>
                        <p className="font-bold">
                          {BADGE_INFO[b.type].name}
                          {b.validUntil && (
                            <span className="ml-2 text-sm font-normal text-muted">
                              valid until {date.format(new Date(b.validUntil))}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed">{BADGE_INFO[b.type].means}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          {BADGE_INFO[b.type].doesNotMean}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/about-badges"
                className="mt-3 inline-block text-sm font-semibold underline underline-offset-4"
              >
                How badges work
              </Link>
            </section>

            {/* Developer quotations */}
            {p.loanQuotations.length > 0 && <Quotations p={p} />}

            {/* Location */}
            {p.location && (
              <section>
                <h2 className="text-xl font-bold">Location</h2>
                <p className="mt-1 text-sm text-muted">{p.project?.locationText ?? placeLine(p)}</p>
                <ListingMap
                  markers={[
                    {
                      id: p.id,
                      slug: p.slug,
                      title: p.title,
                      price: p.price,
                      type: p.type,
                      ...p.location,
                    },
                  ]}
                  center={[p.location.lat, p.location.lng]}
                  zoom={15}
                  fit={false}
                  className="mt-4 h-80"
                />
              </section>
            )}
          </div>

          {/* Side column */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-line p-5">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Building2 aria-hidden className="size-4" /> Listed by
              </p>
              <p className="mt-1 font-bold">{p.firm?.name}</p>
              {p.project && (
                <p className="mt-3 text-sm text-muted">
                  {p.project.name} by {p.project.developer.name}
                  {p.project.ltsNumber && (
                    <>
                      <br />
                      License to sell no. {p.project.ltsNumber}
                    </>
                  )}
                </p>
              )}
            </div>
            <LoanCalculator
              price={Number(p.price)}
              defaults={p.loanDefaults}
              firmName={p.firm?.name}
            />
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}

function Spec({ icon: Icon, children }: { icon: typeof Bath; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 font-medium">
      <Icon aria-hidden className="size-4" /> {children}
    </li>
  );
}

function Gallery({ p }: { p: ListingDetail }) {
  const [i, setI] = useState(0);
  const n = p.photos.length;
  return (
    <div className="relative mt-4 aspect-[16/8] overflow-hidden rounded-3xl bg-canvas">
      {n === 0 ? (
        <PropertyArt type={p.type} />
      ) : (
        <img
          src={p.photos[i]}
          alt={`${p.title}, photo ${i + 1} of ${n}`}
          className="h-full w-full object-cover"
        />
      )}
      {n > 1 && (
        <>
          {[
            ['Previous photo', ChevronLeft, -1, 'left-3'],
            ['Next photo', ChevronRight, 1, 'right-3'],
          ].map(([label, Icon, d, pos]) => {
            const I = Icon as typeof ChevronLeft;
            return (
              <button
                key={label as string}
                aria-label={label as string}
                onClick={() => setI((x) => (x + (d as number) + n) % n)}
                className={`absolute top-1/2 ${pos} grid size-10 -translate-y-1/2 place-items-center rounded-full bg-paper/90 shadow hover:bg-paper`}
              >
                <I aria-hidden className="size-5" />
              </button>
            );
          })}
          <span className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-semibold text-paper tabular-nums">
            {i + 1} / {n}
          </span>
        </>
      )}
    </div>
  );
}

function Quotations({ p }: { p: ListingDetail }) {
  return (
    <section>
      <h2 className="text-xl font-bold">Payment options from the developer</h2>
      <p className="mt-1 text-sm text-muted">
        Sample computations provided by the developer. Final terms may change.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {p.loanQuotations.map((q) => (
          <div key={q.id} className="rounded-2xl border border-line p-4">
            <p className="font-bold">{q.label}</p>
            <p className="text-xs text-muted">{METHOD_LABEL[q.paymentMethod]}</p>
            {q.monthlyAmortization && (
              <p className="mt-3 text-2xl font-bold tabular-nums">
                {peso(q.monthlyAmortization)}
                <span className="text-sm font-medium text-muted"> /month</span>
              </p>
            )}
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <QRow k="Reservation" v={peso(q.reservationFee)} />
              <QRow
                k={`Downpayment (${Number(q.downpaymentPct)}%)`}
                v={`${peso(q.monthlyDp)} × ${q.dpTermMonths} mo`}
              />
              {Number(q.loanAmount) > 0 && <QRow k="Loan amount" v={peso(q.loanAmount)} />}
              {q.interestRatePct && (
                <QRow
                  k="Rate and term"
                  v={`${Number(q.interestRatePct)}%, ${q.loanTermYears} yrs`}
                />
              )}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function QRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
}
