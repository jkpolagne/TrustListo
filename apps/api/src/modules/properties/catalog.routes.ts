import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { getPoints, setPoint } from '../../lib/geo';
import { processListingPhoto } from '../../lib/photos';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';
import { objectKey, presignedGet, putObject } from '../../lib/storage';
import { requireDocumentFile, singleFile } from '../../lib/upload';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { queueDocument } from '../docai/pipeline';

/**
 * Developers → projects → units (SPEC §7.5). CompanyAdmin edits; Broker, Sales Manager and
 * Sales Person read (SPEC §5.2). Everything is scoped to the session's firm.
 */
export const catalogRouter = Router();
catalogRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON'));
const adminOnly = requireRole('COMPANY_ADMIN');

const id = (v: unknown) => z.string().min(1).parse(v);
const money = z.coerce.number().min(0).max(1_000_000_000);
const optionalNum = (max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().min(0).max(max).optional(),
  );
const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

// ───────────── Developers ─────────────

catalogRouter.get('/developers', async (req, res) => {
  const developers = await prisma.developer.findMany({
    where: firmScope(req.user!),
    orderBy: { name: 'asc' },
    select: { id: true, name: true, isActive: true, _count: { select: { projects: true } } },
  });
  res.json({ data: developers });
});

const developerBody = z.object({
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean().optional(),
});

catalogRouter.post('/developers', adminOnly, async (req, res) => {
  const body = developerBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  if (await prisma.developer.findFirst({ where: { firmId, name: body.name } })) {
    throw new HttpError(409, 'DUPLICATE', 'You already have a developer with this name.');
  }
  const dev = await prisma.developer.create({ data: { firmId, ...body } });
  await audit(req, {
    action: 'DEVELOPER_CREATED',
    entityType: 'Developer',
    entityId: dev.id,
    after: { name: dev.name },
  });
  res.status(201).json(dev);
});

catalogRouter.patch('/developers/:id', adminOnly, async (req, res) => {
  const body = developerBody.partial().parse(req.body);
  const dev = await prisma.developer.findFirst({
    where: { id: id(req.params.id), ...firmScope(req.user!) },
  });
  if (!dev) throw notFoundError();
  const updated = await prisma.developer.update({ where: { id: dev.id }, data: body });
  await audit(req, {
    action: 'DEVELOPER_UPDATED',
    entityType: 'Developer',
    entityId: dev.id,
    before: { name: dev.name, isActive: dev.isActive },
    after: { name: updated.name, isActive: updated.isActive },
  });
  res.json(updated);
});

// ───────────── Projects ─────────────

const projectSelect = {
  id: true,
  name: true,
  locationText: true,
  ltsNumber: true,
  ltsExpiresAt: true,
  ltsStatus: true,
  developer: { select: { id: true, name: true } },
  _count: { select: { properties: true } },
} satisfies Prisma.ProjectSelect;

/** The most recent License to Sell upload per project, so the admin sees where it stands. */
async function latestLtsUploads(firmId: string, projectIds: string[]) {
  const docs = await prisma.document.findMany({
    where: { firmId, ownerType: 'PROJECT', ownerId: { in: projectIds } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ownerId: true,
      aiStatus: true,
      reviewStatus: true,
      reviewNote: true,
      flags: true,
      createdAt: true,
    },
  });
  const latest = new Map<string, (typeof docs)[number]>();
  for (const d of docs) if (!latest.has(d.ownerId)) latest.set(d.ownerId, d);
  return latest;
}

catalogRouter.get('/projects', async (req, res) => {
  const scope = firmScope(req.user!);
  const projects = await prisma.project.findMany({
    where: scope,
    orderBy: [{ developer: { name: 'asc' } }, { name: 'asc' }],
    select: projectSelect,
  });
  const ids = projects.map((p) => p.id);
  const points = await getPoints('Project', ids);
  const uploads = await latestLtsUploads(scope.firmId, ids);
  res.json({
    data: projects.map((p) => {
      const { ownerId: _owner, ...latestLts } = uploads.get(p.id) ?? { ownerId: '' };
      return {
        ...p,
        location: points.get(p.id) ?? null,
        latestLts: uploads.has(p.id) ? latestLts : null,
      };
    }),
  });
});

/**
 * Upload a License to Sell (SPEC §7.5, §13). Module 1 reads it in the background; a broker
 * approves it, which verifies every unit of the project. Uploading a renewal doesn't touch
 * the current approved license until the broker approves the new one.
 */
