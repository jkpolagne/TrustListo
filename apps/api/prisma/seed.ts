// Demo seed (SPEC §17). Fictional people only. M0 scope: firms, users + hierarchy,
// credentials, developers/projects/units, loan quotations, split-config placeholders.
// Later milestones add seller listings, inquiries, clients, visits, commission templates.
import { PrismaClient, type CredentialType, type ReviewStatus, type Role } from '@prisma/client';
import { createHash } from 'node:crypto';
import argon2 from 'argon2';
import sharp from 'sharp';
import { ensureBucket, objectKey, putObject } from '../src/lib/storage';
import { attachSeedPhotos } from './seedPhotos';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV=production');
  process.exit(1);
}

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

async function wipe() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

let passwordHash = '';

type UserInput = {
  firmId: string | null;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  managerId?: string;
  brokerId?: string;
  referralCode?: string;
};

function createUser(u: UserInput) {
  return prisma.user.create({ data: { ...u, passwordHash } });
}

const esc = (s: string) =>
  s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/**
 * A mock credential image, obviously fake (SPEC §17: never real IDs). Rendered from SVG so
 * the broker review screen has something to show.
 */
async function mockCredentialImage(
  type: CredentialType,
  holder: string,
  number: string,
  expiresAt: Date | null,
): Promise<Buffer> {
  const title = type === 'PRC_LICENSE' ? 'Real Estate Broker License' : 'Salesperson Registration';
  const exp = expiresAt ? expiresAt.toISOString().slice(0, 10) : 'not shown';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760">
    <rect width="1200" height="760" fill="#f4f4f2"/>
    <rect x="30" y="30" width="1140" height="700" fill="none" stroke="#333" stroke-width="4"/>
    <text x="80" y="130" font-family="Arial" font-size="44" font-weight="bold">${esc(title)}</text>
    <text x="80" y="180" font-family="Arial" font-size="26" fill="#555">TrustListo demo data</text>
    <text x="80" y="300" font-family="Arial" font-size="30">Name: ${esc(holder)}</text>
    <text x="80" y="360" font-family="Arial" font-size="30">No.: ${esc(number)}</text>
    <text x="80" y="420" font-family="Arial" font-size="30">Valid until: ${exp}</text>
    <text x="600" y="620" font-family="Arial" font-size="84" font-weight="bold" fill="#c00" fill-opacity="0.35"
      text-anchor="middle" transform="rotate(-12 600 600)">SPECIMEN · NOT VALID</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function credential(
  firmId: string,
  userId: string,
  type: CredentialType,
  status: ReviewStatus,
  expiresAt: Date | null,
  number: string,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const png = await mockCredentialImage(
    type,
    `${user.firstName} ${user.lastName}`,
    number,
    expiresAt,
  );
  const storageKey = objectKey(firmId, 'credentials', userId, 'image/png');
  await putObject(storageKey, png, 'image/png');

  const reviewed = status === 'APPROVED' || status === 'REJECTED';
  const broker = reviewed
    ? await prisma.user.findFirst({ where: { firmId, role: 'BROKER' } })
    : null;
  const flags =
    status === 'NEEDS_ATTENTION'
      ? [
          {
            code: 'DUPLICATE_FILE',
            severity: 'WARNING',
            message: 'This exact file was already uploaded for another record.',
          },
        ]
      : [];

  const cred = await prisma.credential.create({
    data: {
      firmId,
      userId,
      type,
      status,
      expiresAt,
      numberEntered: number,
      reviewedAt: reviewed ? new Date() : null,
      reviewedById: broker?.id,
    },
  });
  const doc = await prisma.document.create({
    data: {
      firmId,
      ownerType: 'CREDENTIAL',
      ownerId: cred.id,
      declaredType: type === 'PRC_LICENSE' ? 'PRC_ID' : 'DHSUD_CERT',
      detectedType:
        status === 'PENDING_AI' ? null : type === 'PRC_LICENSE' ? 'PRC_ID' : 'DHSUD_CERT',
      storageKey,
      mimeType: 'image/png',
      sizeBytes: png.length,
      sha256: createHash('sha256').update(png).digest('hex'),
      uploadedById: userId,
      aiStatus: status === 'PENDING_AI' ? 'QUEUED' : 'DONE',
      flags,
      reviewStatus: status,
      reviewedById: broker?.id,
      reviewedAt: reviewed ? new Date() : null,
    },
  });
  await prisma.credential.update({ where: { id: cred.id }, data: { documentId: doc.id } });
}

/** Monthly amortization for a fully amortizing loan. */
function amortization(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return Math.round(((principal * r) / (1 - Math.pow(1 + r, -n))) * 100) / 100;
}

function quotation(price: number, label: string, method: 'PAG_IBIG' | 'BANK' | 'IN_HOUSE') {
  const cfg = {
    PAG_IBIG: { dp: 10, term: 12, rate: 6.25, years: 30 },
    BANK: { dp: 20, term: 18, rate: 7.5, years: 20 },
    IN_HOUSE: { dp: 20, term: 12, rate: 14, years: 5 },
  }[method];
  const reservationFee = 20000;
  const dpTotal = (price * cfg.dp) / 100;
  const loanAmount = price - dpTotal;
  return {
    label,
    paymentMethod: method,
    reservationFee,
    downpaymentPct: cfg.dp,
    dpTermMonths: cfg.term,
    monthlyDp: Math.round(((dpTotal - reservationFee) / cfg.term) * 100) / 100,
    loanAmount,
    interestRatePct: cfg.rate,
    loanTermYears: cfg.years,
    monthlyAmortization: amortization(loanAmount, cfg.rate, cfg.years),
    notes: 'Sample quotation for demo only.',
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function setGeom(table: 'Project' | 'Property', id: string, lat: number, lng: number) {
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
    lng,
    lat,
    id,
  );
}

type UnitInput = {
  title: string;
  type: 'HOUSE_AND_LOT' | 'LOT' | 'CONDO' | 'TOWNHOUSE';
  price: number;
  lot: number;
  floor?: number;
  bed?: number;
  bath?: number;
};

async function developerListing(opts: {
  firmId: string;
  brokerId: string;
  developer: string;
  project: string;
  location: string;
  barangay: string;
  lat: number;
  lng: number;
  ltsNumber: string;
  ltsExpiresAt: Date;
  units: UnitInput[];
}) {
  const dev = await prisma.developer.create({
    data: { firmId: opts.firmId, name: opts.developer },
  });
  const project = await prisma.project.create({
    data: {
      firmId: opts.firmId,
      developerId: dev.id,
      name: opts.project,
      locationText: opts.location,
      ltsNumber: opts.ltsNumber,
      ltsExpiresAt: opts.ltsExpiresAt,
      ltsStatus: 'APPROVED',
    },
  });
  await setGeom('Project', project.id, opts.lat, opts.lng);

  for (const [i, u] of opts.units.entries()) {
    const p = await prisma.property.create({
      data: {
        firmId: opts.firmId,
        source: 'DEVELOPER',
        projectId: project.id,
        title: `${opts.project} – ${u.title}`,
        slug: slugify(`${opts.project}-${u.title}`),
        type: u.type,
        description: `${u.title} at ${opts.project}, ${opts.location}.`,
        price: u.price,
        lotAreaSqm: u.lot,
        floorAreaSqm: u.floor,
        bedrooms: u.bed,
        bathrooms: u.bath,
        barangay: opts.barangay,
        status: 'LIVE',
        publishedAt: new Date(),
        loanQuotations: {
          create: [
            quotation(u.price, 'Pag-IBIG 30 yrs', 'PAG_IBIG'),
            quotation(u.price, 'Bank 20 yrs', 'BANK'),
            quotation(u.price, 'In-house 5 yrs', 'IN_HOUSE'),
          ],
        },
        badges: {
          create: [
            { type: 'LTS_VERIFIED', grantedById: opts.brokerId, validUntil: opts.ltsExpiresAt },
          ],
        },
      },
    });
    // Spread units slightly around the project pin.
    await setGeom('Property', p.id, opts.lat + i * 0.0006, opts.lng + i * 0.0006);
    await attachSeedPhotos(prisma, opts.firmId, p.id, u.type);
  }
}

async function main() {
  passwordHash = await argon2.hash('Password123!');
  await ensureBucket();
  await wipe();

  // ── SuperAdmin ──
  await createUser({
    firmId: null,
    role: 'SUPER_ADMIN',
    email: 'superadmin@trustlisto.test',
    firstName: 'Platform',
    lastName: 'Admin',
  });

  // ── Firm 1: Advench Realty (pilot) ──
  const adv = await prisma.firm.create({
    data: { name: 'Advench Realty', slug: 'advench', address: 'Naga City, Camarines Sur' },
  });
  await createUser({
    firmId: adv.id,
    role: 'COMPANY_ADMIN',
    email: 'admin@advench.test',
    firstName: 'Andrea',
    lastName: 'Villanueva',
  });
  const b1 = await createUser({
    firmId: adv.id,
    role: 'BROKER',
    email: 'broker1@advench.test',
    firstName: 'Bernardo',
    lastName: 'Reyes',
    referralCode: 'BREYES',
  });
  const b2 = await createUser({
    firmId: adv.id,
    role: 'BROKER',
    email: 'broker2@advench.test',
    firstName: 'Beatriz',
    lastName: 'Santos',
    referralCode: 'BSANTOS',
  });
  const sm1 = await createUser({
    firmId: adv.id,
    role: 'SALES_MANAGER',
    email: 'sm1@advench.test',
    firstName: 'Marco',
    lastName: 'Dela Cruz',
    brokerId: b1.id,
    referralCode: 'MDCRUZ',
  });
  const sm2 = await createUser({
    firmId: adv.id,
    role: 'SALES_MANAGER',
    email: 'sm2@advench.test',
    firstName: 'Liza',
    lastName: 'Mendoza',
    brokerId: b1.id,
    referralCode: 'LMENDOZA',
  });
  const sm3 = await createUser({
    firmId: adv.id,
    role: 'SALES_MANAGER',
    email: 'sm3@advench.test',
    firstName: 'Ramon',
    lastName: 'Bautista',
    brokerId: b2.id,
    referralCode: 'RBAUTISTA',
  });
  const sps = [];
  const spNames: [string, string, string][] = [
    ['Joy', 'Ocampo', sm1.id],
    ['Carlo', 'Garcia', sm1.id],
    ['Nina', 'Aquino', sm2.id],
    ['Paolo', 'Rivera', sm2.id],
    ['Kris', 'Navarro', sm3.id],
    ['Ella', 'Torres', sm3.id],
  ];
  for (const [i, [first, last, managerId]] of spNames.entries()) {
    sps.push(
      await createUser({
        firmId: adv.id,
        role: 'SALES_PERSON',
        email: `sp${i + 1}@advench.test`,
        firstName: first,
        lastName: last,
        managerId,
        referralCode: `${first[0]}${last}`.toUpperCase(),
      }),
    );
  }

  // Credentials in mixed states: approved, pending review, expired.
  await credential(adv.id, b1.id, 'PRC_LICENSE', 'APPROVED', inDays(700), 'PRC-0012345');
  await credential(adv.id, b2.id, 'PRC_LICENSE', 'APPROVED', inDays(400), 'PRC-0023456');
  await credential(adv.id, sm1.id, 'DHSUD_REGISTRATION', 'APPROVED', inDays(300), 'DHSUD-R5-1001');
  await credential(adv.id, sm2.id, 'DHSUD_REGISTRATION', 'READY_FOR_REVIEW', null, 'DHSUD-R5-1002');
  await credential(adv.id, sm3.id, 'DHSUD_REGISTRATION', 'APPROVED', inDays(-30), 'DHSUD-R5-1003');
  const spStates: [ReviewStatus, number | null][] = [
    ['APPROVED', 365],
    ['APPROVED', 200],
    ['PENDING_AI', null],
    ['APPROVED', -10],
    ['NEEDS_ATTENTION', null],
    ['APPROVED', 500],
  ];
  for (const [i, sp] of sps.entries()) {
    const [status, days] = spStates[i]!;
    await credential(
      adv.id,
      sp.id,
      'DHSUD_REGISTRATION',
      status,
      days === null ? null : inDays(days),
      `DHSUD-R5-20${i + 1}`,
    );
  }

  // Developers & projects (one LTS expiring within 60 days).
  await developerListing({
    firmId: adv.id,
    brokerId: b1.id,
    developer: 'Vista Land (Camella)',
    project: 'Camella Naga',
    location: 'Del Rosario, Naga City',
    barangay: 'Del Rosario',
    lat: 13.6105,
    lng: 123.2232,
    ltsNumber: 'LTS-R5-2024-0101',
    ltsExpiresAt: inDays(500),
    units: [
      {
        title: 'Ella Model',
        type: 'HOUSE_AND_LOT',
        price: 2_150_000,
        lot: 88,
        floor: 45,
        bed: 2,
        bath: 1,
      },
      {
        title: 'Freya Model',
        type: 'HOUSE_AND_LOT',
        price: 3_480_000,
        lot: 110,
        floor: 72,
        bed: 3,
        bath: 2,
      },
      { title: 'Residential Lot', type: 'LOT', price: 1_250_000, lot: 120 },
    ],
  });
  await developerListing({
    firmId: adv.id,
    brokerId: b1.id,
    developer: 'St. Andrew',
    project: 'St. Andrew Homes Pacol',
    location: 'Pacol, Naga City',
    barangay: 'Pacol',
    lat: 13.6466,
    lng: 123.2299,
    ltsNumber: 'LTS-R5-2023-0222',
    ltsExpiresAt: inDays(320),
    units: [
      {
        title: 'Townhouse A',
        type: 'TOWNHOUSE',
        price: 1_890_000,
        lot: 60,
        floor: 48,
        bed: 2,
        bath: 1,
      },
      {
        title: 'Single Attached',
        type: 'HOUSE_AND_LOT',
        price: 2_650_000,
        lot: 96,
        floor: 56,
        bed: 3,
        bath: 1,
      },
      { title: 'Corner Lot', type: 'LOT', price: 1_420_000, lot: 140 },
    ],
  });
  await developerListing({
    firmId: adv.id,
    brokerId: b2.id,
    developer: 'Parkview',
    project: 'Parkview Estates Cararayan',
    location: 'Cararayan, Naga City',
    barangay: 'Cararayan',
    lat: 13.6151,
    lng: 123.2489,
    ltsNumber: 'LTS-R5-2022-0333',
    ltsExpiresAt: inDays(45), // expiring within 60 days
    units: [
      {
        title: 'Bungalow',
        type: 'HOUSE_AND_LOT',
        price: 2_380_000,
        lot: 100,
        floor: 52,
        bed: 2,
        bath: 1,
      },
      {
        title: 'Two-Storey',
        type: 'HOUSE_AND_LOT',
        price: 3_950_000,
        lot: 120,
        floor: 90,
        bed: 4,
        bath: 2,
      },
      { title: 'Inner Lot', type: 'LOT', price: 980_000, lot: 100 },
    ],
  });
  await developerListing({
    firmId: adv.id,
    brokerId: b2.id,
    developer: 'Futura',
    project: 'Futura Homes Concepcion',
    location: 'Concepcion Grande, Naga City',
    barangay: 'Concepcion Grande',
    lat: 13.629,
    lng: 123.2105,
    ltsNumber: 'LTS-R5-2025-0444',
    ltsExpiresAt: inDays(700),
    units: [
      {
        title: 'Mila Townhouse',
        type: 'TOWNHOUSE',
        price: 1_650_000,
        lot: 54,
        floor: 40,
        bed: 2,
        bath: 1,
      },
      {
        title: 'Shaira Duplex',
        type: 'HOUSE_AND_LOT',
        price: 2_250_000,
        lot: 75,
        floor: 50,
        bed: 2,
        bath: 1,
      },
      {
        title: 'Studio Condo',
        type: 'CONDO',
        price: 1_480_000,
        lot: 0,
        floor: 24,
        bed: 1,
        bath: 1,
      },
    ],
  });

  // ── Firm 2: Bicol Prime Realty (proves isolation + shared marketplace) ──
  const bp = await prisma.firm.create({
    data: { name: 'Bicol Prime Realty', slug: 'bicol-prime', address: 'Naga City, Camarines Sur' },
  });
  await createUser({
    firmId: bp.id,
    role: 'COMPANY_ADMIN',
    email: 'admin@bicolprime.test',
    firstName: 'Teresa',
    lastName: 'Lim',
  });
  const bpB = await createUser({
    firmId: bp.id,
    role: 'BROKER',
    email: 'broker@bicolprime.test',
    firstName: 'Gilbert',
    lastName: 'Fernandez',
    referralCode: 'GFERNANDEZ',
  });
  const bpSm = await createUser({
    firmId: bp.id,
    role: 'SALES_MANAGER',
    email: 'sm@bicolprime.test',
    firstName: 'Diana',
    lastName: 'Castillo',
    brokerId: bpB.id,
    referralCode: 'DCASTILLO',
  });
  const bpSp1 = await createUser({
    firmId: bp.id,
    role: 'SALES_PERSON',
    email: 'sp1@bicolprime.test',
    firstName: 'Rico',
    lastName: 'Salazar',
    managerId: bpSm.id,
    referralCode: 'RSALAZAR',
  });
  const bpSp2 = await createUser({
    firmId: bp.id,
    role: 'SALES_PERSON',
    email: 'sp2@bicolprime.test',
    firstName: 'Mae',
    lastName: 'Pascual',
    managerId: bpSm.id,
    referralCode: 'MPASCUAL',
  });
  await credential(bp.id, bpB.id, 'PRC_LICENSE', 'APPROVED', inDays(600), 'PRC-0034567');
  await credential(bp.id, bpSm.id, 'DHSUD_REGISTRATION', 'APPROVED', inDays(250), 'DHSUD-R5-3001');
  await credential(bp.id, bpSp1.id, 'DHSUD_REGISTRATION', 'APPROVED', inDays(180), 'DHSUD-R5-3002');
  await credential(
    bp.id,
    bpSp2.id,
    'DHSUD_REGISTRATION',
    'READY_FOR_REVIEW',
    null,
    'DHSUD-R5-3003',
  );

  await developerListing({
    firmId: bp.id,
    brokerId: bpB.id,
    developer: 'Bicol Highlands Land Inc.',
    project: 'Highlands Residences Panicuason',
    location: 'Panicuason, Naga City',
    barangay: 'Panicuason',
    lat: 13.6581,
    lng: 123.277,
    ltsNumber: 'LTS-R5-2024-0555',
    ltsExpiresAt: inDays(450),
    units: [
      {
        title: 'Cabin House',
        type: 'HOUSE_AND_LOT',
        price: 2_780_000,
        lot: 150,
        floor: 60,
        bed: 2,
        bath: 1,
      },
      { title: 'View Lot', type: 'LOT', price: 1_150_000, lot: 200 },
    ],
  });

  // Commission split placeholders (§17 — NOT real numbers, see OPEN-5).
  for (const firmId of [adv.id, bp.id]) {
    await prisma.commissionSplitConfig.createMany({
      data: [
        {
          firmId,
          handledBy: 'SALES_PERSON',
          brokerPct: 20,
          salesManagerPct: 20,
          salesPersonPct: 60,
        },
        {
          firmId,
          handledBy: 'SALES_MANAGER',
          brokerPct: 30,
          salesManagerPct: 70,
          salesPersonPct: 0,
        },
      ],
    });
  }

  const [firms, users, props] = await Promise.all([
    prisma.firm.count(),
    prisma.user.count(),
    prisma.property.count(),
  ]);
  console.log(
    `Seeded ${firms} firms, ${users} users, ${props} live listings. Password: Password123!`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
