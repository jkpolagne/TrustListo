import type { Role } from '@trustlisto/shared';
import type { ClientRow } from './clients';
import { awaitsMySignature, daysSince, type CommissionRow } from './commissions';
import type { Lead, Visit } from './leads';
import type { SellerRequestRow } from './sellers';
import { credentialState, type TeamMember } from './team';

/*
 * The office "Do next" list and the sale-stage counts (Overview pages). Built from the lists the
 * user can already see, so it never shows anything their role can't open.
 */

export type Task = {
  key: string;
  title: string; // starts with the verb: "Call Lorna Belmonte"
  detail: string;
  to: string;
  action: string; // button label, same verb
  urgent?: boolean;
  /** Sorting: lower first. Urgent tasks always lead. */
  rank: number;
};

export type Waiting = { key: string; text: string; to: string };

const ago = (iso: string) => {
  const d = daysSince(iso);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};
const when = new Intl.DateTimeFormat('en-PH', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export type WorkInput = {
  me: { id: string; role: Role };
  base: string;
  leads?: Lead[];
  visits?: Visit[];
  clients?: ClientRow[];
  commissions?: CommissionRow[];
  sellers?: SellerRequestRow[];
  team?: TeamMember[];
};

/** Who handles a row: leads and visits carry consultantId, clients carry consultant.id. */
type Owned = { consultantId?: string; consultant?: { id: string } | null };
const ownerOf = (x: Owned) => x.consultantId ?? x.consultant?.id;

const sortTasks = (t: Task[]) =>
  t.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || a.rank - b.rank);

/** A consultant's own work (Sales Person, and a Sales Manager's own deals). */
export function consultantWork(w: WorkInput): { tasks: Task[]; waiting: Waiting[] } {
  const mine = (x: Owned) => ownerOf(x) === w.me.id;
  const tasks: Task[] = [];
  const waiting: Waiting[] = [];
  const visits = (w.visits ?? []).filter(mine);
  const leads = (w.leads ?? []).filter(mine);

  for (const l of leads) {
    const lead = `${w.base}/leads/${l.id}`;
    const where = l.property?.title ?? 'a listing';
    if (l.status === 'NEW') {
      tasks.push({
        key: `call-${l.id}`,
        title: `Call ${l.buyerName}`,
        detail: `New lead ${ago(l.createdAt)} for ${where}. Mark them contacted once you've talked.`,
        to: lead,
        action: 'Open lead',
        urgent: daysSince(l.createdAt) >= 1,
        rank: 10,
      });
    } else if (l.status === 'CONTACTED' || l.status === 'QUALIFIED') {
      const booked = visits.some(
        (v) => v.inquiryId === l.id && (v.status === 'PENDING' || v.status === 'APPROVED'),
      );
      if (!booked)
        tasks.push({
          key: `visit-${l.id}`,
          title: `Schedule a visit with ${l.buyerName}`,
          detail: `${where}. The company admin approves the time.`,
          to: lead,
          action: 'Schedule',
          rank: 20,
        });
    } else if (l.status === 'VISIT_SCHEDULED') {
      tasks.push({
        key: `reserve-${l.id}`,
        title: `Convert ${l.buyerName} once they reserve`,
        detail: 'Upload the reservation receipt from the lead page to make them a client.',
        to: lead,
        action: 'Open lead',
        rank: 40,
      });
    }
  }

  for (const v of visits) {
    const buyer = v.lead?.buyerName ?? 'the buyer';
    if (v.status === 'PENDING') {
      waiting.push({
        key: `v-${v.id}`,
        text: `Visit with ${buyer} on ${when.format(new Date(v.scheduledAt))}: waiting for the admin to approve.`,
        to: `${w.base}/visits`,
      });
    } else if (v.status === 'APPROVED' && new Date(v.scheduledAt) < new Date()) {
      tasks.push({
        key: `outcome-${v.id}`,
        title: `Record how the visit with ${buyer} went`,
        detail: `It was on ${when.format(new Date(v.scheduledAt))}. Mark it completed or no-show.`,
        to: `${w.base}/visits`,
        action: 'Open visits',
        rank: 15,
      });
    }
  }

  // Clients whose paid commission waits on documents (§10.4 BLOCKED).
  const blocked = new Set(
    (w.commissions ?? [])
      .filter((c) => c.tranches.some((t) => t.status === 'BLOCKED'))
      .map((c) => c.clientId),
  );
  for (const c of (w.clients ?? []).filter(mine)) {
    const page = `${w.base}/clients/${c.id}`;
    const left = c.checklist.total - c.checklist.done;
    if (c.status === 'ACTIVE' && left > 0) {
      const held = blocked.has(c.id);
      tasks.push({
        key: `docs-${c.id}`,
        title: `Finish ${c.fullName}'s documents`,
        detail: held
          ? `The buyer has paid, but a commission is held until documents are verified. ${c.checklist.done} of ${c.checklist.total} done.`
          : `${c.checklist.done} of ${c.checklist.total} verified. Upload what's missing; the broker verifies.`,
        to: page,
        action: 'Open checklist',
        urgent: held,
        rank: 30,
      });
    }
    if (c.status === 'CLOSING') {
      tasks.push({
        key: `close-${c.id}`,
        title: `Finish the transfer steps for ${c.fullName}`,
        detail: 'Tick each step as it happens. The last one completes the sale.',
        to: page,
        action: 'Open client',
        rank: 50,
      });
    }
  }

  // Vouchers only: the commissions list is already limited to deals this user is paid from.
  for (const c of w.commissions ?? []) {
    const page = `${w.base}/commissions/${c.id}`;
    for (const t of c.tranches) {
      if (awaitsMySignature(t, w.me.id)) {
        tasks.push({
          key: `sign-${t.id}`,
          title: `Sign the voucher for ${c.client?.fullName ?? 'a deal'}`,
          detail: `${t.label}. The broker has signed; the payout is recorded once every payee signs.`,
          to: page,
          action: 'Sign',
          urgent: true,
          rank: 5,
        });
      }
    }
  }

  for (const r of (w.sellers ?? []).filter((r) => r.agent?.id === w.me.id)) {
    const page = `${w.base}/sellers/${r.id}`;
    if (r.status === 'NEW') {
      tasks.push({
        key: `seller-${r.id}`,
        title: `Reply to ${r.sellerName}'s listing request`,
        detail: `${r.locationText}. Accept or decline it.`,
        to: page,
        action: 'Open request',
        urgent: daysSince(r.createdAt) >= 2,
        rank: 25,
      });
    } else if (r.status === 'ACCEPTED' || r.status === 'DOCUMENTS_IN_PROGRESS') {
      tasks.push({
        key: `seller-docs-${r.id}`,
        title: `Collect ${r.sellerName}'s property documents`,
        detail:
          'Upload the title, tax declaration, tax receipt and ID, then send them to the broker.',
        to: page,
        action: 'Open request',
        rank: 45,
      });
    } else if (r.status === 'SUBMITTED_FOR_REVIEW') {
      waiting.push({
        key: `seller-rev-${r.id}`,
        text: `${r.sellerName}'s property is with the broker for review.`,
        to: page,
      });
    }
  }

  return { tasks: sortTasks(tasks), waiting };
}

