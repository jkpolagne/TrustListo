import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../test/helpers';
import { prisma } from './lib/prisma';

afterAll(() => prisma.$disconnect());

describe('app', () => {
  it('reports healthy DB with PostGIS', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: true });
    expect(res.body.postgis).toBeTruthy();
  });

  it('returns the §13 error shape for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });
});
