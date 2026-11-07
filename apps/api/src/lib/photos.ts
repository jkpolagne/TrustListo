import sharp from 'sharp';
import { HttpError } from '../middleware/errorHandler';
import { sniffMime } from './upload';

/**
 * Listing photos are re-encoded before storing:
 * - auto-rotated from EXIF, resized to at most 1600px, saved as WebP;
 * - all metadata dropped, which removes GPS coordinates a phone camera may embed
 *   (a seller's home location is personal data under the Data Privacy Act).
 */
export async function processListingPhoto(file: Express.Multer.File | undefined): Promise<Buffer> {
  if (!file) throw new HttpError(400, 'FILE_REQUIRED', 'Attach a photo.');
  const mime = sniffMime(file.buffer);
  if (!mime || mime === 'application/pdf') {
    throw new HttpError(400, 'FILE_TYPE', 'Upload a JPG, PNG or WebP photo.');
  }
  try {
    return await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(400, 'FILE_TYPE', "This photo couldn't be read. Try another file.");
  }
}
