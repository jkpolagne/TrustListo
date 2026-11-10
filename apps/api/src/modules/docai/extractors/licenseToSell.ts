import { parseDate } from '../text';
import type { OcrResult } from '../types';
import { cleanValue, idToken, labeled, linesOf } from './common';

export function extractLicenseToSell(ocr: OcrResult) {
  const lines = linesOf(ocr);
  return {
    ltsNumber: labeled(lines, /\b(?:LICENSE TO SELL|LTS)\s*(?:NO\.?|NUMBER)/, idToken),
    projectName: labeled(lines, /^(?:NAME OF\s+)?PROJECT(?: NAME)?\b/, cleanValue),
    developerName: labeled(
      lines,
      /^(?:NAME OF DEVELOPER|OWNER\s*\/\s*DEVELOPER|DEVELOPER|DEVELOPED BY)\b/,
      cleanValue,
    ),
    issueDate: labeled(lines, /\b(?:DATE ISSUED|ISSUED ON|DATE OF ISSUE)\b/, parseDate),
    expiryDate: labeled(
      lines,
      /\b(?:VALID UNTIL|VALIDITY|EXPIRY DATE|EXPIRES ON|DATE OF EXPIRY)\b/,
      parseDate,
    ),
  };
}
