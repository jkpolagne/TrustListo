// M9: closing estimate + checklist (§11), one-time rating link (§12), reports (§10.6).
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, signIn } from './helpers';

afterAll(async () => {
  await prisma.$disconnect();
});

const ALL = [
  'DEED_SIGNED',
  'CGT_DST_PAID',
  'ECAR_OBTAINED',
  'TRANSFER_TAX_PAID',
  'TITLE_TRANSFERRED',
  'TAX_DEC_ISSUED',
  'KEYS_TURNED_OVER',
];

describe('M9: closing → completed → rating', () => {
  let token = '';

  it('scopes the closing record and lets only the handling consultant edit it', async () => {
    const noel = await prisma.client.findFirstOrThrow({ where: { fullName: 'Noel Santiago' } });
    const sp2 = await signIn('sp2@advench.test');
    const first = await sp2.agent.get(`/api/v1/clients/${noel.id}/closing`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ saved: false, canEdit: true, clientStatus: 'ACTIVE' });
    expect(first.body.computation.sellingPrice).toBe(Number(noel.tcp));

    // Another salesperson, another firm: 404. The broker reads but can't edit.
    const sp1 = await signIn('sp1@advench.test');
    expect((await sp1.agent.get(`/api/v1/clients/${noel.id}/closing`)).status).toBe(404);
    const other = await signIn('admin@bicolprime.test');
    expect((await other.agent.get(`/api/v1/clients/${noel.id}/closing`)).status).toBe(404);
    const broker = await signIn('broker1@advench.test');
    const seen = await broker.agent.get(`/api/v1/clients/${noel.id}/closing`);
    expect(seen.status).toBe(200);
    expect(seen.body.canEdit).toBe(false);
    expect(
      (
        await broker.agent
          .put(`/api/v1/clients/${noel.id}/closing`)
          .set(broker.csrfHeader)
          .send({ items: [{ code: 'DEED_SIGNED', done: true }] })
      ).status,
    ).toBe(403);
  });

  it('saving the estimate starts closing, and the saved rates never change afterwards', async () => {
    const noel = await prisma.client.findFirstOrThrow({ where: { fullName: 'Noel Santiago' } });
    const sp2 = await signIn('sp2@advench.test');
    const saved = await sp2.agent
      .put(`/api/v1/clients/${noel.id}/closing`)
      .set(sp2.csrfHeader)
      .send({ taxBase: 1_500_000, registrationFee: 8_000 });
    expect(saved.status).toBe(200);
    expect(saved.body.clientStatus).toBe('CLOSING');
    expect(saved.body.computation).toMatchObject({ taxBase: 1_500_000, taxBaseOverride: true });
    const cgt = saved.body.computation.lines.find((l: { code: string }) => l.code === 'CGT');
    expect(cgt.amount).toBe(90_000); // 6% of the override

    // The admin raises CGT; Noel's saved estimate keeps the old rate.
    const admin = await signIn('admin@advench.test');
    const firm = (await admin.agent.get('/api/v1/settings/firm')).body;
    const { name: _n, ...rest } = firm;
    await admin.agent
      .put('/api/v1/settings/firm')
      .set(admin.csrfHeader)
      .send({ ...rest, cgtRatePct: 7 });
    const again = await sp2.agent.get(`/api/v1/clients/${noel.id}/closing`);
    expect(again.body.computation.rates.cgtRatePct).toBe(6);
    await admin.agent.put('/api/v1/settings/firm').set(admin.csrfHeader).send(rest);

    const log = await prisma.auditLog.findFirst({
      where: { entityId: noel.id, action: 'CLIENT_STATUS_CHANGED' },
    });
    expect(log?.after).toEqual({ status: 'CLOSING' });
  });

  it('the last tick completes the sale, audits each tick, and issues the rating link once', async () => {
    const noel = await prisma.client.findFirstOrThrow({ where: { fullName: 'Noel Santiago' } });
    const sp2 = await signIn('sp2@advench.test');
    const put = (items: { code: string; done: boolean }[]) =>
      sp2.agent.put(`/api/v1/clients/${noel.id}/closing`).set(sp2.csrfHeader).send({ items });

    const almost = await put(ALL.slice(0, -1).map((code) => ({ code, done: true })));
    expect(almost.body.clientStatus).toBe('CLOSING');
    expect(almost.body.ratingToken).toBeNull();
    expect(almost.body.checklist[0].doneBy).toBe('Carlo Garcia');

    const done = await put([{ code: 'KEYS_TURNED_OVER', done: true }]);
    expect(done.body.clientStatus).toBe('COMPLETED');
    expect(done.body.ratingToken).toMatch(/^[\w-]{32}$/);
    token = done.body.ratingToken;
    expect(done.body.ratingLink.usedAt).toBeNull();

    // Final once completed; only a hash of the token is stored.
    expect((await put([{ code: 'DEED_SIGNED', done: false }])).status).toBe(409);
    const terms = await sp2.agent
      .patch(`/api/v1/clients/${noel.id}`)
      .set(sp2.csrfHeader)
      .send({ paymentMethod: 'BANK', civilStatus: 'SINGLE', employmentType: 'OFW' });
    expect(terms.body.error.code).toBe('CLIENT_CLOSED');
    const stored = await prisma.ratingToken.findUniqueOrThrow({ where: { clientId: noel.id } });
    expect(stored.tokenHash).not.toContain(token);
    const actions = (
      await prisma.auditLog.findMany({ where: { entityId: noel.id }, select: { action: true } })
    ).map((a) => a.action);
    expect(actions.filter((a) => a === 'CLOSING_ITEM_DONE')).toHaveLength(ALL.length);
    expect(actions).toEqual(
      expect.arrayContaining(['CLIENT_STATUS_CHANGED', 'RATING_LINK_ISSUED']),
    );
  });

  it('the buyer rates once through the link, without an account', async () => {
    const page = await request(app).get(`/api/v1/public/ratings/${token}`);
    expect(page.status).toBe(200);
    expect(page.body.consultant).toEqual({ firstName: 'Carlo', lastName: 'Garcia' });
    expect(page.body).not.toHaveProperty('client'); // no buyer data on a public page

    expect((await request(app).get('/api/v1/public/ratings/not-a-real-token')).status).toBe(404);
    const noConsent = await request(app).post(`/api/v1/public/ratings/${token}`).send({ stars: 5 });
    expect(noConsent.status).toBe(400);
    const sent = await request(app)
      .post(`/api/v1/public/ratings/${token}`)
      .send({ stars: 5, comment: 'Very patient with our Pag-IBIG papers.', consent: true });
    expect(sent.status).toBe(201);
    const twice = await request(app)
      .post(`/api/v1/public/ratings/${token}`)
      .send({ stars: 1, consent: true });
    expect(twice.status).toBe(410);

    // The profile shows the new average; the link can't be re-issued after a rating.
    const sp2 = await prisma.user.findUniqueOrThrow({ where: { email: 'sp2@advench.test' } });
    const profile = await request(app).get(`/api/v1/public/consultants/${sp2.id}`);
    expect(JSON.stringify(profile.body)).toContain('"count":1');
    const noel = await prisma.client.findFirstOrThrow({ where: { fullName: 'Noel Santiago' } });
    const agent = await signIn('sp2@advench.test');
    expect(
      (await agent.agent.post(`/api/v1/clients/${noel.id}/rating-link`).set(agent.csrfHeader))
        .status,
    ).toBe(409);
  });

  it('an expired link is refused, and re-issuing replaces it', async () => {
    const teresa = await prisma.client.findFirstOrThrow({ where: { fullName: 'Teresa Lim' } });
    const sp = await signIn('sp1@advench.test');
    // Not completed yet: no link.
    expect(
      (await sp.agent.post(`/api/v1/clients/${teresa.id}/rating-link`).set(sp.csrfHeader)).status,
    ).toBe(409);
    await sp.agent
      .put(`/api/v1/clients/${teresa.id}/closing`)
      .set(sp.csrfHeader)
      .send({ items: ALL.map((code) => ({ code, done: true })) });
    const first = await sp.agent
      .post(`/api/v1/clients/${teresa.id}/rating-link`)
      .set(sp.csrfHeader);
    expect(first.status).toBe(201);
    await prisma.ratingToken.update({
      where: { clientId: teresa.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (await request(app).get(`/api/v1/public/ratings/${first.body.ratingToken}`)).status,
    ).toBe(410);
    const second = await sp.agent
      .post(`/api/v1/clients/${teresa.id}/rating-link`)
      .set(sp.csrfHeader);
    expect(
      (await request(app).get(`/api/v1/public/ratings/${second.body.ratingToken}`)).status,
    ).toBe(200);
  });
});

describe('M9: reports (§10.6)', () => {
  it('summarises the month for the firm and shows team performance', async () => {
    const admin = await signIn('admin@advench.test');
    const s = await admin.agent.get('/api/v1/reports/summary');
    expect(s.status).toBe(200);
    expect(s.body.completed).toBeGreaterThanOrEqual(2); // Noel and Teresa, above
    expect(s.body.reserved).toHaveProperty('totalTcp');
    expect((await admin.agent.get('/api/v1/reports/summary?month=2026-13')).status).toBe(400);

    const p = await admin.agent.get('/api/v1/reports/pipeline');
    expect(p.body.clients.COMPLETED).toBeGreaterThanOrEqual(2);
    const carlo = p.body.team.find((t: { firstName: string }) => t.firstName === 'Carlo');
    expect(carlo.completed).toBeGreaterThanOrEqual(1);
  });

  it('a sales manager sees only their team; a salesperson has no reports', async () => {
    const sm = await signIn('sm1@advench.test');
    const smUser = await prisma.user.findUniqueOrThrow({ where: { email: 'sm1@advench.test' } });
    const p = await sm.agent.get('/api/v1/reports/pipeline');
    expect(p.status).toBe(200);
    for (const t of p.body.team as { id: string; managerId: string | null }[]) {
      expect(t.id === smUser.id || t.managerId === smUser.id).toBe(true);
    }
    // Asking for someone outside the team returns nothing, not their numbers.
    const outsider = await prisma.user.findFirstOrThrow({
      where: { email: 'sm2@advench.test' },
    });
    const narrowed = await sm.agent.get(`/api/v1/reports/pipeline?consultantId=${outsider.id}`);
    expect(narrowed.body.team).toEqual([]);
    expect(narrowed.body.clients).toEqual({});

    const sp = await signIn('sp2@advench.test');
    expect((await sp.agent.get('/api/v1/reports/summary')).status).toBe(403);
  });
});