/** The CompanyAdmin's work: approvals, transmittals, credentials, and leads nobody has called. */
export function adminWork(w: WorkInput): { tasks: Task[]; waiting: Waiting[] } {
  const tasks: Task[] = [];
  const waiting: Waiting[] = [];

  for (const v of w.visits ?? []) {
    if (v.status !== 'PENDING') continue;
    const who = v.consultant
      ? `${v.consultant.firstName} ${v.consultant.lastName}`
      : 'A consultant';
    tasks.push({
      key: `approve-${v.id}`,
      title: `Approve or decline a visit for ${v.lead?.buyerName ?? 'a buyer'}`,
      detail: `${who}, ${when.format(new Date(v.scheduledAt))}, ${v.property?.title ?? ''}.`,
      to: `${w.base}/visits`,
      action: 'Open visits',
      urgent: new Date(v.scheduledAt).getTime() - Date.now() < 2 * 86_400_000,
      rank: 10,
    });
  }

  for (const c of w.commissions ?? []) {
    for (const t of c.tranches) {
      if (t.status !== 'AWAITING_TRANSMITTAL') continue;
      const days = t.awaitingSince ? daysSince(t.awaitingSince) : 0;
      tasks.push({
        key: `tx-${t.id}`,
        title: `Upload the developer's transmittal for ${c.client?.fullName ?? 'a deal'}`,
        detail: `${t.label}, waiting ${days} ${days === 1 ? 'day' : 'days'}.${days > 90 ? ' Follow up with the developer.' : ''}`,
        to: `${w.base}/commissions/${c.id}`,
        action: 'Upload',
        urgent: days > 90,
        rank: 20,
      });
    }
  }

  for (const p of w.team ?? []) {
    for (const cr of p.credentials) {
      const state = credentialState(cr);
      if (state === 'expired' || state === 'rejected') {
        tasks.push({
          key: `cred-${cr.id}`,
          title: `Upload a current credential for ${p.firstName} ${p.lastName}`,
          detail:
            state === 'expired'
              ? 'Their license expired, so buyers no longer see them in the agent picker.'
              : 'The broker rejected the last upload. Buyers don’t see them until one is approved.',
          to: `${w.base}/team/${p.id}`,
          action: 'Open profile',
          rank: 40,
        });
      }
      if (state === 'review' || state === 'reading' || state === 'attention') {
        waiting.push({
          key: `credw-${cr.id}`,
          text: `${p.firstName} ${p.lastName}'s credential is with the broker.`,
          to: `${w.base}/team/${p.id}`,
        });
      }
    }
  }

  const cold = (w.leads ?? []).filter((l) => l.status === 'NEW' && daysSince(l.createdAt) >= 2);
  if (cold.length) {
    tasks.push({
      key: 'cold-leads',
      title: `Check on ${cold.length} lead${cold.length === 1 ? '' : 's'} nobody has called`,
      detail: 'New for 2 days or more. Remind the consultant, or reassign.',
      to: `${w.base}/leads`,
      action: 'Open leads',
      urgent: true,
      rank: 15,
    });
  }

  for (const c of w.commissions ?? []) {
    for (const t of c.tranches) {
      if (t.status === 'READY_FOR_RELEASE' && !t.voucher) {
        waiting.push({
          key: `voucher-${t.id}`,
          text: `${c.client?.fullName}: ${t.label} is ready for the broker's voucher.`,
          to: `${w.base}/commissions/${c.id}`,
        });
      }
    }
  }

  return { tasks: sortTasks(tasks), waiting };
}

