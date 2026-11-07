import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../env';
import { getPoints, parseBbox, propertyIdsInBbox } from '../../lib/geo';
import { prisma } from '../../lib/prisma';
import { presignedGet } from '../../lib/storage';
import { notFoundError } from '../../middleware/errorHandler';
import { photoUrl, publicPropertyWhere, validBadges } from './visibility';

/** Public marketplace (SPEC §7.1, §13). No login. Rate limited. */
export const publicRouter = Router();

publicRouter.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 10_000 : 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Wait a minute and try again.' },
      });
    },
  }),
);

const PROPERTY_TYPES = [
  'HOUSE_AND_LOT',
  'LOT',
  'CONDO',
  'TOWNHOUSE',
  'COMMERCIAL',
  'OTHER',
] as const;
const BADGES = ['OWNERSHIP_VERIFIED', 'LTS_VERIFIED', 'TAX_CURRENT', 'TITLE_CLEAN'] as const;
const METHODS = ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'] as const;

const filters = z.object({
  q: z.string().trim().max(80).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  city: z.string().trim().max(60).optional(),
  barangay: z.string().trim().max(60).optional(),
  source: z.enum(['DEVELOPER', 'INDIVIDUAL_SELLER']).optional(),
  badge: z.enum(BADGES).optional(),
  paymentMethod: z.enum(METHODS).optional(),
  bbox: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

async function buildWhere(query: unknown) {
  const f = filters.parse(query);
  const now = new Date();
  const and: Prisma.PropertyWhereInput[] = [await publicPropertyWhere(now)];

  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: 'insensitive' } },
        { barangay: { contains: f.q, mode: 'insensitive' } },
        { city: { contains: f.q, mode: 'insensitive' } },
        { project: { name: { contains: f.q, mode: 'insensitive' } } },
      ],
    });
  }
  if (f.type) and.push({ type: f.type });
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    and.push({ price: { gte: f.minPrice, lte: f.maxPrice } });
  }
  if (f.city) and.push({ city: { equals: f.city, mode: 'insensitive' } });
  if (f.barangay) and.push({ barangay: { contains: f.barangay, mode: 'insensitive' } });
  if (f.source) and.push({ source: f.source });
  if (f.badge) {
    and.push({
      badges: {
        some: { type: f.badge, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      },
    });
  }
  if (f.paymentMethod) and.push({ loanQuotations: { some: { paymentMethod: f.paymentMethod } } });
  const bbox = parseBbox(f.bbox);
  if (bbox) and.push({ id: { in: await propertyIdsInBbox(bbox) } });

  const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
    f.sort === 'price_asc'
      ? [{ price: 'asc' }]
      : f.sort === 'price_desc'
        ? [{ price: 'desc' }]
        : [{ publishedAt: 'desc' }, { createdAt: 'desc' }];

  return { where: { AND: and }, orderBy, f };
}

const cardSelect = (now: Date) =>
  ({
    id: true,
    slug: true,
    title: true,
    type: true,
    source: true,
    price: true,
    lotAreaSqm: true,
    floorAreaSqm: true,
    bedrooms: true,
    bathrooms: true,
    barangay: true,
    city: true,
    province: true,
    firmId: true,
    publishedAt: true,
    project: { select: { name: true, developer: { select: { name: true } } } },
    photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 },
    badges: validBadges(now),
  }) satisfies Prisma.PropertySelect;

async function firmNames(ids: string[]) {
  const firms = await prisma.firm.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, name: true, slug: true },
  });
  return new Map(firms.map((f) => [f.id, { name: f.name, slug: f.slug }]));
}

publicRouter.get('/properties', async (req, res) => {
  const { where, orderBy, f } = await buildWhere(req.query);
  const now = new Date();
  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy,
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      select: cardSelect(now),
    }),
    prisma.property.count({ where }),
  ]);
  const [points, firms] = await Promise.all([
    getPoints(
      'Property',
      rows.map((r) => r.id),
    ),
    firmNames(rows.map((r) => r.firmId)),
  ]);
  res.json({
    data: rows.map(({ photos, firmId, ...r }) => ({
      ...r,
      firm: firms.get(firmId) ?? null,
      photo: photos[0] ? photoUrl(photos[0].id) : null,
      location: points.get(r.id) ?? null,
    })),
    page: f.page,
    pageSize: f.pageSize,
    total,
  });
});

/** Every matching listing as a map pin (no pagination; capped). */
publicRouter.get('/properties/markers', async (req, res) => {
  const { where } = await buildWhere(req.query);
  const rows = await prisma.property.findMany({
    where,
    take: 500,
    select: { id: true, slug: true, title: true, price: true, type: true },
  });
  const points = await getPoints(
    'Property',
    rows.map((r) => r.id),
  );
  res.json({
    data: rows.filter((r) => points.has(r.id)).map((r) => ({ ...r, ...points.get(r.id)! })),
  });
});

publicRouter.get('/properties/:slug', async (req, res) => {
  const now = new Date();
  const property = await prisma.property.findFirst({
    where: { AND: [{ slug: String(req.params.slug) }, await publicPropertyWhere(now)] },
    select: {
      ...cardSelect(now),
      description: true,
      photos: { select: { id: true }, orderBy: { sort: 'asc' } },
      project: {
        select: {
          name: true,
          locationText: true,
          ltsNumber: true,
          ltsExpiresAt: true,
          developer: { select: { name: true } },
        },
      },
      loanQuotations: {
        select: {
          id: true,
          label: true,
          paymentMethod: true,
          reservationFee: true,
          downpaymentPct: true,
          dpTermMonths: true,
          monthlyDp: true,
          loanAmount: true,
          interestRatePct: true,
          loanTermYears: true,
          monthlyAmortization: true,
          notes: true,
        },
      },
    },
  });
  if (!property) throw notFoundError();
  const [points, firms, loan] = await Promise.all([
    getPoints('Property', [property.id]),
    firmNames([property.firmId]),
    prisma.firm.findUniqueOrThrow({
      where: { id: property.firmId },
      select: {
        loanRatePct: true,
        loanTermYears: true,
        loanDownpaymentPct: true,
        loanIncomeRatioPct: true,
      },
    }),
  ]);
  const { photos, firmId, ...rest } = property;
  res.json({
    ...rest,
    firm: firms.get(firmId) ?? null,
    photos: photos.map((p) => photoUrl(p.id)),
    location: points.get(property.id) ?? null,
    // The listing firm's calculator assumptions (SPEC §7.4), shown to the buyer.
    loanDefaults: {
      annualRatePct: Number(loan.loanRatePct),
      years: loan.loanTermYears,
      downpaymentPct: Number(loan.loanDownpaymentPct),
      incomeRatioPct: Number(loan.loanIncomeRatioPct),
    },
  });
});

/** Listing photos of publicly visible listings only. Redirects to a short-lived storage link. */
publicRouter.get('/photos/:id', async (req, res) => {
  const photo = await prisma.propertyPhoto.findUnique({
    where: { id: String(req.params.id) },
    select: { key: true, propertyId: true },
  });
  if (!photo) throw notFoundError();
  const visible = await prisma.property.count({
    where: { AND: [{ id: photo.propertyId }, await publicPropertyWhere()] },
  });
  if (!visible) throw notFoundError();
  res.set('Cache-Control', 'public, max-age=240');
  res.redirect(302, await presignedGet(photo.key));
});
