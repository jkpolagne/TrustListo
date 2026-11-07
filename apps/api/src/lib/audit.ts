import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from './prisma';

/**
 * Writes one audit row (SPEC §2 rule 11). Call it for every approval, rejection,
 * signature and status change. Never put passwords, hashes or document contents in before/after.
 */
export async function audit(
  req: Request | null,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    firmId?: string | null;
    actorId?: string | null;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      firmId: entry.firmId ?? req?.user?.firmId ?? null,
      actorId: entry.actorId ?? req?.user?.id ?? null,
      before: entry.before,
      after: entry.after,
      ip: req?.ip ?? null,
    },
  });
}
