import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/* Closing & transfer (SPEC §11), ratings (§12) and reports (§10.6). */

export type Payer = 'BUYER' | 'SELLER';

export interface ClosingLine {
  code: 'CGT' | 'DST' | 'TRANSFER_TAX' | 'REGISTRATION_FEE';
  label: string;
  ratePct: number | null;
  amount: number;
  paidBy: Payer;
}

export interface Computation {
  sellingPrice: number;
  taxBase: number;
  taxBaseOverride: boolean;
  registrationFee: number | null;
  rates: { cgtRatePct: number; dstRatePct: number; transferTaxRatePct: number };
  lines: ClosingLine[];
  totals: Record<Payer, number>;
}

export interface ClosingItem {
  code: string;
  label: string;
  done: boolean;
  doneAt: string | null;
  doneBy: string | null;
}

export interface Closing {
  clientStatus: 'ACTIVE' | 'CLOSING' | 'COMPLETED' | 'CANCELLED';
  saved: boolean;
  computation: Computation;
  checklist: ClosingItem[];
  canEdit: boolean;
  canIssueLink: boolean;
  ratingLink: { expiresAt: string; usedAt: string | null } | null;
  rating: { stars: number; createdAt: string } | null;
  /** Only in the response that completes the sale or re-issues the link; shown once. */
  ratingToken?: string | null;
}

export const CLIENT_STATUS: Record<Closing['clientStatus'], string> = {
  ACTIVE: 'Active',
  CLOSING: 'In closing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PAID_BY: Record<Payer, string> = { BUYER: 'Buyer', SELLER: 'Seller' };

export const useClosing = (clientId: string) =>
  useQuery({
    queryKey: ['closing', clientId],
    queryFn: () => api<Closing>(`/clients/${clientId}/closing`),
  });

export const ratingLink = (token: string) => `${window.location.origin}/rate/${token}`;

// ───────────── Reports ─────────────

export interface Summary {
  month: string;
  reserved: { count: number; totalTcp: number };
  newLeads: number;
  completed: number;
  released: { count: number; total: number };
}

export interface TeamRow {
  id: string;
  firstName: string;
  lastName: string;
  role: 'SALES_MANAGER' | 'SALES_PERSON';
  managerId: string | null;
  openLeads: number;
  activeClients: number;
  reservedThisMonth: number;
  reservedTcpThisMonth: number;
  completed: number;
}

export interface Pipeline {
  leads: Partial<Record<string, number>>;
  clients: Partial<Record<string, number>>;
  team: TeamRow[];
}

export const useSummary = (month: string) =>
  useQuery({
    queryKey: ['reports', 'summary', month],
    queryFn: () => api<Summary>(`/reports/summary?month=${month}`),
  });

export const usePipeline = (filters: { consultantId?: string; paymentMethod?: string }) => {
  const qs = new URLSearchParams(
    Object.entries(filters).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  return useQuery({
    queryKey: ['reports', 'pipeline', qs],
    queryFn: () => api<Pipeline>(`/reports/pipeline${qs ? `?${qs}` : ''}`),
  });
};

/** YYYY-MM in Philippine time, like the server. */
export function thisMonth(now = new Date()): string {
  const m = new Date(now.getTime() + 8 * 3_600_000);
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`;
}
