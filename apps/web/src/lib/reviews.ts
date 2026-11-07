import { useQuery } from '@tanstack/react-query';
import type { Role } from '@trustlisto/shared';
import { api } from './api';
import type { Credential } from './team';

export interface DocFlag {
  code: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message: string;
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
    aiStatus: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';
    flags: DocFlag[] | null;
  } | null;
}

export function useReviewQueue() {
  return useQuery({
    queryKey: ['reviews', 'queue'],
    queryFn: () => api<{ credentials: CredentialReview[] }>('/reviews/queue'),
    refetchInterval: (q) =>
      q.state.data?.credentials.some((c) => c.status === 'PENDING_AI') ? 3000 : false,
  });
}

export function useCredentialReview(id: string) {
  return useQuery({
    queryKey: ['reviews', 'credential', id],
    queryFn: () => api<CredentialReview>(`/reviews/credentials/${id}`),
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
