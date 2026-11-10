// M5: seller "List Your Property" → agent → documents → broker approval → live (SPEC §7.6, §15 M5).
import { afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { closeOcr } from '../src/modules/docai/ocr';
import { whenIdle } from '../src/modules/docai/queue';
import * as mock from '../prisma/seed-docs/mockDocs';
import { SAMPLES } from '../prisma/seed-docs/samples';
import { app, signIn } from './helpers';

vi.setConfig({ testTimeout: 60_000 }); // real OCR of four documents

afterAll(async () => {
  await closeOcr();
  await prisma.$disconnect();
});

const sample = async (file: string) =>
  Buffer.from(await SAMPLES.find((s) => s.file === file)!.render());

async function pickableAgent(email: string) {
  return prisma.user.findUniqueOrThrow({ where: { email } });
}

function sellerForm(agentId: string, over: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    sellerName: 'Maria Lourdes Santos',
    sellerPhone: '09171234567',
    barangay: 'Concepcion Pequeña',
    city: 'Naga City',
    propertyType: 'LOT',
    lotAreaSqm: '240',
    askingPrice: '3600000',
    hasTitle: 'true',
    consent: 'true',
    agentId,
    website: '',
    ...over,
  };
  let r = request(app).post('/api/v1/public/seller-requests');
  for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
  return r;
}

