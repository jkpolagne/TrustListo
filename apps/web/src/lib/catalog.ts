import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { LoanQuotation, PropertyType } from './marketplace';

export type ListingStatus =
  'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_ATTENTION' | 'LIVE' | 'REJECTED' | 'SUSPENDED' | 'SOLD';
export type ReviewStatus =
  'PENDING_AI' | 'NEEDS_ATTENTION' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Developer {
  id: string;
  name: string;
  isActive: boolean;
  _count: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  locationText: string;
  ltsNumber: string | null;
  ltsExpiresAt: string | null;
  ltsStatus: ReviewStatus;
  developer: { id: string; name: string };
  _count: { properties: number };
  location: { lat: number; lng: number } | null;
  /** The most recent License to Sell upload, whatever its state. */
  latestLts: {
    id: string;
    aiStatus: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';
    reviewStatus: ReviewStatus;
    reviewNote: string | null;
    flags: { severity: string; message: string }[] | null;
    createdAt: string;
  } | null;
}

export interface Unit {
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  status: ListingStatus;
  price: string;
  bedrooms: number | null;
  bathrooms: number | null;
  lotAreaSqm: string | null;
  floorAreaSqm: string | null;
  barangay: string | null;
  publishedAt: string | null;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    ltsStatus: ReviewStatus;
    ltsExpiresAt: string | null;
  } | null;
  _count: { photos: number; loanQuotations: number };
}

export interface UnitDetail extends Unit {
  description: string | null;
  projectId: string | null;
  photos: { id: string; url: string }[];
  loanQuotations: LoanQuotation[];
  location: { lat: number; lng: number } | null;
}

export const useDevelopers = () =>
  useQuery({
    queryKey: ['catalog', 'developers'],
    queryFn: () => api<{ data: Developer[] }>('/catalog/developers').then((r) => r.data),
  });

export const useProjects = () =>
  useQuery({
    queryKey: ['catalog', 'projects'],
    queryFn: () => api<{ data: Project[] }>('/catalog/projects').then((r) => r.data),
    // Poll while a just-uploaded license is still being read.
    refetchInterval: (q) =>
      q.state.data?.some((p) => p.latestLts?.reviewStatus === 'PENDING_AI') ? 3000 : false,
  });

export const useUnits = () =>
  useQuery({
    queryKey: ['catalog', 'units'],
    queryFn: () => api<{ data: Unit[] }>('/catalog/properties').then((r) => r.data),
  });

export const useUnit = (id: string | undefined) =>
  useQuery({
    queryKey: ['catalog', 'unit', id],
    queryFn: () => api<UnitDetail>(`/catalog/properties/${id}`),
    enabled: !!id,
  });

export function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['catalog'] });
    void qc.invalidateQueries({ queryKey: ['public'] });
  };
}

/** A project's License to Sell is usable when a broker approved it and it hasn't expired. */
export function ltsState(p: { ltsStatus: ReviewStatus; ltsExpiresAt: string | null }) {
  if (p.ltsStatus !== 'APPROVED') return 'missing' as const;
  if (!p.ltsExpiresAt || new Date(p.ltsExpiresAt) < new Date()) return 'expired' as const;
  const days = (new Date(p.ltsExpiresAt).getTime() - Date.now()) / 86_400_000;
  return days <= 30 ? ('expiring' as const) : ('valid' as const);
}

export const STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Waiting for broker',
  NEEDS_ATTENTION: 'Needs attention',
  LIVE: 'Live',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
  SOLD: 'Sold',
};
