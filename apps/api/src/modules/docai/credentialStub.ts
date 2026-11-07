import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { enqueue } from './queue';
import { suggestFrom, type AiSuggestion, type DocFlag } from './types';

/**
 * M2 stand-in for the real pipeline (OCR arrives in M4). It doesn't read the image yet;
 * it only runs checks that need no OCR, then hands the credential to the broker.
 */
export function queueCredentialCheck(credentialId: string): void {
  enqueue(async () => {
    await checkCredential(credentialId);
  });
}

export async function checkCredential(credentialId: string): Promise<AiSuggestion> {
  const cred = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    include: { document: true },
  });
  const doc = cred.document;
  const flags: DocFlag[] = [];

  if (doc) {
    const dup = await prisma.document.findFirst({
      where: { firmId: doc.firmId, sha256: doc.sha256, id: { not: doc.id } },
      select: { id: true },
    });
    if (dup) {
      flags.push({
        code: 'DUPLICATE_FILE',
        severity: 'WARNING',
        message: 'This exact file was already uploaded for another record.',
      });
    }
  }

  const suggestion = suggestFrom(flags);
  await prisma.$transaction([
    ...(doc
      ? [
          prisma.document.update({
            where: { id: doc.id },
            data: {
              aiStatus: 'DONE',
              detectedType: doc.declaredType,
              flags: flags as unknown as Prisma.InputJsonValue,
              reviewStatus: suggestion,
            },
          }),
        ]
      : []),
    prisma.credential.update({ where: { id: cred.id }, data: { status: suggestion } }),
  ]);
  return suggestion;
}
