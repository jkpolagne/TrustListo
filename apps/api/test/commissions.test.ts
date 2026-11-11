// M8: transmittal + AI amount check, vouchers, signatures, release (SPEC §10.4–10.5).
import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { closeOcr } from '../src/modules/docai/ocr';
import { whenIdle } from '../src/modules/docai/queue';
import * as mock from '../prisma/seed-docs/mockDocs';
import { signIn } from './helpers';

vi.setConfig({ testTimeout: 60_000 });

afterAll(async () => {
  await closeOcr();
  await prisma.$disconnect();
});

const trancheOf = async (buyer: string, status: string) => {
  const client = await prisma.client.findFirstOrThrow({ where: { fullName: buyer } });
  return prisma.commissionTranche.findFirstOrThrow({
    where: { commission: { clientId: client.id }, status: status as never },
    include: { commission: true },
  });
};

describe('M8: transmittal → voucher → signatures → released', () => {
  it('checks the transmittal amount with Module 1 and needs the admin to confirm it', async () => {
    const t = await trancheOf('Liza Domingo', 'AWAITING_TRANSMITTAL');
    const admin = await signIn('admin@advench.test');
    const wrong = Number(t.amount) - 500;
    const file = await mock.transmittal({
      developer: 'St. Andrew',
      firm: 'Advench Realty',
      date: new Date().toISOString().slice(0, 10),
      buyer: 'LIZA DOMINGO',
      unit: 'Townhouse A',
      tranche: 'Full commission',
      amount: wrong,
    });
    // Only the CompanyAdmin uploads transmittals (§5.2).
    const broker = await signIn('broker1@advench.test');
    expect(
      (
        await broker.agent
          .post(`/api/v1/tranches/${t.id}/transmittal`)
          .set(broker.csrfHeader)
          .attach('file', file, 't.png')
      ).status,
    ).toBe(403);

    const up = await admin.agent
      .post(`/api/v1/tranches/${t.id}/transmittal`)
      .set(admin.csrfHeader)
      .attach('file', file, 't.png');
    expect(up.status).toBe(201);
    await whenIdle();
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: up.body.documentId } });
    expect((doc.flags as { code: string }[]).map((f) => f.code)).toContain('AMOUNT_MISMATCH');
    // The admin (and broker) can open the file to compare; a salesperson cannot.
    expect((await admin.agent.get(`/api/v1/documents/${doc.id}/url`)).status).toBe(200);
    expect((await broker.agent.get(`/api/v1/documents/${doc.id}/url`)).status).toBe(200);
    const sp = await signIn('sp2@advench.test');
    expect((await sp.agent.get(`/api/v1/documents/${doc.id}/url`)).status).toBe(404);
    // The admin confirms transmittals, so they stay out of the broker's review queue.
    const queue = await broker.agent.get('/api/v1/reviews/queue');
    expect(queue.body.documents.map((d: { id: string }) => d.id)).not.toContain(doc.id);

    const noNote = await admin.agent
      .post(`/api/v1/tranches/${t.id}/transmittal/confirm`)
      .set(admin.csrfHeader)
      .send({ amount: wrong });
    expect(noNote.body.error.code).toBe('NOTE_REQUIRED');
    const ok = await admin.agent
      .post(`/api/v1/tranches/${t.id}/transmittal/confirm`)
      .set(admin.csrfHeader)
      .send({ amount: Number(t.amount) });
    expect(ok.status).toBe(200);
    expect((await prisma.commissionTranche.findUniqueOrThrow({ where: { id: t.id } })).status).toBe(
      'READY_FOR_RELEASE',
    );
  });

  it('broker vouchers with withholding, signs first; payees sign; edits clear signatures; all signed → released', async () => {
    const t = await trancheOf('Noel Santiago', 'READY_FOR_RELEASE');
    const broker = await signIn('broker1@advench.test');
    const sp2 = await prisma.user.findUniqueOrThrow({ where: { email: 'sp2@advench.test' } });
    const sm = await prisma.user.findUniqueOrThrow({ where: { id: sp2.managerId! } });

    // Only the broker creates vouchers.
    const admin = await signIn('admin@advench.test');
    expect(
      (await admin.agent.post(`/api/v1/tranches/${t.id}/voucher`).set(admin.csrfHeader).send({}))
        .status,
    ).toBe(403);

    const created = await broker.agent
      .post(`/api/v1/tranches/${t.id}/voucher`)
      .set(broker.csrfHeader)
      .send({});
    expect(created.status).toBe(201);
    const v = (await broker.agent.get(`/api/v1/vouchers/${created.body.id}`)).body;
    expect(v.intact).toBe(true);
    expect(v.lines.map((l: { role: string }) => l.role)).toEqual([
      'BROKER',
      'SALES_MANAGER',
      'SALES_PERSON',
    ]);
    const grossSum = v.lines.reduce(
      (s: number, l: { grossShare: number }) => s + Math.round(l.grossShare * 100),
      0,
    );
    expect(grossSum).toBe(Math.round(Number(t.amount) * 100)); // shares add up to the tranche exactly
    for (const l of v.lines) {
      expect(l.deductions[0].label).toBe('Withholding tax (5%)'); // OPEN-6
      expect(l.net).toBeCloseTo(l.grossShare * 0.95, 2);
    }

    const sp = await signIn('sp2@advench.test');
    const early = await sp.agent
      .post(`/api/v1/vouchers/${v.id}/sign`)
      .set(sp.csrfHeader)
      .send({ typedName: `${sp2.firstName} ${sp2.lastName}` });
    expect(early.body.error.code).toBe('BROKER_FIRST');
    const badName = await broker.agent
      .post(`/api/v1/vouchers/${v.id}/sign`)
      .set(broker.csrfHeader)
      .send({ typedName: 'Someone Else' });
    expect(badName.body.error.code).toBe('NAME_MISMATCH');
    const brokerUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'broker1@advench.test' },
    });
    const brokerName = `${brokerUser.firstName} ${brokerUser.lastName}`;
    expect(
      (
        await broker.agent
          .post(`/api/v1/vouchers/${v.id}/sign`)
          .set(broker.csrfHeader)
          .send({ typedName: brokerName })
      ).status,
    ).toBe(200);

    // An edit after signing clears the signatures (content hash changes).
    const edit = await broker.agent
      .patch(`/api/v1/vouchers/${v.id}`)
      .set(broker.csrfHeader)
      .send({ deductions: [{ userId: sp2.id, label: 'Cash advance', amount: 100 }] });
    expect(edit.status).toBe(200);
    const after = await prisma.commissionVoucher.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.brokerSignedAt).toBeNull();
    expect(after.contentHash).not.toBe(v.contentHash);
    await broker.agent
      .post(`/api/v1/vouchers/${v.id}/sign`)
      .set(broker.csrfHeader)
      .send({ typedName: brokerName });

    // Not a payee → can't see or sign it.
    const outsider = await signIn('sp1@advench.test');
    expect((await outsider.agent.get(`/api/v1/vouchers/${v.id}`)).status).toBe(404);
    const otherFirm = await signIn('broker@bicolprime.test');
    expect((await otherFirm.agent.get(`/api/v1/vouchers/${v.id}`)).status).toBe(404);

    const smAgent = await signIn(sm.email);
    const s1 = await smAgent.agent
      .post(`/api/v1/vouchers/${v.id}/sign`)
      .set(smAgent.csrfHeader)
      .send({ typedName: `${sm.firstName} ${sm.lastName}` });
    expect(s1.body).toEqual({ signed: true, released: false });
    const s2 = await sp.agent
      .post(`/api/v1/vouchers/${v.id}/sign`)
      .set(sp.csrfHeader)
      .send({ typedName: `${sp2.firstName} ${sp2.lastName}` });
    expect(s2.body).toEqual({ signed: true, released: true });

    expect((await prisma.commissionTranche.findUniqueOrThrow({ where: { id: t.id } })).status).toBe(
      'RELEASED',
    );
    const logs = await prisma.auditLog.findMany({
      where: { entityId: { in: [v.id, t.id] } },
      select: { action: true },
    });
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining([
        'VOUCHER_CREATED',
        'VOUCHER_SIGNED',
        'VOUCHER_EDITED',
        'TRANCHE_RELEASED',
      ]),
    );

    // The payee sees it under My Commissions; a non-payee consultant doesn't.
    const mine = await sp.agent.get('/api/v1/commissions');
    expect(mine.body.data.map((c: { id: string }) => c.id)).toContain(t.commissionId);
    expect(
      (await outsider.agent.get('/api/v1/commissions')).body.data.map((c: { id: string }) => c.id),
    ).not.toContain(t.commissionId);
  });

  it('a confirmed payment moves a tranche; the broker dashboard shows aging', async () => {
    const broker = await signIn('broker1@advench.test');
    const list = await broker.agent.get('/api/v1/commissions');
    expect(list.status).toBe(200);
    const statuses = list.body.data.flatMap((c: { tranches: { status: string }[] }) =>
      c.tranches.map((t) => t.status),
    );
    expect(statuses).toEqual(expect.arrayContaining(['WAITING', 'BLOCKED', 'RELEASED']));

    // Teresa Lim pays the balance in cash: both tranches reach the milestone; docs still missing → BLOCKED.
    const teresa = await prisma.client.findFirstOrThrow({ where: { fullName: 'Teresa Lim' } });
    const sp = await signIn('sp1@advench.test');
    const pay = await sp.agent
      .post(`/api/v1/clients/${teresa.id}/payments`)
      .set(sp.csrfHeader)
      .field('kind', 'FULL_CASH')
      .attach(
        'file',
        await mock.paymentReceipt({
          orNumber: 'AR-70001',
          date: new Date().toISOString().slice(0, 10),
          payor: 'TERESA LIM',
          amount: Number(teresa.tcp) - 20_000,
          issuer: 'St. Andrew',
          purpose: 'Full payment',
        }),
        'r.png',
      );
    await whenIdle();
    await sp.agent
      .post(`/api/v1/payments/${pay.body.paymentId}/confirm`)
      .set(sp.csrfHeader)
      .send({ amount: Number(teresa.tcp) - 20_000, paidAt: new Date().toISOString().slice(0, 10) });
    const tranches = await prisma.commissionTranche.findMany({
      where: { commission: { clientId: teresa.id } },
    });
    expect(tranches.map((t) => t.status)).toEqual(['BLOCKED', 'BLOCKED']);
  });
});
