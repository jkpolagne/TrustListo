import { parseDate, parseMoney } from '../text';
import type { OcrResult } from '../types';
import { idToken, labeled, linesOf, personName } from './common';

const money = (raw: string) => {
  const n = parseMoney(raw);
  return n === null ? null : n.toFixed(2);
};

/**
 * Buyer payment receipt (official or acknowledgement receipt from the developer or firm).
 * The amount pre-fills the payment form; the uploader confirms it (SPEC §8.3).
 */
export function extractPaymentReceipt(ocr: OcrResult) {
  const lines = linesOf(ocr);
  return {
    orNumber: labeled(
      lines,
      /\b(?:O\.?\s?R\.?|A\.?\s?R\.?|OFFICIAL RECEIPT|ACKNOWLEDGE?MENT RECEIPT|RECEIPT)\s*(?:NO\.?|NUMBER|#)/,
      idToken,
    ),
    paymentDate: labeled(lines, /\bDATE(?: OF PAYMENT| PAID)?\b/, parseDate),
    amount: labeled(
      lines,
      /\b(?:TOTAL AMOUNT PAID|AMOUNT PAID|TOTAL AMOUNT|AMOUNT RECEIVED|THE SUM OF|AMOUNT|TOTAL)\b/,
      money,
    ),
    receivedFrom: labeled(lines, /\bRECEIVED FROM\b/, personName),
  };
}
