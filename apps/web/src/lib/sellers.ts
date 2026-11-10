import { useQuery } from '@tanstack/react-query';
import type { Role } from '@trustlisto/shared';
import { api } from './api';
import type { BadgeType, PropertyType } from './marketplace';
import type { AiStatus, DocFlag } from './reviews';

/** A verified consultant as the public sees them (SPEC §7.3 card). */
export interface AgentCard {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  bio: string | null;
  firm: { name: string; slug: string } | null;
  badges: ('PRC_LICENSE' | 'DHSUD_REGISTRATION')[];
  rating: { average: number; count: number } | null;
  completedSales: number;
}

/** Fresh random order each time (the server shuffles); never cached across visits. */
export function useAgents() {
  return useQuery({
    queryKey: ['public', 'agents'],
    queryFn: () => api<{ data: AgentCard[] }>('/public/agents').then((r) => r.data),
    staleTime: Infinity,
    gcTime: 0,
  });
}

export type SellerRequestStatus =
  'NEW' | 'ACCEPTED' | 'DOCUMENTS_IN_PROGRESS' | 'SUBMITTED_FOR_REVIEW' | 'LISTED' | 'DECLINED';

export const REQUEST_STATUS: Record<SellerRequestStatus, string> = {
  NEW: 'New, waiting for you',
  ACCEPTED: 'Accepted',
  DOCUMENTS_IN_PROGRESS: 'Collecting documents',
  SUBMITTED_FOR_REVIEW: 'With the broker',
  LISTED: 'Live',
  DECLINED: 'Declined',
};

export const LISTING_DOCS = ['LAND_TITLE', 'TAX_DECLARATION', 'RPT_RECEIPT', 'SELLER_ID'] as const;
export type ListingDoc = (typeof LISTING_DOCS)[number];

export const LISTING_DOC_HELP: Record<ListingDoc, string> = {
  LAND_TITLE: 'TCT, OCT or CCT, all pages including the memorandum of encumbrances.',
  TAX_DECLARATION: 'The latest tax declaration of the lot.',
  RPT_RECEIPT: 'Official receipt for this year’s real property tax.',
  SELLER_ID: 'A government ID of the seller, front side.',
};

export interface RequestDocument {
  id: string;
  declaredType: ListingDoc;
  detectedType: string | null;
  aiStatus: AiStatus;
  reviewStatus: 'PENDING_AI' | 'NEEDS_ATTENTION' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED';
  flags: DocFlag[] | null;
  reviewNote: string | null;
  createdAt: string;
}

type Person = { id: string; firstName: string; lastName: string; role: Role };

export interface SellerRequestRow {
  id: string;
  status: SellerRequestStatus;
  sellerName: string;
  locationText: string;
  propertyType: PropertyType;
  lotAreaSqm: string | null;
  floorAreaSqm: string | null;
  askingPrice: string;
  createdAt: string;
  photoCount: number;
  agent: Person | null;
  property: { id: string; status: string; slug: string } | null;
  documents: RequestDocument[];
}

export interface SellerRequestDetail extends Omit<
  SellerRequestRow,
  'documents' | 'photoCount' | 'property'
> {
  sellerPhone: string;
  sellerEmail: string | null;
  hasTitle: boolean;
  isAgent: boolean;
  photos: string[];
  property: {
    id: string;
    status: string;
    slug: string;
    title: string;
    description: string | null;
    barangay: string | null;
    city: string;
    badges: { type: BadgeType; validUntil: string | null }[];
  } | null;
  rejection: { reason: string; at: string } | null;
  documents: RequestDocument[];
  current: Partial<Record<ListingDoc, RequestDocument>>;
}

const reading = (d: { aiStatus: AiStatus }) =>
  d.aiStatus === 'QUEUED' || d.aiStatus === 'PROCESSING';

export function useSellerRequests() {
  return useQuery({
    queryKey: ['seller-requests'],
    queryFn: () => api<{ data: SellerRequestRow[] }>('/seller-requests').then((r) => r.data),
  });
}

export function useSellerRequest(id: string) {
  return useQuery({
    queryKey: ['seller-requests', id],
    queryFn: () => api<SellerRequestDetail>(`/seller-requests/${id}`),
    // Keep polling while Module 1 reads an uploaded document.
    refetchInterval: (q) => (q.state.data?.documents.some(reading) ? 3000 : false),
  });
}

export interface ListingReview {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: PropertyType;
  price: string;
  lotAreaSqm: string | null;
  floorAreaSqm: string | null;
  barangay: string | null;
  city: string;
  slug: string;
  photos: string[];
  badges: { type: BadgeType; validUntil: string | null }[];
  seller: {
    requestId: string;
    name: string;
    phone: string;
    email: string | null;
    locationText: string;
    hasTitle: boolean;
    requestStatus: SellerRequestStatus;
  };
  agent: Person | null;
  documents: { type: ListingDoc; document: RequestDocument | null }[];
}

export function useListingReview(id: string) {
  return useQuery({
    queryKey: ['reviews', 'listing', id],
    queryFn: () => api<ListingReview>(`/reviews/properties/${id}`),
  });
}
