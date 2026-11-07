import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const app = createApp();

afterAll(() => prisma.$disconnect());

describe('app', () => {
  it('reports healthy DB with PostGIS', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: true });
    expect(res.body.postgis).toBeTruthy();
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
