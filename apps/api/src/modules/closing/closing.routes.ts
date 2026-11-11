import type { ClientStatus, ClosingRecord, Prisma } from '@prisma/client';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { consultantScope } from '../leads/scope';
import { issueRatingToken } from '../ratings/tokens';
import {
  CLOSING_CODES,
  allDone,
  applyTicks,
  computeClosing,
  emptyChecklist,
  type ChecklistItem,
  type Computation,
  type Rates,
} from './engine';

/**
 * Closing & transfer (SPEC §11), mounted at /clients. Admin and Broker read every deal; a
 * consultant reads their scope; only the handling consultant edits. Decided 2026-11-11: the
 * first save moves ACTIVE → CLOSING, the last tick moves CLOSING → COMPLETED (OPEN-9) and
 * issues the buyer's one-time rating link (§12). Every tick and status change is audited.
 */
export const closingRouter = Router();
closingRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON'));

async function findClient(req: Express.Request, id: string) {
  const c = await prisma.client.findFirst({ where: { ...(await consultantScope(req.user!)), id } });
  if (!c) throw notFoundError();
  return c;
}

async function firmRates(firmId: string): Promise<Rates> {
  const f = await prisma.firm.findUniqueOrThrow({ where: { id: firmId } });
  return {
    cgtRatePct: Number(f.cgtRatePct),
    dstRatePct: Number(f.dstRatePct),
    transferTaxRatePct: Number(f.transferTaxRatePct),
  };
}

async function view(
  req: Express.Request,
  client: { id: string; status: string; consultantId: string; tcp: Prisma.Decimal; firmId: string },
  record: ClosingRecord | null,
) {
  const computation =
    (record?.computation as unknown as Computation | undefined) ??
    computeClosing({ sellingPrice: Number(client.tcp), rates: await firmRates(client.firmId) });
  const checklist =
    (record?.checklist as unknown as ChecklistItem[] | undefined) ?? emptyChecklist();
  const [people, token, rating] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: checklist.map((i) => i.doneById).filter((x): x is string => !!x) } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.ratingToken.findUnique({ where: { clientId: client.id } }),
    prisma.rating.findUnique({ where: { clientId: client.id } }),
  ]);
  const isHandler = client.consultantId === req.user!.id;
  return {
    clientStatus: client.status,
    saved: !!record,
    computation,
    checklist: checklist.map((i) => {
      const p = people.find((u) => u.id === i.doneById);
      return { ...i, doneBy: p ? `${p.firstName} ${p.lastName}` : null };
    }),
    canEdit: isHandler && (client.status === 'ACTIVE' || client.status === 'CLOSING'),
    // Who may (re)issue the buyer's rating link: the handler or the CompanyAdmin (§12).
    canIssueLink: isHandler || req.user!.role === 'COMPANY_ADMIN',
    ratingLink: token ? { expiresAt: token.expiresAt, usedAt: token.usedAt } : null,
    rating: rating ? { stars: rating.stars, createdAt: rating.createdAt } : null,
  };
}

closingRouter.get('/:id/closing', async (req, res) => {
  const c = await findClient(req, req.params.id);
  const record = await prisma.closingRecord.findUnique({ where: { clientId: c.id } });
  res.json(await view(req, c, record));
});

const money = z.coerce.number().min(0).max(10_000_000_000);
const putBody = z.object({
  sellingPrice: money.positive('Enter the selling price.').optional(),
  taxBase: money.nullable().optional(), // override: zonal value or FMV if higher
  registrationFee: money.nullable().optional(),
  items: z
    .array(z.object({ code: z.enum(CLOSING_CODES), done: z.boolean() }))
    .max(CLOSING_CODES.length)
    .optional(),
});

