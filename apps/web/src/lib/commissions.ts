import { useQuery } from '@tanstack/react-query';
import type { Role } from '@trustlisto/shared';
import { api } from './api';
import type { PaymentMethod } from './clients';
import type { AiStatus, DocFlag, ExtractedField } from './reviews';

/* Commissions (SPEC §10.2–10.5). No money moves here (rule 2): "released" records a payout made outside. */

export type TrancheStatus =
  'WAITING' | 'BLOCKED' | 'AWAITING_TRANSMITTAL' | 'READY_FOR_RELEASE' | 'RELEASED';

export type TrancheTrigger =
  | 'ON_RESERVATION'
  | 'FULL_PAYMENT'
  | 'TCP_PERCENT_PAID'
  | 'DP_PERCENT_PAID'
  | 'DP_FULLY_PAID'
  | 'LOAN_RELEASED'
  | 'MONTHLY';

export type Stage = 'RESERVATION' | 'FINANCING';

export const STATUS: Record<TrancheStatus, string> = {
  WAITING: 'Waiting for payment',
  BLOCKED: 'Documents missing',
  AWAITING_TRANSMITTAL: 'Waiting for transmittal',
  READY_FOR_RELEASE: 'Ready for voucher',
  RELEASED: 'Released',
};

export const STATUS_ORDER: TrancheStatus[] = [
  'WAITING',
  'BLOCKED',
  'AWAITING_TRANSMITTAL',
  'READY_FOR_RELEASE',
  'RELEASED',
];

/** A tranche with a voucher stays READY_FOR_RELEASE until everyone signs; say so. */
export const statusText = (t: Pick<Tranche, 'status' | 'voucher'>) =>
  t.status === 'READY_FOR_RELEASE' && t.voucher ? 'Waiting for signatures' : STATUS[t.status];

export const statusTone = (s: TrancheStatus) =>
  s === 'BLOCKED' ? 'danger' : s === 'WAITING' || s === 'RELEASED' ? 'neutral' : 'info';

/** What the buyer must have paid for a tranche, in plain words. */
export function triggerText(t: TrancheTrigger | null, v: string | number | null): string {
  const n = v === null ? null : Number(v);
  switch (t) {
    case 'ON_RESERVATION':
      return 'Reservation paid';
    case 'FULL_PAYMENT':
      return 'Paid in full';
    case 'TCP_PERCENT_PAID':
      return `${n ?? 100}% of the price paid`;
    case 'DP_PERCENT_PAID':
      return `${n ?? 100}% of the downpayment paid`;
    case 'DP_FULLY_PAID':
      return 'Downpayment fully paid';
    case 'LOAN_RELEASED':
      return 'Loan released';
    case 'MONTHLY':
      return 'Payments received that month';
    default:
      return 'Payment milestone';
  }
}

export const STAGE: Record<Stage, string> = {
  RESERVATION: 'reservation documents',
  FINANCING: 'reservation and financing documents',
};

export const PAYEE_ROLE: Record<string, string> = {
  BROKER: 'Broker',
  SALES_MANAGER: 'Sales manager',
  SALES_PERSON: 'Salesperson',
};

export interface SplitPerson {
  userId: string;
  role: 'BROKER' | 'SALES_MANAGER' | 'SALES_PERSON';
  pct: number;
}

export interface Signature {
  userId: string;
  typedName: string;
  ip: string | null;
  userAgent: string | null;
  hash: string;
  signedAt: string;
}

export interface VoucherLine {
  userId: string;
  role: string;
  name: string;
  pct: number;
  grossShare: number;
  deductions: { label: string; amount: number }[];
  net: number;
}

export interface Voucher {
  id: string;
  trancheId: string;
  voucherNo: string;
  lines: VoucherLine[];
  totalNet: string;
  contentHash: string;
  brokerSignedAt: string | null;
  brokerSignature: Signature | null;
  consultantSignatures: Signature[] | null;
  releasedAt: string | null;
  createdAt: string;
  intact?: boolean;
}

