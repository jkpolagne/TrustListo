import { useQuery } from '@tanstack/react-query';
import type { Role } from '@trustlisto/shared';
import { api } from './api';
import type { ReviewStatus } from './catalog';
import type { Credential } from './team';

export interface DocFlag {
  code: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message: string;
  evidence?: { field: string; found: string; expected?: string };
}

export type AiStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface ExtractedField {
  value: string | null;
  confidence: number;
  edited?: boolean;
  aiValue?: string | null;
}

export interface CredentialReview extends Credential {
  numberEntered: string;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: Role; email: string };
  document: {
    id: string;
    mimeType: string;
    aiStatus: AiStatus;
    flags: DocFlag[] | null;
    ocrText: string | null;
    ocrConfidence: number | null;
    detectedType: string | null;
    extracted: Record<string, ExtractedField> | null;
  } | null;
}

export interface DocumentOwner {
  kind: 'PROJECT' | 'LISTING' | 'OTHER';
  title: string;
  subtitle: string;
}

export interface QueuedDocument {
  id: string;
  ownerType: string;
  ownerId: string;
  declaredType: string | null;
  detectedType: string | null;
  aiStatus: AiStatus;
  reviewStatus: ReviewStatus;
  flags: DocFlag[] | null;
  createdAt: string;
  owner: DocumentOwner;
}

export interface FieldRow {
  key: string;
  label: string;
  required: boolean;
  value: string | null;
  confidence: number;
  edited: boolean;
  aiValue: string | null;
}

export interface DocumentReview {
  id: string;
  ownerType: string;
  declaredType: string | null;
  detectedType: string | null;
  mimeType: string;
  aiStatus: AiStatus;
  reviewStatus: ReviewStatus;
  ocrText: string | null;
  ocrConfidence: number | null;
  flags: DocFlag[];
  fields: FieldRow[];
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewer: { firstName: string; lastName: string } | null;
  createdAt: string;
  owner: DocumentOwner;
  siblings: Omit<QueuedDocument, 'owner'>[];
}

/** What each document type is called on screen. */
export const DOC_TYPE_NAME: Record<string, string> = {
  LAND_TITLE: 'Land title',
  TAX_DECLARATION: 'Tax declaration',
  RPT_RECEIPT: 'Real property tax receipt',
  SELLER_ID: "Seller's ID",
  VALID_ID: 'Valid ID',
  PASSPORT: 'Passport',
  LICENSE_TO_SELL: 'License to sell',
  PRC_ID: 'PRC ID',
  DHSUD_CERT: 'DHSUD certificate',
  PAYMENT_RECEIPT: 'Payment receipt',
  TRANSMITTAL: 'Transmittal',
  UNKNOWN: 'Unrecognized document',
};
export const docTypeName = (t: string | null) => (t ? (DOC_TYPE_NAME[t] ?? t) : 'Document');

const reading = (s: { aiStatus: AiStatus }) =>
  s.aiStatus === 'QUEUED' || s.aiStatus === 'PROCESSING';

export function useReviewQueue() {
  return useQuery({
    queryKey: ['reviews', 'queue'],
    queryFn: () =>
      api<{
        credentials: CredentialReview[];
        documents: QueuedDocument[];
        listings: QueuedListing[];
      }>('/reviews/queue'),
    refetchInterval: (q) =>
      q.state.data?.credentials.some((c) => c.status === 'PENDING_AI') ||
      q.state.data?.documents.some(reading)
        ? 3000
        : false,
  });
}

export function useCredentialReview(id: string) {
  return useQuery({
    queryKey: ['reviews', 'credential', id],
    queryFn: () => api<CredentialReview>(`/reviews/credentials/${id}`),
    refetchInterval: (q) => (q.state.data?.status === 'PENDING_AI' ? 3000 : false),
  });
}

export function useDocumentReview(id: string) {
  return useQuery({
    queryKey: ['reviews', 'document', id],
    queryFn: () => api<DocumentReview>(`/reviews/documents/${id}`),
    refetchInterval: (q) => (q.state.data && reading(q.state.data) ? 3000 : false),
  });
}

/** Short-lived link to the file. Refreshed before the 5-minute expiry. */
export function useDocumentUrl(documentId: string | undefined) {
  return useQuery({
    queryKey: ['documents', documentId, 'url'],
    queryFn: () => api<{ url: string; mimeType: string }>(`/documents/${documentId}/url`),
    enabled: !!documentId,
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });
}

/**
 * The broker's one-line summary of the AI result (SPEC §8.4):
 * "Ready for review", or "Needs attention: <first flag> (+N more)".
 */
export function aiSummary(d: { aiStatus: AiStatus; flags: DocFlag[] | null }): {
  tone: 'info' | 'neutral' | 'danger';
  text: string;
} {
  if (reading(d)) return { tone: 'info', text: 'Being read' };
  const serious = (d.flags ?? []).filter((f) => f.severity !== 'INFO');
  if (d.aiStatus === 'FAILED' && !serious.length)
    return { tone: 'danger', text: "Couldn't be read" };
  if (!serious.length) return { tone: 'neutral', text: 'Ready for review' };
  const more = serious.length > 1 ? ` (+${serious.length - 1} more)` : '';
  return { tone: 'danger', text: `Needs attention: ${serious[0]!.message}${more}` };
}

/** An individual seller listing waiting for the broker's go-live decision. */
export interface QueuedListing {
  id: string;
  title: string;
  status: 'PENDING_REVIEW' | 'NEEDS_ATTENTION';
  barangay: string | null;
  city: string;
  updatedAt: string;
  sellerRequest: { id: string; sellerName: string } | null;
  documentsApproved: number;
  documentsTotal: number;
}
