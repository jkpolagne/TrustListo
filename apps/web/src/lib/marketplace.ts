import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Paginated } from '@trustlisto/shared';
import { api } from './api';

export type PropertyType = 'HOUSE_AND_LOT' | 'LOT' | 'CONDO' | 'TOWNHOUSE' | 'COMMERCIAL' | 'OTHER';
export type BadgeType = 'OWNERSHIP_VERIFIED' | 'LTS_VERIFIED' | 'TAX_CURRENT' | 'TITLE_CLEAN';
export type PaymentMethod = 'CASH' | 'DEFERRED_CASH' | 'IN_HOUSE' | 'BANK' | 'PAG_IBIG';

export interface ListingCard {
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  source: 'DEVELOPER' | 'INDIVIDUAL_SELLER';
  price: string;
  lotAreaSqm: string | null;
  floorAreaSqm: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  barangay: string | null;
  city: string;
  province: string;
  publishedAt: string | null;
  firm: { name: string; slug: string } | null;
  project: { name: string; developer: { name: string } } | null;
  badges: { type: BadgeType; validUntil: string | null }[];
  photo: string | null;
  location: { lat: number; lng: number } | null;
}

export interface LoanQuotation {
  id: string;
  label: string;
  paymentMethod: PaymentMethod;
  reservationFee: string;
  downpaymentPct: string;
  dpTermMonths: number;
  monthlyDp: string;
  loanAmount: string;
  interestRatePct: string | null;
  loanTermYears: number | null;
  monthlyAmortization: string | null;
  notes: string | null;
}

export interface ListingDetail extends Omit<ListingCard, 'photo' | 'project'> {
  description: string | null;
  photos: string[];
  project: {
    name: string;
    locationText: string;
    ltsNumber: string | null;
    ltsExpiresAt: string | null;
    developer: { name: string };
  } | null;
  loanQuotations: LoanQuotation[];
}

export interface Marker {
  id: string;
  slug: string;
  title: string;
  price: string;
  type: PropertyType;
  lat: number;
  lng: number;
}

/** Search filters, mirrored in the URL so results can be shared and bookmarked. */
export interface Filters {
  q?: string;
  type?: PropertyType;
  minPrice?: string;
  maxPrice?: string;
  badge?: BadgeType;
  paymentMethod?: PaymentMethod;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: string;
  bbox?: string;
}

const qs = (f: Filters, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, String(v));
  return p.toString();
};

export function useListings(f: Filters, pageSize = 12) {
  return useQuery({
    queryKey: ['public', 'listings', f, pageSize],
    queryFn: () =>
      api<Paginated<ListingCard>>(`/public/properties?${qs(f, { pageSize: String(pageSize) })}`),
    placeholderData: keepPreviousData,
  });
}

export function useMarkers(f: Filters) {
  const rest = { ...f, page: undefined, sort: undefined }; // the map shows every match
  return useQuery({
    queryKey: ['public', 'markers', rest],
    queryFn: () =>
      api<{ data: Marker[] }>(`/public/properties/markers?${qs(rest)}`).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useListing(slug: string) {
  return useQuery({
    queryKey: ['public', 'listing', slug],
    queryFn: () => api<ListingDetail>(`/public/properties/${slug}`),
    retry: false,
  });
}

// ───────────── Labels ─────────────

export const TYPE_LABEL: Record<PropertyType, string> = {
  HOUSE_AND_LOT: 'House and lot',
  LOT: 'Lot only',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  COMMERCIAL: 'Commercial',
  OTHER: 'Other',
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  DEFERRED_CASH: 'Deferred cash',
  IN_HOUSE: 'In-house financing',
  BANK: 'Bank loan',
  PAG_IBIG: 'Pag-IBIG loan',
};

/** What each badge means, and what it doesn't (SPEC §7.1: both, in plain language). */
export const BADGE_INFO: Record<BadgeType, { name: string; means: string; doesNotMean: string }> = {
  LTS_VERIFIED: {
    name: 'License to sell',
    means:
      "A broker checked the developer's DHSUD license to sell for this project, and it's still valid.",
    doesNotMean:
      "It isn't a confirmation from DHSUD itself, and it says nothing about construction quality.",
  },
  OWNERSHIP_VERIFIED: {
    name: 'Ownership verified',
    means: "A broker checked that the seller's name matches the registered owner on the title.",
    doesNotMean:
      "It isn't a Registry of Deeds search. Always get a certified true copy before paying.",
  },
  TITLE_CLEAN: {
    name: 'Title clean',
    means: 'No mortgage, lien or adverse claim appears on the title copy a broker reviewed.',
    doesNotMean: 'Claims filed after that copy was issued would not show here.',
  },
  TAX_CURRENT: {
    name: 'Taxes current',
    means: 'A broker saw real property tax receipts covering the current period.',
    doesNotMean: "It isn't a check with the city treasurer's records.",
  },
};

const compact = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 2,
});
/** ₱2.15M */
export const pesoShort = (v: string | number) => compact.format(Number(v));

export const placeLine = (p: { barangay: string | null; city: string }) =>
  [p.barangay, p.city].filter(Boolean).join(', ');
