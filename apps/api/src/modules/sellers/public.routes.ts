import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../../env';
import { audit } from '../../lib/audit';
import { processListingPhoto } from '../../lib/photos';
import { prisma } from '../../lib/prisma';
import { objectKey, putObject } from '../../lib/storage';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { consultantCards, pickableConsultantWhere, shuffle } from '../consultants/pickable';
import { photoUrl, publicPropertyWhere, validBadges } from '../marketplace/visibility';

/**
 * Public side of the individual seller flow (SPEC §7.1, §7.6, §13):
 * the agent picker, consultant profiles, and the "List Your Property" form.
 * Mounted under /public, after the marketplace router's rate limit.
 */
export const sellerPublicRouter = Router();

/** Seller's agent picker: verified consultants of every active firm, in a fresh random order. */
sellerPublicRouter.get('/agents', async (_req, res) => {
  const cards = await consultantCards(pickableConsultantWhere());
  res.json({ data: shuffle(cards) });
});

sellerPublicRouter.get('/consultants/:id', async (req, res) => {
  const now = new Date();
  const [card] = await consultantCards({ ...pickableConsultantWhere(now), id: req.params.id }, now);
  if (!card) throw notFoundError();
  const listings = await prisma.property.findMany({
    where: { AND: [{ assignedAgentId: card.id }, await publicPropertyWhere(now)] },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      price: true,
      barangay: true,
      city: true,
      photos: { select: { id: true }, orderBy: { sort: 'asc' }, take: 1 },
      badges: validBadges(now),
    },
    orderBy: { publishedAt: 'desc' },
  });
  res.json({
    ...card,
    listings: listings.map(({ photos, ...l }) => ({
      ...l,
      photo: photos[0] ? photoUrl(photos[0].id) : null,
    })),
  });
});

// A seller submits at most a few requests; stop scripted floods (SPEC §7.2 abuse protection).
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many submissions from this connection. Try again in a few minutes.',
      },
    });
  },
});

const MAX_PHOTOS = 8;
const photosUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: MAX_PHOTOS },
}).array('photos', MAX_PHOTOS);

const yes = z.preprocess((v) => v === true || v === 'true', z.boolean());
const optionalArea = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.number().positive().max(10_000_000).optional(),
);

const sellerBody = z.object({
  sellerName: z.string().trim().min(3, 'Enter your full name.').max(120),
  sellerPhone: z
    .string()
    .trim()
    .regex(/^(\+?63|0)9\d{9}$/, 'Enter a mobile number like 09171234567.'),
  sellerEmail: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().trim().email('Enter a valid email, or leave it blank.').max(160).optional(),
  ),
  barangay: z.string().trim().min(2, 'Enter the barangay.').max(80),
  city: z.string().trim().min(2, 'Enter the city or town.').max(80),
  propertyType: z.enum(['HOUSE_AND_LOT', 'LOT', 'CONDO', 'TOWNHOUSE', 'COMMERCIAL', 'OTHER']),
  lotAreaSqm: optionalArea,
  floorAreaSqm: optionalArea,
  askingPrice: z.coerce
    .number()
    .min(10_000, 'Enter the asking price in pesos.')
    .max(10_000_000_000),
  hasTitle: yes,
  agentId: z.string().min(1, 'Choose an agent.'),
  consent: yes,
  /** Honeypot: people never see this field; bots fill it in. */
  website: z.string().max(0).optional().or(z.literal('')),
});

sellerPublicRouter.post('/seller-requests', submitLimiter, photosUpload, async (req, res) => {
  const body = sellerBody.parse(req.body);
  if (!body.consent) {
    throw new HttpError(400, 'CONSENT_REQUIRED', 'Agree to the privacy notice to continue.');
  }
  // OPEN-2, decided: only titled properties can be listed, so don't take untitled requests.
  if (!body.hasTitle) {
    throw new HttpError(
      400,
      'TITLE_REQUIRED',
      'TrustListo lists only properties with a land title, so a broker can verify ownership.',
    );
  }
  // The client can't choose who handles the property; only a pickable agent is accepted.
  const agent = await prisma.user.findFirst({
    where: { ...pickableConsultantWhere(), id: body.agentId },
    select: { id: true, firmId: true },
  });
  if (!agent?.firmId) {
    throw new HttpError(
      400,
      'AGENT_UNAVAILABLE',
      'That agent is no longer available. Choose another.',
    );
  }
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const photos = await Promise.all(files.map((f) => processListingPhoto(f))); // validates first

  const request = await prisma.sellerListingRequest.create({
    data: {
      firmId: agent.firmId,
      agentId: agent.id,
      sellerName: body.sellerName,
      sellerPhone: body.sellerPhone,
      sellerEmail: body.sellerEmail,
      locationText: `${body.barangay}, ${body.city}`,
      propertyType: body.propertyType,
      lotAreaSqm: body.lotAreaSqm,
      floorAreaSqm: body.floorAreaSqm,
      askingPrice: body.askingPrice,
      hasTitle: true,
      photoKeys: [],
      consentAt: new Date(),
    },
  });
  const photoKeys: string[] = [];
  for (const webp of photos) {
    const key = objectKey(agent.firmId, 'seller-requests', request.id, 'image/webp');
    await putObject(key, webp, 'image/webp');
    photoKeys.push(key);
  }
  if (photoKeys.length) {
    await prisma.sellerListingRequest.update({ where: { id: request.id }, data: { photoKeys } });
  }
  await audit(req, {
    firmId: agent.firmId,
    action: 'SELLER_REQUEST_CREATED',
    entityType: 'SellerListingRequest',
    entityId: request.id,
    after: { agentId: agent.id, photos: photoKeys.length }, // no seller PII in logs (§14)
  });
  res.status(201).json({ id: request.id });
});
