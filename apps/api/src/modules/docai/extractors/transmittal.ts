import { parseDate, parseMoney } from '../text';
import type { OcrResult } from '../types';
import { cleanValue, labeled, linesOf, personName } from './common';

const money = (raw: string) => {
  const n = parseMoney(raw);
  return n === null ? null : n.toFixed(2);
};

/**
 * Developer's commission transmittal (SPEC §8.3): the amount it releases and which buyer/unit
 * it is for. The amount is compared with the tranche (AMOUNT_MISMATCH if off by more than ₱1).
 */
export function extractTransmittal(ocr: OcrResult) {
  const lines = linesOf(ocr);
  return {
    amount: labeled(
      lines,
      /\b(?:NET COMMISSION|COMMISSION AMOUNT|TOTAL COMMISSION|AMOUNT RELEASED|AMOUNT)\b/,
      money,
    ),
    buyerName: labeled(lines, /\b(?:BUYER|CLIENT|ACCOUNT NAME)\b/, personName),
    unit: labeled(lines, /\b(?:UNIT|PROPERTY|LOT\/UNIT)\b/, cleanValue),
    transmittalDate: labeled(lines, /\bDATE\b/, parseDate),
  };
}
