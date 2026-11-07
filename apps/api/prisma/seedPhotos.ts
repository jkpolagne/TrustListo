// Openly licensed demo photos (see prisma/seed-photos/CREDITS.md). Illustrative only.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrismaClient, PropertyType } from '@prisma/client';
import { objectKey, putObject } from '../src/lib/storage';

const PHOTO_DIR = resolve(import.meta.dirname, 'seed-photos');

const PHOTO_POOL: Partial<Record<PropertyType, string[]>> = {
  HOUSE_AND_LOT: ['house-bungalow', 'house-duplex', 'house-two-storey-a', 'house-two-storey-b'],
  TOWNHOUSE: ['townhouse-row'],
  CONDO: ['condo-tower', 'condo-midrise'],
  LOT: ['lot-graded'],
};
const turns: Partial<Record<PropertyType, number>> = {};

/**
 * Gives a listing a cover photo, rotating through the pool for its type, plus a second photo
 * when the pool has more than one.
 */
export async function attachSeedPhotos(
  prisma: PrismaClient,
  firmId: string,
  propertyId: string,
  type: PropertyType,
): Promise<number> {
  const pool = PHOTO_POOL[type];
  if (!pool?.length) return 0;
  const turn = (turns[type] = (turns[type] ?? -1) + 1);
  const names =
    pool.length > 1
      ? [pool[turn % pool.length]!, pool[(turn + 1) % pool.length]!]
      : [pool[0]!];
  for (const [sort, name] of names.entries()) {
    const key = objectKey(firmId, 'properties', propertyId, 'image/webp');
    await putObject(key, readFileSync(resolve(PHOTO_DIR, `${name}.webp`)), 'image/webp');
    await prisma.propertyPhoto.create({ data: { propertyId, key, sort } });
  }
  return names.length;
}
