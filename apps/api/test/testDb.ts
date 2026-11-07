import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(import.meta.dirname, '../../../.env') });

/** Same server as dev, separate database, so tests never touch your demo data. */
export function testDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = '/trustlisto_test';
  return url.toString();
}
