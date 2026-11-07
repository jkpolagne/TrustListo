import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@trustlisto/shared';
import { api } from './api';

export type CredentialStatus =
  'PENDING_AI' | 'NEEDS_ATTENTION' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Credential {
  id: string;
  type: 'PRC_LICENSE' | 'DHSUD_REGISTRATION';
  status: CredentialStatus;
  expiresAt: string | null;
  numberEntered?: string;
  rejectReason?: string | null;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  managerId: string | null;
  brokerId: string | null;
  referralCode: string | null;
  credentials: Credential[];
}

export function useTeam() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ data: TeamMember[] }>('/users').then((r) => r.data),
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api<TeamMember>(`/users/${id}`),
    // Refresh while a new upload is still being checked.
    refetchInterval: (q) =>
      q.state.data?.credentials.some((c) => c.status === 'PENDING_AI') ? 2000 : false,
  });
}

/** After any change to people, refresh lists and the detail page. */
export function useInvalidateTeam() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['users'] });
}

/** What a credential means to a person reading the screen. */
export type CredentialState =
  'verified' | 'expired' | 'review' | 'reading' | 'attention' | 'rejected';

export function credentialState(c: Credential, now = Date.now()): CredentialState {
  switch (c.status) {
    case 'APPROVED':
      return c.expiresAt && new Date(c.expiresAt).getTime() < now ? 'expired' : 'verified';
    case 'READY_FOR_REVIEW':
      return 'review';
    case 'PENDING_AI':
      return 'reading';
    case 'NEEDS_ATTENTION':
      return 'attention';
    case 'REJECTED':
      return 'rejected';
  }
}

export const CREDENTIAL_NAME: Record<Credential['type'], string> = {
  PRC_LICENSE: 'PRC license',
  DHSUD_REGISTRATION: 'DHSUD registration',
};

export const fullName = (u: { firstName: string; lastName: string }) =>
  `${u.firstName} ${u.lastName}`;
