import type { Document, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { objectKey, putObject } from '../../lib/storage';
import { requireDocumentFile, singleFile } from '../../lib/upload';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { queueDocument } from '../docai/pipeline';
import type { DocFlag, Extracted } from '../docai/types';
import { consultantScope } from '../leads/scope';
import { createCommission, evaluateClient } from '../commissions/service';
import { expectedDocType, syncChecklist } from './checklist';
import { needsEmployment } from './requirements.rules';

/**
 * Module 3, first part (SPEC §10.1, §9, §8.3 Stage 2): lead → client conversion with the
 * reservation receipt, the requirements checklist, buyer documents, and buyer payments.
 * Scope (§5.2): CompanyAdmin/Broker read all; Sales Manager works own + reads team; Sales
 * Person works own. Only the handling consultant changes a client's records.
 */

const FIRM = requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON');
const METHODS = ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'] as const;
const EMPLOYMENT = ['LOCALLY_EMPLOYED', 'OFW', 'SELF_EMPLOYED'] as const;
const CIVIL = ['SINGLE', 'MARRIED', 'SEPARATED'] as const;

function assertHandler(req: Express.Request, consultantId: string) {
  if (consultantId !== req.user!.id) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the consultant handling this buyer can do this.');
  }
}

async function storeDocument(
  req: Express.Request,
  opts: {
    ownerType: 'PAYMENT' | 'CLIENT';
    ownerId: string;
    declaredType: Document['declaredType'];
  },
) {
  const file = requireDocumentFile(req.file);
  const firmId = req.user!.firmId!;
  const storageKey = objectKey(firmId, opts.ownerType.toLowerCase(), opts.ownerId, file.mime);
  await putObject(storageKey, file.buffer, file.mime);
  return prisma.document.create({
    data: {
      firmId,
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      declaredType: opts.declaredType,
      storageKey,
      mimeType: file.mime,
      sizeBytes: file.size,
      sha256: file.sha256,
      uploadedById: req.user!.id,
    },
  });
}

const hasBlocker = (d: { flags: unknown }) =>
  ((d.flags ?? []) as DocFlag[]).some((f) => f.severity === 'BLOCKER');

// ───────────── Conversion (mounted at /inquiries) ─────────────

export const conversionRouter = Router();
conversionRouter.use(FIRM);

async function myOpenLead(req: Express.Request, id: string) {
  const lead = await prisma.inquiry.findFirst({
    where: { ...(await consultantScope(req.user!)), id },
  });
  if (!lead) throw notFoundError();
  assertHandler(req, lead.consultantId);
  if (lead.status === 'RESERVED' || lead.status === 'LOST') {
    throw new HttpError(409, 'LEAD_CLOSED', 'This lead is already a client or was marked lost.');
  }
  return lead;
}

/** Step 1: the reservation receipt. Module 1 reads the amount to pre-fill step 2. */
conversionRouter.post('/:id/receipt', singleFile('file'), async (req, res) => {
  const lead = await myOpenLead(req, String(req.params.id));
  const doc = await storeDocument(req, {
    ownerType: 'PAYMENT',
    ownerId: lead.id, // re-pointed to the Payment on conversion
    declaredType: 'PAYMENT_RECEIPT',
  });
  queueDocument(doc.id);
  res.status(201).json({ documentId: doc.id });
});

