// One-off: add the demo photos to seeded listings in an existing database, without
// re-seeding (which would wipe data you entered yourself).
//   pnpm --filter api db:backfill-photos
// Only touches listings that have no photos and were created by the seed (seeded rows have
// no PROPERTY_CREATED audit entry; units added through the app do).
import { PrismaClient } from '@prisma/client';
import { ensureBucket } from '../src/lib/storage';
import { attachSeedPhotos } from './seedPhotos';

const prisma = new PrismaClient();

async function main() {
  await ensureBucket();
  const createdInApp = await prisma.auditLog.findMany({
    where: { action: 'PROPERTY_CREATED' },
    select: { entityId: true },
  });
  const targets = await prisma.property.findMany({
    where: { photos: { none: {} }, id: { notIn: createdInApp.map((a) => a.entityId) } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, firmId: true, type: true, title: true },
  });
  let photos = 0;
  for (const p of targets) photos += await attachSeedPhotos(prisma, p.firmId, p.id, p.type);
  console.log(`Added ${photos} photos to ${targets.length} seeded listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
