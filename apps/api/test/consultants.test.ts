// M2: consultants, hierarchy, credential upload, broker review.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { closeOcr } from '../src/modules/docai/ocr';
import { processDocument } from '../src/modules/docai/pipeline';
import { whenIdle } from '../src/modules/docai/queue';
import request from 'supertest';
import { app, signIn } from './helpers';

afterAll(async () => {
  await closeOcr();
  await prisma.$disconnect();
});

let png: Buffer;
beforeAll(async () => {
  png = await sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 180, b: 40 } },
  })
    .png()
    .toBuffer();
});

const uniq = () => Math.random().toString(36).slice(2, 8);

async function createUser(
  admin: Awaited<ReturnType<typeof signIn>>,
  body: Record<string, unknown>,
) {
  return admin.agent.post('/api/v1/users').set(admin.csrfHeader).send(body);
}

describe('M2 acceptance: SP under SM under Broker, credential reaches broker queue', () => {
  it('works end to end', async () => {
    const admin = await signIn('admin@advench.test');
    const tag = uniq();

    const broker = await createUser(admin, {
      role: 'BROKER',
      firstName: 'Test',
      lastName: `Broker${tag}`,
      email: `b-${tag}@advench.test`,
    });
    expect(broker.status).toBe(201);
    expect(broker.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);

    const sm = await createUser(admin, {
      role: 'SALES_MANAGER',
      firstName: 'Test',
      lastName: `Manager${tag}`,
      email: `m-${tag}@advench.test`,
      brokerId: broker.body.user.id,
    });
    expect(sm.status).toBe(201);
    expect(sm.body.user.brokerId).toBe(broker.body.user.id);

    const sp = await createUser(admin, {
      role: 'SALES_PERSON',
      firstName: 'Test',
      lastName: `Sales${tag}`,
      email: `s-${tag}@advench.test`,
      managerId: sm.body.user.id,
    });
    expect(sp.status).toBe(201);
    expect(sp.body.user.managerId).toBe(sm.body.user.id);
    expect(sp.body.user.referralCode).toMatch(/^TSALES/);

    // The new consultant can sign in with the temporary password.
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `s-${tag}@advench.test`, password: sp.body.temporaryPassword });
    expect(login.status).toBe(200);

    const up = await admin.agent
      .post(`/api/v1/users/${sp.body.user.id}/credentials`)
      .set(admin.csrfHeader)
      .field('type', 'DHSUD_REGISTRATION')
      .field('numberEntered', `DHSUD-R5-${tag}`)
      .attach('file', png, 'scan.png');
    expect(up.status).toBe(201);
    expect(up.body.status).toBe('PENDING_AI');

    await whenIdle();

    const brokerSession = await signIn('broker1@advench.test');
    const queue = await brokerSession.agent.get('/api/v1/reviews/queue').expect(200);
    const item = queue.body.credentials.find((c: { id: string }) => c.id === up.body.id);
    expect(item).toBeTruthy();
    expect(['READY_FOR_REVIEW', 'NEEDS_ATTENTION']).toContain(item.status);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'CREDENTIAL_UPLOADED', entityId: up.body.id },
    });
    expect(audit).toBeTruthy();
  });
});