const convertBody = z
  .object({
    receiptDocumentId: z.string().min(1),
    amount: z.coerce.number().positive('Enter the amount on the receipt.').max(1_000_000_000),
    paidAt: z.coerce.date(),
    tcp: z.coerce.number().positive('Enter the total contract price.').max(10_000_000_000),
    // Required downpayment (SPEC §10.3 DP milestones). Needed for bank and Pag-IBIG deals.
    downpaymentAmount: z.coerce.number().positive().max(10_000_000_000).nullable().optional(),
    paymentMethod: z.enum(METHODS, {
      errorMap: () => ({ message: 'Choose how the buyer will pay (not "not sure").' }),
    }),
    civilStatus: z.enum(CIVIL),
    employmentType: z.enum(EMPLOYMENT).nullable().optional(),
    fullName: z.string().trim().min(3).max(120).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    email: z.string().trim().email().max(160).optional().or(z.literal('')),
  })
  .refine((b) => !needsEmployment(b.paymentMethod) || !!b.downpaymentAmount, {
    message: 'Enter the required downpayment; bank and Pag-IBIG commissions depend on it.',
    path: ['downpaymentAmount'],
  })
  .refine((b) => !needsEmployment(b.paymentMethod) || !!b.employmentType, {
    message: 'Bank and Pag-IBIG buyers need an employment type.',
    path: ['employmentType'],
  });

/** Step 2: the buyer reserved → Client, confirmed reservation Payment, checklist (§10.1). */
conversionRouter.post('/:id/convert', async (req, res) => {
  const body = convertBody.parse(req.body);
  const lead = await myOpenLead(req, String(req.params.id));
  const receipt = await prisma.document.findFirst({
    where: {
      id: body.receiptDocumentId,
      firmId: lead.firmId,
      ownerType: 'PAYMENT',
      ownerId: lead.id,
    },
  });
  if (!receipt)
    throw new HttpError(400, 'RECEIPT_REQUIRED', 'Upload the reservation receipt first.');
  if (receipt.aiStatus === 'QUEUED' || receipt.aiStatus === 'PROCESSING') {
    throw new HttpError(409, 'STILL_READING', 'Wait a moment while the receipt is read.');
  }
  if (hasBlocker(receipt)) {
    throw new HttpError(
      409,
      'RECEIPT_FLAGGED',
      'This receipt was already used for another payment. Upload the right one.',
    );
  }
  const property = await prisma.property.findUniqueOrThrow({ where: { id: lead.propertyId } });
  const input = {
    paymentMethod: body.paymentMethod,
    civilStatus: body.civilStatus,
    employmentType: body.employmentType ?? null,
  };
  const aiAmount = Number(((receipt.extracted ?? {}) as Extracted).amount?.value);

  const client = await prisma.$transaction(async (tx) => {
    const c = await tx.client.create({
      data: {
        firmId: lead.firmId,
        inquiryId: lead.id,
        propertyId: lead.propertyId,
        consultantId: lead.consultantId,
        fullName: body.fullName ?? lead.buyerName,
        phone: body.phone ?? lead.buyerPhone,
        email: body.email || lead.buyerEmail,
        civilStatus: body.civilStatus,
        paymentMethod: body.paymentMethod,
        employmentType: body.employmentType ?? null,
        tcp: body.tcp,
        saleType: property.source === 'DEVELOPER' ? 'DEVELOPER_SALE' : 'PRIVATE_SALE',
        reservationPaidAt: body.paidAt,
        downpaymentAmount: body.downpaymentAmount ?? null,
      },
    });
    const payment = await tx.payment.create({
      data: {
        firmId: lead.firmId,
        clientId: c.id,
        kind: 'RESERVATION',
        amount: body.amount,
        paidAt: body.paidAt,
        proofDocumentId: receipt.id,
        confirmedById: req.user!.id,
      },
    });
    await tx.document.update({ where: { id: receipt.id }, data: { ownerId: payment.id } });
    await tx.inquiry.update({ where: { id: lead.id }, data: { status: 'RESERVED' } });
    const checklist = await syncChecklist(tx, c, input);
    // Commission and tranches from the firm's template (SPEC §10.1); none if no template fits.
    const commission = await createCommission(tx, c.id);
    if (!commission) {
      await audit(
        req,
        {
          action: 'COMMISSION_TEMPLATE_MISSING',
          entityType: 'Client',
          entityId: c.id,
          after: { paymentMethod: c.paymentMethod },
        },
        tx,
      );
    }
    await audit(
      req,
      {
        action: 'CLIENT_CREATED',
        entityType: 'Client',
        entityId: c.id,
        after: { inquiryId: lead.id, ...input, tcp: body.tcp, items: checklist.added.length },
      },
      tx,
    );
    await audit(
      req,
      {
        action: 'PAYMENT_CONFIRMED',
        entityType: 'Payment',
        entityId: payment.id,
        after: {
          kind: 'RESERVATION',
          amount: body.amount,
          aiAmount: Number.isFinite(aiAmount) ? aiAmount : null,
        },
      },
      tx,
    );
    return c;
  });
  await evaluateClient(client.id, req);
  res.status(201).json({ clientId: client.id });
});

