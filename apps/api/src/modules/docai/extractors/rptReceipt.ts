import { parseDate, parseMoney } from '../text';
import type { OcrResult } from '../types';
import { field, idToken, labeled, linesOf } from './common';

/** "1ST-4TH QTR 2026" → { year: 2026, quarter: 4 }; "2026" alone → the full year (quarter 4). */
export function parsePeriod(raw: string): { year: number; quarter: number } | null {
  const years = [...raw.matchAll(/\b(20\d{2})\b/g)].map((m) => +m[1]!);
  if (!years.length) return null;
  const quarters = [
    ...[...raw.matchAll(/\b([1-4])\s*(?:ST|ND|RD|TH)?\s*(?:QTR|QUARTER)\b/g)].map((m) => +m[1]!),
    ...[...raw.matchAll(/\bQ([1-4])\b/g)].map((m) => +m[1]!),
    // "1ST-4TH QTR": the end of the range has no "QTR" of its own.
    ...[...raw.matchAll(/\b[1-4]\s*(?:ST|ND|RD|TH)\s*-\s*([1-4])\s*(?:ST|ND|RD|TH)/g)].map(
      (m) => +m[1]!,
    ),
  ];
  return { year: Math.max(...years), quarter: quarters.length ? Math.max(...quarters) : 4 };
}

const money = (raw: string) => {
  const n = parseMoney(raw);
  return n === null ? null : n.toFixed(2);
};

export function extractRptReceipt(ocr: OcrResult) {
  const lines = linesOf(ocr);
  const period = labeled(
    lines,
    /\b(?:PERIOD COVERED|FOR THE YEAR|TAX YEAR|YEAR COVERED)\b/,
    (raw) => (parsePeriod(raw) ? raw : null),
  );
  const parsed = period.value ? parsePeriod(period.value) : null;
  return {
    orNumber: labeled(
      lines,
      /\b(?:O\.?\s?R\.?|OFFICIAL RECEIPT|RECEIPT)\s*(?:NO\.?|NUMBER|#)/,
      idToken,
    ),
    paymentDate: labeled(lines, /\bDATE(?: OF PAYMENT| PAID)?\b/, parseDate),
    amount: labeled(lines, /\b(?:TOTAL AMOUNT PAID|TOTAL AMOUNT|AMOUNT PAID|TOTAL)\b/, money),
    yearCovered: field(parsed ? String(parsed.year) : null, period.confidence),
    quarterCovered: field(parsed ? String(parsed.quarter) : null, period.confidence),
    tdNumber: labeled(lines, /\b(?:TD|ARP)\s*(?:NO\.?|NUMBER)/, idToken),
  };
}
