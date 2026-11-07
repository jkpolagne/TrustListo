import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { CSRF_COOKIE, CSRF_HEADER } from '@trustlisto/shared';
import { prisma } from '../lib/prisma';
import { SESSION_COOKIE, endSession, readSession } from '../lib/session';
import { HttpError, forbiddenError } from './errorHandler';

export interface AuthUser {
  id: string;
  role: Role;
  firmId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const unauthenticated = () => new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');

/**
 * Loads the user from the DB on every request, so deactivating a user or suspending a firm
 * takes effect immediately rather than when the token expires.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const userId = await readSession(req.cookies?.[SESSION_COOKIE]);
  if (!userId) throw unauthenticated();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { firm: { select: { status: true } } },
  });
  if (!user || !user.isActive || user.firm?.status === 'SUSPENDED') {
    endSession(res);
    throw unauthenticated();
  }

  req.user = {
    id: user.id,
    role: user.role,
    firmId: user.firmId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    referralCode: user.referralCode,
  };
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbiddenError();
    next();
  };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Double-submit check for cookie-authenticated writes (SPEC §14). */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method) || !req.cookies?.[SESSION_COOKIE]) return next();
  const cookie = req.cookies[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (!cookie || cookie !== header) {
    throw new HttpError(
      403,
      'CSRF_FAILED',
      'Security token missing. Reload the page and try again.',
    );
  }
  next();
};
