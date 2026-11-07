import { createHash } from 'node:crypto';
import multer from 'multer';
import { env } from '../env';
import { HttpError } from '../middleware/errorHandler';

/** Keeps uploads in memory (≤ UPLOAD_MAX_MB) so we can sniff and hash before storing. */
export const singleFile = (field: string) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  }).single(field);

/**
 * Detects the real file type from its first bytes ("magic bytes"), ignoring the file name
 * and the browser's claimed type, which are both easy to fake (SPEC §14).
 */
export function sniffMime(buf: Buffer): string | null {
  const ascii = (start: number, end: number) => buf.subarray(start, end).toString('latin1');
  if (ascii(0, 5) === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function requireDocumentFile(file: Express.Multer.File | undefined) {
  if (!file) throw new HttpError(400, 'FILE_REQUIRED', 'Attach the document file.');
  const mime = sniffMime(file.buffer);
  if (!mime) {
    throw new HttpError(400, 'FILE_TYPE', 'Upload a PDF, JPG, PNG or WebP file.');
  }
  return { mime, buffer: file.buffer, size: file.size, sha256: sha256(file.buffer) };
}

export const sha256 = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');