closingRouter.put('/:id/closing', async (req, res) => {
  const body = putBody.parse(req.body);
  const c = await findClient(req, req.params.id);
  if (c.consultantId !== req.user!.id) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the consultant handling this buyer can do this.');
  }
  if (c.status === 'COMPLETED')
    throw new HttpError(409, 'COMPLETED', 'This sale is complete; its closing record is final.');
  if (c.status === 'CANCELLED') throw new HttpError(409, 'CANCELLED', 'This sale was cancelled.');

  let ratingToken: string | null = null;
  const record = await prisma.$transaction(async (tx) => {
    const existing = await tx.closingRecord.findUnique({ where: { clientId: c.id } });
    const before = existing?.computation as unknown as Computation | undefined;
    const figures =
      body.sellingPrice !== undefined || 'taxBase' in body || 'registrationFee' in body;
    // Rates are snapshotted on each recompute, so later Settings changes don't alter a saved deal.
    const computation =
      figures || !before
        ? computeClosing({
            sellingPrice: body.sellingPrice ?? before?.sellingPrice ?? Number(c.tcp),
            taxBase:
              'taxBase' in body ? body.taxBase : before?.taxBaseOverride ? before.taxBase : null,
            registrationFee:
              'registrationFee' in body ? body.registrationFee : (before?.registrationFee ?? null),
            rates: await firmRates(c.firmId),
          })
        : before;
    const { checklist, changed } = applyTicks(
      (existing?.checklist as unknown as ChecklistItem[] | undefined) ?? emptyChecklist(),
      body.items ?? [],
      req.user!.id,
    );

    const saved = await tx.closingRecord.upsert({
      where: { clientId: c.id },
      create: {
        firmId: c.firmId,
        clientId: c.id,
        sellingPrice: computation.sellingPrice,
        computation: computation as unknown as Prisma.InputJsonValue,
        checklist: checklist as unknown as Prisma.InputJsonValue,
      },
      update: {
        sellingPrice: computation.sellingPrice,
        computation: computation as unknown as Prisma.InputJsonValue,
        checklist: checklist as unknown as Prisma.InputJsonValue,
      },
    });

    if (figures) {
      await audit(
        req,
        {
          action: 'CLOSING_ESTIMATE_SAVED',
          entityType: 'Client',
          entityId: c.id,
          before: before ? { taxBase: before.taxBase, totals: before.totals } : undefined,
          after: { taxBase: computation.taxBase, totals: computation.totals },
        },
        tx,
      );
    }
    for (const ch of changed) {
      await audit(
        req,
        {
          action: ch.done ? 'CLOSING_ITEM_DONE' : 'CLOSING_ITEM_UNDONE',
          entityType: 'Client',
          entityId: c.id,
          after: { code: ch.code },
        },
        tx,
      );
    }

    // ACTIVE → CLOSING on the first save; the last tick → COMPLETED + rating link.
    let status: ClientStatus = c.status;
    const next: ClientStatus = allDone(checklist)
      ? 'COMPLETED'
      : status === 'ACTIVE'
        ? 'CLOSING'
        : status;
    if (next !== status) {
      if (status === 'ACTIVE' && next === 'COMPLETED') {
        await setStatus(tx, req, c.id, 'ACTIVE', 'CLOSING');
        status = 'CLOSING';
      }
      await setStatus(tx, req, c.id, status, next);
      if (next === 'COMPLETED') ratingToken = await issueRatingToken(tx, req, c);
    }
    return saved;
  });

  const fresh = await prisma.client.findUniqueOrThrow({ where: { id: c.id } });
  res.json({ ...(await view(req, fresh, record)), ratingToken });
});

async function setStatus(
  tx: Prisma.TransactionClient,
  req: Request,
  clientId: string,
  from: ClientStatus,
  to: ClientStatus,
) {
  await tx.client.update({ where: { id: clientId }, data: { status: to } });
  await audit(
    req,
    {
      action: 'CLIENT_STATUS_CHANGED',
      entityType: 'Client',
      entityId: clientId,
      before: { status: from },
      after: { status: to },
    },
    tx,
  );
}

/**
 * Re-issues the buyer's rating link (the token is stored hashed, so a lost link can't be shown
 * again). The old link stops working. Not possible once the buyer has rated.
 */
closingRouter.post('/:id/rating-link', async (req, res) => {
  const c = await findClient(req, String(req.params.id));
  if (c.consultantId !== req.user!.id && req.user!.role !== 'COMPANY_ADMIN') {
    throw new HttpError(403, 'FORBIDDEN', 'Only the handling consultant or the admin can do this.');
  }
  if (c.status !== 'COMPLETED')
    throw new HttpError(409, 'NOT_COMPLETED', 'The rating link opens once the sale is complete.');
  const rated = await prisma.rating.findUnique({ where: { clientId: c.id } });
  if (rated) throw new HttpError(409, 'ALREADY_RATED', 'This buyer has already left a rating.');
  const token = await prisma.$transaction((tx) => issueRatingToken(tx, req, c));
  res.status(201).json({ ratingToken: token });
});