catalogRouter.post('/projects/:id/lts', adminOnly, singleFile('file'), async (req, res) => {
  const file = requireDocumentFile(req.file);
  const { firmId } = firmScope(req.user!);
  const project = await prisma.project.findFirst({ where: { id: id(req.params.id), firmId } });
  if (!project) throw notFoundError();
  const waiting = await prisma.document.findFirst({
    where: {
      firmId,
      ownerType: 'PROJECT',
      ownerId: project.id,
      reviewStatus: { in: ['PENDING_AI', 'NEEDS_ATTENTION', 'READY_FOR_REVIEW'] },
    },
  });
  if (waiting) {
    throw new HttpError(
      409,
      'LTS_UNDER_REVIEW',
      'A license for this project is already waiting for the broker. Wait for the decision first.',
    );
  }

  const storageKey = objectKey(firmId, 'projects', project.id, file.mime);
  await putObject(storageKey, file.buffer, file.mime);
  const doc = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        firmId,
        ownerType: 'PROJECT',
        ownerId: project.id,
        declaredType: 'LICENSE_TO_SELL',
        storageKey,
        mimeType: file.mime,
        sizeBytes: file.size,
        sha256: file.sha256,
        uploadedById: req.user!.id,
      },
    });
    if (project.ltsStatus !== 'APPROVED') {
      await tx.project.update({ where: { id: project.id }, data: { ltsStatus: 'PENDING_AI' } });
    }
    await audit(
      req,
      {
        action: 'LTS_UPLOADED',
        entityType: 'Project',
        entityId: project.id,
        after: { documentId: d.id },
      },
      tx,
    );
    return d;
  });
  queueDocument(doc.id);
  res.status(201).json({ id: doc.id, aiStatus: doc.aiStatus, reviewStatus: doc.reviewStatus });
});

const projectBody = z.object({
  developerId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  locationText: z.string().trim().min(2).max(200),
  location: point.nullable().optional(),
});

catalogRouter.post('/projects', adminOnly, async (req, res) => {
  const body = projectBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const dev = await prisma.developer.findFirst({ where: { id: body.developerId, firmId } });
  if (!dev) throw new HttpError(400, 'DEVELOPER_REQUIRED', 'Choose one of your developers.');
  const project = await prisma.project.create({
    data: { firmId, developerId: dev.id, name: body.name, locationText: body.locationText },
  });
  if (body.location) await setPoint('Project', project.id, body.location);
  await audit(req, {
    action: 'PROJECT_CREATED',
    entityType: 'Project',
    entityId: project.id,
    after: { name: project.name },
  });
  res.status(201).json(project);
});

catalogRouter.patch('/projects/:id', adminOnly, async (req, res) => {
  const body = projectBody.omit({ developerId: true }).partial().parse(req.body);
  const project = await prisma.project.findFirst({
    where: { id: id(req.params.id), ...firmScope(req.user!) },
  });
  if (!project) throw notFoundError();
  const { location, ...data } = body;
  const updated = await prisma.project.update({ where: { id: project.id }, data });
  if (location !== undefined) await setPoint('Project', project.id, location);
  res.json(updated);
});

// ───────────── Units (Property, source = DEVELOPER) ─────────────

const propertyListSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  status: true,
  price: true,
  bedrooms: true,
  bathrooms: true,
  lotAreaSqm: true,
  floorAreaSqm: true,
  barangay: true,
  publishedAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true, ltsStatus: true, ltsExpiresAt: true } },
  _count: { select: { photos: true, loanQuotations: true } },
} satisfies Prisma.PropertySelect;

catalogRouter.get('/properties', async (req, res) => {
  const q = z
    .object({
      status: z
        .enum([
          'DRAFT',
          'PENDING_REVIEW',
          'NEEDS_ATTENTION',
          'LIVE',
          'REJECTED',
          'SUSPENDED',
          'SOLD',
        ])
        .optional(),
      projectId: z.string().optional(),
    })
    .parse(req.query);
  const properties = await prisma.property.findMany({
    where: {
      ...firmScope(req.user!),
      source: 'DEVELOPER',
      status: q.status,
      projectId: q.projectId,
    },
    orderBy: [{ project: { name: 'asc' } }, { title: 'asc' }],
    select: propertyListSelect,
  });
  res.json({ data: properties });
});

const firmPhotoUrl = (photoId: string) => `/api/v1/catalog/photos/${photoId}`;

async function findProperty(req: Express.Request, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...firmScope(req.user!) },
    select: {
      ...propertyListSelect,
      description: true,
      source: true,
      projectId: true,
      photos: { select: { id: true, sort: true }, orderBy: { sort: 'asc' } },
      loanQuotations: true,
      badges: { select: { type: true, validUntil: true } },
    },
  });
  if (!property) throw notFoundError();
  return property;
}

