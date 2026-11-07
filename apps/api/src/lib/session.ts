import { randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { CSRF_COOKIE } from '@trustlisto/shared';
import { env } from '../env';

export const SESSION_COOKIE = 'tl_session';
const secret = new TextEncoder().encode(env.JWT_SECRET);

const base: CookieOptions = {
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
};

/** JWT holds only the user id. Role/firm/active status are re-read from the DB on every request. */
export async function startSession(res: Response, userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
  res.cookie(SESSION_COOKIE, token, { ...base, httpOnly: true });
  setCsrfCookie(res);
}

/** Double-submit CSRF token: readable by our JS, echoed back in a header on writes. */
export function setCsrfCookie(res: Response): void {
  res.cookie(CSRF_COOKIE, randomBytes(24).toString('base64url'), { ...base, httpOnly: false });
}

export function endSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, base);
}

export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