// ───────────── Clients ─────────────

export const clientsRouter = Router();
clientsRouter.use(FIRM);

async function findClient(req: Express.Request, id: string) {
  const c = await prisma.client.findFirst({ where: { ...(await consultantScope(req.user!)), id } });
  if (!c) throw notFoundError();
  return c;
}

const docSummary = {
  id: true,
  declaredType: true,
  detectedType: true,
  aiStatus: true,
  reviewStatus: true,
  flags: true,
  extracted: true,
  reviewNote: true,
} as const satisfies Prisma.DocumentSelect;

clientsRouter.get('/', async (req, res) => {
  const rows = await prisma.client.findMany({
    where: await consultantScope(req.user!),
    orderBy: { createdAt: 'desc' },
  });
  const [props, people, items, paid] = await Promise.all([
    prisma.property.findMany({
      where: { id: { in: rows.map((r) => r.propertyId) } },
      select: { id: true, title: true },
    }),
    prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.consultantId) } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.requirementItem.groupBy({
      by: ['clientId', 'status'],
      where: { clientId: { in: rows.map((r) => r.id) }, required: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ['clientId'],
      where: { clientId: { in: rows.map((r) => r.id) }, confirmedById: { not: null } },
      _sum: { amount: true },
    }),
  ]);
  const p = new Map(props.map((x) => [x.id, x]));
  const u = new Map(people.map((x) => [x.id, x]));
  const s = new Map(paid.map((x) => [x.clientId, Number(x._sum.amount ?? 0)]));
  res.json({
    data: rows.map((r) => {
      const mine = items.filter((i) => i.clientId === r.id);
      const total = mine.reduce((n, i) => n + i._count._all, 0);
      const done = mine
        .filter((i) => i.status === 'VERIFIED' || i.status === 'WAIVED')
        .reduce((n, i) => n + i._count._all, 0);
      return {
        ...r,
        property: p.get(r.propertyId) ?? null,
        consultant: u.get(r.consultantId) ?? null,
        checklist: { total, done },
        paid: s.get(r.id) ?? 0,
      };
    }),
  });
});

