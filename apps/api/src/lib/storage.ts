import { randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Object key layout from SPEC §5.3: firms/{firmId}/{entity}/{entityId}/{uuid}.{ext} */
export function objectKey(firmId: string, entity: string, entityId: string, mime: string): string {
  return `firms/${firmId}/${entity}/${entityId}/${randomUUID()}.${EXT[mime] ?? 'bin'}`;
}

/** Objects are private (no public ACL). Access only through presignedGet after a scope check. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}

/** 5-minute download link (SPEC §5.3). */
export function presignedGet(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
    expiresIn: 300,
  });
}

/** Reads a stored object back (the document pipeline needs the bytes for OCR). */
export async function getObjectBytes(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}
