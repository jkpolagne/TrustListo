import argon2 from 'argon2';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { CSRF_COOKIE, type Me } from '@trustlisto/shared';
import { z } from 'zod';
import { env } from '../../env';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { endSession, setCsrfCookie, startSession } from '../../lib/session';
import { requireAuth } from '../../middleware/auth';
import { HttpError } from '../../middleware/errorHandler';
import { clearFailures, isLocked, recordFailure } from './lockout';

export const authRouter = Router();

// Per-IP brake on password guessing, on top of the per-email lockout. Only failed attempts
// count: a shared office computer (or a demo laptop) switching between accounts is never
// locked out by its own successful sign-ins.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Try again in 15 minutes.',
      },
    });
  },
});

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are real.
const dummyHash = argon2.hash('not-a-real-password');

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const badCredentials = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginBody.parse(req.body);

  if (isLocked(email)) {
    throw new HttpError(
      429,
      'ACCOUNT_LOCKED',
      'Too many failed attempts. This account is locked for 15 minutes.',
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { firm: { select: { status: true } } },
  });
  const ok = await argon2.verify(user?.passwordHash ?? (await dummyHash), password);

  if (!user || !ok) {
    recordFailure(email);
    if (user) {
      await audit(req, {
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        firmId: user.firmId,
        actorId: user.id,
      });
    }
    throw badCredentials();
  }
  if (!user.isActive) {
    throw new HttpError(
      403,
      'ACCOUNT_INACTIVE',
      'This account is deactivated. Contact your company admin.',
    );
  }
  if (user.firm?.status === 'SUSPENDED') {
    throw new HttpError(
      403,
      'FIRM_SUSPENDED',
      'Your firm’s access is suspended. Contact TrustListo support.',
    );
  }

  clearFailures(email);
  await startSession(res, user.id);
  await audit(req, {
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    firmId: user.firmId,
    actorId: user.id,
  });
  res.json({ role: user.role });
});

authRouter.post('/logout', async (req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const u = req.user!;
  const [firm, credentials] = await Promise.all([
    u.firmId
      ? prisma.firm.findUnique({
          where: { id: u.firmId },
          select: { id: true, name: true, slug: true },
        })
      : null,
    prisma.credential.findMany({
      where: { userId: u.id },
      select: { id: true, type: true, status: true, expiresAt: true },
    }),
  ]);
  // Re-issue the CSRF cookie if the browser lost it.
  if (!req.cookies?.[CSRF_COOKIE]) setCsrfCookie(res);
  const me: Me = {
    id: u.id,
    email: u.email,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
    referralCode: u.referralCode,
    firm,
    credentials: credentials.map((c) => ({ ...c, expiresAt: c.expiresAt?.toISOString() ?? null })),
  };
  res.json(me);
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .regex(/[A-Za-z]/, 'Include at least one letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordBody.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await argon2.verify(user.passwordHash, currentPassword))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is incorrect.');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await argon2.hash(newPassword, { type: argon2.argon2id }) },
  });
  await audit(req, { action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user.id });
  res.status(204).end();
});