describe('hierarchy rules', () => {
  it('a salesperson needs a sales manager', async () => {
    const admin = await signIn('admin@advench.test');
    const res = await createUser(admin, {
      role: 'SALES_PERSON',
      firstName: 'No',
      lastName: 'Manager',
      email: `nm-${uniq()}@advench.test`,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MANAGER_REQUIRED');
  });

  it("can't attach to another firm's manager", async () => {
    const bicolSm = await prisma.user.findUniqueOrThrow({ where: { email: 'sm@bicolprime.test' } });
    const admin = await signIn('admin@advench.test');
    const res = await createUser(admin, {
      role: 'SALES_PERSON',
      firstName: 'Cross',
      lastName: 'Firm',
      email: `cf-${uniq()}@advench.test`,
      managerId: bicolSm.id,
    });
    expect(res.status).toBe(400);
  });

  it("can't move an existing salesperson under another firm's manager", async () => {
    const bicolSm = await prisma.user.findUniqueOrThrow({ where: { email: 'sm@bicolprime.test' } });
    const sp = await prisma.user.findUniqueOrThrow({ where: { email: 'sp3@advench.test' } });
    const admin = await signIn('admin@advench.test');
    const res = await admin.agent
      .patch(`/api/v1/users/${sp.id}`)
      .set(admin.csrfHeader)
      .send({ managerId: bicolSm.id });
    expect(res.status).toBe(400);
  });

  it('a manager with an active team cannot be deactivated', async () => {
    const sm = await prisma.user.findUniqueOrThrow({ where: { email: 'sm1@advench.test' } });
    const admin = await signIn('admin@advench.test');
    const res = await admin.agent
      .patch(`/api/v1/users/${sm.id}`)
      .set(admin.csrfHeader)
      .send({ isActive: false });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HAS_ACTIVE_TEAM');
  });

  it('deactivation is audited', async () => {
    const admin = await signIn('admin@advench.test');
    const tag = uniq();
    const sm = await prisma.user.findUniqueOrThrow({ where: { email: 'sm2@advench.test' } });
    const created = await createUser(admin, {
      role: 'SALES_PERSON',
      firstName: 'Temp',
      lastName: 'Person',
      email: `tp-${tag}@advench.test`,
      managerId: sm.id,
    });
    const id = created.body.user.id;
    await admin.agent
      .patch(`/api/v1/users/${id}`)
      .set(admin.csrfHeader)
      .send({ isActive: false })
      .expect(200);
    const row = await prisma.auditLog.findFirst({
      where: { action: 'USER_DEACTIVATED', entityId: id },
    });
    expect(row?.before).toEqual({ isActive: true });
    expect(row?.after).toEqual({ isActive: false });
  });

  it('only CompanyAdmin can create consultants', async () => {
    for (const email of ['broker1@advench.test', 'sm1@advench.test']) {
      const s = await signIn(email);
      const res = await createUser(s, {
        role: 'BROKER',
        firstName: 'X',
        lastName: 'Y',
        email: `x-${uniq()}@advench.test`,
      });
      expect(res.status).toBe(403);
    }
  });
});

describe('credential upload', () => {
  it('rejects files that are not PDF or images, whatever the name says', async () => {
    const sp = await prisma.user.findUniqueOrThrow({ where: { email: 'sp1@advench.test' } });
    const admin = await signIn('admin@advench.test');
    const res = await admin.agent
      .post(`/api/v1/users/${sp.id}/credentials`)
      .set(admin.csrfHeader)
      .field('type', 'DHSUD_REGISTRATION')
      .field('numberEntered', 'DHSUD-123')
      .attach('file', Buffer.from('MZ fake executable'), {
        filename: 'license.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TYPE');
  });

  it("can't upload for another firm's consultant", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { email: 'sp1@bicolprime.test' } });
    const admin = await signIn('admin@advench.test');
    const res = await admin.agent
      .post(`/api/v1/users/${other.id}/credentials`)
      .set(admin.csrfHeader)
      .field('type', 'DHSUD_REGISTRATION')
      .field('numberEntered', 'DHSUD-123')
      .attach('file', png, 'scan.png');
    expect(res.status).toBe(404);
  });

  it('flags a file uploaded twice', async () => {
    const sp = await prisma.user.findUniqueOrThrow({ where: { email: 'sp2@advench.test' } });
    const admin = await signIn('admin@advench.test');
    const send = () =>
      admin.agent
        .post(`/api/v1/users/${sp.id}/credentials`)
        .set(admin.csrfHeader)
        .field('type', 'DHSUD_REGISTRATION')
        .field('numberEntered', 'DHSUD-R5-DUP')
        .attach('file', png, 'scan.png');
    await send();
    const second = await send();
    await whenIdle();
    const cred = await prisma.credential.findUniqueOrThrow({ where: { id: second.body.id } });
    expect(cred.status).toBe('NEEDS_ATTENTION');
  });
});

