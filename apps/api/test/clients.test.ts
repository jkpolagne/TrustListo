// M7: lead → client, checklist, buyer documents via Module 1, payments with receipt prefill.
import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { buildChecklist } from '../src/modules/clients/requirements.rules';
import { closeOcr } from '../src/modules/docai/ocr';
import { whenIdle } from '../src/modules/docai/queue';
import type { Extracted } from '../src/modules/docai/types';
import * as mock from '../prisma/seed-docs/mockDocs';
import { signIn } from './helpers';

vi.setConfig({ testTimeout: 60_000 }); // real OCR

afterAll(async () => {
  await closeOcr();
  await prisma.$disconnect();
});

const today = new Date().toISOString().slice(0, 10);
const receipt = (orNumber: string, amount: number, payor = 'DENNIS YAP') =>
  mock.paymentReceipt({
    orNumber,
    date: today,
    payor,
    amount,
    issuer: 'Vista Land (Camella)',
    purpose: 'Reservation fee, Camella Naga',
  });

describe('M7 acceptance', () => {
  it('converts a lead with a prefilled, confirmed receipt; checklist matches §9; docs verified by the broker', async () => {
    const lead = await prisma.inquiry.findFirstOrThrow({ where: { buyerName: 'Dennis Yap' } });
    const sp = await signIn('sp1@advench.test');

    // Step 1: receipt → Module 1 reads the amount for the form.
    const up = await sp.agent
      .post(`/api/v1/inquiries/${lead.id}/receipt`)
      .set(sp.csrfHeader)
      .attach('file', await receipt('AR-50017', 20_000), 'receipt.png');
    expect(up.status).toBe(201);
    await whenIdle();
    const read = await sp.agent.get(`/api/v1/documents/${up.body.documentId}`);
    expect(read.status).toBe(200);
    expect(read.body.detectedType).toBe('PAYMENT_RECEIPT');
    expect((read.body.extracted as Extracted).amount?.value).toBe('20000.00'); // prefill

    // Another consultant can't convert someone else's lead.
    const other = await signIn('sp2@advench.test');
    expect(
      (await other.agent.post(`/api/v1/inquiries/${lead.id}/receipt`).set(other.csrfHeader)).status,
    ).toBe(404);

    const base = {
      receiptDocumentId: up.body.documentId,
      amount: 20_000, // confirmed by the consultant
      paidAt: today,
      tcp: 2_450_000,
      downpaymentAmount: 245_000,
      paymentMethod: 'PAG_IBIG',
      civilStatus: 'MARRIED',
    };
    const noEmployment = await sp.agent
      .post(`/api/v1/inquiries/${lead.id}/convert`)
      .set(sp.csrfHeader)
      .send(base);
    expect(noEmployment.status).toBe(400);
    const notSure = await sp.agent
      .post(`/api/v1/inquiries/${lead.id}/convert`)
      .set(sp.csrfHeader)
      .send({ ...base, paymentMethod: 'NOT_SURE', employmentType: 'OFW' });
    expect(notSure.status).toBe(400);

    const conv = await sp.agent
      .post(`/api/v1/inquiries/${lead.id}/convert`)
      .set(sp.csrfHeader)
      .send({ ...base, employmentType: 'OFW' });
    expect(conv.status).toBe(201);
    const clientId = conv.body.clientId;
    expect((await prisma.inquiry.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe(
      'RESERVED',
    );

    const detail = await sp.agent.get(`/api/v1/clients/${clientId}`);
    expect(detail.body).toMatchObject({
      saleType: 'DEVELOPER_SALE',
      paymentMethod: 'PAG_IBIG',
      isMine: true,
    });
    const want = buildChecklist({
      paymentMethod: 'PAG_IBIG',
      civilStatus: 'MARRIED',
      employmentType: 'OFW',
    })
      .map((i) => `${i.code}|${i.appliesTo}`)
      .sort();
    const got = detail.body.requirements
      .map((i: { code: string; appliesTo: string }) => `${i.code}|${i.appliesTo}`)
      .sort();
    expect(got).toEqual(want);
    const reservation = detail.body.payments[0];
    expect(reservation).toMatchObject({ kind: 'RESERVATION', amount: '20000', confirmed: true });
    const log = await prisma.auditLog.findFirst({
      where: { entityId: reservation.id, action: 'PAYMENT_CONFIRMED' },
    });
    expect(log?.after).toMatchObject({ amount: 20000, aiAmount: 20000 });

    // A downpayment: counts only after the consultant confirms the amount.
    const dp = await sp.agent
      .post(`/api/v1/clients/${clientId}/payments`)
      .set(sp.csrfHeader)
      .field('kind', 'DOWNPAYMENT')
      .attach('file', await receipt('AR-50018', 49_500), 'dp.png');
    expect(dp.status).toBe(201);
    await whenIdle();
    const unconfirmed = await prisma.payment.findUniqueOrThrow({
      where: { id: dp.body.paymentId },
    });
    expect(unconfirmed.confirmedById).toBeNull();
    const ok = await sp.agent
      .post(`/api/v1/payments/${dp.body.paymentId}/confirm`)
      .set(sp.csrfHeader)
      .send({ amount: 49_500, paidAt: today });
    expect(ok.status).toBe(200);

    // The same receipt number again is flagged and can't be confirmed.
    const dup = await sp.agent
      .post(`/api/v1/clients/${clientId}/payments`)
      .set(sp.csrfHeader)
      .field('kind', 'DOWNPAYMENT')
      .attach('file', await receipt('AR-50018', 12_000), 'again.png');
    await whenIdle();
    const dupDoc = await prisma.document.findUniqueOrThrow({ where: { id: dup.body.documentId } });
    expect((dupDoc.flags as { code: string }[]).map((f) => f.code)).toContain('DUPLICATE_RECEIPT');
    const blocked = await sp.agent
      .post(`/api/v1/payments/${dup.body.paymentId}/confirm`)
      .set(sp.csrfHeader)
      .send({ amount: 12_000, paidAt: today });
    expect(blocked.body.error.code).toBe('RECEIPT_FLAGGED');

    // Buyer documents: the buyer's ID reads cleanly; someone else's ID is flagged.
    const items = detail.body.requirements as { id: string; code: string; appliesTo: string }[];
    const id1 = items.find((i) => i.code === 'VALID_ID_1' && i.appliesTo === 'BUYER')!;
    const id2 = items.find((i) => i.code === 'VALID_ID_2' && i.appliesTo === 'BUYER')!;
    const idDoc = (last: string, given: string) =>
      mock.validId({
        kind: 'philsys',
        last,
        given,
        middle: 'REYES',
        idNumber: '1111-2222-3333-4444',
        birth: '1990-01-01',
      });
    for (const [item, file] of [
      [id1, await idDoc('YAP', 'DENNIS')],
      [id2, await idDoc('SANTOS', 'PEDRO')],
    ] as const) {
      const r = await sp.agent
        .post(`/api/v1/requirements/${item.id}/documents`)
        .set(sp.csrfHeader)
        .attach('file', file, 'id.png');
      expect(r.status).toBe(201);
    }
    await whenIdle();
    const i1 = await prisma.requirementItem.findUniqueOrThrow({ where: { id: id1.id } });
    const i2 = await prisma.requirementItem.findUniqueOrThrow({ where: { id: id2.id } });
    const d1 = await prisma.document.findUniqueOrThrow({ where: { id: i1.documentId! } });
    expect(i1.status, JSON.stringify(d1.flags)).toBe('UPLOADED');
    expect(i2.status).toBe('NEEDS_ATTENTION');
    const flagged = await prisma.document.findUniqueOrThrow({ where: { id: i2.documentId! } });
    expect((flagged.flags as { code: string }[]).map((f) => f.code)).toContain('NAME_MISMATCH');

    // Only the broker verifies (OPEN-3); the queue holds buyer docs, not receipts.
    const broker = await signIn('broker1@advench.test');
    const queue = await broker.agent.get('/api/v1/reviews/queue');
    const queued = queue.body.documents.map((d: { id: string }) => d.id);
    expect(queued).toContain(i1.documentId);
    expect(queued).not.toContain(dp.body.documentId);
    expect(
      (
        await sp.agent
          .post(`/api/v1/reviews/documents/${i1.documentId}/approve`)
          .set(sp.csrfHeader)
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await broker.agent
          .post(`/api/v1/reviews/documents/${i1.documentId}/approve`)
          .set(broker.csrfHeader)
          .send({})
      ).status,
    ).toBe(200);
    expect((await prisma.requirementItem.findUniqueOrThrow({ where: { id: id1.id } })).status).toBe(
      'VERIFIED',
    );
    await broker.agent
      .post(`/api/v1/reviews/documents/${i2.documentId}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'This is not the buyer’s ID.' });
    const back = await prisma.requirementItem.findUniqueOrThrow({ where: { id: id2.id } });
    expect(back).toMatchObject({ status: 'MISSING', documentId: null });

    // Waive: broker only, audited.
    const photo = items.find((i) => i.code === 'PHOTO_1X1')!;
    expect(
      (
        await sp.agent
          .post(`/api/v1/requirements/${photo.id}/waive`)
          .set(sp.csrfHeader)
          .send({ reason: 'Not needed' })
      ).status,
    ).toBe(403);
    expect(
      (
        await broker.agent
          .post(`/api/v1/requirements/${photo.id}/waive`)
          .set(broker.csrfHeader)
          .send({ reason: 'Pag-IBIG accepted the 2x2 photos.' })
      ).status,
    ).toBe(200);

    // Switching to cash regenerates: untouched items go, uploaded/verified work stays.
    const cash = await sp.agent
      .patch(`/api/v1/clients/${clientId}`)
      .set(sp.csrfHeader)
      .send({ paymentMethod: 'CASH', civilStatus: 'MARRIED', employmentType: null });
    expect(cash.status).toBe(200);
    const after = await prisma.requirementItem.findMany({ where: { clientId } });
    expect(
      after
        .filter((i) => i.required)
        .map((i) => i.code)
        .sort(),
    ).toEqual(['VALID_ID_1', 'VALID_ID_2']);
    expect(after.find((i) => i.code === 'PHOTO_1X1')).toMatchObject({
      status: 'WAIVED',
      required: false,
    });
    expect(after.some((i) => i.code === 'ESAV')).toBe(false);

    // Isolation: other consultants and other firms can't see this client or its documents.
    expect((await other.agent.get(`/api/v1/clients/${clientId}`)).status).toBe(404);
    const otherFirm = await signIn('broker@bicolprime.test');
    expect((await otherFirm.agent.get(`/api/v1/clients/${clientId}`)).status).toBe(404);
    expect((await otherFirm.agent.get(`/api/v1/documents/${i1.documentId}/url`)).status).toBe(404);
    expect((await broker.agent.get(`/api/v1/clients/${clientId}`)).status).toBe(200);
  });
});
