// M6: inquiries (referral, organic picker, seller-agent routing), leads, visits (SPEC §7.2, §10.8).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { app, signIn } from './helpers';

afterAll(() => prisma.$disconnect());

let devListing: { id: string; firmId: string };
let sp1: { id: string; referralCode: string | null; managerId: string | null };

beforeAll(async () => {
  const adv = await prisma.firm.findFirstOrThrow({ where: { name: { contains: 'Advench' } } });
  devListing = await prisma.property.findFirstOrThrow({
    where: { firmId: adv.id, source: 'DEVELOPER', status: 'LIVE' },
    select: { id: true, firmId: true },
  });
  sp1 = await prisma.user.findUniqueOrThrow({
    where: { email: 'sp1@advench.test' },
    select: { id: true, referralCode: true, managerId: true },
  });
});

const buyer = (over: Record<string, unknown> = {}) => ({
  propertyId: devListing.id,
  buyerName: 'Jose Rizal Santos',
  buyerPhone: '09171112222',
  natureOfWork: 'OFW',
  paymentPref: 'PAG_IBIG',
  civilStatus: 'MARRIED',
  message: 'Interested',
  consent: true,
  ...over,
});
const inquire = (body: object) => request(app).post('/api/v1/public/inquiries').send(body);

describe('routing (§7.2)', () => {
  it('a referral link auto-assigns its consultant (M6 acceptance)', async () => {
    const pool = await request(app).get(
      `/api/v1/public/properties/${devListing.id}/consultants?ref=${sp1.referralCode}`,
    );
    expect(pool.body.mode).toBe('REFERRAL');
    expect(pool.body.data.map((c: { id: string }) => c.id)).toEqual([sp1.id]);

    const res = await inquire(buyer({ ref: sp1.referralCode!.toLowerCase() }));
    expect(res.status).toBe(201);
    const inq = await prisma.inquiry.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(inq).toMatchObject({
      consultantId: sp1.id,
      source: 'REFERRAL',
      firmId: devListing.firmId,
    });
  });

  it('organic inquiries pick from a shuffled pool of the listing firm only (M6 acceptance)', async () => {
    const orders = new Set<string>();
    let ids: string[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await request(app).get(`/api/v1/public/properties/${devListing.id}/consultants`);
      expect(res.body.mode).toBe('PICK');
      ids = res.body.data.map((c: { id: string }) => c.id);
      orders.add(ids.join());
    }
    expect(orders.size).toBeGreaterThan(1);
    const people = await prisma.user.findMany({ where: { id: { in: ids } } });
    expect(people.every((p) => p.firmId === devListing.firmId)).toBe(true);
    expect(people.every((p) => p.role === 'SALES_MANAGER' || p.role === 'SALES_PERSON')).toBe(true);

    // Must choose; can't choose someone outside the pool (no co-broke, rule 8).
    expect((await inquire(buyer())).body.error.code).toBe('CHOOSE_CONSULTANT');
    const outsider = await prisma.user.findUniqueOrThrow({
      where: { email: 'sp1@bicolprime.test' },
    });
    expect((await inquire(buyer({ consultantId: outsider.id }))).body.error.code).toBe(
      'CHOOSE_CONSULTANT',
    );
    // Another firm's referral code is ignored, not honoured.
    const pool = await request(app).get(
      `/api/v1/public/properties/${devListing.id}/consultants?ref=${outsider.referralCode}`,
    );
    expect(pool.body.mode).toBe('PICK');

    const res = await inquire(buyer({ consultantId: ids[0] }));
    expect(res.status).toBe(201);
    expect((await prisma.inquiry.findUniqueOrThrow({ where: { id: res.body.id } })).source).toBe(
      'ORGANIC',
    );
  });

  it("an individual seller's listing always goes to the seller's agent", async () => {
    const p = await prisma.property.findFirstOrThrow({
      where: { source: 'INDIVIDUAL_SELLER', firmId: devListing.firmId },
    });
    await prisma.property.update({ where: { id: p.id }, data: { status: 'LIVE' } });
    const pool = await request(app).get(`/api/v1/public/properties/${p.id}/consultants`);
    expect(pool.body.mode).toBe('ASSIGNED');
    const res = await inquire(
      buyer({
        propertyId: p.id,
        consultantId: sp1.id === p.assignedAgentId ? undefined : sp1.id,
        ref: sp1.referralCode,
      }),
    );
    expect(res.status).toBe(201);
    expect(
      (await prisma.inquiry.findUniqueOrThrow({ where: { id: res.body.id } })).consultantId,
    ).toBe(p.assignedAgentId);
  });

  it('refuses a missing consent, bots, and hidden listings', async () => {
    expect((await inquire(buyer({ consultantId: sp1.id, consent: false }))).status).toBe(400);
    expect((await inquire(buyer({ consultantId: sp1.id, website: 'x' }))).status).toBe(400);
    const hidden = await prisma.property.findFirstOrThrow({ where: { status: { not: 'LIVE' } } });
    expect((await inquire(buyer({ propertyId: hidden.id }))).status).toBe(404);
  });
});

