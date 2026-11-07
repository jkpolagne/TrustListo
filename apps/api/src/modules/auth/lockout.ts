/**
 * Locks an email after repeated failed logins (SPEC §14).
 * In-memory: resets when the API restarts and isn't shared across servers. Fine for one
 * prototype server; persisting it would need a schema change (§6), so ask first.
 */
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;

const failures = new Map<string, { count: number; lockedUntil: number }>();

export function isLocked(email: string, now = Date.now()): boolean {
  const f = failures.get(email);
  return !!f && f.lockedUntil > now;
}

export function recordFailure(email: string, now = Date.now()): void {
  const f = failures.get(email) ?? { count: 0, lockedUntil: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILURES) {
    f.lockedUntil = now + LOCK_MS;
    f.count = 0;
  }
  failures.set(email, f);
}

export function clearFailures(email: string): void {
  failures.delete(email);
}
