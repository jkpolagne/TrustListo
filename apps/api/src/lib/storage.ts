import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../env';

// Same code path for MinIO (dev) and DigitalOcean Spaces (prod).
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

/** Creates the upload bucket if missing (dev convenience; Spaces bucket is created manually). */
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
  }
}
