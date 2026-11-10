import type { BadgeType, Document, Prisma } from '@prisma/client';
import { isNone, taxCurrent, taxPeriodEnd } from '../docai/checks';
import { bestOwnerMatch } from '../docai/names';
import type { Extracted } from '../docai/types';

/**
 * Listing badges (SPEC §8.7), granted only from documents a broker APPROVED.
 * Recomputed from scratch after every decision, so a later rejection or correction also
 * takes a badge away. Expired badges stay in the table and are hidden on read (validBadges).
 */

type Tx = Prisma.TransactionClient;
const LISTING_BADGES: BadgeType[] = ['OWNERSHIP_VERIFIED', 'TITLE_CLEAN', 'TAX_CURRENT'];
const ID_TYPES = ['SELLER_ID', 'VALID_ID', 'PASSPORT'] as const;

const val = (d: Document | undefined, key: string) =>
  ((d?.extracted ?? {}) as Extracted)[key]?.value ?? null;

/** The property a listing document belongs to (none yet while the seller request is open). */
export async function listingPropertyId(tx: Tx, doc: Document): Promise<string | null> {
  if (doc.ownerType === 'PROPERTY') return doc.ownerId;
  if (doc.ownerType !== 'SELLER_REQUEST') return null;
  const p = await tx.property.findFirst({
    where: { sellerRequestId: doc.ownerId, firmId: doc.firmId },
    select: { id: true },
  });
  return p?.id ?? null;
}

export async function refreshListingBadges(
  tx: Tx,
  doc: Document,
  brokerId: string,
  now = new Date(),
): Promise<BadgeType[]> {
  const propertyId = await listingPropertyId(tx, doc);
  if (!propertyId) return [];

  const approved = await tx.document.findMany({
    where: {
      firmId: doc.firmId,
      ownerType: doc.ownerType,
      ownerId: doc.ownerId,
      reviewStatus: 'APPROVED',
    },
    orderBy: { reviewedAt: 'desc' }, // newest decision wins
  });
  const latest = (types: readonly string[]) =>
    approved.find((d) => d.declaredType && types.includes(d.declaredType));
  const title = latest(['LAND_TITLE']);
  const id = latest(ID_TYPES);
  const rpt = latest(['RPT_RECEIPT']);

  const earned = new Map<BadgeType, Date | null>();
  if (title && id) {
    const owner = val(title, 'ownerName');
    const name = val(id, 'fullName');
    if (owner && name && bestOwnerMatch(name, owner).verdict === 'MATCH') {
      earned.set('OWNERSHIP_VERIFIED', null);
    }
  }
  if (title && isNone(val(title, 'encumbrances') ?? '')) earned.set('TITLE_CLEAN', null);
  if (rpt) {
    const year = Number(val(rpt, 'yearCovered'));
    const quarter = Number(val(rpt, 'quarterCovered') ?? 4);
    if (year && taxCurrent(year, quarter, now)) {
      earned.set('TAX_CURRENT', taxPeriodEnd(val(rpt, 'yearCovered'), val(rpt, 'quarterCovered')));
    }
  }

  await tx.propertyBadge.deleteMany({
    where: { propertyId, type: { in: LISTING_BADGES.filter((b) => !earned.has(b)) } },
  });
  for (const [type, validUntil] of earned) {
    await tx.propertyBadge.upsert({
      where: { propertyId_type: { propertyId, type } },
      create: { propertyId, type, grantedById: brokerId, validUntil },
      update: { validUntil },
    });
  }
  return [...earned.keys()];
}

/** A broker-approved License to Sell verifies every unit of its project until it expires. */
export async function grantLtsBadges(
  tx: Tx,
  projectId: string,
  brokerId: string,
  validUntil: Date,
): Promise<number> {
  const units = await tx.property.findMany({ where: { projectId }, select: { id: true } });
  for (const u of units) {
    await tx.propertyBadge.upsert({
      where: { propertyId_type: { propertyId: u.id, type: 'LTS_VERIFIED' } },
      create: { propertyId: u.id, type: 'LTS_VERIFIED', grantedById: brokerId, validUntil },
      update: { validUntil, grantedById: brokerId },
    });
  }
  return units.length;
}
