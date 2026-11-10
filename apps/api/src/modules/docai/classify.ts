import type { DocType } from '@prisma/client';
import { DOCAI } from './config';
import { norm } from './text';

/**
 * Rule-based classifier (SPEC §8.2): each document type has signal phrases with weights.
 * Score = sum of weights of the phrases found. Explainable: the result lists what matched.
 * Strong phrases (the document's own title) weigh 4–5; supporting words weigh 1–2.
 */
type Signal = [phrase: string, weight: number];

const SIGNALS: Partial<Record<DocType, Signal[]>> = {
  LAND_TITLE: [
    ['TRANSFER CERTIFICATE OF TITLE', 5],
    ['ORIGINAL CERTIFICATE OF TITLE', 5],
    ['CONDOMINIUM CERTIFICATE OF TITLE', 5],
    ['REGISTRY OF DEEDS', 3],
    ['TCT NO', 3],
    ['MEMORANDUM OF ENCUMBRANCES', 2],
    ['TECHNICAL DESCRIPTION', 1],
    ['LAND REGISTRATION AUTHORITY', 1],
  ],
  TAX_DECLARATION: [
    ['TAX DECLARATION OF REAL PROPERTY', 5],
    ['TAX DECLARATION', 3],
    ['ARP NO', 3],
    ['ASSESSED VALUE', 2],
    ['ASSESSOR', 2],
    ['MARKET VALUE', 1],
  ],
  RPT_RECEIPT: [
    ['REAL PROPERTY TAX', 4],
    ['OFFICIAL RECEIPT', 2],
    ['BASIC', 1],
    ['SEF', 1],
    ['SPECIAL EDUCATION FUND', 1],
    ['TREASURER', 2],
  ],
  LICENSE_TO_SELL: [
    ['LICENSE TO SELL', 5],
    ['DHSUD', 1],
    ['HLURB', 1],
    ['PROJECT NAME', 2],
    ['HUMAN SETTLEMENTS', 1],
  ],
  PRC_ID: [
    ['PROFESSIONAL REGULATION COMMISSION', 4],
    ['PROFESSIONAL IDENTIFICATION CARD', 2],
    ['REGISTRATION NO', 1],
    ['REAL ESTATE', 1],
  ],
  DHSUD_CERT: [
    ['DEPARTMENT OF HUMAN SETTLEMENTS AND URBAN DEVELOPMENT', 3],
    ['CERTIFICATE OF REGISTRATION', 3],
    ['REAL ESTATE SALESPERSON', 2],
    ['HAS BEEN REGISTERED', 1],
  ],
  PAYMENT_RECEIPT: [
    ['ACKNOWLEDGEMENT RECEIPT', 4],
    ['ACKNOWLEDGMENT RECEIPT', 4],
    ['OFFICIAL RECEIPT', 2],
    ['RECEIVED FROM', 2],
    ['AMOUNT', 1],
  ],
  TRANSMITTAL: [
    ['TRANSMITTAL', 4],
    ['COMMISSION', 2],
  ],
  CENOMAR: [
    ['CERTIFICATE OF NO MARRIAGE', 5],
    ['PHILIPPINE STATISTICS AUTHORITY', 1],
  ],
  BIRTH_CERT: [
    ['CERTIFICATE OF LIVE BIRTH', 5],
    ['PHILIPPINE STATISTICS AUTHORITY', 1],
  ],
  MARRIAGE_CONTRACT: [
    ['CERTIFICATE OF MARRIAGE', 5],
    ['PHILIPPINE STATISTICS AUTHORITY', 1],
  ],
  PAYSLIP: [
    ['PAYSLIP', 4],
    ['PAY SLIP', 4],
    ['NET PAY', 2],
  ],
  COE: [['CERTIFICATE OF EMPLOYMENT', 5]],
  ITR: [
    ['BIR FORM', 3],
    ['2316', 2],
    ['1700', 1],
    ['1701', 1],
  ],
  VALID_ID: [
    ['PHILIPPINE IDENTIFICATION', 4],
    ['PHILSYS', 3],
    ["DRIVER'S LICENSE", 4],
    ['DRIVERS LICENSE', 4],
    ['UNIFIED MULTI-PURPOSE ID', 4],
    ['POSTAL IDENTITY CARD', 4],
    ['DATE OF BIRTH', 1],
    ['REPUBLIKA NG PILIPINAS', 1],
  ],
  PASSPORT: [
    ['PASSPORT', 4],
    ['PASAPORTE', 4],
  ],
};

export type Classification = {
  type: DocType;
  score: number;
  /** The phrases that matched, for the broker and the manuscript. */
  matched: string[];
};

export function classify(ocrText: string): Classification {
  const text = norm(ocrText);
  // Also match with spaces/punctuation removed, so "TCTNO" or "TCT No." both count.
  const squashed = text.replace(/[^A-Z0-9]/g, '');
  let best: Classification = { type: 'UNKNOWN', score: 0, matched: [] };
  for (const [type, signals] of Object.entries(SIGNALS) as [DocType, Signal[]][]) {
    let score = 0;
    const matched: string[] = [];
    for (const [phrase, weight] of signals) {
      if (text.includes(phrase) || squashed.includes(phrase.replace(/[^A-Z0-9]/g, ''))) {
        score += weight;
        matched.push(phrase);
      }
    }
    if (score > best.score) best = { type, score, matched };
  }
  return best.score >= DOCAI.classifyThreshold ? best : { ...best, type: 'UNKNOWN' };
}

/**
 * Types that count as "the same thing" for TYPE_MISMATCH. A seller's valid ID can be any
 * government ID; a PRC card is also a valid ID.
 */
const FAMILIES: DocType[][] = [['SELLER_ID', 'VALID_ID', 'PASSPORT', 'PRC_ID']];

export function sameKind(declared: DocType, detected: DocType): boolean {
  if (declared === detected) return true;
  return FAMILIES.some((f) => f.includes(declared) && f.includes(detected));
}