clientsRouter.get('/:id', async (req, res) => {
  const c = await findClient(req, req.params.id);
  const [property, consultant, items, payments] = await Promise.all([
    prisma.property.findUnique({
      where: { id: c.propertyId },
      select: { id: true, title: true, slug: true, source: true },
    }),
    prisma.user.findUnique({
      where: { id: c.consultantId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.requirementItem.findMany({
      where: { clientId: c.id },
      orderBy: [{ stage: 'desc' }, { appliesTo: 'asc' }],
    }),
    prisma.payment.findMany({ where: { clientId: c.id }, orderBy: { paidAt: 'asc' } }),
  ]);
  const docIds = [
    ...items.map((i) => i.documentId),
    ...payments.map((p) => p.proofDocumentId),
  ].filter((x): x is string => !!x);
  const docs = new Map(
    (await prisma.document.findMany({ where: { id: { in: docIds } }, select: docSummary })).map(
      (d) => [d.id, d],
    ),
  );
  res.json({
    ...c,
    property,
    consultant,
    isMine: c.consultantId === req.user!.id,
    requirements: items.map((i) => ({
      ...i,
      document: i.documentId ? (docs.get(i.documentId) ?? null) : null,
    })),
    payments: payments.map((p) => ({
      ...p,
      confirmed: !!p.confirmedById,
      document: p.proofDocumentId ? (docs.get(p.proofDocumentId) ?? null) : null,
    })),
  });
});

const patchBody = z
  .object({
    paymentMethod: z.enum(METHODS),
    civilStatus: z.enum(CIVIL),
    employmentType: z.enum(EMPLOYMENT).nullable(),
  })
  .refine((b) => !needsEmployment(b.paymentMethod) || !!b.employmentType, {
    message: 'Bank and Pag-IBIG buyers need an employment type.',
    path: ['employmentType'],
  });

/** Changing how the buyer pays or their civil status regenerates the checklist (§9). */
clientsRouter.patch('/:id', async (req, res) => {
  const body = patchBody.parse(req.body);
  const c = await findClient(req, req.params.id);
  assertHandler(req, c.consultantId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.client.update({ where: { id: c.id }, data: body });
    const changes = await syncChecklist(tx, c, body);
    await audit(
      req,
      {
        action: 'CLIENT_UPDATED',
        entityType: 'Client',
        entityId: c.id,
        before: {
          paymentMethod: c.paymentMethod,
          civilStatus: c.civilStatus,
          employmentType: c.employmentType,
        },
        after: { ...body, ...changes },
      },
      tx,
    );
    return changes;
  });
  await evaluateClient(c.id, req);
  res.json(result);
});

const paymentBody = z.object({
  kind: z.enum([
    'DOWNPAYMENT',
    'FULL_CASH',
    'DEFERRED_INSTALLMENT',
    'IN_HOUSE_INSTALLMENT',
    'LOAN_RELEASE',
    'OTHER',
  ]),
});

/** Payment proof upload (§13). Counts only after the uploader confirms the amount. */
clientsRouter.post('/:id/payments', singleFile('file'), async (req, res) => {
  const { kind } = paymentBody.parse(req.body);
  const c = await findClient(req, String(req.params.id));
  assertHandler(req, c.consultantId);
  const payment = await prisma.payment.create({
    data: { firmId: c.firmId, clientId: c.id, kind, amount: 0, paidAt: new Date() },
  });
  const doc = await storeDocument(req, {
    ownerType: 'PAYMENT',
    ownerId: payment.id,
    declaredType: 'PAYMENT_RECEIPT',
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { proofDocumentId: doc.id } });
  queueDocument(doc.id);
  res.status(201).json({ paymentId: payment.id, documentId: doc.id });
});

// ───────────── Requirements ─────────────

export const requirementsRouter = Router();
requirementsRouter.use(FIRM);

async function findItem(req: Express.Request, id: string) {
  const item = await prisma.requirementItem.findFirst({
    where: { id, firmId: req.user!.firmId! },
  });
  if (!item) throw notFoundError();
  const client = await findClient(req, item.clientId); // applies the consultant scope
  return { item, client };
}

/** Buyer document for one checklist item; Module 1 reads it, a broker verifies it (OPEN-3). */
requirementsRouter.post('/:id/documents', singleFile('file'), async (req, res) => {
  const { item, client } = await findItem(req, String(req.params.id));
  assertHandler(req, client.consultantId);
  if (item.status === 'VERIFIED' || item.status === 'WAIVED') {
    throw new HttpError(409, 'ALREADY_DONE', 'This item is already verified or waived.');
  }
  const doc = await storeDocument(req, {
    ownerType: 'CLIENT',
    ownerId: client.id,
    declaredType: expectedDocType(item.code, item.appliesTo),
  });
  await prisma.$transaction(async (tx) => {
    // A replaced upload leaves the broker's queue; the new one takes its place.
    if (item.documentId) {
      await tx.document.updateMany({
        where: {
          id: item.documentId,
          reviewStatus: { in: ['PENDING_AI', 'READY_FOR_REVIEW', 'NEEDS_ATTENTION'] },
        },
        data: { reviewStatus: 'REJECTED', reviewNote: 'Replaced by a newer upload.' },
      });
    }
    await tx.requirementItem.update({
      where: { id: item.id },
      data: { documentId: doc.id, status: 'UPLOADED' },
    });
    await audit(
      req,
      {
        action: 'REQUIREMENT_UPLOADED',
        entityType: 'RequirementItem',
        entityId: item.id,
        before: { status: item.status, documentId: item.documentId },
        after: { status: 'UPLOADED', documentId: doc.id },
      },
      tx,
    );
  });
  queueDocument(doc.id);
  res.status(201).json({ documentId: doc.id });
});

const waiveBody = z.object({
  reason: z.string().trim().min(5, 'Say why this document is not needed.').max(500),
});

/** A broker may waive an item that doesn't apply to this buyer; audited (rule 11). */
requirementsRouter.post('/:id/waive', requireRole('BROKER'), async (req, res) => {
  const { reason } = waiveBody.parse(req.body);
  const { item } = await findItem(req, String(req.params.id));
  if (item.status === 'VERIFIED')
    throw new HttpError(409, 'ALREADY_DONE', 'This item is already verified.');
  await prisma.$transaction(async (tx) => {
    await tx.requirementItem.update({
      where: { id: item.id },
      data: { status: 'WAIVED', verifiedById: req.user!.id, verifiedAt: new Date() },
    });
    await audit(
      req,
      {
        action: 'REQUIREMENT_WAIVED',
        entityType: 'RequirementItem',
        entityId: item.id,
        before: { status: item.status },
        after: { status: 'WAIVED', reason },
      },
      tx,
    );
  });
  await evaluateClient(item.clientId, req); // waived items count as complete
  res.json({ status: 'WAIVED' });
});

// ───────────── Payments ─────────────

export const paymentsRouter = Router();
paymentsRouter.use(FIRM);

const confirmBody = z.object({
  amount: z.coerce.number().positive('Enter the amount on the receipt.').max(1_000_000_000),
  paidAt: z.coerce.date(),
});

/** The uploader confirms (or corrects) the amount the AI read; only then does it count (§8.3). */
paymentsRouter.post('/:id/confirm', async (req, res) => {
  const body = confirmBody.parse(req.body);
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.id, firmId: req.user!.firmId! },
  });
  if (!payment) throw notFoundError();
  const client = await findClient(req, payment.clientId);
  assertHandler(req, client.consultantId);
  if (payment.confirmedById)
    throw new HttpError(409, 'ALREADY_CONFIRMED', 'This payment is already confirmed.');
  const doc = payment.proofDocumentId
    ? await prisma.document.findUnique({ where: { id: payment.proofDocumentId } })
    : null;
  if (doc && (doc.aiStatus === 'QUEUED' || doc.aiStatus === 'PROCESSING')) {
    throw new HttpError(409, 'STILL_READING', 'Wait a moment while the receipt is read.');
  }
  if (doc && hasBlocker(doc)) {
    throw new HttpError(
      409,
      'RECEIPT_FLAGGED',
      'This receipt was already used for another payment.',
    );
  }
  const aiAmount = Number(((doc?.extracted ?? {}) as Extracted).amount?.value);
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { amount: body.amount, paidAt: body.paidAt, confirmedById: req.user!.id },
    });
    await audit(
      req,
      {
        action: 'PAYMENT_CONFIRMED',
        entityType: 'Payment',
        entityId: payment.id,
        after: {
          kind: payment.kind,
          amount: body.amount,
          aiAmount: Number.isFinite(aiAmount) ? aiAmount : null,
        },
      },
      tx,
    );
  });
  await evaluateClient(client.id, req); // a confirmed payment can reach a milestone
  res.json({ confirmed: true });
});
