// M3: public marketplace (search, map, detail, photos) + firm catalog management.
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, signIn } from './helpers';

afterAll(() => prisma.$disconnect());

const pub = (path: string) => request(app).get(`/api/v1/public${path}`);
type Card = {
  id: string;
  slug: string;
  price: string;
  type: string;
  firm: { slug: string };
  location: { lat: number; lng: number } | null;
  badges: { type: string }[];
};

let png: Buffer;
beforeAll(async () => {
  png = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#88aa44' } })
    .png()
    .toBuffer();
});

describe('M3 acceptance: live seeded listings are searchable and on the map', () => {
  it('lists live listings from both firms, each with a map location', async () => {
    const res = await pub('/properties?pageSize=48').expect(200);
    const cards: Card[] = res.body.data;
    expect(res.body.total).toBeGreaterThanOrEqual(14);
    expect(new Set(cards.map((c) => c.firm.slug))).toEqual(new Set(['advench', 'bicol-prime']));
    expect(cards.every((c) => c.location && Math.abs(c.location.lat - 13.6) < 0.2)).toBe(true);
  });

  it('returns map markers with coordinates', async () => {
    const res = await pub('/properties/markers').expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(14);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        slug: expect.any(String),
        lat: expect.any(Number),
        lng: expect.any(Number),
      }),
    );
  });

  it('filters by map area (PostGIS bbox)', async () => {
    // A small box around Panicuason only (Bicol Prime's project).
    const res = await pub('/properties?bbox=123.27,13.65,123.29,13.67').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.data.every((c: Card) => c.firm.slug === 'bicol-prime')).toBe(true);
  });

  it('filters by type, price and badge, and paginates', async () => {
    const lots = await pub('/properties?type=LOT&pageSize=48').expect(200);
    expect(lots.body.data.every((c: Card) => c.type === 'LOT')).toBe(true);

    const cheap = await pub('/properties?maxPrice=1500000&pageSize=48').expect(200);
    expect(cheap.body.data.every((c: Card) => Number(c.price) <= 1_500_000)).toBe(true);

    const sorted = await pub('/properties?sort=price_asc&pageSize=48').expect(200);
    const prices = sorted.body.data.map((c: Card) => Number(c.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const badge = await pub('/properties?badge=LTS_VERIFIED&pageSize=48').expect(200);
    expect(
      badge.body.data.every((c: Card) => c.badges.some((b) => b.type === 'LTS_VERIFIED')),
    ).toBe(true);

    const page2 = await pub('/properties?pageSize=5&page=2').expect(200);
    expect(page2.body.data).toHaveLength(5);
  });

  it('searches by text', async () => {
    const res = await pub('/properties?q=camella').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('shows a listing with its loan quotations', async () => {
    const list = await pub('/properties?q=Freya').expect(200);
    const slug = list.body.data[0].slug;
    const res = await pub(`/properties/${slug}`).expect(200);
    expect(res.body.loanQuotations.length).toBeGreaterThan(0);
    expect(res.body.project.developer.name).toBe('Vista Land (Camella)');
    expect(res.body).not.toHaveProperty('firmId');
  });
});

describe('public visibility rules', () => {
  it('hides drafts', async () => {
    const draft = await prisma.property.findFirstOrThrow({ where: { status: 'LIVE' } });
    await prisma.property.update({ where: { id: draft.id }, data: { status: 'DRAFT' } });
    try {
      expect((await pub(`/properties/${draft.slug}`)).status).toBe(404);
    } finally {
      await prisma.property.update({ where: { id: draft.id }, data: { status: 'LIVE' } });
    }
  });

  it('hides every listing of a suspended firm', async () => {
    await prisma.firm.update({ where: { slug: 'bicol-prime' }, data: { status: 'SUSPENDED' } });
    try {
      const res = await pub('/properties?pageSize=48').expect(200);
      expect(res.body.data.some((c: Card) => c.firm.slug === 'bicol-prime')).toBe(false);
    } finally {
      await prisma.firm.update({ where: { slug: 'bicol-prime' }, data: { status: 'ACTIVE' } });
    }
  });

  it('hides units whose License to Sell has expired', async () => {
    const project = await prisma.project.findFirstOrThrow({ where: { name: 'Camella Naga' } });
    const before = project.ltsExpiresAt;
    await prisma.project.update({
      where: { id: project.id },
      data: { ltsExpiresAt: new Date(Date.now() - 86400000) },
    });
    try {
      const res = await pub('/properties?q=camella').expect(200);
      expect(res.body.total).toBe(0);
    } finally {
      await prisma.project.update({ where: { id: project.id }, data: { ltsExpiresAt: before } });
    }
  });
});

describe('firm catalog', () => {
  it('admin adds developer → project → unit, then publishes once the LTS is approved', async () => {
    const admin = await signIn('admin@advench.test');
    const tag = Math.random().toString(36).slice(2, 7);
    const dev = await admin.agent
      .post('/api/v1/catalog/developers')
      .set(admin.csrfHeader)
      .send({ name: `Test Dev ${tag}` })
      .expect(201);
    // Its sales earn a commission from day one: one template per payment method (§10.3).
    const templates = await prisma.commissionTemplate.findMany({
      where: { developerId: dev.body.id },
      select: { paymentMethod: true },
    });
    expect(templates.map((t) => t.paymentMethod).sort()).toEqual([
      'BANK',
      'CASH',
      'DEFERRED_CASH',
      'IN_HOUSE',
      'PAG_IBIG',
    ]);
    const project = await admin.agent
      .post('/api/v1/catalog/projects')
      .set(admin.csrfHeader)
      .send({
        developerId: dev.body.id,
        name: `Test Homes ${tag}`,
        locationText: 'Naga City',
        location: { lat: 13.62, lng: 123.19 },
      })
      .expect(201);
    const unit = await admin.agent
      .post('/api/v1/catalog/properties')
      .set(admin.csrfHeader)
      .send({
        projectId: project.body.id,
        title: 'Model A',
        type: 'HOUSE_AND_LOT',
        price: 2500000,
        bedrooms: 2,
      })
      .expect(201);
    expect(unit.body.status).toBe('DRAFT');

    // New project has no approved License to Sell → can't publish.
    const blocked = await admin.agent
      .post(`/api/v1/catalog/properties/${unit.body.id}/publish`)
      .set(admin.csrfHeader);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('LTS_NOT_APPROVED');

    // (Broker LTS approval arrives with the document pipeline; simulate the approved state.)
    await prisma.project.update({
      where: { id: project.body.id },
      data: { ltsStatus: 'APPROVED', ltsExpiresAt: new Date(Date.now() + 365 * 86400000) },
    });
    await admin.agent
      .post(`/api/v1/catalog/properties/${unit.body.id}/publish`)
      .set(admin.csrfHeader)
      .expect(200);

    const pubRes = await pub(`/properties/${unit.body.slug}`).expect(200);
    expect(pubRes.body.location).toEqual({ lat: 13.62, lng: 123.19 }); // inherited from the project

    const row = await prisma.auditLog.findFirst({
      where: { action: 'LISTING_PUBLISHED', entityId: unit.body.id },
    });
    expect(row?.after).toEqual({ status: 'LIVE' });
  });

  it('only CompanyAdmin edits; other roles can read', async () => {
    const broker = await signIn('broker1@advench.test');
    expect((await broker.agent.get('/api/v1/catalog/properties')).status).toBe(200);
    const res = await broker.agent
      .post('/api/v1/catalog/developers')
      .set(broker.csrfHeader)
      .send({ name: 'Nope Dev' });
    expect(res.status).toBe(403);
  });

  it("another firm gets 404 for this firm's units", async () => {
    const unit = await prisma.property.findFirstOrThrow({
      where: { project: { name: 'Camella Naga' } },
    });
    const other = await signIn('admin@bicolprime.test');
    expect((await other.agent.get(`/api/v1/catalog/properties/${unit.id}`)).status).toBe(404);
    const patch = await other.agent
      .patch(`/api/v1/catalog/properties/${unit.id}`)
      .set(other.csrfHeader)
      .send({ price: 1 });
    expect(patch.status).toBe(404);
  });

  it('SuperAdmin cannot see firm catalogs', async () => {
    const s = await signIn('superadmin@trustlisto.test');
    expect((await s.agent.get('/api/v1/catalog/properties')).status).toBe(403);
  });

  it('photos: images only, re-encoded, public only while the listing is live', async () => {
    const admin = await signIn('admin@advench.test');
    const unit = await prisma.property.findFirstOrThrow({
      where: { project: { name: 'Futura Homes Concepcion' }, status: 'LIVE' },
    });

    const bad = await admin.agent
      .post(`/api/v1/catalog/properties/${unit.id}/photos`)
      .set(admin.csrfHeader)
      .attach('file', Buffer.from('%PDF-1.4 not a photo'), 'photo.jpg');
    expect(bad.status).toBe(400);

    const ok = await admin.agent
      .post(`/api/v1/catalog/properties/${unit.id}/photos`)
      .set(admin.csrfHeader)
      .attach('file', png, 'photo.png')
      .expect(201);
    const photo = await prisma.propertyPhoto.findUniqueOrThrow({ where: { id: ok.body.id } });
    expect(photo.key).toMatch(/\.webp$/);

    const live = await pub(`/photos/${photo.id}`);
    expect(live.status).toBe(302);

    await prisma.property.update({ where: { id: unit.id }, data: { status: 'DRAFT' } });
    try {
      expect((await pub(`/photos/${photo.id}`)).status).toBe(404);
    } finally {
      await prisma.property.update({ where: { id: unit.id }, data: { status: 'LIVE' } });
    }
  });

  it('loan quotations: add, edit, delete', async () => {
    const admin = await signIn('admin@advench.test');
    const unit = await prisma.property.findFirstOrThrow({
      where: { project: { name: 'St. Andrew Homes Pacol' } },
    });
    const q = await admin.agent
      .post(`/api/v1/catalog/properties/${unit.id}/quotations`)
      .set(admin.csrfHeader)
      .send({
        label: 'Spot cash',
        paymentMethod: 'CASH',
        reservationFee: 20000,
        downpaymentPct: 100,
        dpTermMonths: 0,
        monthlyDp: 0,
        loanAmount: 0,
      })
      .expect(201);
    await admin.agent
      .patch(`/api/v1/catalog/quotations/${q.body.id}`)
      .set(admin.csrfHeader)
      .send({ notes: '5% discount' })
      .expect(200);
    await admin.agent
      .delete(`/api/v1/catalog/quotations/${q.body.id}`)
      .set(admin.csrfHeader)
      .expect(204);
  });
});

describe('firm loan defaults (SPEC §7.4)', () => {
  it('admin edits them, they are audited, and buyers see them on that firm’s listings', async () => {
    const admin = await signIn('admin@bicolprime.test');
    const res = await admin.agent
      .put('/api/v1/settings/firm')
      .set(admin.csrfHeader)
      .send({ loanRatePct: 7.5, loanTermYears: 20, loanDownpaymentPct: 15, loanIncomeRatioPct: 30 })
      .expect(200);
    expect(res.body).toMatchObject({ loanRatePct: 7.5, loanTermYears: 20 });

    const list = await pub('/properties?q=Highlands').expect(200);
    const detail = await pub(`/properties/${list.body.data[0].slug}`).expect(200);
    expect(detail.body.loanDefaults).toEqual({
      annualRatePct: 7.5,
      years: 20,
      downpaymentPct: 15,
      incomeRatioPct: 30,
    });

    const other = await pub('/properties?q=Camella').expect(200);
    const advDetail = await pub(`/properties/${other.body.data[0].slug}`).expect(200);
    expect(advDetail.body.loanDefaults.annualRatePct).toBe(6.25);

    // The newest one: other test files also change firm settings.
    const row = await prisma.auditLog.findFirst({
      where: { action: 'FIRM_SETTINGS_UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(row?.after).toMatchObject({ loanRatePct: 7.5 });
  });

  it('rejects unrealistic values and non-admins', async () => {
    const admin = await signIn('admin@advench.test');
    const bad = await admin.agent
      .put('/api/v1/settings/firm')
      .set(admin.csrfHeader)
      .send({ loanRatePct: 99, loanTermYears: 30, loanDownpaymentPct: 10, loanIncomeRatioPct: 35 });
    expect(bad.status).toBe(400);
    const broker = await signIn('broker1@advench.test');
    expect((await broker.agent.get('/api/v1/settings/firm')).status).toBe(200);
    const put = await broker.agent
      .put('/api/v1/settings/firm')
      .set(broker.csrfHeader)
      .send({ loanRatePct: 5, loanTermYears: 30, loanDownpaymentPct: 10, loanIncomeRatioPct: 35 });
    expect(put.status).toBe(403);
  });
});
