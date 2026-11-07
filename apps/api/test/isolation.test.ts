// Tenant isolation + role matrix for M1 routes (SPEC §2 rules 4–5, §5.2, §14).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, signIn } from './helpers';

afterAll(() => prisma.$disconnect());

let advench: { id: string };
let bicol: { id: string };
let bicolUserIds: string[];
let advenchUserIds: string[];

beforeAll(async () => {
  advench = await prisma.firm.findUniqueOrThrow({ where: { slug: 'advench' } });
  bicol = await prisma.firm.findUniqueOrThrow({ where: { slug: 'bicol-prime' } });
  bicolUserIds = (await prisma.user.findMany({ where: { firmId: bicol.id } })).map((u) => u.id);
  advenchUserIds = (await prisma.user.findMany({ where: { firmId: advench.id } })).map((u) => u.id);
});

describe('tenant isolation', () => {
  it('Firm A lists only its own users', async () => {
    const { agent } = await signIn('admin@advench.test');
    const res = await agent.get('/api/v1/users').expect(200);
    const ids: string[] = res.body.data.map((u: { id: string }) => u.id);
    expect(ids.length).toBe(advenchUserIds.length);
    expect(ids.some((id) => bicolUserIds.includes(id))).toBe(false);
  });

  it('Firm A gets 404 (not 403) for every Firm B user', async () => {
    const { agent } = await signIn('admin@advench.test');
    for (const id of bicolUserIds) {
      const res = await agent.get(`/api/v1/users/${id}`);
      expect(res.status).toBe(404);
    }
  });

  it('Firm B broker gets 404 for Firm A users', async () => {
    const { agent } = await signIn('broker@bicolprime.test');
    for (const id of advenchUserIds) {
      expect((await agent.get(`/api/v1/users/${id}`)).status).toBe(404);
    }
  });

  it('ignores a firmId smuggled in the query string', async () => {
    const { agent } = await signIn('admin@bicolprime.test');
    const res = await agent.get(`/api/v1/users?firmId=${advench.id}`).expect(200);
    const ids: string[] = res.body.data.map((u: { id: string }) => u.id);
    expect(ids.every((id) => bicolUserIds.includes(id))).toBe(true);
  });

  it('audit log shows only the caller’s firm', async () => {
    await signIn('admin@bicolprime.test'); // creates a Bicol LOGIN row
    const { agent } = await signIn('broker1@advench.test');
    const res = await agent.get('/api/v1/audit?pageSize=100').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((r: { firmId: string }) => r.firmId === advench.id)).toBe(true);
  });
});

describe('hierarchy scope', () => {
  it('a sales manager sees only themself and their team', async () => {
    const sm = await prisma.user.findUniqueOrThrow({ where: { email: 'sm1@advench.test' } });
    const { agent } = await signIn('sm1@advench.test');
    const res = await agent.get('/api/v1/users').expect(200);
    const users: { id: string; managerId: string | null }[] = res.body.data;
    expect(users.length).toBe(3); // sm1 + 2 salespersons
    expect(users.every((u) => u.id === sm.id || u.managerId === sm.id)).toBe(true);
  });

  it("a sales manager gets 404 for another manager's salesperson", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { email: 'sp5@advench.test' } });
    const { agent } = await signIn('sm1@advench.test');
    expect((await agent.get(`/api/v1/users/${other.id}`)).status).toBe(404);
  });
});

describe('role matrix', () => {
  it('a salesperson cannot list consultants', async () => {
    const { agent } = await signIn('sp1@advench.test');
    expect((await agent.get('/api/v1/users')).status).toBe(403);
    expect((await agent.get('/api/v1/audit')).status).toBe(403);
  });

  it('a sales manager cannot read the audit trail', async () => {
    const { agent } = await signIn('sm1@advench.test');
    expect((await agent.get('/api/v1/audit')).status).toBe(403);
  });

  it('SuperAdmin sees firms and counts but no firm internals', async () => {
    const { agent } = await signIn('superadmin@trustlisto.test');
    const res = await agent.get('/api/v1/admin/firms').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['createdAt', 'id', 'liveListingCount', 'name', 'slug', 'status', 'userCount'].sort(),
    );
    expect((await agent.get('/api/v1/users')).status).toBe(403);
    expect((await agent.get('/api/v1/audit')).status).toBe(403);
  });

  it('firm users cannot reach SuperAdmin routes', async () => {
    for (const email of ['admin@advench.test', 'broker1@advench.test', 'sp1@advench.test']) {
      const { agent } = await signIn(email);
      expect((await agent.get('/api/v1/admin/firms')).status).toBe(403);
    }
  });

  it('anonymous requests get 401', async () => {
    for (const path of ['/api/v1/users', '/api/v1/audit', '/api/v1/admin/firms']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
  });
});
