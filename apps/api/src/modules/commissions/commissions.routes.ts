import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { objectKey, putObject } from '../../lib/storage';
import { requireDocumentFile, singleFile } from '../../lib/upload';
import { requireAuth, requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { queueDocument } from '../docai/pipeline';
import type { DocFlag } from '../docai/types';
import { agingBucket, sharesCents, toCents, toPesos } from './engine';
import { evaluateClient, type SplitSnapshot } from './service';

/**
 * Commissions (SPEC §10.4–10.5, §13): read by the CompanyAdmin and Broker (all) and by each
 * payee consultant (their own deals). The CompanyAdmin handles transmittals; the Broker creates
 * and signs vouchers first, then each payee consultant signs. No money moves in the system
 * (rule 2): RELEASED records that the payout happened outside it.
 */
export const commissionsRouter = Router();
// Mounted at the API root, so its guards apply only to its own paths.
commissionsRouter.use(
  ['/commissions', '/tranches', '/vouchers'],
  requireAuth,
  requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON'),
);

const seesAll = (role: string) => role === 'COMPANY_ADMIN' || role === 'BROKER';

/** Commissions the user may read: all of the firm, or the deals where they are a payee. */
function commissionWhere(req: Express.Request): Prisma.CommissionWhereInput {
  const { firmId } = firmScope(req.user!);
  if (seesAll(req.user!.role)) return { firmId };
  return {
    firmId,
    splitSnapshot: { path: ['people'], array_contains: [{ userId: req.user!.id }] },
  };
}

async function withContext(rows: Prisma.CommissionGetPayload<{ include: { tranches: true } }>[]) {
  const clients = await prisma.client.findMany({
    where: { id: { in: rows.map((r) => r.clientId) } },
    select: { id: true, fullName: true, propertyId: true, paymentMethod: true, tcp: true },
  });
  const props = await prisma.property.findMany({
    where: { id: { in: clients.map((c) => c.propertyId) } },
    select: { id: true, title: true },
  });
  const c = new Map(clients.map((x) => [x.id, x]));
  const p = new Map(props.map((x) => [x.id, x]));
  return rows.map((r) => {
    const client = c.get(r.clientId);
    return {
      ...r,
      tranches: [...r.tranches].sort((a, b) => a.sequence - b.sequence),
      client: client ? { ...client, property: p.get(client.propertyId) ?? null } : null,
    };
  });
}

commissionsRouter.get('/commissions', async (req, res) => {
  const rows = await prisma.commission.findMany({
    where: commissionWhere(req),
    include: { tranches: true },
  });
  const data = await withContext(rows);
  // Broker dashboard: tranches waiting for the developer's transmittal, by age (§10.6).
  const awaiting = data.flatMap((c) =>
    c.tranches
      .filter((t) => t.status === 'AWAITING_TRANSMITTAL' && t.awaitingSince)
      .map((t) => ({ trancheId: t.id, commissionId: c.id, bucket: agingBucket(t.awaitingSince!) })),
  );
  res.json({ data, awaiting });
});

commissionsRouter.get('/commissions/:id', async (req, res) => {
  const row = await prisma.commission.findFirst({
    where: { ...commissionWhere(req), id: req.params.id },
    include: { tranches: { include: { voucher: true } } },
  });
  if (!row) throw notFoundError();
  const [ctx] = await withContext([row]);
  const snap = row.splitSnapshot as unknown as SplitSnapshot;
  const people = await prisma.user.findMany({
    where: { id: { in: snap.people.map((p) => p.userId) } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const transmittalDocs = await prisma.document.findMany({
    where: {
      firmId: row.firmId,
      ownerType: 'TRANSMITTAL',
      ownerId: { in: row.tranches.map((t) => t.id) },
    },
    select: {
      id: true,
      ownerId: true,
      aiStatus: true,
      flags: true,
      extracted: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    ...ctx,
    people: snap.people.map((s) => ({ ...s, user: people.find((u) => u.id === s.userId) ?? null })),
    transmittals: transmittalDocs,
    me: req.user!.id,
  });
});

async function findTranche(req: Express.Request, id: string) {
  const { firmId } = firmScope(req.user!);
  const t = await prisma.commissionTranche.findFirst({
    where: { id, firmId },
    include: { commission: true, voucher: true },
  });
  if (!t) throw notFoundError();
  return t;
}

// ───────────── Transmittals (CompanyAdmin, §5.2) ─────────────

commissionsRouter.post(
  '/tranches/:id/transmittal',
  requireRole('COMPANY_ADMIN'),
  singleFile('file'),
  async (req, res) => {
    const file = requireDocumentFile(req.file);
    const t = await findTranche(req, String(req.params.id));
    if (t.status !== 'AWAITING_TRANSMITTAL') {
      throw new HttpError(409, 'WRONG_STATUS', 'This tranche is not waiting for a transmittal.');
    }
    const storageKey = objectKey(t.firmId, 'transmittals', t.id, file.mime);
    await putObject(storageKey, file.buffer, file.mime);
    const doc = await prisma.$transaction(async (tx) => {
      const d = await tx.document.create({
        data: {
          firmId: t.firmId,
          ownerType: 'TRANSMITTAL',
          ownerId: t.id,
          declaredType: 'TRANSMITTAL',
          storageKey,
          mimeType: file.mime,
          sizeBytes: file.size,
          sha256: file.sha256,
          uploadedById: req.user!.id,
        },
      });
      await tx.commissionTranche.update({
        where: { id: t.id },
        data: { transmittalDocumentId: d.id },
      });
      await audit(
        req,
        {
          action: 'TRANSMITTAL_UPLOADED',
          entityType: 'CommissionTranche',
          entityId: t.id,
          after: { documentId: d.id },
        },
        tx,
      );
      return d;
    });
    queueDocument(doc.id);
    res.status(201).json({ documentId: doc.id });
  },
);

const confirmTransmittalBody = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  note: z.string().trim().max(500).optional(),
});

/** Admin confirms the transmittal's amount (AI pre-checked); then the tranche can be vouchered. */
commissionsRouter.post(
  '/tranches/:id/transmittal/confirm',
  requireRole('COMPANY_ADMIN'),
  async (req, res) => {
    const body = confirmTransmittalBody.parse(req.body);
    const t = await findTranche(req, String(req.params.id));
    if (t.status !== 'AWAITING_TRANSMITTAL' || !t.transmittalDocumentId) {
      throw new HttpError(409, 'WRONG_STATUS', 'Upload the transmittal first.');
    }
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: t.transmittalDocumentId } });
    if (doc.aiStatus === 'QUEUED' || doc.aiStatus === 'PROCESSING') {
      throw new HttpError(409, 'STILL_READING', 'Wait a moment while the transmittal is read.');
    }
    const diff = Math.abs(toCents(body.amount) - toCents(t.amount.toString()));
    if (diff > 100 && !body.note) {
      throw new HttpError(
        400,
        'NOTE_REQUIRED',
        'The transmittal amount differs from the tranche by more than ₱1. Explain why to continue.',
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.commissionTranche.update({
        where: { id: t.id },
        data: { transmittalAmount: body.amount },
      });
      await audit(
        req,
        {
          action: 'TRANSMITTAL_CONFIRMED',
          entityType: 'CommissionTranche',
          entityId: t.id,
          after: {
            amount: body.amount,
            trancheAmount: Number(t.amount),
            flags: ((doc.flags ?? []) as DocFlag[]).map((f) => f.code),
            ...(body.note ? { note: body.note } : {}),
          },
        },
        tx,
      );
    });
    await evaluateClient(t.commission.clientId, req);
    res.json({ confirmed: true });
  },
);

