import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@trustlisto/shared';
import { env } from './env';
import { prisma } from './lib/prisma';
import { csrfProtection, requireAuth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errorHandler';
import { auditRouter } from './modules/audit/audit.routes';
import { authRouter } from './modules/auth/auth.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { adminRouter } from './modules/firms/admin.routes';
import { publicRouter } from './modules/marketplace/public.routes';
import { catalogRouter } from './modules/properties/catalog.routes';
import { settingsRouter } from './modules/settings/settings.routes';
import { reviewsRouter } from './modules/reviews/reviews.routes';
import { usersRouter } from './modules/users/users.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // correct client IP behind DO's load balancer
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const v1 = Router();
  v1.use(csrfProtection);

  v1.get('/health', async (_req, res) => {
    try {
      const [row] = await prisma.$queryRaw<{ v: string }[]>`SELECT postgis_version() AS v`;
      const body: HealthResponse = { status: 'ok', db: true, postgis: row?.v ?? null };
      res.json(body);
    } catch {
      const body: HealthResponse = { status: 'error', db: false, postgis: null };
      res.status(503).json(body);
    }
  });

  v1.use('/auth', authRouter);
  v1.use('/public', publicRouter); // marketplace, no login
  // Everything below needs a signed-in user.
  v1.use('/admin', requireAuth, adminRouter);
  v1.use('/users', requireAuth, usersRouter);
  v1.use('/audit', requireAuth, auditRouter);
  v1.use('/reviews', requireAuth, reviewsRouter);
  v1.use('/documents', requireAuth, documentsRouter);
  v1.use('/catalog', requireAuth, catalogRouter); // developers, projects, units
  v1.use('/settings', requireAuth, settingsRouter);

  app.use('/api/v1', v1);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
