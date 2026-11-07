import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { testDatabaseUrl } from './testDb';

// Runs once before all test files: migrate (creates the DB if missing) and load the seed.
export default function setup() {
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl(), NODE_ENV: 'test' };
  const cwd = resolve(import.meta.dirname, '..');
  execSync('pnpm exec prisma migrate deploy', { cwd, env, stdio: 'pipe' });
  execSync('pnpm exec tsx prisma/seed.ts', { cwd, env, stdio: 'pipe' });
}
