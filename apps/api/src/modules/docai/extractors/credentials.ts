import { parseDate } from '../text';
import type { OcrResult } from '../types';
import { cleanValue, idToken, labeled, linesOf, personName, splitName } from './common';

const VALID_UNTIL =
  /\b(?:VALID UNTIL|VALIDITY|EXPIRY DATE|EXPIRES ON|EXPIRATION DATE|DATE OF EXPIRY)\b/;

/** PRC professional ID card. */
export function extractPrcId(ocr: OcrResult) {
  const lines = linesOf(ocr);
  const split = splitName(lines);
  return {
    fullName: split.value ? split : labeled(lines, /^NAME\b/, personName),
    registrationNumber: labeled(lines, /\bREGISTRATION\s*(?:NO\.?|NUMBER)/, idToken),
    validUntil: labeled(lines, VALID_UNTIL, parseDate),
    profession: labeled(lines, /^PROFESSION\b/, cleanValue),
  };
}

/** DHSUD Certificate of Registration (real estate salesperson). */
export function extractDhsudCert(ocr: OcrResult) {
  const lines = linesOf(ocr);
  const name = labeled(lines, /\bCERTIFY THAT\b/, personName);
  return {
    fullName: name.value ? name : labeled(lines, /^NAME\b/, personName),
    registrationNumber: labeled(
      lines,
      /\b(?:CERTIFICATE OF REGISTRATION|REGISTRATION)\s*(?:NO\.?|NUMBER)/,
      idToken,
    ),
    validUntil: labeled(lines, VALID_UNTIL, parseDate),
  };
}
