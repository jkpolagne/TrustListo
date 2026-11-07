import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { ROLE_HOME } from '@trustlisto/shared';
import { PASSWORD, app, signIn } from '../../../test/helpers';
import { prisma } from '../../lib/prisma';

afterAll(() => prisma.$disconnect());

const login = (email: string, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

describe('login', () => {
  it.each([
    ['superadmin@trustlisto.test', 'SUPER_ADMIN'],
    ['admin@advench.test', 'COMPANY_ADMIN'],
    ['broker1@advench.test', 'BROKER'],
    ['sm1@advench.test', 'SALES_MANAGER'],
    ['sp1@advench.test', 'SALES_PERSON'],
  ] as const)('%s signs in as %s and has a dashboard', async (email, role) => {
    const { agent } = await signIn(email);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.role).toBe(role);
    expect(ROLE_HOME[role]).toBeTruthy();
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('sets an httpOnly session cookie', async () => {
    const res = await login('admin@advench.test');
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const session = cookies.find((c) => c.startsWith('tl_session='));
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await login('admin@advench.test', 'nope');
    const unknown = await login('nobody@advench.test', 'nope');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('locks an account after 5 failed attempts, even with the right password', async () => {
    for (let i = 0; i < 5; i++) await login('sp6@advench.test', 'wrong');
    const res = await login('sp6@advench.test');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('blocks deactivated users, including existing sessions', async () => {
    const { agent } = await signIn('sp2@bicolprime.test');
    await prisma.user.update({
      where: { email: 'sp2@bicolprime.test' },
      data: { isActive: false },
    });
    try {
      expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
      const res = await login('sp2@bicolprime.test');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    } finally {
      await prisma.user.update({
        where: { email: 'sp2@bicolprime.test' },
        data: { isActive: true },
      });
    }
  });

  it('blocks users of a suspended firm', async () => {
    await prisma.firm.update({ where: { slug: 'bicol-prime' }, data: { status: 'SUSPENDED' } });
    try {
      const res = await login('admin@bicolprime.test');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FIRM_SUSPENDED');
    } finally {
      await prisma.firm.update({ where: { slug: 'bicol-prime' }, data: { status: 'ACTIVE' } });
    }
  });

  it('writes LOGIN to the audit log', async () => {
    await signIn('broker2@advench.test');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'broker2@advench.test' } });
    const row = await prisma.auditLog.findFirst({
      where: { action: 'LOGIN', entityId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(row?.firmId).toBe(user.firmId);
  });
});

describe('session', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('logout clears the session', async () => {
    const { agent, csrfHeader } = await signIn('sm2@advench.test');
    await agent.post('/api/v1/auth/logout').set(csrfHeader).expect(204);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('refuses writes without the CSRF token', async () => {
    const { agent } = await signIn('sm3@advench.test');
    const res = await agent
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'NewPassword123' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('changes the password and audits it', async () => {
    const email = 'sp5@advench.test';
    const { agent, csrfHeader } = await signIn(email);
    await agent
      .post('/api/v1/auth/change-password')
      .set(csrfHeader)
      .send({ currentPassword: PASSWORD, newPassword: 'BrandNew2026x' })
      .expect(204);
    expect((await login(email, 'BrandNew2026x')).status).toBe(200);
    expect((await login(email, PASSWORD)).status).toBe(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(
      await prisma.auditLog.count({ where: { action: 'PASSWORD_CHANGED', entityId: user.id } }),
    ).toBe(1);

    // Restore the seed password for other tests.
    await prisma.user.update({
      where: { email },
      data: { passwordHash: await argon2.hash(PASSWORD) },
    });
  });

  it('rejects a weak new password', async () => {
    const { agent, csrfHeader } = await signIn('sp4@advench.test');
    const res = await agent
      .post('/api/v1/auth/change-password')
      .set(csrfHeader)
      .send({ currentPassword: PASSWORD, newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
