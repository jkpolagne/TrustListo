import { parseArea, parseMoney } from '../text';
import type { OcrResult } from '../types';
import { anywhere, cleanValue, field, idToken, labeled, linesOf, personName } from './common';

const money = (raw: string) => {
  const n = parseMoney(raw);
  return n === null ? null : n.toFixed(2);
};

export function extractTaxDeclaration(ocr: OcrResult) {
  const lines = linesOf(ocr);
  return {
    tdNumber: labeled(lines, /\b(?:TD|ARP|TAX DECLARATION)\s*(?:NO\.?|NUMBER)/, idToken),
    ownerName: labeled(lines, /^OWNERS?\b(?!'S| ADDRESS)/, personName),
    lotNumber: anywhere(lines, /\bLOT\s*(?:NO\.?|NUMBER)?\s*[:.]?\s*([0-9]+[A-Z0-9-]*)/),
    areaSqm: (() => {
      for (const l of lines) {
        const a = /AR[EC]A/.test(l.norm) ? parseArea(l.norm) : null;
        if (a !== null) return field(String(a), l.confidence);
      }
      return field(null, 0);
    })(),
    assessedValue: labeled(lines, /\b(?:TOTAL\s+)?ASSESSED VALUE\b/, money),
    improvements: labeled(lines, /\b(?:IMPROVEMENTS?|KIND OF PROPERTY)\b/, cleanValue),
  };
}
