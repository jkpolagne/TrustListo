import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/testDb';

export default defineConfig({
  test: {
    env: { DATABASE_URL: testDatabaseUrl(), NODE_ENV: 'test' },
    globalSetup: ['./test/globalSetup.ts'],
    // Test files share one seeded DB; run them one at a time.
    fileParallelism: false,
  },
});
