import { parseDate } from '../text';
import type { OcrResult } from '../types';
import { idToken, labeled, linesOf, personName, splitName } from './common';

/** Government IDs and passports: name, ID number, birth date, and expiry if printed. */
export function extractValidId(ocr: OcrResult) {
  const lines = linesOf(ocr);
  const split = splitName(lines);
  return {
    fullName: split.value ? split : labeled(lines, /^(?:FULL\s+)?NAME\b/, personName),
    idNumber: labeled(
      lines,
      /\b(?:ID|LICENSE|CARD|PASSPORT|PHILSYS)\s*(?:NO\.?|NUMBER)|\b(?:PCN|CRN)\b/,
      idToken,
    ),
    birthDate: labeled(lines, /\b(?:DATE OF BIRTH|BIRTH ?DATE|PETSA NG KAPANGANAKAN)\b/, parseDate),
    expiryDate: labeled(
      lines,
      /\b(?:EXPIRATION DATE|EXPIRY DATE|DATE OF EXPIRY|VALID UNTIL|VALID THRU|EXPIRES)\b/,
      parseDate,
    ),
  };
}
