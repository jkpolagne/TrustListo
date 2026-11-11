// M9 acceptance (SPEC §15): the §17 demo spine, one deal from inquiry to rating, through the API
// only. The database is read to look up ids, never written: no manual DB edits.
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { closeOcr } from '../src/modules/docai/ocr';
import { whenIdle } from '../src/modules/docai/queue';
import * as mock from '../prisma/seed-docs/mockDocs';
import { app, signIn } from './helpers';

vi.setConfig({ testTimeout: 180_000 }); // real OCR on several documents

afterAll(async () => {
  await closeOcr();
  await prisma.$disconnect();
});

const today = new Date().toISOString().slice(0, 10);
const BUYER = { given: 'ROSA', last: 'MENDIOLA', full: 'Rosa Mendiola' };

describe('§17 demo script, steps 3–8 plus closing and rating', () => {
  it('runs end to end without touching the database', async () => {
    const firm = await prisma.firm.findFirstOrThrow({ where: { name: 'Advench Realty' } });
    const unit = await prisma.property.findFirstOrThrow({
      where: {
        firmId: firm.id,
        status: 'LIVE',
        project: { developer: { name: { contains: 'Camella' } } },
      },
      orderBy: { price: 'asc' },
    });
    const spUser = await prisma.user.findUniqueOrThrow({ where: { email: 'sp1@advench.test' } });
    const smUser = await prisma.user.findUniqueOrThrow({ where: { id: spUser.managerId! } });
    const sp = await signIn('sp1@advench.test');
    const admin = await signIn('admin@advench.test');
    const broker = await signIn('broker1@advench.test');
    const brokerUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'broker1@advench.test' },
    });

    // 3. A buyer inquires through the salesperson's referral link → auto-assigned.
    const inquiry = await request(app).post('/api/v1/public/inquiries').send({
      propertyId: unit.id,
      ref: spUser.referralCode,
      buyerName: BUYER.full,
      buyerPhone: '09171112233',
      natureOfWork: 'OFW',
      paymentPref: 'PAG_IBIG',
      civilStatus: 'MARRIED',
      consent: true,
    });
    expect(inquiry.status).toBe(201);
    const lead = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.body.id } });
    expect(lead.consultantId).toBe(spUser.id);

    // 4. The salesperson schedules a visit; the CompanyAdmin approves it (rule 10).
    const visit = await sp.agent
      .post('/api/v1/visits')
      .set(sp.csrfHeader)
      .send({ inquiryId: lead.id, scheduledAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect(visit.status).toBe(201);
    const approved = await admin.agent
      .patch(`/api/v1/visits/${visit.body.id}`)
      .set(admin.csrfHeader)
      .send({ status: 'APPROVED' });
    expect(approved.status).toBe(200);

    // 5. Converted to a client: Pag-IBIG, married, OFW → checklist generated.
    const tcp = Number(unit.price);
    const dp = Math.round(tcp * 0.1);
    const rcpt = await sp.agent
      .post(`/api/v1/inquiries/${lead.id}/receipt`)
      .set(sp.csrfHeader)
      .attach(
        'file',
        await mock.paymentReceipt({
          orNumber: 'AR-91001',
          date: today,
          payor: `${BUYER.given} ${BUYER.last}`,
          amount: 20_000,
          issuer: 'Vista Land (Camella)',
          purpose: 'Reservation fee',
        }),
        'r.png',
      );
    await whenIdle();
    const conv = await sp.agent
      .post(`/api/v1/inquiries/${lead.id}/convert`)
      .set(sp.csrfHeader)
      .send({
        receiptDocumentId: rcpt.body.documentId,
        amount: 20_000,
        paidAt: today,
        tcp,
        downpaymentAmount: dp,
        paymentMethod: 'PAG_IBIG',
        civilStatus: 'MARRIED',
        employmentType: 'OFW',
      });
    expect(conv.status).toBe(201);
    const clientId = conv.body.clientId as string;
    const commission = await prisma.commission.findUniqueOrThrow({
      where: { clientId },
      include: { tranches: { orderBy: { sequence: 'asc' } } },
    });
    expect(commission.tranches.map((t) => t.label)).toEqual([
      'Tranche 1',
      'Tranche 2',
      'Tranche 3',
      'Retention',
    ]);

    // 6. A downpayment receipt → amount prefilled → confirmed → 30% of DP reached → BLOCKED.
    const dpAmount = Math.ceil(dp * 0.3) - 20_000 + 1_000;
    const pay = await sp.agent
      .post(`/api/v1/clients/${clientId}/payments`)
      .set(sp.csrfHeader)
      .field('kind', 'DOWNPAYMENT')
      .attach(
        'file',
        await mock.paymentReceipt({
          orNumber: 'AR-91002',
          date: today,
          payor: `${BUYER.given} ${BUYER.last}`,
          amount: dpAmount,
          issuer: 'Vista Land (Camella)',
          purpose: 'Downpayment',
        }),
        'dp.png',
      );
    await whenIdle();
    const read = await sp.agent.get(`/api/v1/documents/${pay.body.documentId}`);
    expect(Number(read.body.extracted.amount.value)).toBe(dpAmount); // prefill
    await sp.agent
      .post(`/api/v1/payments/${pay.body.paymentId}/confirm`)
      .set(sp.csrfHeader)
      .send({ amount: dpAmount, paidAt: today });
    const statuses = async () =>
      (
        await prisma.commissionTranche.findMany({
          where: { commissionId: commission.id },
          orderBy: { sequence: 'asc' },
        })
      ).map((t) => t.status);
    expect(await statuses()).toEqual(['BLOCKED', 'WAITING', 'WAITING', 'WAITING']);

    // 7. IDs uploaded; one is someone else's → NAME_MISMATCH → broker rejects; the right one is
    //    uploaded; the broker approves both → tranche 1 AWAITING_TRANSMITTAL with aging.
    const items = (await sp.agent.get(`/api/v1/clients/${clientId}`)).body.requirements as {
      id: string;
      code: string;
      appliesTo: string;
    }[];
    const item = (code: string) => items.find((i) => i.code === code && i.appliesTo === 'BUYER')!;
    const upload = async (itemId: string, file: Buffer) => {
      const r = await sp.agent
        .post(`/api/v1/requirements/${itemId}/documents`)
        .set(sp.csrfHeader)
        .attach('file', file, 'id.png');
      expect(r.status).toBe(201);
    };
    const id = (kind: 'philsys' | 'drivers', last: string, given: string, n: string) =>
      mock.validId({
        kind,
        last,
        given,
        middle: 'CRUZ',
        idNumber: n,
        birth: '1988-04-12',
        ...(kind === 'drivers' ? { expiry: '2030-04-12' } : {}),
      });
    await upload(
      item('VALID_ID_1').id,
      await id('philsys', BUYER.last, BUYER.given, '5555-6666-7777-8888'),
    );
    await upload(
      item('VALID_ID_2').id,
      await id('philsys', 'SANTOS', 'PEDRO', '1234-5678-9012-3456'),
    );
    await whenIdle();
    const docOf = async (code: string) =>
      (await prisma.requirementItem.findUniqueOrThrow({ where: { id: item(code).id } }))
        .documentId!;
    const wrong = await prisma.document.findUniqueOrThrow({
      where: { id: await docOf('VALID_ID_2') },
    });
    expect((wrong.flags as { code: string }[]).map((f) => f.code)).toContain('NAME_MISMATCH');
    await broker.agent
      .post(`/api/v1/reviews/documents/${wrong.id}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'This ID belongs to someone else.' });
    await upload(
      item('VALID_ID_2').id,
      await id('drivers', BUYER.last, BUYER.given, 'N01-88-123456'),
    );
    await whenIdle();
    for (const code of ['VALID_ID_1', 'VALID_ID_2']) {
      const ok = await broker.agent
        .post(`/api/v1/reviews/documents/${await docOf(code)}/approve`)
        .set(broker.csrfHeader)
        .send({});
      expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    }
    expect(await statuses()).toEqual(['AWAITING_TRANSMITTAL', 'WAITING', 'WAITING', 'WAITING']);
    const list = await broker.agent.get('/api/v1/commissions');
    const t1 = commission.tranches[0]!;
    expect(list.body.awaiting).toContainEqual({
      trancheId: t1.id,
      commissionId: commission.id,
      bucket: '0–30',
    });

    // 8. Admin uploads the transmittal → AI amount check → confirm → READY; broker vouchers and
    //    signs first; the manager and the salesperson sign → RELEASED.
    const tx = await admin.agent
      .post(`/api/v1/tranches/${t1.id}/transmittal`)
      .set(admin.csrfHeader)
      .attach(
        'file',
        await mock.transmittal({
          developer: 'Vista Land (Camella)',
          firm: 'Advench Realty',
          date: today,
          buyer: `${BUYER.given} ${BUYER.last}`,
          unit: unit.title,
          tranche: 'Tranche 1',
          amount: Number(t1.amount),
        }),
        't.png',
      );
    expect(tx.status).toBe(201);
    await whenIdle();
    const txDoc = await prisma.document.findUniqueOrThrow({ where: { id: tx.body.documentId } });
    expect((txDoc.flags as { code: string }[] | null)?.map((f) => f.code) ?? []).not.toContain(
      'AMOUNT_MISMATCH',
    );
    await admin.agent
      .post(`/api/v1/tranches/${t1.id}/transmittal/confirm`)
      .set(admin.csrfHeader)
      .send({ amount: Number(t1.amount) });
    expect((await statuses())[0]).toBe('READY_FOR_RELEASE');

    const voucher = await broker.agent
      .post(`/api/v1/tranches/${t1.id}/voucher`)
      .set(broker.csrfHeader)
      .send({});
    expect(voucher.status).toBe(201);
    const sign = async (who: Awaited<ReturnType<typeof signIn>>, name: string) =>
      who.agent
        .post(`/api/v1/vouchers/${voucher.body.id}/sign`)
        .set(who.csrfHeader)
        .send({ typedName: name });
    const sm = await signIn(smUser.email);
    expect((await sign(sm, `${smUser.firstName} ${smUser.lastName}`)).body.error.code).toBe(
      'BROKER_FIRST',
    );
    expect((await sign(broker, `${brokerUser.firstName} ${brokerUser.lastName}`)).status).toBe(200);
    expect((await sign(sm, `${smUser.firstName} ${smUser.lastName}`)).body.released).toBe(false);
    expect((await sign(sp, `${spUser.firstName} ${spUser.lastName}`)).body.released).toBe(true);
    expect(await statuses()).toEqual(['RELEASED', 'WAITING', 'WAITING', 'WAITING']);

    // Closing (§11): estimate, then the transfer steps → COMPLETED → rating link → buyer rates.
    const est = await sp.agent
      .put(`/api/v1/clients/${clientId}/closing`)
      .set(sp.csrfHeader)
      .send({ registrationFee: 9_500 });
    expect(est.body.clientStatus).toBe('CLOSING');
    const steps = est.body.checklist.map((i: { code: string }) => ({ code: i.code, done: true }));
    const done = await sp.agent
      .put(`/api/v1/clients/${clientId}/closing`)
      .set(sp.csrfHeader)
      .send({ items: steps });
    expect(done.body.clientStatus).toBe('COMPLETED');
    const rated = await request(app)
      .post(`/api/v1/public/ratings/${done.body.ratingToken}`)
      .send({ stars: 5, consent: true });
    expect(rated.status).toBe(201);

    // Every decision on the way is in the audit trail (rule 11).
    const actions = new Set(
      (
        await prisma.auditLog.findMany({
          where: { firmId: firm.id, createdAt: { gte: lead.createdAt } },
          select: { action: true },
        })
      ).map((a) => a.action),
    );
    for (const a of [
      'TRANSMITTAL_CONFIRMED',
      'VOUCHER_CREATED',
      'VOUCHER_SIGNED',
      'TRANCHE_RELEASED',
      'CLIENT_STATUS_CHANGED',
      'RATING_LINK_ISSUED',
      'RATING_SUBMITTED',
    ]) {
      expect(actions, a).toContain(a);
    }
  });
});
