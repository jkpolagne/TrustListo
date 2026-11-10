import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../env';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { consultantCards, pickableConsultantWhere, shuffle } from '../consultants/pickable';
import { publicPropertyWhere } from '../marketplace/visibility';

/**
 * Buyer inquiries (SPEC §7.2). The server decides who gets the lead, never the browser:
 *   1. individual seller listing → always the seller's chosen agent;
 *   2. a valid referral code of an active consultant of the listing's firm → that consultant;
 *   3. otherwise the buyer picks from the listing firm's verified consultants (shuffled).
 * No co-broke (rule 8): only the listing firm's people ever receive the inquiry.
 */
export const leadsPublicRouter = Router();

async function visibleProperty(id: string) {
  const p = await prisma.property.findFirst({
    where: { AND: [{ id }, await publicPropertyWhere()] },
    select: { id: true, firmId: true, source: true, assignedAgentId: true },
  });
  if (!p) throw notFoundError();
  return p;
}

/** A referral code counts only for an active consultant of the listing's own firm. */
async function referrer(code: string | undefined, firmId: string) {
  if (!code) return null;
  return prisma.user.findFirst({
    where: {
      referralCode: code.trim().toUpperCase(),
      firmId,
      isActive: true,
      role: { in: ['SALES_MANAGER', 'SALES_PERSON'] },
    },
    select: { id: true },
  });
}

type Routing =
  { mode: 'ASSIGNED' | 'REFERRAL'; consultantId: string } | { mode: 'PICK'; consultantId: null };

async function routeFor(
  p: Awaited<ReturnType<typeof visibleProperty>>,
  ref?: string,
): Promise<Routing> {
  if (p.source === 'INDIVIDUAL_SELLER' && p.assignedAgentId) {
    return { mode: 'ASSIGNED', consultantId: p.assignedAgentId };
  }
  const r = await referrer(ref, p.firmId);
  if (r) return { mode: 'REFERRAL', consultantId: r.id };
  return { mode: 'PICK', consultantId: null };
}

const poolWhere = (firmId: string): Prisma.UserWhereInput => ({
  ...pickableConsultantWhere(),
  firmId,
});

/**
 * Who the buyer can send this inquiry to. PICK: the listing firm's verified consultants in a
 * fresh random order (§7.3, never cached, never sorted by rating). ASSIGNED / REFERRAL: one.
 */
leadsPublicRouter.get('/properties/:id/consultants', async (req, res) => {
  const p = await visibleProperty(req.params.id);
  const route = await routeFor(p, typeof req.query.ref === 'string' ? req.query.ref : undefined);
  if (route.mode === 'PICK') {
    res.json({ mode: 'PICK', data: shuffle(await consultantCards(poolWhere(p.firmId))) });
    return;
  }
  res.json({ mode: route.mode, data: await consultantCards({ id: route.consultantId }) });
});

const inquiryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 5, // §7.2: e.g. 5 inquiries / 10 min per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many inquiries from this connection. Try again in a few minutes.',
      },
    });
  },
});

const inquiryBody = z.object({
  propertyId: z.string().min(1),
  consultantId: z.string().optional(),
  ref: z.string().trim().max(12).optional(),
  buyerName: z.string().trim().min(3, 'Enter your full name.').max(120),
  buyerPhone: z
    .string()
    .trim()
    .regex(/^(\+?63|0)9\d{9}$/, 'Enter a mobile number like 09171234567.'),
  buyerEmail: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().trim().email('Enter a valid email, or leave it blank.').max(160).optional(),
  ),
  natureOfWork: z.enum(['EMPLOYED', 'OFW', 'BUSINESS', 'OTHER']),
  paymentPref: z.enum(['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG', 'NOT_SURE']),
  civilStatus: z.enum(['SINGLE', 'MARRIED', 'SEPARATED']),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Agree to the privacy notice to send your inquiry.' }),
  }),
  website: z.string().max(0).optional(), // honeypot
});

leadsPublicRouter.post('/inquiries', inquiryLimiter, async (req, res) => {
  const body = inquiryBody.parse(req.body);
  const p = await visibleProperty(body.propertyId);
  const route = await routeFor(p, body.ref);

  let consultantId = route.consultantId;
  if (route.mode === 'PICK') {
    const picked = body.consultantId
      ? await prisma.user.findFirst({ where: { ...poolWhere(p.firmId), id: body.consultantId } })
      : null;
    if (!picked) {
      throw new HttpError(400, 'CHOOSE_CONSULTANT', 'Choose a consultant to send your inquiry to.');
    }
    consultantId = picked.id;
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      firmId: p.firmId,
      propertyId: p.id,
      consultantId: consultantId!,
      source: route.mode === 'REFERRAL' ? 'REFERRAL' : 'ORGANIC',
      referralCode: route.mode === 'REFERRAL' ? body.ref!.trim().toUpperCase() : null,
      buyerName: body.buyerName,
      buyerPhone: body.buyerPhone,
      buyerEmail: body.buyerEmail,
      natureOfWork: body.natureOfWork,
      paymentPref: body.paymentPref,
      civilStatus: body.civilStatus,
      message: body.message || null,
      consentAt: new Date(),
    },
  });
  await audit(req, {
    firmId: p.firmId,
    action: 'INQUIRY_CREATED',
    entityType: 'Inquiry',
    entityId: inquiry.id,
    after: { propertyId: p.id, consultantId, source: inquiry.source }, // no buyer PII (§14)
  });
  const consultant = await prisma.user.findUniqueOrThrow({
    where: { id: consultantId! },
    select: { firstName: true, lastName: true, firm: { select: { name: true } } },
  });
  res.status(201).json({ id: inquiry.id, consultant });
});