catalogRouter.get('/properties/:id', async (req, res) => {
  const p = await findProperty(req, id(req.params.id));
  const points = await getPoints('Property', [p.id]);
  res.json({
    ...p,
    photos: p.photos.map((ph) => ({ id: ph.id, url: firmPhotoUrl(ph.id) })),
    location: points.get(p.id) ?? null,
  });
});

const unitBody = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(2).max(140),
  type: z.enum(['HOUSE_AND_LOT', 'LOT', 'CONDO', 'TOWNHOUSE', 'COMMERCIAL', 'OTHER']),
  description: z.string().trim().max(4000).optional(),
  price: money,
  lotAreaSqm: optionalNum(1_000_000),
  floorAreaSqm: optionalNum(1_000_000),
  bedrooms: optionalNum(50),
  bathrooms: optionalNum(50),
  barangay: z.string().trim().max(80).optional(),
  location: point.nullable().optional(),
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);

catalogRouter.post('/properties', adminOnly, async (req, res) => {
  const { location, ...body } = unitBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const project = await prisma.project.findFirst({ where: { id: body.projectId, firmId } });
  if (!project) throw new HttpError(400, 'PROJECT_REQUIRED', 'Choose one of your projects.');

  const property = await prisma.property.create({
    data: {
      ...body,
      firmId,
      source: 'DEVELOPER',
      status: 'DRAFT',
      slug: `${slugify(`${project.name} ${body.title}`)}-${randomBytes(3).toString('hex')}`,
    },
  });
  // Default the pin to the project's location.
  if (location) await setPoint('Property', property.id, location);
  else {
    const pp = (await getPoints('Project', [project.id])).get(project.id);
    if (pp) await setPoint('Property', property.id, pp);
  }
  await audit(req, {
    action: 'PROPERTY_CREATED',
    entityType: 'Property',
    entityId: property.id,
    after: { title: property.title, status: 'DRAFT' },
  });
  res.status(201).json(property);
});

catalogRouter.patch('/properties/:id', adminOnly, async (req, res) => {
  const { location, projectId, ...body } = unitBody.partial().parse(req.body);
  const current = await findProperty(req, id(req.params.id));
  if (projectId) {
    const ok = await prisma.project.findFirst({
      where: { id: projectId, ...firmScope(req.user!) },
    });
    if (!ok) throw new HttpError(400, 'PROJECT_REQUIRED', 'Choose one of your projects.');
  }
  const updated = await prisma.property.update({
    where: { id: current.id },
    data: { ...body, ...(projectId && { projectId }) },
  });
  if (location !== undefined) await setPoint('Property', current.id, location);
  if (body.price !== undefined && Number(current.price) !== body.price) {
    await audit(req, {
      action: 'PROPERTY_PRICE_CHANGED',
      entityType: 'Property',
      entityId: current.id,
      before: { price: Number(current.price) },
      after: { price: body.price },
    });
  }
  res.json(updated);
});

/**
 * Publish a developer unit. Allowed only when its project's License to Sell was approved by a
 * broker and hasn't expired (SPEC §7.5). The unit inherits the project's LTS_VERIFIED badge.
 */
catalogRouter.post('/properties/:id/publish', adminOnly, async (req, res) => {
  const p = await findProperty(req, id(req.params.id));
  if (p.status === 'LIVE')
    throw new HttpError(409, 'ALREADY_LIVE', 'This listing is already live.');
  const project = p.project;
  if (
    !project ||
    project.ltsStatus !== 'APPROVED' ||
    !project.ltsExpiresAt ||
    project.ltsExpiresAt < new Date()
  ) {
    throw new HttpError(
      409,
      'LTS_NOT_APPROVED',
      "This project's License to Sell isn't approved by a broker, or it has expired. Units can't go live until it is.",
    );
  }

  // Reuse the broker approval already granted to sibling units of this project, if any.
  // If the project had no units back then, credit the broker who approved the license.
  const sibling =
    (await prisma.propertyBadge.findFirst({
      where: { type: 'LTS_VERIFIED', property: { projectId: project.id } },
      select: { grantedById: true },
    })) ??
    (await prisma.project
      .findUnique({
        where: { id: project.id },
        select: { ltsDocument: { select: { reviewedById: true } } },
      })
      .then((p) =>
        p?.ltsDocument?.reviewedById ? { grantedById: p.ltsDocument.reviewedById } : null,
      ));

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: p.id },
      data: { status: 'LIVE', publishedAt: new Date() },
    });
    if (sibling) {
      await tx.propertyBadge.upsert({
        where: { propertyId_type: { propertyId: p.id, type: 'LTS_VERIFIED' } },
        create: {
          propertyId: p.id,
          type: 'LTS_VERIFIED',
          grantedById: sibling.grantedById,
          validUntil: project.ltsExpiresAt,
        },
        update: { validUntil: project.ltsExpiresAt },
      });
    }
    await audit(
      req,
      {
        action: 'LISTING_PUBLISHED',
        entityType: 'Property',
        entityId: p.id,
        before: { status: p.status },
        after: { status: 'LIVE' },
      },
      tx,
    );
  });
  res.json({ status: 'LIVE' });
});