describe('broker review', () => {
  async function pendingCredential(email = 'sp4@advench.test') {
    const sp = await prisma.user.findUniqueOrThrow({ where: { email } });
    const admin = await signIn('admin@advench.test');
    const unique = await sharp({
      create: {
        width: 20 + Math.floor(Math.random() * 200),
        height: 20,
        channels: 3,
        background: '#123456',
      },
    })
      .png()
      .toBuffer();
    const res = await admin.agent
      .post(`/api/v1/users/${sp.id}/credentials`)
      .set(admin.csrfHeader)
      .field('type', 'DHSUD_REGISTRATION')
      .field('numberEntered', 'DHSUD-R5-777')
      .attach('file', unique, 'scan.png');
    await whenIdle();
    return res.body.id as string;
  }
  const nextYear = () => new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  it('broker approves with a confirmed expiry; it is audited', async () => {
    const id = await pendingCredential();
    const broker = await signIn('broker1@advench.test');
    const res = await broker.agent
      .post(`/api/v1/reviews/credentials/${id}/approve`)
      .set(broker.csrfHeader)
      .send({ expiresAt: nextYear(), numberEntered: 'DHSUD-R5-778' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.numberEntered).toBe('DHSUD-R5-778');
    const row = await prisma.auditLog.findFirst({
      where: { action: 'CREDENTIAL_APPROVED', entityId: id },
    });
    expect(row?.before).toMatchObject({ numberEntered: 'DHSUD-R5-777' });
    expect(row?.after).toMatchObject({ numberEntered: 'DHSUD-R5-778', status: 'APPROVED' });

    // Already decided → can't decide again.
    const again = await broker.agent
      .post(`/api/v1/reviews/credentials/${id}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'Changed my mind' });
    expect(again.status).toBe(409);
  });

  it('refuses an expiry date in the past', async () => {
    const id = await pendingCredential();
    const broker = await signIn('broker1@advench.test');
    const res = await broker.agent
      .post(`/api/v1/reviews/credentials/${id}/approve`)
      .set(broker.csrfHeader)
      .send({ expiresAt: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EXPIRED');
  });

  it('reject needs a reason', async () => {
    const id = await pendingCredential();
    const broker = await signIn('broker1@advench.test');
    const bad = await broker.agent
      .post(`/api/v1/reviews/credentials/${id}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: '' });
    expect(bad.status).toBe(400);
    const ok = await broker.agent
      .post(`/api/v1/reviews/credentials/${id}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'Photo is too blurry to read the number.' });
    expect(ok.body.status).toBe('REJECTED');
  });

  it('only a broker can approve (rule 1)', async () => {
    const id = await pendingCredential();
    for (const email of [
      'admin@advench.test',
      'sm1@advench.test',
      'sp1@advench.test',
      'superadmin@trustlisto.test',
    ]) {
      const s = await signIn(email);
      const res = await s.agent
        .post(`/api/v1/reviews/credentials/${id}/approve`)
        .set(s.csrfHeader)
        .send({ expiresAt: nextYear() });
      expect(res.status).toBe(403);
    }
  });

  it("another firm's broker gets 404", async () => {
    const id = await pendingCredential();
    const broker = await signIn('broker@bicolprime.test');
    const res = await broker.agent
      .post(`/api/v1/reviews/credentials/${id}/approve`)
      .set(broker.csrfHeader)
      .send({ expiresAt: nextYear() });
    expect(res.status).toBe(404);
    const cred = await prisma.credential.findUniqueOrThrow({ where: { id } });
    expect(cred.status).not.toBe('APPROVED');
  });

  it('document links are scoped and short-lived', async () => {
    const id = await pendingCredential();
    const cred = await prisma.credential.findUniqueOrThrow({ where: { id } });
    const broker = await signIn('broker1@advench.test');
    const ok = await broker.agent.get(`/api/v1/documents/${cred.documentId}/url`).expect(200);
    expect(ok.body.url).toContain('X-Amz-Expires=300');
    for (const email of ['broker@bicolprime.test', 'sp1@advench.test']) {
      const s = await signIn(email);
      expect((await s.agent.get(`/api/v1/documents/${cred.documentId}/url`)).status).toBe(404);
    }
  });
});

describe('AI never approves (rule 1)', () => {
  it('the pipeline only ever suggests review states', async () => {
    // Undecided credentials only, so seeded approvals aren't disturbed.
    const creds = await prisma.credential.findMany({
      where: { status: { notIn: ['APPROVED', 'REJECTED'] }, documentId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    expect(creds.length).toBeGreaterThan(0);
    for (const c of creds) {
      await processDocument(c.documentId!);
      const after = await prisma.credential.findUniqueOrThrow({ where: { id: c.id } });
      expect(['READY_FOR_REVIEW', 'NEEDS_ATTENTION']).toContain(after.status);
    }
  });

  it('no docai source file writes an APPROVED status', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) =>
        statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)],
      );
    const all = files(join(import.meta.dirname, '../src/modules/docai'));
    expect(all.length).toBeGreaterThan(10);
    for (const f of all) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/['"`]APPROVED['"`]/);
    }
  });
});
