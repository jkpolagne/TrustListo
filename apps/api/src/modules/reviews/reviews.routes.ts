import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import type { DocFlag } from '../docai/types';

/** Broker review queue and decisions (SPEC §8.6, §13 reviews). Only BROKER can approve (rule 1). */
export const reviewsRouter = Router();
reviewsRouter.use(requireRole('BROKER'));

const REVIEWABLE = ['READY_FOR_REVIEW', 'NEEDS_ATTENTION'] as const;

const credentialDetail = {
  id: true,
  type: true,
  status: true,
  numberEntered: true,
  expiresAt: true,
  rejectReason: true,
  reviewedAt: true,
  createdAt: true,
  user: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
  document: {
    select: {
      id: true,
      mimeType: true,
      aiStatus: true,
      flags: true,
      ocrText: true,
      extracted: true,
    },
  },
} as const;

reviewsRouter.get('/queue', async (req, res) => {
  const { firmId } = firmScope(req.user!);
  const credentials = await prisma.credential.findMany({
    where: { firmId, status: { in: [...REVIEWABLE, 'PENDING_AI'] } },
    select: credentialDetail,
    orderBy: { createdAt: 'asc' }, // oldest first
  });
  res.json({ credentials });
});

async function findCredential(firmId: string, id: string) {
  const cred = await prisma.credential.findFirst({
    where: { id, firmId },
    select: credentialDetail,
  });
  if (!cred) throw notFoundError();
  return cred;
}

reviewsRouter.get('/credentials/:id', async (req, res) => {
  res.json(await findCredential(firmScope(req.user!).firmId, req.params.id));
});

function assertReviewable(status: string) {
  if (!(REVIEWABLE as readonly string[]).includes(status)) {
    throw new HttpError(
      409,
      'NOT_REVIEWABLE',
      status === 'PENDING_AI'
        ? 'This document is still being checked. Try again in a moment.'
        : 'This credential was already decided.',
    );
  }
}

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const approveBody = z.object({
  // The broker confirms the expiry date printed on the document.
  expiresAt: z.coerce.date(),
  // The broker may correct the number the admin typed; the change is audited.
  numberEntered: z.string().trim().min(3).max(40).optional(),
  overrideNote: z.string().trim().max(500).optional(),
});

reviewsRouter.post('/credentials/:id/approve', async (req, res) => {
  const body = approveBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const cred = await findCredential(firmId, req.params.id);
  assertReviewable(cred.status);

  if (body.expiresAt < today()) {
    throw new HttpError(
      400,
      'EXPIRED',
      'This credential has expired. Reject it and ask for a current one.',
    );
  }
  const flags = (cred.document?.flags ?? []) as DocFlag[];
  if (flags.some((f) => f.severity === 'BLOCKER') && !body.overrideNote) {
    throw new HttpError(
      400,
      'OVERRIDE_NOTE_REQUIRED',
      'Explain why you are approving despite the blocking issue.',
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.credential.update({
      where: { id: cred.id },
      data: {
        status: 'APPROVED',
        expiresAt: body.expiresAt,
        numberEntered: body.numberEntered ?? cred.numberEntered,
        reviewedById: req.user!.id,
        reviewedAt: now,
        rejectReason: null,
      },
    });
    if (cred.document) {
      await tx.document.update({
        where: { id: cred.document.id },
        data: {
          reviewStatus: 'APPROVED',
          reviewedById: req.user!.id,
          reviewedAt: now,
          reviewNote: body.overrideNote,
        },
      });
    }
    await audit(
      req,
      {
        action: 'CREDENTIAL_APPROVED',
        entityType: 'Credential',
        entityId: cred.id,
        before: {
          status: cred.status,
          numberEntered: cred.numberEntered,
          expiresAt: cred.expiresAt?.toISOString() ?? null,
        },
        after: {
          status: 'APPROVED',
          numberEntered: body.numberEntered ?? cred.numberEntered,
          expiresAt: body.expiresAt.toISOString(),
          ...(body.overrideNote ? { overrideNote: body.overrideNote } : {}),
        },
      },
      tx,
    );
  });
  res.json(await findCredential(firmId, cred.id));
});

const rejectBody = z.object({
  reason: z.string().trim().min(5, 'Give the reason so the admin knows what to fix.').max(500),
});

reviewsRouter.post('/credentials/:id/reject', async (req, res) => {
  const { reason } = rejectBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const cred = await findCredential(firmId, req.params.id);
  assertReviewable(cred.status);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.credential.update({
      where: { id: cred.id },
      data: {
        status: 'REJECTED',
        rejectReason: reason,
        reviewedById: req.user!.id,
        reviewedAt: now,
      },
    });
    if (cred.document) {
      await tx.document.update({
        where: { id: cred.document.id },
        data: {
          reviewStatus: 'REJECTED',
          reviewedById: req.user!.id,
          reviewedAt: now,
          reviewNote: reason,
        },
      });
    }
    await audit(
      req,
      {
        action: 'CREDENTIAL_REJECTED',
        entityType: 'Credential',
        entityId: cred.id,
        before: { status: cred.status },
        after: { status: 'REJECTED', reason },
      },
      tx,
    );
  });
  res.json(await findCredential(firmId, cred.id));
});