catalogRouter.post('/properties/:id/unpublish', adminOnly, async (req, res) => {
  const p = await findProperty(req, id(req.params.id));
  if (p.status !== 'LIVE') throw new HttpError(409, 'NOT_LIVE', 'This listing is not live.');
  await prisma.property.update({ where: { id: p.id }, data: { status: 'DRAFT' } });
  await audit(req, {
    action: 'LISTING_UNPUBLISHED',
    entityType: 'Property',
    entityId: p.id,
    before: { status: 'LIVE' },
    after: { status: 'DRAFT' },
  });
  res.json({ status: 'DRAFT' });
});

// ───────────── Photos ─────────────

catalogRouter.post('/properties/:id/photos', adminOnly, singleFile('file'), async (req, res) => {
  const p = await findProperty(req, id(req.params.id));
  if (p.photos.length >= 20)
    throw new HttpError(400, 'TOO_MANY_PHOTOS', 'A listing can have up to 20 photos.');
  const webp = await processListingPhoto(req.file);
  const key = objectKey(firmScope(req.user!).firmId, 'properties', p.id, 'image/webp');
  await putObject(key, webp, 'image/webp');
  const photo = await prisma.propertyPhoto.create({
    data: { propertyId: p.id, key, sort: (p.photos.at(-1)?.sort ?? -1) + 1 },
  });
  res.status(201).json({ id: photo.id, url: firmPhotoUrl(photo.id) });
});

async function findPhoto(req: Express.Request, photoId: string) {
  const photo = await prisma.propertyPhoto.findFirst({
    where: { id: photoId, property: firmScope(req.user!) },
  });
  if (!photo) throw notFoundError();
  return photo;
}

catalogRouter.get('/photos/:id', async (req, res) => {
  const photo = await findPhoto(req, id(req.params.id));
  res.redirect(302, await presignedGet(photo.key));
});

catalogRouter.delete('/photos/:id', adminOnly, async (req, res) => {
  const photo = await findPhoto(req, id(req.params.id));
  await prisma.propertyPhoto.delete({ where: { id: photo.id } });
  res.status(204).end();
});

/** Make this photo the cover (first). */
catalogRouter.post('/photos/:id/cover', adminOnly, async (req, res) => {
  const photo = await findPhoto(req, id(req.params.id));
  const min = await prisma.propertyPhoto.aggregate({
    where: { propertyId: photo.propertyId },
    _min: { sort: true },
  });
  await prisma.propertyPhoto.update({
    where: { id: photo.id },
    data: { sort: (min._min.sort ?? 0) - 1 },
  });
  res.status(204).end();
});

// ───────────── Loan quotations (developer's actual breakdowns, SPEC §7.4) ─────────────

const quotationBody = z.object({
  label: z.string().trim().min(2).max(60),
  paymentMethod: z.enum(['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG']),
  reservationFee: money,
  downpaymentPct: z.coerce.number().min(0).max(100),
  dpTermMonths: z.coerce.number().int().min(0).max(120),
  monthlyDp: money,
  loanAmount: money,
  interestRatePct: optionalNum(100),
  loanTermYears: optionalNum(40),
  monthlyAmortization: optionalNum(1_000_000_000),
  notes: z.string().trim().max(500).optional(),
});

catalogRouter.post('/properties/:id/quotations', adminOnly, async (req, res) => {
  const body = quotationBody.parse(req.body);
  const p = await findProperty(req, id(req.params.id));
  const q = await prisma.loanQuotation.create({ data: { ...body, propertyId: p.id } });
  res.status(201).json(q);
});

async function findQuotation(req: Express.Request, quotationId: string) {
  const q = await prisma.loanQuotation.findFirst({
    where: { id: quotationId, property: firmScope(req.user!) },
  });
  if (!q) throw notFoundError();
  return q;
}

catalogRouter.patch('/quotations/:id', adminOnly, async (req, res) => {
  const body = quotationBody.partial().parse(req.body);
  const q = await findQuotation(req, id(req.params.id));
  res.json(await prisma.loanQuotation.update({ where: { id: q.id }, data: body }));
});

catalogRouter.delete('/quotations/:id', adminOnly, async (req, res) => {
  const q = await findQuotation(req, id(req.params.id));
  await prisma.loanQuotation.delete({ where: { id: q.id } });
  res.status(204).end();
});
