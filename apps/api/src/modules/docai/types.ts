// SPEC §8.4
export type DocFlagCode =
  | 'OWNER_MISMATCH'
  | 'AREA_MISMATCH'
  | 'ENCUMBRANCE_FOUND'
  | 'TAX_DELINQUENT'
  | 'LTS_EXPIRED'
  | 'LTS_EXPIRING_SOON'
  | 'PROJECT_MISMATCH'
  | 'NAME_MISMATCH'
  | 'NUMBER_MISMATCH'
  | 'CREDENTIAL_EXPIRED'
  | 'ID_EXPIRED'
  | 'TYPE_MISMATCH'
  | 'LOW_CONFIDENCE'
  | 'DUPLICATE_RECEIPT'
  | 'DUPLICATE_FILE'
  | 'AMOUNT_MISMATCH'
  | 'OCR_FAILED';

export type DocFlag = {
  code: DocFlagCode;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message: string;
  evidence?: { field: string; found: string; expected?: string };
};

/**
 * The only two outcomes the AI may suggest. APPROVED is deliberately not in this type:
 * AI flags, a broker decides (SPEC §2 rule 1, §8).
 */
export type AiSuggestion = 'NEEDS_ATTENTION' | 'READY_FOR_REVIEW';

export const suggestFrom = (flags: DocFlag[]): AiSuggestion =>
  flags.some((f) => f.severity !== 'INFO') ? 'NEEDS_ATTENTION' : 'READY_FOR_REVIEW';

/** One OCR'd line with Tesseract's confidence for it (0–100). */
export type OcrLine = { text: string; confidence: number };
export type OcrResult = { text: string; confidence: number; lines: OcrLine[]; pages: number };

/**
 * A field read from the document (SPEC §8.3). `edited` marks a broker correction; the AI's
 * original reading is kept in `aiValue` so the audit trail shows both.
 */
export type ExtractedField = {
  value: string | null;
  confidence: number;
  edited?: boolean;
  aiValue?: string | null;
};
export type Extracted = Record<string, ExtractedField>;
