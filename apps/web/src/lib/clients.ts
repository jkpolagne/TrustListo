import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { AiStatus, DocFlag, ExtractedField } from './reviews';

export type PaymentMethod = 'CASH' | 'DEFERRED_CASH' | 'IN_HOUSE' | 'BANK' | 'PAG_IBIG';
export type CivilStatus = 'SINGLE' | 'MARRIED' | 'SEPARATED';
export type EmploymentType = 'LOCALLY_EMPLOYED' | 'OFW' | 'SELF_EMPLOYED';
export type ItemStatus = 'MISSING' | 'UPLOADED' | 'NEEDS_ATTENTION' | 'VERIFIED' | 'WAIVED';
export type PaymentKind =
  | 'RESERVATION'
  | 'DOWNPAYMENT'
  | 'FULL_CASH'
  | 'DEFERRED_INSTALLMENT'
  | 'IN_HOUSE_INSTALLMENT'
  | 'LOAN_RELEASE'
  | 'OTHER';

export const METHOD: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  DEFERRED_CASH: 'Deferred cash',
  IN_HOUSE: 'In-house financing',
  BANK: 'Bank loan',
  PAG_IBIG: 'Pag-IBIG housing loan',
};
export const EMPLOYMENT: Record<EmploymentType, string> = {
  LOCALLY_EMPLOYED: 'Employed in the Philippines',
  OFW: 'OFW',
  SELF_EMPLOYED: 'Self-employed or business',
};
export const PAYMENT_KIND: Record<PaymentKind, string> = {
  RESERVATION: 'Reservation fee',
  DOWNPAYMENT: 'Downpayment',
  FULL_CASH: 'Full cash payment',
  DEFERRED_INSTALLMENT: 'Deferred cash installment',
  IN_HOUSE_INSTALLMENT: 'In-house installment',
  LOAN_RELEASE: 'Loan release',
  OTHER: 'Other',
};
export const ITEM_STATUS: Record<ItemStatus, string> = {
  MISSING: 'Missing',
  UPLOADED: 'Waiting for broker',
  NEEDS_ATTENTION: 'Flagged',
  VERIFIED: 'Verified by broker',
  WAIVED: 'Waived',
};
export const needsEmployment = (m: PaymentMethod | '') => m === 'BANK' || m === 'PAG_IBIG';

export interface DocSummary {
  id: string;
  declaredType: string | null;
  detectedType: string | null;
  aiStatus: AiStatus;
  reviewStatus: string;
  flags: DocFlag[] | null;
  extracted: Record<string, ExtractedField> | null;
  reviewNote: string | null;
}

export interface RequirementItem {
  id: string;
  code: string;
  label: string;
  appliesTo: 'BUYER' | 'SPOUSE' | 'REPRESENTATIVE';
  stage: 'RESERVATION' | 'FINANCING';
  required: boolean;
  status: ItemStatus;
  documentId: string | null;
  document: DocSummary | null;
}

export interface ClientPayment {
  id: string;
  kind: PaymentKind;
  amount: string;
  paidAt: string;
  confirmed: boolean;
  document: DocSummary | null;
}

export interface ClientRow {
  id: string;
  fullName: string;
  phone: string;
  status: 'ACTIVE' | 'CLOSING' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: PaymentMethod;
  tcp: string;
  createdAt: string;
  property: { id: string; title: string } | null;
  consultant: { id: string; firstName: string; lastName: string } | null;
  checklist: { total: number; done: number };
  paid: number;
}

export interface ClientDetail extends Omit<ClientRow, 'checklist' | 'paid' | 'property'> {
  email: string | null;
  civilStatus: CivilStatus;
  employmentType: EmploymentType | null;
  saleType: 'DEVELOPER_SALE' | 'PRIVATE_SALE';
  reservationPaidAt: string;
  isMine: boolean;
  property: { id: string; title: string; slug: string; source: string } | null;
  requirements: RequirementItem[];
  payments: ClientPayment[];
}

const reading = (d: { aiStatus: AiStatus } | null) =>
  !!d && (d.aiStatus === 'QUEUED' || d.aiStatus === 'PROCESSING');

export const useClients = () =>
  useQuery({
    queryKey: ['clients'],
    queryFn: () => api<{ data: ClientRow[] }>('/clients').then((r) => r.data),
  });

export const useClient = (id: string) =>
  useQuery({
    queryKey: ['clients', id],
    queryFn: () => api<ClientDetail>(`/clients/${id}`),
    // Keep polling while Module 1 reads an upload or a receipt.
    refetchInterval: (q) =>
      q.state.data &&
      (q.state.data.requirements.some((r) => reading(r.document)) ||
        q.state.data.payments.some((p) => reading(p.document)))
        ? 3000
        : false,
  });

/** One uploaded document's AI status, polled until it has been read. */
export const useDocumentStatus = (id: string | null) =>
  useQuery({
    queryKey: ['documents', id],
    queryFn: () => api<DocSummary & { ocrConfidence: number | null }>(`/documents/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (!q.state.data || reading(q.state.data) ? 2000 : false),
  });
