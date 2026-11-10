// Demo seed (SPEC §17). Fictional people only. M0 scope: firms, users + hierarchy,
// credentials, developers/projects/units, loan quotations, split-config placeholders.
// M4 adds Module 1 documents: readable credential/LTS images and two individual seller
// listings with their title, tax declaration, RPT receipt and seller ID.
// Later milestones add inquiries, clients, visits, commission templates.
import {
  PrismaClient,
  type CredentialType,
  type DocType,
  type Prisma,
  type ReviewStatus,
  type Role,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import argon2 from 'argon2';
import { ensureBucket, objectKey, putObject } from '../src/lib/storage';
import * as mock from './seed-docs/mockDocs';
import { SAMPLES } from './seed-docs/samples';
import { attachSeedPhotos } from './seedPhotos';
import { syncChecklist } from '../src/modules/clients/checklist';
import { createCommission, evaluateClient } from '../src/modules/commissions/service';

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

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A mock credential image (SPEC §17: never real IDs), laid out like the real PRC card / DHSUD
 * certificate so Module 1 can read it. `printedName` lets a demo document disagree with the
 * consultant's record, which the AI should flag.
 */
function mockCredentialImage(
  type: CredentialType,
  user: { firstName: string; lastName: string },
  number: string,
  validUntil: Date,
  printedName?: string,
): Promise<Buffer> {
  const [first, last] = printedName ? printedName.split(' ') : [user.firstName, user.lastName];
  return type === 'PRC_LICENSE'
    ? mock.prcId({
        last: last!.toUpperCase(),
        first: first!.toUpperCase(),
        middle: 'SANTOS',
        registrationNumber: number.replace(/^PRC-/, ''),
        registered: isoDay(inDays(-1500)),
        validUntil: isoDay(validUntil),
      })
    : mock.dhsudCert({
        name: `${first} ${last}`,
        registrationNumber: number,
        issued: isoDay(inDays(-300)),
        validUntil: isoDay(validUntil),
      });
}

/**
 * Seeds a credential. APPROVED/REJECTED ones are stored as already decided. Undecided ones are
 * left QUEUED: the API reads them with Module 1 when it starts (server.ts), like a fresh upload.
 */
async function credential(
  firmId: string,
  userId: string,
  type: CredentialType,
  status: ReviewStatus,
  expiresAt: Date | null,
  number: string,
  printedName?: string,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const png = await mockCredentialImage(type, user, number, expiresAt ?? inDays(400), printedName);
  const storageKey = objectKey(firmId, 'credentials', userId, 'image/png');
  await putObject(storageKey, png, 'image/png');

  const reviewed = status === 'APPROVED' || status === 'REJECTED';
  const broker = reviewed
    ? await prisma.user.findFirst({ where: { firmId, role: 'BROKER' } })
    : null;
  if (!reviewed) status = 'PENDING_AI';
  const flags: never[] = [];

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

/**
 * Stores a seed document. With `approvedBy` it is recorded as already broker-approved (with
 * the fields a broker would have confirmed); without, it is QUEUED for Module 1 to read when
 * the API starts.
 */
async function seedDocument(opts: {
  firmId: string;
  ownerType: 'PROJECT' | 'SELLER_REQUEST';
  ownerId: string;
  declaredType: DocType;
  file: Buffer;
  mime: string;
  uploadedById: string;
  approvedBy?: string;
  fields?: Record<string, string>;
}) {
  const storageKey = objectKey(opts.firmId, opts.ownerType.toLowerCase(), opts.ownerId, opts.mime);
  await putObject(storageKey, opts.file, opts.mime);
  const approved = !!opts.approvedBy;
  return prisma.document.create({
    data: {
      firmId: opts.firmId,
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      declaredType: opts.declaredType,
      storageKey,
      mimeType: opts.mime,
      sizeBytes: opts.file.length,
      sha256: createHash('sha256').update(opts.file).digest('hex'),
      uploadedById: opts.uploadedById,
      aiStatus: approved ? 'DONE' : 'QUEUED',
      detectedType: approved ? opts.declaredType : null,
      reviewStatus: approved ? 'APPROVED' : 'PENDING_AI',
      reviewedById: opts.approvedBy,
      reviewedAt: approved ? new Date() : null,
      flags: approved ? [] : undefined,
      extracted: opts.fields
        ? (Object.fromEntries(
            Object.entries(opts.fields).map(([k, value]) => [k, { value, confidence: 95 }]),
          ) as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

/**
 * Individual seller listing waiting for broker review (SPEC §7.6, §17): the request, its
 * PENDING_REVIEW property, and the four documents the agent uploaded (queued for Module 1).
 */
async function sellerListing(opts: {
  firmId: string;
  agentId: string;
  sellerName: string;
  sellerPhone: string;
  barangay: string;
  lat: number;
  lng: number;
  lotAreaSqm: number;
  price: number;
  title: string;
  /** Evaluation samples (prisma/seed-docs/samples.ts) to upload as this listing's documents. */
  docs: (string | { file: string; declaredType: DocType; render: () => Promise<Buffer> })[];
}) {
  const request = await prisma.sellerListingRequest.create({
    data: {
      firmId: opts.firmId,
      agentId: opts.agentId,
      sellerName: opts.sellerName,
      sellerPhone: opts.sellerPhone,
      locationText: `${opts.barangay}, Naga City`,
      propertyType: 'LOT',
      lotAreaSqm: opts.lotAreaSqm,
      askingPrice: opts.price,
      hasTitle: true,
      photoKeys: [],
      status: 'SUBMITTED_FOR_REVIEW',
      consentAt: new Date(),
    },
  });
  const property = await prisma.property.create({
    data: {
      firmId: opts.firmId,
      source: 'INDIVIDUAL_SELLER',
      sellerRequestId: request.id,
      assignedAgentId: opts.agentId,
      title: opts.title,
      slug: slugify(opts.title),
      type: 'LOT',
      description: `${opts.title}. Sold by the owner through a TrustListo agent.`,
      price: opts.price,
      lotAreaSqm: opts.lotAreaSqm,
      barangay: opts.barangay,
      status: 'PENDING_REVIEW',
    },
  });
  await setGeom('Property', property.id, opts.lat, opts.lng);
  await attachSeedPhotos(prisma, opts.firmId, property.id, 'LOT');
  for (const doc of opts.docs) {
    const s = typeof doc === 'string' ? SAMPLES.find((x) => x.file === doc)! : doc;
    await seedDocument({
      firmId: opts.firmId,
      ownerType: 'SELLER_REQUEST',
      ownerId: request.id,
      declaredType: s.declaredType,
      file: Buffer.from(await s.render()),
      mime: s.file.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
      uploadedById: opts.agentId,
    });
  }
  return { request, property };
}

/** An RPT receipt paid for the current year, so the clean demo listing stays "tax current". */
const currentRptReceipt = (payor: string, tdNumber: string) => {
  const year = new Date().getFullYear();
  return {
    file: 'rpt-current.png',
    declaredType: 'RPT_RECEIPT' as DocType,
    render: () =>
      mock.rptReceipt({
        orNumber: '7845123',
        date: `${year}-01-15`,
        payor,
        tdNumber,
        period: `1st-4th Qtr ${year}`,
        basic: 2_880,
      }),
  };
};

/**
 * Leads and visits for the Advench dashboards (SPEC §17): every lead status, both sources, and
 * visits in each state. Buyers are fictional.
 */
async function seedLeads(firmId: string, adminId: string) {
  const units = await prisma.property.findMany({
    where: { firmId, source: 'DEVELOPER', status: 'LIVE' },
    select: { id: true },
    take: 6,
  });
  const sp = await prisma.user.findUniqueOrThrow({ where: { email: 'sp1@advench.test' } });
  const sm = await prisma.user.findUniqueOrThrow({ where: { email: 'sm1@advench.test' } });
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000);
  const leads: {
    consultantId: string;
    buyerName: string;
    status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'VISIT_SCHEDULED' | 'LOST';
    source: 'ORGANIC' | 'REFERRAL';
    paymentPref: 'PAG_IBIG' | 'BANK' | 'CASH' | 'IN_HOUSE' | 'NOT_SURE';
    natureOfWork: 'EMPLOYED' | 'OFW' | 'BUSINESS';
    civilStatus: 'SINGLE' | 'MARRIED';
  }[] = [
    {
      consultantId: sp.id,
      buyerName: 'Lorna Belmonte',
      status: 'NEW',
      source: 'ORGANIC',
      paymentPref: 'PAG_IBIG',
      natureOfWork: 'OFW',
      civilStatus: 'MARRIED',
    },
    {
      consultantId: sp.id,
      buyerName: 'Dennis Yap',
      status: 'NEW',
      source: 'REFERRAL',
      paymentPref: 'BANK',
      natureOfWork: 'EMPLOYED',
      civilStatus: 'SINGLE',
    },
    {
      consultantId: sp.id,
      buyerName: 'Grace Abad',
      status: 'CONTACTED',
      source: 'ORGANIC',
      paymentPref: 'NOT_SURE',
      natureOfWork: 'EMPLOYED',
      civilStatus: 'MARRIED',
    },
    {
      consultantId: sp.id,
      buyerName: 'Ramil Cuevas',
      status: 'QUALIFIED',
      source: 'ORGANIC',
      paymentPref: 'IN_HOUSE',
      natureOfWork: 'BUSINESS',
      civilStatus: 'MARRIED',
    },
    {
      consultantId: sp.id,
      buyerName: 'Teresa Lim',
      status: 'VISIT_SCHEDULED',
      source: 'REFERRAL',
      paymentPref: 'CASH',
      natureOfWork: 'BUSINESS',
      civilStatus: 'SINGLE',
    },
    {
      consultantId: sp.id,
      buyerName: 'Alvin Mercado',
      status: 'LOST',
      source: 'ORGANIC',
      paymentPref: 'BANK',
      natureOfWork: 'EMPLOYED',
      civilStatus: 'SINGLE',
    },
    {
      consultantId: sm.id,
      buyerName: 'Cecilia Ramos',
      status: 'QUALIFIED',
      source: 'ORGANIC',
      paymentPref: 'PAG_IBIG',
      natureOfWork: 'EMPLOYED',
      civilStatus: 'MARRIED',
    },
  ];
  const created: Prisma.InquiryGetPayload<object>[] = [];
  for (const [i, l] of leads.entries()) {
    created.push(
      await prisma.inquiry.create({
        data: {
          ...l,
          firmId,
          propertyId: units[i % units.length]!.id,
          referralCode: l.source === 'REFERRAL' ? sp.referralCode : null,
          buyerPhone: `0917555${String(1000 + i)}`,
          message: 'Is this still available? I would like to see the unit.',
          consentAt: new Date(),
          createdAt: hours(-24 * (leads.length - i)),
        },
      }),
    );
  }
  const lost = created[5]!;
  await prisma.auditLog.create({
    data: {
      firmId,
      actorId: sp.id,
      action: 'LEAD_STATUS_CHANGED',
      entityType: 'Inquiry',
      entityId: lost.id,
      before: { status: 'CONTACTED' },
      after: { status: 'LOST', reason: 'Bought a unit from another developer.' },
    },
  });

  const visit = (
    inquiry: (typeof created)[number],
    at: Date,
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW',
    extra: { declineReason?: string } = {},
  ) =>
    prisma.visit.create({
      data: {
        firmId,
        propertyId: inquiry.propertyId,
        consultantId: inquiry.consultantId,
        inquiryId: inquiry.id,
        scheduledAt: at,
        status,
        decidedById: status === 'PENDING' ? null : adminId,
        notes: 'Meet at the model house.',
        ...extra,
      },
    });
  await visit(created[3]!, hours(50), 'PENDING');
  await visit(created[6]!, hours(74), 'PENDING');
  await visit(created[4]!, hours(26), 'APPROVED');
  await visit(created[2]!, hours(30), 'DECLINED', {
    declineReason: 'The model house is closed for repainting that day.',
  });
  await visit(created[4]!, hours(-72), 'COMPLETED');
  await visit(created[3]!, hours(-120), 'NO_SHOW');

  // Teresa Lim visited and reserved: a cash client with her reservation recorded (SPEC §10.1).
  const teresa = created[4]!;
  const unit = await prisma.property.findUniqueOrThrow({ where: { id: teresa.propertyId } });
  await prisma.inquiry.update({ where: { id: teresa.id }, data: { status: 'RESERVED' } });
  const client = await prisma.client.create({
    data: {
      firmId,
      inquiryId: teresa.id,
      propertyId: teresa.propertyId,
      consultantId: teresa.consultantId,
      fullName: teresa.buyerName,
      phone: teresa.buyerPhone,
      civilStatus: 'SINGLE',
      paymentMethod: 'CASH',
      tcp: unit.price,
      saleType: 'DEVELOPER_SALE',
      reservationPaidAt: hours(-48),
    },
  });
  await prisma.payment.create({
    data: {
      firmId,
      clientId: client.id,
      kind: 'RESERVATION',
      amount: 20_000,
      paidAt: hours(-48),
      confirmedById: teresa.consultantId,
    },
  });
  await prisma.$transaction((tx) =>
    syncChecklist(tx, client, {
      paymentMethod: 'CASH',
      civilStatus: 'SINGLE',
      employmentType: null,
    }),
  );
  await prisma.$transaction((tx) => createCommission(tx, client.id));
  await evaluateClient(client.id);
}

type Trigger =
  | 'ON_RESERVATION'
  | 'FULL_PAYMENT'
  | 'TCP_PERCENT_PAID'
  | 'DP_PERCENT_PAID'
  | 'DP_FULLY_PAID'
  | 'LOAN_RELEASED'
  | 'MONTHLY';
type TrancheDef = [
  label: string,
  share: number,
  trigger: Trigger,
  value: number | null,
  stage: 'RESERVATION' | 'FINANCING',
];

/**
 * Commission templates per developer × payment method (SPEC §10.3). Gross 5% everywhere and the
 * DP thresholds are PLACEHOLDERS (OPEN-5, OPEN-8) — the CompanyAdmin edits them in Settings.
 */
async function seedCommissionTemplates(firmId: string) {
  const GROSS = 5; // PLACEHOLDER (OPEN-5)
  const cash: TrancheDef[] = [
    ['Advance (20%)', 20, 'FULL_PAYMENT', null, 'RESERVATION'], // OPEN-7: on full cash payment
    ['Balance (80%)', 80, 'FULL_PAYMENT', null, 'RESERVATION'],
  ];
  const halfTcp: TrancheDef[] = [['Full commission', 100, 'TCP_PERCENT_PAID', 50, 'FINANCING']];
  const camella: TrancheDef[] = [
    ['Tranche 1', 30, 'DP_PERCENT_PAID', 30, 'RESERVATION'], // X₁ PLACEHOLDER (OPEN-8)
    ['Tranche 2', 30, 'DP_PERCENT_PAID', 60, 'RESERVATION'], // X₂ PLACEHOLDER (OPEN-8)
    ['Tranche 3', 30, 'DP_FULLY_PAID', null, 'FINANCING'],
    ['Retention', 10, 'LOAN_RELEASED', null, 'FINANCING'],
  ];
  const parkview: TrancheDef[] = [
    ['First DP milestone', 20, 'DP_PERCENT_PAID', 50, 'RESERVATION'], // PLACEHOLDER (OPEN-8)
    ['DP fully paid', 80, 'DP_FULLY_PAID', null, 'FINANCING'],
  ];
  const monthly: TrancheDef[] = [['Monthly', 100, 'MONTHLY', null, 'RESERVATION']];

  const create = (
    developerId: string | null,
    method: 'CASH' | 'DEFERRED_CASH' | 'IN_HOUSE' | 'BANK' | 'PAG_IBIG',
    tranches: TrancheDef[],
    requiresTransmittal = true,
  ) =>
    prisma.commissionTemplate.create({
      data: {
        firmId,
        developerId,
        paymentMethod: method,
        grossRatePct: GROSS,
        requiresTransmittal,
        tranches: {
          create: tranches.map(([label, sharePct, trigger, triggerValue, requiredStage], i) => ({
            sequence: i + 1,
            label,
            sharePct,
            trigger,
            triggerValue,
            requiredStage,
          })),
        },
      },
    });

  for (const dev of await prisma.developer.findMany({ where: { firmId } })) {
    if (/futura/i.test(dev.name)) {
      for (const m of ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'] as const) {
        await create(dev.id, m, monthly);
      }
      continue;
    }
    await create(dev.id, 'CASH', cash);
    await create(dev.id, 'DEFERRED_CASH', halfTcp);
    await create(dev.id, 'IN_HOUSE', halfTcp);
    // Vista Land / St. Andrew per §10.3; other developers default to the same until confirmed.
    const loan = /parkview/i.test(dev.name) ? parkview : camella;
    await create(dev.id, 'BANK', loan);
    await create(dev.id, 'PAG_IBIG', loan);
  }
  // Private sales: spot cash, no developer transmittal.
  await create(
    null,
    'CASH',
    [['Full commission', 100, 'FULL_PAYMENT', null, 'RESERVATION']],
    false,
  );
}

/**
 * Deals in each commission status for the demo (§17): blocked on documents, waiting for the
 * developer's transmittal (aged 45 days), and ready for the broker's voucher. Teresa Lim
 * (seedLeads) is the "waiting for payment" one.
 */
async function seedCommissionDeals(firmId: string) {
  const sp = await prisma.user.findUniqueOrThrow({ where: { email: 'sp2@advench.test' } });
  const broker = await prisma.user.findFirstOrThrow({ where: { firmId, role: 'BROKER' } });
  const units = await prisma.property.findMany({
    where: {
      firmId,
      source: 'DEVELOPER',
      status: 'LIVE',
      project: { developer: { name: { not: { contains: 'Futura' } } } },
    },
    take: 3,
    orderBy: { price: 'asc' },
  });
  const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
  const deals = [
    { name: 'Mario Fernandez', method: 'CASH' as const, paidAll: true, verified: false },
    { name: 'Liza Domingo', method: 'IN_HOUSE' as const, paidAll: false, verified: true },
    {
      name: 'Noel Santiago',
      method: 'CASH' as const,
      paidAll: true,
      verified: true,
      transmittal: true,
    },
  ];
  for (const [i, d] of deals.entries()) {
    const unit = units[i % units.length]!;
    const tcp = Number(unit.price);
    const client = await prisma.client.create({
      data: {
        firmId,
        propertyId: unit.id,
        consultantId: sp.id,
        fullName: d.name,
        phone: `0918777${1000 + i}`,
        civilStatus: 'SINGLE',
        paymentMethod: d.method,
        tcp,
        saleType: 'DEVELOPER_SALE',
        reservationPaidAt: ago(90),
      },
    });
    const paid = d.paidAll ? tcp : Math.ceil(tcp * 0.55);
    await prisma.payment.createMany({
      data: [
        {
          firmId,
          clientId: client.id,
          kind: 'RESERVATION',
          amount: 20_000,
          paidAt: ago(90),
          confirmedById: sp.id,
        },
        {
          firmId,
          clientId: client.id,
          kind: d.method === 'CASH' ? 'FULL_CASH' : 'IN_HOUSE_INSTALLMENT',
          amount: paid - 20_000,
          paidAt: ago(60),
          confirmedById: sp.id,
        },
      ],
    });
    await prisma.$transaction((tx) =>
      syncChecklist(tx, client, {
        paymentMethod: d.method,
        civilStatus: 'SINGLE',
        employmentType: null,
      }),
    );
    await prisma.requirementItem.updateMany({
      where: { clientId: client.id },
      data: d.verified
        ? { status: 'VERIFIED', verifiedById: broker.id, verifiedAt: ago(50) }
        : { status: 'UPLOADED' },
    });
    await prisma.$transaction((tx) => createCommission(tx, client.id));
    await evaluateClient(client.id);
    // Make the transmittal wait look 45 days old, so the aging buckets have something to show.
    await prisma.commissionTranche.updateMany({
      where: { firmId, commission: { clientId: client.id }, status: 'AWAITING_TRANSMITTAL' },
      data: { awaitingSince: ago(45) },
    });
    if (d.transmittal) {
      const tranches = await prisma.commissionTranche.findMany({
        where: { commission: { clientId: client.id } },
      });
      for (const t of tranches) {
        await prisma.commissionTranche.update({
          where: { id: t.id },
          data: { transmittalAmount: t.amount },
        });
      }
      await evaluateClient(client.id);
    }
  }
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

  // The License to Sell on file, already approved by the broker.
  const lts = {
    ltsNumber: opts.ltsNumber,
    project: opts.project,
    developer: opts.developer,
    location: opts.location,
    issued: isoDay(inDays(-700)),
    validUntil: isoDay(opts.ltsExpiresAt),
  };
  const ltsDoc = await seedDocument({
    firmId: opts.firmId,
    ownerType: 'PROJECT',
    ownerId: project.id,
    declaredType: 'LICENSE_TO_SELL',
    file: await mock.licenseToSell(lts),
    mime: 'image/png',
    uploadedById: opts.brokerId,
    approvedBy: opts.brokerId,
    fields: {
      ltsNumber: lts.ltsNumber,
      projectName: lts.project,
      developerName: lts.developer,
      issueDate: lts.issued,
      expiryDate: lts.validUntil,
    },
  });
  await prisma.project.update({ where: { id: project.id }, data: { ltsDocumentId: ltsDoc.id } });

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
      // This one's certificate carries a different first name: Module 1 should flag it.
      status === 'NEEDS_ATTENTION' ? `Kristine ${sp.lastName}` : undefined,
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

  // ── Module 1 work for the brokers (read by the AI when the API starts) ──
  // The license expiring within 60 days has a renewal waiting for the Advench broker.
  const expiring = await prisma.project.findFirstOrThrow({
    where: { ltsNumber: 'LTS-R5-2022-0333' },
    include: { developer: true },
  });
  const advAdmin = await prisma.user.findFirstOrThrow({
    where: { firmId: adv.id, role: 'COMPANY_ADMIN' },
  });
  await seedDocument({
    firmId: adv.id,
    ownerType: 'PROJECT',
    ownerId: expiring.id,
    declaredType: 'LICENSE_TO_SELL',
    file: mock.licenseToSellPdf({
      ltsNumber: 'LTS-R5-2026-0333',
      project: expiring.name,
      developer: expiring.developer.name,
      location: expiring.locationText,
      issued: isoDay(inDays(-5)),
      validUntil: isoDay(inDays(3 * 365)),
    }),
    mime: 'application/pdf',
    uploadedById: advAdmin.id,
  });

  // Two individual seller listings (§17): one clean, one the AI should flag.
  await sellerListing({
    firmId: adv.id,
    agentId: sps[0]!.id,
    sellerName: 'Maria Lourdes Santos',
    sellerPhone: '09171234567',
    barangay: 'Concepcion Pequeña',
    lat: 13.6268,
    lng: 123.2072,
    lotAreaSqm: 240,
    price: 3_600_000,
    title: 'Residential lot in Concepcion Pequeña',
    docs: [
      'title-santos.png',
      'taxdec-santos.png',
      currentRptReceipt('MARIA LOURDES S. SANTOS', '2024-05-0123'),
      'id-santos-photo.jpg',
    ],
  });
  await sellerListing({
    firmId: bp.id,
    agentId: bpSp1.id,
    sellerName: 'Roberto Villanueva',
    sellerPhone: '09281234567',
    barangay: 'Pacol',
    lat: 13.6385,
    lng: 123.2531,
    lotAreaSqm: 320,
    price: 2_900_000,
    title: 'Corner lot in Pacol',
    docs: [
      'title-villanueva.png',
      'taxdec-villanueva.png',
      'rpt-villanueva.png',
      'id-villanueva.png',
    ],
  });
  // A request a seller just sent, waiting for the agent to accept it (§17 demo step 9).
  await prisma.sellerListingRequest.create({
    data: {
      firmId: bp.id,
      agentId: bpSm.id,
      sellerName: 'Ana Marie Bautista',
      sellerPhone: '09391234567',
      locationText: 'Carolina, Naga City',
      propertyType: 'HOUSE_AND_LOT',
      lotAreaSqm: 180,
      floorAreaSqm: 96,
      askingPrice: 4_250_000,
      hasTitle: true,
      photoKeys: [],
      status: 'NEW',
      consentAt: new Date(),
    },
  });
  // Commission templates (§10.3) and the OPEN-6 withholding placeholder, before any deal exists.
  for (const firmId of [adv.id, bp.id]) {
    await seedCommissionTemplates(firmId);
    await prisma.firm.update({ where: { id: firmId }, data: { withholdingPct: 5 } }); // PLACEHOLDER
  }
  await seedLeads(adv.id, advAdmin.id);
  await seedCommissionDeals(adv.id);

  const queued = await prisma.document.count({ where: { aiStatus: 'QUEUED' } });

  const [firms, users, props] = await Promise.all([
    prisma.firm.count(),
    prisma.user.count(),
    prisma.property.count(),
  ]);
  console.log(`Seeded ${firms} firms, ${users} users, ${props} listings. Password: Password123!`);
  console.log(`${queued} documents are queued for Module 1; the API reads them when it starts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
