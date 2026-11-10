/** Text helpers shared by the classifier and extractors. All work on OCR output, so they are forgiving. */

/** Uppercase, strip accents (Ñ → N), collapse whitespace. */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  SEPT: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};
const MONTH = String.raw`(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEPT?|OCT|NOV|DEC)[A-Z]*\.?`;

const iso = (y: number, m: number, d: number): string | null => {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null; // e.g. Feb 30
  return date.toISOString().slice(0, 10);
};

/**
 * Finds the first date in a string and returns it as YYYY-MM-DD.
 * Accepts "March 5, 2027", "05 March 2027", "2027-03-05" and "03/05/2027" (month first, as PH documents print it).
 */
export function parseDate(input: string): string | null {
  const s = norm(input);
  let m = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);
  m = s.match(new RegExp(String.raw`\b${MONTH}\s*(\d{1,2}),?\s*(\d{4})\b`));
  if (m) return iso(+m[3]!, MONTHS[m[1]!]!, +m[2]!);
  m = s.match(
    new RegExp(String.raw`\b(\d{1,2})(?:ST|ND|RD|TH)?\s*(?:DAY OF\s*)?${MONTH},?\s*(\d{4})\b`),
  );
  if (m) return iso(+m[3]!, MONTHS[m[2]!]!, +m[1]!);
  m = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (m) return iso(+m[3]!, +m[1]!, +m[2]!);
  return null;
}

/**
 * "₱1,234.50", "P 1,234.50", "PHP 1234" → 1234.5. OCR often reads a thousands comma as a
 * period ("1.430.000.00"), so only a final ".dd" counts as centavos; other separators are dropped.
 */
export function parseMoney(input: string): number | null {
  const m = norm(input).match(/\d[\d,.]*\d|\d/);
  if (!m) return null;
  const raw = m[0];
  const cents = raw.match(/[.,](\d{2})$/);
  const whole = (cents ? raw.slice(0, -3) : raw).replace(/[^\d]/g, '');
  if (!whole) return null;
  const n = Number(`${whole}.${cents?.[1] ?? '00'}`);
  return Number.isFinite(n) ? n : null;
}

/** "240 square meters", "240 sq. m.", "240 SQM", "240 m2" → 240 */
export function parseArea(input: string): number | null {
  const m = norm(input).match(
    /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:\(\s*\d[\d,.]*\s*\)\s*)?(?:S[QG][A-Z]*[.,]?\s*M[A-Z]*\b\.?|M2\b|M²)/,
  );
  if (!m) return null;
  return Number(m[1]!.replace(/,/g, ''));
}

/** Uppercase letters and digits only, for comparing ID numbers typed different ways. */
export const alnum = (s: string) => norm(s).replace(/[^A-Z0-9]/g, '');