describe('leads dashboard (§10.1, §5.2)', () => {
  it('scopes leads: own, team, firm — and only the handler updates them', async () => {
    const lead = await prisma.inquiry.findFirstOrThrow({
      where: { consultantId: sp1.id, status: 'NEW' },
    });
    const me = await signIn('sp1@advench.test');
    expect(
      (await me.agent.get('/api/v1/inquiries')).body.data.every(
        (l: { consultantId: string }) => l.consultantId === sp1.id,
      ),
    ).toBe(true);
    expect((await me.agent.get(`/api/v1/inquiries/${lead.id}`)).status).toBe(200);

    const peer = await signIn('sp2@advench.test');
    expect((await peer.agent.get(`/api/v1/inquiries/${lead.id}`)).status).toBe(404);
    const otherFirm = await signIn('broker@bicolprime.test');
    expect((await otherFirm.agent.get(`/api/v1/inquiries/${lead.id}`)).status).toBe(404);

    const manager = await prisma.user.findUniqueOrThrow({ where: { id: sp1.managerId! } });
    const sm = await signIn(manager.email);
    expect((await sm.agent.get(`/api/v1/inquiries/${lead.id}`)).status).toBe(200);
    expect(
      (
        await sm.agent
          .patch(`/api/v1/inquiries/${lead.id}`)
          .set(sm.csrfHeader)
          .send({ status: 'CONTACTED' })
      ).status,
    ).toBe(403);
    const broker = await signIn('broker1@advench.test');
    expect((await broker.agent.get(`/api/v1/inquiries/${lead.id}`)).status).toBe(200);

    const ok = await me.agent
      .patch(`/api/v1/inquiries/${lead.id}`)
      .set(me.csrfHeader)
      .send({ status: 'CONTACTED' });
    expect(ok.status).toBe(200);
    const noReason = await me.agent
      .patch(`/api/v1/inquiries/${lead.id}`)
      .set(me.csrfHeader)
      .send({ status: 'LOST' });
    expect(noReason.status).toBe(400);
    const lost = await me.agent
      .patch(`/api/v1/inquiries/${lead.id}`)
      .set(me.csrfHeader)
      .send({ status: 'LOST', reason: 'Budget too low.' });
    expect(lost.status).toBe(200);
    expect((await me.agent.get(`/api/v1/inquiries/${lead.id}`)).body.lostReason).toBe(
      'Budget too low.',
    );
  });
});

