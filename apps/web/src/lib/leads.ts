import { useQuery } from '@tanstack/react-query';
import type { Role } from '@trustlisto/shared';
import { api } from './api';
import type { AgentCard } from './sellers';

export type LeadStatus =
  'NEW' | 'CONTACTED' | 'QUALIFIED' | 'VISIT_SCHEDULED' | 'RESERVED' | 'LOST';
export type VisitStatus =
  'PENDING' | 'APPROVED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED' | 'CANCELLED';

export const LEAD_STATUS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  VISIT_SCHEDULED: 'Visit scheduled',
  RESERVED: 'Reserved',
  LOST: 'Lost',
};

export const VISIT_STATUS: Record<VisitStatus, string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  COMPLETED: 'Completed',
  NO_SHOW: 'Buyer didn’t come',
  RESCHEDULED: 'Moved',
  CANCELLED: 'Cancelled',
};

export const NATURE_OF_WORK = {
  EMPLOYED: 'Employed in the Philippines',
  OFW: 'Working abroad (OFW)',
  BUSINESS: 'Own business',
  OTHER: 'Other',
} as const;

export const PAYMENT_PREF = {
  PAG_IBIG: 'Pag-IBIG housing loan',
  BANK: 'Bank loan',
  IN_HOUSE: 'In-house financing',
  CASH: 'Cash',
  DEFERRED_CASH: 'Deferred cash',
  NOT_SURE: 'Not sure yet',
} as const;

export const CIVIL_STATUS = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  SEPARATED: 'Separated',
} as const;

/** Who an inquiry about this listing can go to (the server decides; SPEC §7.2). */
export function useInquiryRouting(
  propertyId: string | undefined,
  ref: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['public', 'routing', propertyId, ref],
    queryFn: () =>
      api<{ mode: 'PICK' | 'ASSIGNED' | 'REFERRAL'; data: AgentCard[] }>(
        `/public/properties/${propertyId}/consultants${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`,
      ),
    enabled: enabled && !!propertyId,
    staleTime: Infinity, // one shuffle per opening; no re-ordering under the buyer
    gcTime: 0,
  });
}

type Person = { id: string; firstName: string; lastName: string; role: Role };

export interface Lead {
  id: string;
  status: LeadStatus;
  source: 'ORGANIC' | 'REFERRAL';
  referralCode: string | null;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  natureOfWork: keyof typeof NATURE_OF_WORK;
  paymentPref: keyof typeof PAYMENT_PREF;
  civilStatus: keyof typeof CIVIL_STATUS;
  message: string | null;
  consultantId: string;
  createdAt: string;
  updatedAt: string;
  property: { id: string; title: string; slug: string; source: string; status: string } | null;
  consultant: Person | null;
}

export interface Visit {
  id: string;
  status: VisitStatus;
  scheduledAt: string;
  notes: string | null;
  declineReason: string | null;
  rescheduledFromId: string | null;
  consultantId: string;
  inquiryId: string | null;
  property: {
    id: string;
    title: string;
    slug: string;
    barangay: string | null;
    city: string;
  } | null;
  consultant: Person | null;
  lead: { id: string; buyerName: string; buyerPhone: string } | null;
  warnings?: { visitId: string; message: string }[];
}

export interface LeadDetail extends Lead {
  isMine: boolean;
  lostReason: string | null;
  clientId: string | null;
  visits: Omit<Visit, 'property' | 'consultant' | 'lead'>[];
}

export const useLeads = () =>
  useQuery({
    queryKey: ['leads'],
    queryFn: () => api<{ data: Lead[] }>('/inquiries').then((r) => r.data),
    refetchInterval: 60_000, // new inquiries show up without a reload
  });

export const useLead = (id: string) =>
  useQuery({ queryKey: ['leads', id], queryFn: () => api<LeadDetail>(`/inquiries/${id}`) });

export const useVisits = () =>
  useQuery({
    queryKey: ['visits'],
    queryFn: () => api<{ data: Visit[] }>('/visits').then((r) => r.data),
  });
