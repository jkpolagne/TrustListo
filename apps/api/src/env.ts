import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

// .env lives at the repo root.
config({ path: resolve(import.meta.dirname, '../../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('8h'),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string(),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  UPLOAD_MAX_MB: z.coerce.number().default(10),
  OCR_LANG: z.string().default('eng'),
  OCR_CONCURRENCY: z.coerce.number().default(1),
  NAME_MATCH_OK: z.coerce.number().default(0.92),
  NAME_MATCH_WARN: z.coerce.number().default(0.8),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment. Copy .env.example to .env at the repo root.');
}

export const env = parsed.data;