// ───────────── Where every deal is (the stage strip) ─────────────

export type StageKey = 'lead' | 'visit' | 'paperwork' | 'commission' | 'closing' | 'done';

export type Stage = {
  key: StageKey;
  name: string;
  count: number;
  who: string;
  to: string;
};

/** Who acts at each stage, worded for the reader: the consultant, the admin, or an observer. */
const WHO: Record<'consultant' | 'admin' | 'observer', Record<StageKey, string>> = {
  consultant: {
    lead: 'You call the buyer',
    visit: 'You schedule, the admin approves',
    paperwork: 'You upload, a broker verifies',
    commission: 'Transmittal and voucher, then you sign',
    closing: 'You tick the transfer steps',
    done: 'The buyer rates the agent',
  },
  admin: {
    lead: 'The consultant calls the buyer',
    visit: 'The consultant schedules, you approve',
    paperwork: 'The consultant uploads, a broker verifies',
    commission: 'You add the transmittal, the broker vouchers',
    closing: 'The consultant ticks the transfer steps',
    done: 'The buyer rates the agent',
  },
  observer: {
    lead: 'The consultant calls the buyer',
    visit: 'The consultant schedules, the admin approves',
    paperwork: 'The consultant uploads, a broker verifies',
    commission: 'Admin transmittal, broker voucher, payees sign',
    closing: 'The consultant ticks the transfer steps',
    done: 'The buyer rates the agent',
  },
};

export function stages(w: WorkInput, scope: 'mine' | 'all'): Stage[] {
  const pick = <T extends Owned>(xs: T[] = []) =>
    scope === 'mine' ? xs.filter((x) => ownerOf(x) === w.me.id) : xs;
  const leads = pick(w.leads);
  const clients = pick(w.clients);
  const reader =
    scope === 'mine' ? 'consultant' : w.me.role === 'COMPANY_ADMIN' ? 'admin' : 'observer';
  const who = WHO[reader];
  const tranches = (w.commissions ?? [])
    .filter((c) => scope === 'all' || clients.some((cl) => cl.id === c.clientId))
    .flatMap((c) => c.tranches);
  // A lead is at the visit stage once a visit is requested, not only once it's approved.
  const visiting = new Set(
    (w.visits ?? [])
      .filter((v) => v.inquiryId && (v.status === 'PENDING' || v.status === 'APPROVED'))
      .map((v) => v.inquiryId!),
  );
  const atVisit = (l: Lead) =>
    l.status === 'VISIT_SCHEDULED' ||
    (visiting.has(l.id) && ['NEW', 'CONTACTED', 'QUALIFIED'].includes(l.status));

  return [
    {
      key: 'lead',
      name: 'Lead',
      count: leads.filter(
        (l) => ['NEW', 'CONTACTED', 'QUALIFIED'].includes(l.status) && !atVisit(l),
      ).length,
      who: who.lead,
      to: `${w.base}/leads`,
    },
    {
      key: 'visit',
      name: 'Visit',
      count: leads.filter(atVisit).length,
      who: who.visit,
      to: `${w.base}/visits`,
    },
    {
      key: 'paperwork',
      name: 'Documents',
      count: clients.filter((c) => c.status === 'ACTIVE' && c.checklist.done < c.checklist.total)
        .length,
      who: who.paperwork,
      to: `${w.base}/clients`,
    },
    {
      key: 'commission',
      name: 'Commission',
      count: tranches.filter(
        (t) => t.status === 'AWAITING_TRANSMITTAL' || t.status === 'READY_FOR_RELEASE',
      ).length,
      who: who.commission,
      to: `${w.base}/commissions`,
    },
    {
      key: 'closing',
      name: 'Closing',
      count: clients.filter((c) => c.status === 'CLOSING').length,
      who: who.closing,
      to: `${w.base}/clients`,
    },
    {
      key: 'done',
      name: 'Completed',
      count: clients.filter((c) => c.status === 'COMPLETED').length,
      who: who.done,
      to: `${w.base}/clients`,
    },
  ];
}
