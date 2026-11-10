import type { Prisma } from '@prisma/client';
import { buildChecklist, RULES, type ChecklistInput } from './requirements.rules';

type Tx = Prisma.TransactionClient;
const key = (i: { code: string; appliesTo: string }) => `${i.code}|${i.appliesTo}`;

/**
 * Creates or regenerates a client's checklist (SPEC §9): new items are added, items no longer
 * needed are removed if nothing was uploaded, and kept-but-optional if something was (the
 * work isn't thrown away). Returns what changed, for the audit log.
 */
export async function syncChecklist(
  tx: Tx,
  client: { id: string; firmId: string },
  input: ChecklistInput,
) {
  const wanted = buildChecklist(input);
  const existing = await tx.requirementItem.findMany({ where: { clientId: client.id } });
  const have = new Map(existing.map((e) => [key(e), e]));
  const want = new Set(wanted.map(key));

  const added: string[] = [];
  const removed: string[] = [];
  for (const w of wanted) {
    const e = have.get(key(w));
    if (!e) {
      await tx.requirementItem.create({
        data: {
          firmId: client.firmId,
          clientId: client.id,
          code: w.code,
          label: w.label,
          appliesTo: w.appliesTo,
          stage: w.stage,
          required: w.required,
        },
      });
      added.push(key(w));
    } else if (e.label !== w.label || e.stage !== w.stage || e.required !== w.required) {
      await tx.requirementItem.update({
        where: { id: e.id },
        data: { label: w.label, stage: w.stage, required: w.required },
      });
    }
  }
  for (const e of existing) {
    if (want.has(key(e))) continue;
    if (e.status === 'MISSING' && !e.documentId) {
      await tx.requirementItem.delete({ where: { id: e.id } });
    } else {
      await tx.requirementItem.update({ where: { id: e.id }, data: { required: false } });
    }
    removed.push(key(e));
  }
  return { added, removed };
}

/** Which document type an item expects (for Module 1's type check). */
export function expectedDocType(code: string, appliesTo: string) {
  return RULES.find((r) => r.code === code && r.appliesTo === appliesTo)?.docType ?? null;
}