describe('visits (§10.8, rule 10) — M6 acceptance', () => {
  it('consultant schedules, admin approves or declines, consultant records the outcome', async () => {
    const lead = await prisma.inquiry.findFirstOrThrow({
      where: { consultantId: sp1.id, status: 'QUALIFIED' },
    });
    const sp = await signIn('sp1@advench.test');
    const at = new Date(Date.now() + 5 * 24 * 3_600_000);
    const first = await sp.agent
      .post('/api/v1/visits')
      .set(sp.csrfHeader)
      .send({ inquiryId: lead.id, scheduledAt: at });
    expect(first.status).toBe(201);
    expect(first.body.status).toBe('PENDING');
    // Second visit 30 minutes later: allowed, with a clash warning.
    const second = await sp.agent
      .post('/api/v1/visits')
      .set(sp.csrfHeader)
      .send({ inquiryId: lead.id, scheduledAt: new Date(at.getTime() + 30 * 60_000) });
    expect(second.body.warnings.length).toBeGreaterThan(0);

    const past = await sp.agent
      .post('/api/v1/visits')
      .set(sp.csrfHeader)
      .send({ inquiryId: lead.id, scheduledAt: new Date(Date.now() - 3_600_000) });
    expect(past.body.error.code).toBe('PAST_DATE');
    // A consultant can't approve their own visit; brokers only read.
    expect(
      (
        await sp.agent
          .patch(`/api/v1/visits/${first.body.id}`)
          .set(sp.csrfHeader)
          .send({ status: 'APPROVED' })
      ).status,
    ).toBe(403);
    const broker = await signIn('broker1@advench.test');
    expect(
      (
        await broker.agent
          .patch(`/api/v1/visits/${first.body.id}`)
          .set(broker.csrfHeader)
          .send({ status: 'APPROVED' })
      ).status,
    ).toBe(403);
    expect(
      (
        await broker.agent
          .post('/api/v1/visits')
          .set(broker.csrfHeader)
          .send({ inquiryId: lead.id, scheduledAt: at })
      ).status,
    ).toBe(403);

    const admin = await signIn('admin@advench.test');
    const approve = await admin.agent
      .patch(`/api/v1/visits/${first.body.id}`)
      .set(admin.csrfHeader)
      .send({ status: 'APPROVED' });
    expect(approve.status).toBe(200);
    expect((await prisma.inquiry.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe(
      'VISIT_SCHEDULED',
    );
    const declineNoReason = await admin.agent
      .patch(`/api/v1/visits/${second.body.id}`)
      .set(admin.csrfHeader)
      .send({ status: 'DECLINED' });
    expect(declineNoReason.body.error.code).toBe('REASON_REQUIRED');
    const decline = await admin.agent
      .patch(`/api/v1/visits/${second.body.id}`)
      .set(admin.csrfHeader)
      .send({ status: 'DECLINED', reason: 'Clashes with the earlier visit.' });
    expect(decline.body.status).toBe('DECLINED');

    const tooEarly = await sp.agent
      .patch(`/api/v1/visits/${first.body.id}`)
      .set(sp.csrfHeader)
      .send({ status: 'COMPLETED' });
    expect(tooEarly.body.error.code).toBe('NOT_YET');
    const moved = await sp.agent
      .patch(`/api/v1/visits/${first.body.id}`)
      .set(sp.csrfHeader)
      .send({ status: 'RESCHEDULED', scheduledAt: new Date(at.getTime() + 24 * 3_600_000) });
    expect(moved.body).toMatchObject({ status: 'PENDING', rescheduledFromId: first.body.id });
    expect((await prisma.visit.findUniqueOrThrow({ where: { id: first.body.id } })).status).toBe(
      'RESCHEDULED',
    );

    // Admin sees all visits; another firm sees none of these.
    const all = await admin.agent.get('/api/v1/visits');
    expect(all.body.data.map((v: { id: string }) => v.id)).toContain(moved.body.id);
    const other = await signIn('admin@bicolprime.test');
    expect(
      (await other.agent.get('/api/v1/visits')).body.data.map((v: { id: string }) => v.id),
    ).not.toContain(moved.body.id);

    const logs = await prisma.auditLog.count({
      where: { entityId: { in: [first.body.id, second.body.id] } },
    });
    expect(logs).toBeGreaterThanOrEqual(5);
  });
});
