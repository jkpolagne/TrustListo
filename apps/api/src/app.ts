import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@trustlisto/shared';
import { env } from './env';
import { prisma } from './lib/prisma';
import { errorHandler, notFound } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      const [row] = await prisma.$queryRaw<{ v: string }[]>`SELECT postgis_version() AS v`;
      const body: HealthResponse = { status: 'ok', db: true, postgis: row?.v ?? null };
      res.json(body);
    } catch {
      const body: HealthResponse = { status: 'error', db: false, postgis: null };
      res.status(503).json(body);
    }
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