// ───────────── Vouchers (§10.5) ─────────────

type Line = {
  userId: string;
  role: string;
  name: string;
  pct: number;
  grossShare: number;
  deductions: { label: string; amount: number }[];
  net: number;
};

/** Keys sorted at every level: Postgres jsonb reorders object keys, so insertion order can't be trusted. */
const sortKeys = (x: unknown): unknown =>
  Array.isArray(x)
    ? x.map(sortKeys)
    : x && typeof x === 'object'
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, sortKeys((x as Record<string, unknown>)[k])]),
        )
      : x;

const canonical = (v: { voucherNo: string; trancheId: string; totalNet: number; lines: Line[] }) =>
  JSON.stringify(
    sortKeys({
      voucherNo: v.voucherNo,
      trancheId: v.trancheId,
      totalNet: v.totalNet,
      lines: v.lines,
    }),
  );
const hashOf = (v: Parameters<typeof canonical>[0]) =>
  createHash('sha256').update(canonical(v)).digest('hex');

/** Voucher lines: each payee's share, the firm's withholding % (OPEN-6), extra deductions. */
async function buildLines(
  trancheAmount: string,
  snap: SplitSnapshot,
  withholdingPct: number,
  extra: { userId: string; label: string; amount: number }[],
): Promise<{ lines: Line[]; totalNet: number }> {
  const users = await prisma.user.findMany({
    where: { id: { in: snap.people.map((p) => p.userId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const shares = sharesCents(toCents(trancheAmount), snap.people);
  const lines = snap.people.map((p, i) => {
    const gross = shares[i]!;
    const deductions: { label: string; amount: number }[] = [];
    if (withholdingPct > 0) {
      deductions.push({
        label: `Withholding tax (${withholdingPct}%)`,
        amount: toPesos(Math.round((gross * withholdingPct) / 100)),
      });
    }
    for (const d of extra.filter((e) => e.userId === p.userId))
      deductions.push({ label: d.label, amount: d.amount });
    const net = gross - deductions.reduce((s, d) => s + toCents(d.amount), 0);
    if (net < 0) throw new HttpError(400, 'NEGATIVE_NET', 'Deductions are larger than the share.');
    const u = users.find((x) => x.id === p.userId);
    return {
      userId: p.userId,
      role: p.role,
      name: u ? `${u.firstName} ${u.lastName}` : 'Unknown',
      pct: p.pct,
      grossShare: toPesos(gross),
      deductions,
      net: toPesos(net),
    };
  });
  return { lines, totalNet: toPesos(lines.reduce((s, l) => s + toCents(l.net), 0)) };
}

const deductionsBody = z.object({
  deductions: z
    .array(
      z.object({
        userId: z.string(),
        label: z.string().trim().min(2).max(80),
        amount: z.coerce.number().min(0),
      }),
    )
    .max(30)
    .default([]),
});

/** The broker prepares the voucher for a tranche ready for release. */
commissionsRouter.post('/tranches/:id/voucher', requireRole('BROKER'), async (req, res) => {
  const { deductions } = deductionsBody.parse(req.body ?? {});
  const t = await findTranche(req, String(req.params.id));
  if (t.status !== 'READY_FOR_RELEASE')
    throw new HttpError(409, 'NOT_READY', 'This tranche is not ready for release.');
  if (t.voucher)
    throw new HttpError(409, 'ALREADY_VOUCHERED', 'This tranche already has a voucher.');
  const firm = await prisma.firm.findUniqueOrThrow({ where: { id: t.firmId } });
  const snap = t.commission.splitSnapshot as unknown as SplitSnapshot;
  const { lines, totalNet } = await buildLines(
    t.amount.toString(),
    snap,
    Number(firm.withholdingPct),
    deductions,
  );

  const voucher = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const count = await tx.commissionVoucher.count({
      where: {
        firmId: t.firmId,
        voucherNo: { startsWith: `${firm.slug.slice(0, 3).toUpperCase()}-${year}-` },
      },
    });
    const voucherNo = `${firm.slug.slice(0, 3).toUpperCase()}-${year}-${String(count + 1).padStart(4, '0')}`;
    const v = await tx.commissionVoucher.create({
      data: {
        firmId: t.firmId,
        trancheId: t.id,
        voucherNo,
        lines: lines as unknown as Prisma.InputJsonValue,
        totalNet,
        contentHash: hashOf({ voucherNo, trancheId: t.id, totalNet, lines }),
      },
    });
    await audit(
      req,
      {
        action: 'VOUCHER_CREATED',
        entityType: 'CommissionVoucher',
        entityId: v.id,
        after: { voucherNo, trancheId: t.id, totalNet },
      },
      tx,
    );
    return v;
  });
  res.status(201).json(voucher);
});

async function findVoucher(req: Express.Request, id: string) {
  const { firmId } = firmScope(req.user!);
  const v = await prisma.commissionVoucher.findFirst({
    where: { id, firmId },
    include: { tranche: { include: { commission: true } } },
  });
  if (!v) throw notFoundError();
  const lines = v.lines as unknown as Line[];
  if (!seesAll(req.user!.role) && !lines.some((l) => l.userId === req.user!.id))
    throw notFoundError();
  return { v, lines };
}

commissionsRouter.get('/vouchers/:id', async (req, res) => {
  const { v, lines } = await findVoucher(req, req.params.id);
  const intact =
    hashOf({
      voucherNo: v.voucherNo,
      trancheId: v.trancheId,
      totalNet: Number(v.totalNet),
      lines,
    }) === v.contentHash;
  res.json({ ...v, lines, intact });
});

/** Changing deductions re-issues the content hash and clears every signature (§10.5). */
commissionsRouter.patch('/vouchers/:id', requireRole('BROKER'), async (req, res) => {
  const { deductions } = deductionsBody.parse(req.body);
  const { v } = await findVoucher(req, String(req.params.id));
  if (v.releasedAt) throw new HttpError(409, 'RELEASED', 'A released voucher cannot change.');
  const firm = await prisma.firm.findUniqueOrThrow({ where: { id: v.firmId } });
  const snap = v.tranche.commission.splitSnapshot as unknown as SplitSnapshot;
  const { lines, totalNet } = await buildLines(
    v.tranche.amount.toString(),
    snap,
    Number(firm.withholdingPct),
    deductions,
  );
  await prisma.$transaction(async (tx) => {
    await tx.commissionVoucher.update({
      where: { id: v.id },
      data: {
        lines: lines as unknown as Prisma.InputJsonValue,
        totalNet,
        contentHash: hashOf({ voucherNo: v.voucherNo, trancheId: v.trancheId, totalNet, lines }),
        brokerSignedAt: null,
        brokerSignature: Prisma.DbNull,
        consultantSignatures: Prisma.DbNull,
      },
    });
    await audit(
      req,
      {
        action: 'VOUCHER_EDITED',
        entityType: 'CommissionVoucher',
        entityId: v.id,
        before: { totalNet: Number(v.totalNet) },
        after: { totalNet, signaturesCleared: true },
      },
      tx,
    );
  });
  res.json({ totalNet });
});

const signBody = z.object({
  typedName: z.string().trim().min(3).max(120),
});

type Signature = {
  userId: string;
  typedName: string;
  ip: string | null;
  userAgent: string | null;
  hash: string;
  signedAt: string;
};

/**
 * Simple electronic signature (§10.5): signed-in user + typed full name, with time, IP, user
 * agent and the voucher's content hash. Broker first, then each payee consultant. All signed →
 * the tranche is RELEASED (paid outside the system, rule 2).
 */
commissionsRouter.post('/vouchers/:id/sign', async (req, res) => {
  const { typedName } = signBody.parse(req.body);
  const { v, lines } = await findVoucher(req, req.params.id);
  const user = req.user!;
  if (v.releasedAt) throw new HttpError(409, 'RELEASED', 'This voucher is already fully signed.');
  const expectedHash = hashOf({
    voucherNo: v.voucherNo,
    trancheId: v.trancheId,
    totalNet: Number(v.totalNet),
    lines,
  });
  if (expectedHash !== v.contentHash) {
    throw new HttpError(
      409,
      'TAMPERED',
      'This voucher changed after it was issued. Ask the broker to re-issue it.',
    );
  }
  const fullName = `${user.firstName} ${user.lastName}`;
  if (typedName.toLowerCase().replace(/\s+/g, ' ') !== fullName.toLowerCase()) {
    throw new HttpError(
      400,
      'NAME_MISMATCH',
      `Type your full name exactly as "${fullName}" to sign.`,
    );
  }
  const sig: Signature = {
    userId: user.id,
    typedName,
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    hash: v.contentHash,
    signedAt: new Date().toISOString(),
  };
  const payees = lines.filter((l) => l.role !== 'BROKER').map((l) => l.userId);
  const consultantSigs = ((v.consultantSignatures ?? []) as unknown as Signature[]).filter(
    (s) => s.hash === v.contentHash,
  );

  let released = false;
  await prisma.$transaction(async (tx) => {
    if (user.role === 'BROKER') {
      if (v.brokerSignedAt)
        throw new HttpError(409, 'ALREADY_SIGNED', 'You already signed this voucher.');
      await tx.commissionVoucher.update({
        where: { id: v.id },
        data: {
          brokerSignedAt: new Date(),
          brokerSignature: sig as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      if (!payees.includes(user.id))
        throw new HttpError(403, 'FORBIDDEN', 'Only the payees on this voucher sign it.');
      if (!v.brokerSignedAt) throw new HttpError(409, 'BROKER_FIRST', 'The broker signs first.');
      if (consultantSigs.some((s) => s.userId === user.id))
        throw new HttpError(409, 'ALREADY_SIGNED', 'You already signed this voucher.');
      const all = [...consultantSigs, sig];
      released = payees.every((p) => all.some((s) => s.userId === p));
      await tx.commissionVoucher.update({
        where: { id: v.id },
        data: {
          consultantSignatures: all as unknown as Prisma.InputJsonValue,
          ...(released ? { releasedAt: new Date() } : {}),
        },
      });
      if (released) {
        await tx.commissionTranche.update({
          where: { id: v.trancheId },
          data: { status: 'RELEASED' },
        });
      }
    }
    await audit(
      req,
      {
        action: 'VOUCHER_SIGNED',
        entityType: 'CommissionVoucher',
        entityId: v.id,
        after: { role: user.role, hash: v.contentHash },
      },
      tx,
    );
    if (released) {
      await audit(
        req,
        {
          action: 'TRANCHE_RELEASED',
          entityType: 'CommissionTranche',
          entityId: v.trancheId,
          before: { status: 'READY_FOR_RELEASE' },
          after: { status: 'RELEASED', voucherNo: v.voucherNo },
        },
        tx,
      );
    }
  });
  res.json({ signed: true, released });
});