describe('agent picker (§7.3, OPEN-1)', () => {
  it('lists only verified consultants of active firms, in a fresh random order', async () => {
    const res = await request(app).get('/api/v1/public/agents');
    expect(res.status).toBe(200);
    const ids: string[] = res.body.data.map((a: { id: string }) => a.id);
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      include: { credentials: true, firm: true },
    });
    for (const u of users) {
      expect(['SALES_MANAGER', 'SALES_PERSON']).toContain(u.role);
      expect(u.firm?.status).toBe('ACTIVE');
      expect(u.credentials.some((c) => c.status === 'APPROVED' && c.expiresAt! > new Date())).toBe(
        true,
      );
    }
    // Both firms are in the pool.
    expect(new Set(users.map((u) => u.firmId)).size).toBe(2);
    // Expired (sm3) and still-pending (sm2) credentials keep a consultant out.
    for (const email of ['sm3@advench.test', 'sm2@advench.test', 'broker1@advench.test']) {
      expect(ids).not.toContain((await pickableAgent(email)).id);
    }
    const orders = new Set<string>();
    for (let i = 0; i < 8; i++) {
      orders.add(
        (await request(app).get('/api/v1/public/agents')).body.data
          .map((a: { id: string }) => a.id)
          .join(),
      );
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('List Your Property form', () => {
  it('refuses untitled properties (OPEN-2), missing consent, bots and unverified agents', async () => {
    const agent = await pickableAgent('sm@bicolprime.test');
    const untitled = await sellerForm(agent.id, { hasTitle: 'false' });
    expect(untitled.body.error.code).toBe('TITLE_REQUIRED');
    const noConsent = await sellerForm(agent.id, { consent: 'false' });
    expect(noConsent.body.error.code).toBe('CONSENT_REQUIRED');
    expect((await sellerForm(agent.id, { website: 'http://spam.example' })).status).toBe(400);
    const expired = await pickableAgent('sm3@advench.test');
    expect((await sellerForm(expired.id)).body.error.code).toBe('AGENT_UNAVAILABLE');
  });

  it('creates a request for the chosen agent, with photos', async () => {
    const agent = await pickableAgent('sm@bicolprime.test');
    const photo = await mock.landTitle({
      titleNumber: 'X',
      owner: 'X',
      lotNumber: '1',
      areaSqm: 1,
      barangay: 'X',
      entered: '2020-01-01',
      entries: [],
    });
    const res = await sellerForm(agent.id).attach('photos', photo, 'front.png');
    expect(res.status).toBe(201);
    const r = await prisma.sellerListingRequest.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(r).toMatchObject({ firmId: agent.firmId, agentId: agent.id, status: 'NEW' });
    expect(r.photoKeys).toHaveLength(1);
  });
});

describe('seller listing goes live with earned badges (M5 acceptance)', () => {
  it('runs end to end', async () => {
    const agentUser = await pickableAgent('sm@bicolprime.test');
    const created = await sellerForm(agentUser.id);
    expect(created.status).toBe(201);
    const id = created.body.id;

    // Only the chosen agent's firm sees it; within the firm, other agents don't.
    const other = await signIn('sp1@bicolprime.test');
    expect((await other.agent.get(`/api/v1/seller-requests/${id}`)).status).toBe(404);
    const advench = await signIn('broker1@advench.test');
    expect((await advench.agent.get(`/api/v1/seller-requests/${id}`)).status).toBe(404);
    const admin = await signIn('admin@bicolprime.test');
    expect((await admin.agent.get(`/api/v1/seller-requests/${id}`)).status).toBe(200);
    expect(
      (await admin.agent.post(`/api/v1/seller-requests/${id}/accept`).set(admin.csrfHeader)).status,
    ).toBe(403);

    const agent = await signIn('sm@bicolprime.test');
    const list = await agent.agent.get('/api/v1/seller-requests');
    expect(list.body.data.map((r: { id: string }) => r.id)).toContain(id);
    expect(
      (await agent.agent.post(`/api/v1/seller-requests/${id}/accept`).set(agent.csrfHeader)).status,
    ).toBe(200);

    const year = new Date().getFullYear();
    const files: [string, Buffer][] = [
      ['LAND_TITLE', await sample('title-santos.png')],
      ['TAX_DECLARATION', await sample('taxdec-santos.png')],
      [
        'RPT_RECEIPT',
        await mock.rptReceipt({
          orNumber: '7845999',
          date: `${year}-01-20`,
          payor: 'MARIA LOURDES S. SANTOS',
          tdNumber: '2024-05-0123',
          period: `1st-4th Qtr ${year}`,
          basic: 2_880,
        }),
      ],
    ];
    for (const [type, file] of files) {
      const up = await agent.agent
        .post(`/api/v1/seller-requests/${id}/documents`)
        .set(agent.csrfHeader)
        .field('declaredType', type)
        .attach('file', file, `${type}.png`);
      expect(up.status, type).toBe(201);
    }
    const submitBody = {
      title: 'Residential lot near the cathedral',
      barangay: 'Concepcion Pequeña',
      city: 'Naga City',
      location: { lat: 13.6268, lng: 123.2072 },
    };
    const early = await agent.agent
      .post(`/api/v1/seller-requests/${id}/submit`)
      .set(agent.csrfHeader)
      .send(submitBody);
    expect(early.body.error.code).toBe('DOCUMENTS_MISSING');

    const idUp = await agent.agent
      .post(`/api/v1/seller-requests/${id}/documents`)
      .set(agent.csrfHeader)
      .field('declaredType', 'SELLER_ID')
      .attach('file', await sample('id-santos.png'), 'id.png');
    expect(idUp.status).toBe(201);
    // The agent can open their own documents.
    expect((await agent.agent.get(`/api/v1/documents/${idUp.body.id}/url`)).status).toBe(200);
    expect((await other.agent.get(`/api/v1/documents/${idUp.body.id}/url`)).status).toBe(404);

    await whenIdle();
    const submit = await agent.agent
      .post(`/api/v1/seller-requests/${id}/submit`)
      .set(agent.csrfHeader)
      .send(submitBody);
    expect(submit.status).toBe(200);
    expect(submit.body.status).toBe('PENDING_REVIEW');
    const propertyId = submit.body.propertyId;
    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: { photos: true },
    });
    expect(property).toMatchObject({ source: 'INDIVIDUAL_SELLER', assignedAgentId: agentUser.id });

    // Not public until the broker approves.
    expect((await request(app).get(`/api/v1/public/properties/${property.slug}`)).status).toBe(404);

    const broker = await signIn('broker@bicolprime.test');
    const queue = await broker.agent.get('/api/v1/reviews/queue');
    expect(queue.body.listings.map((l: { id: string }) => l.id)).toContain(propertyId);
    const tooSoon = await broker.agent
      .post(`/api/v1/reviews/properties/${propertyId}/approve`)
      .set(broker.csrfHeader);
    expect(tooSoon.body.error.code).toBe('DOCUMENTS_NOT_APPROVED');

    // A broker sends it back once; the agent sees why and resubmits.
    const reject = await broker.agent
      .post(`/api/v1/reviews/properties/${propertyId}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'Add a photo of the street frontage.' });
    expect(reject.status).toBe(200);
    const detail = await agent.agent.get(`/api/v1/seller-requests/${id}`);
    expect(detail.body.status).toBe('DOCUMENTS_IN_PROGRESS');
    expect(detail.body.rejection.reason).toContain('street frontage');
    const again = await agent.agent
      .post(`/api/v1/seller-requests/${id}/submit`)
      .set(agent.csrfHeader)
      .send(submitBody);
    expect(again.body.propertyId).toBe(propertyId);

    const review = await broker.agent.get(`/api/v1/reviews/properties/${propertyId}`);
    expect(review.status).toBe(200);
    for (const d of review.body.documents) {
      const ok = await broker.agent
        .post(`/api/v1/reviews/documents/${d.document.id}/approve`)
        .set(broker.csrfHeader)
        .send({});
      expect(ok.status, d.type).toBe(200);
    }
    const approve = await broker.agent
      .post(`/api/v1/reviews/properties/${propertyId}/approve`)
      .set(broker.csrfHeader);
    expect(approve.status).toBe(200);
    expect(approve.body.badges.sort()).toEqual([
      'OWNERSHIP_VERIFIED',
      'TAX_CURRENT',
      'TITLE_CLEAN',
    ]);

    const pub = await request(app).get(`/api/v1/public/properties/${property.slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.badges.map((b: { type: string }) => b.type).sort()).toEqual([
      'OWNERSHIP_VERIFIED',
      'TAX_CURRENT',
      'TITLE_CLEAN',
    ]);
    expect((await prisma.sellerListingRequest.findUniqueOrThrow({ where: { id } })).status).toBe(
      'LISTED',
    );
    const log = await prisma.auditLog.findFirst({
      where: { entityId: propertyId, action: 'LISTING_APPROVED' },
    });
    expect(log?.actorId).toBeTruthy();
  });

  it('a decline is recorded with its reason', async () => {
    const agentUser = await pickableAgent('sm@bicolprime.test');
    const created = await sellerForm(agentUser.id, { sellerName: 'Jose Ramos' });
    const agent = await signIn('sm@bicolprime.test');
    const res = await agent.agent
      .post(`/api/v1/seller-requests/${created.body.id}/decline`)
      .set(agent.csrfHeader)
      .send({ reason: 'Outside our service area.' });
    expect(res.status).toBe(200);
    const log = await prisma.auditLog.findFirst({
      where: { entityId: created.body.id, action: 'SELLER_REQUEST_DECLINED' },
    });
    expect(JSON.stringify(log?.after)).toContain('service area');
  });
});