export interface Tranche {
  id: string;
  sequence: number;
  label: string;
  amount: string;
  status: TrancheStatus;
  milestoneReachedAt: string | null;
  docsCompleteAt: string | null;
  transmittalDocumentId: string | null;
  transmittalAmount: string | null;
  awaitingSince: string | null;
  trigger: TrancheTrigger | null;
  triggerValue: string | null;
  requiredStage: Stage | null;
  requiresTransmittal: boolean;
  periodMonth: string | null;
  /** Full voucher on the deal page; id and signing dates in the list. */
  voucher?:
    | (Pick<
        Voucher,
        'id' | 'brokerSignedAt' | 'releasedAt' | 'contentHash' | 'consultantSignatures'
      > &
        Partial<Voucher>)
    | null;
}

export interface CommissionRow {
  id: string;
  clientId: string;
  grossAmount: string;
  splitSnapshot: { handledBy: string; grossRatePct: number; people: SplitPerson[] };
  tranches: Tranche[];
  client: {
    id: string;
    fullName: string;
    paymentMethod: PaymentMethod;
    tcp: string;
    property: { id: string; title: string } | null;
  } | null;
}

export type AgingBucket = '0–30' | '31–60' | '61–90' | '90+';
export const BUCKETS: AgingBucket[] = ['0–30', '31–60', '61–90', '90+'];

export interface TransmittalDoc {
  id: string;
  ownerId: string;
  aiStatus: AiStatus;
  flags: DocFlag[] | null;
  extracted: Record<string, ExtractedField> | null;
  createdAt: string;
}

export interface CommissionDetail extends CommissionRow {
  people: (SplitPerson & {
    user: { id: string; firstName: string; lastName: string; role: Role } | null;
  })[];
  transmittals: TransmittalDoc[];
  me: string;
}

const reading = (d: { aiStatus: AiStatus }) =>
  d.aiStatus === 'QUEUED' || d.aiStatus === 'PROCESSING';

export const useCommissions = () =>
  useQuery({
    queryKey: ['commissions'],
    queryFn: () =>
      api<{
        data: CommissionRow[];
        awaiting: { trancheId: string; commissionId: string; bucket: AgingBucket }[];
      }>('/commissions'),
  });

export const useCommission = (id: string) =>
  useQuery({
    queryKey: ['commissions', id],
    queryFn: () => api<CommissionDetail>(`/commissions/${id}`),
    // Keep polling while Module 1 reads a transmittal.
    refetchInterval: (q) => (q.state.data?.transmittals.some(reading) ? 3000 : false),
  });

export const useVoucher = (id: string | null | undefined) =>
  useQuery({
    queryKey: ['vouchers', id],
    queryFn: () => api<Voucher & { intact: boolean }>(`/vouchers/${id}`),
    enabled: !!id,
  });

/** One person's share of a tranche before deductions (same rounding as the server, in centavos). */
export function shareOf(amount: string | number, people: SplitPerson[], userId: string): number {
  const cents = Math.round(Number(amount) * 100);
  const i = people.findIndex((p) => p.userId === userId);
  if (i < 0) return 0;
  const shares = people.map((p) => Math.round((cents * p.pct) / 100));
  const target = Math.round((cents * people.reduce((s, p) => s + p.pct, 0)) / 100);
  const rest = target - shares.reduce((s, x) => s + x, 0);
  shares[shares.length - 1]! += rest;
  return shares[i]! / 100;
}

/** Whether a payee still has to sign this tranche's voucher (broker signed, they haven't). */
export function awaitsMySignature(t: Tranche, userId: string): boolean {
  const v = t.voucher;
  if (!v || v.releasedAt || !v.brokerSignedAt || t.status !== 'READY_FOR_RELEASE') return false;
  return !(v.consultantSignatures ?? []).some(
    (s) => s.userId === userId && s.hash === v.contentHash,
  );
}

/** Days since a date, for transmittal aging. */
export const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
