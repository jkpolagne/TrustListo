import type { Extracted, ExtractedField, OcrLine, OcrResult } from '../types';
import { norm } from '../text';

/**
 * Helpers for reading labeled values ("TCT No.: T-1234") from OCR lines.
 * Confidence = the OCR confidence of the line the value came from (SPEC §8.3), scaled down
 * when the value was found by a weaker rule (no label, or label on the line above).
 */

export const NONE: ExtractedField = { value: null, confidence: 0 };

export const field = (value: string | null, confidence: number): ExtractedField =>
  value === null || value === '' ? NONE : { value, confidence: Math.round(confidence) };

export type Lines = (OcrLine & { norm: string })[];

export function linesOf(ocr: OcrResult): Lines {
  return ocr.lines.map((l) => ({ ...l, norm: tidy(l.text) })).filter((l) => l.norm.length > 0);
}

/** Short words that are real name/text parts, not OCR noise. */
const KEEP_SHORT = new Set(['MA', 'DE', 'DA', 'LA', 'NO', 'OF', 'TO', 'Y', 'P', 'SQ', 'M']);

/**
 * Removes the stray marks OCR picks up around a photographed line: border/shadow specks at
 * the start ("‘Name of Project", "| License No."), and short junk after a wide gap at the end
 * ("Futura Homes      oi    :"). Tesseract keeps wide gaps because we ask it to preserve
 * spacing, so a gap of 3+ spaces separates columns or noise.
 */
export function tidy(raw: string): string {
  const segments = raw
    .split(/\s{3,}/)
    // Keep a segment with a digit or a real word; drop specks like "Co", ":", "oi" after a
    // wide gap. A short line on its own is kept: it may be a real value ("UY", a surname).
    .filter(
      (seg, _i, all) =>
        /\d/.test(seg) || (seg.match(/[A-Za-z]/g)?.length ?? 0) >= (all.length > 1 ? 3 : 2),
    );
  let s = norm(segments.join('  ')).replace(/^[^A-Z0-9]+/, '');
  // A lone 1–2 character token before real words is usually a speck read as a letter.
  const lead = s.match(/^([A-Z0-9]{1,2})\s+(?=[A-Z]{3,})/);
  if (lead && !KEEP_SHORT.has(lead[1]!)) s = s.slice(lead[0].length);
  // Same at the end: drop trailing 1–2 letter fragments ("SANTOS CO", "2020. DT").
  while (/\s[A-Z]{1,2}[^A-Z0-9]*$/.test(s)) {
    const m = s.match(/\s([A-Z]{1,2})[^A-Z0-9]*$/)!;
    if (KEEP_SHORT.has(m[1]!)) break;
    s = s.slice(0, m.index).trimEnd();
  }
  return s.replace(/[^A-Z0-9)]+$/, '').trim();
}

/**
 * First line matching `label`; the value is the text after the label. When nothing follows
 * the label on that line (ID cards print the label above the value), the next line is used.
 * `parse` turns the raw text into the value or null.
 */
export function labeled(
  lines: Lines,
  label: RegExp,
  parse: (raw: string) => string | null = cleanValue,
): ExtractedField {
  for (const [i, line] of lines.entries()) {
    const m = line.norm.match(label);
    if (!m) continue;
    const rest = line.norm.slice(m.index! + m[0].length).replace(/^[\s:.\-–—#]+/, '');
    const same = rest ? parse(rest) : null;
    if (same) return field(same, line.confidence);
    const next = lines[i + 1];
    // If the next line carries its own label ("…in the name of" / "Registered owner: X"),
    // let the loop read that line as labeled instead of swallowing its label as the value.
    if (next && !label.test(next.norm) && !/^[A-Z][A-Z ']{2,30}:/.test(next.norm)) {
      const below = parse(next.norm);
      if (below) return field(below, next.confidence * 0.9);
    }
  }
  return NONE;
}

/** First line where `pattern`'s first group matches anywhere (no label needed). */
export function anywhere(lines: Lines, pattern: RegExp, scale = 0.8): ExtractedField {
  for (const line of lines) {
    const m = line.norm.match(pattern);
    if (m?.[1]) return field(m[1].trim(), line.confidence * scale);
  }
  return NONE;
}

/** Trims label noise and trailing punctuation. */
export function cleanValue(raw: string): string | null {
  const v = raw
    .replace(/^[\s:.\-–—#]+/, '')
    .replace(/[\s,;:.]+$/, '')
    .trim();
  return v.length ? v : null;
}

/** An ID-like token: letters/digits/dashes with at least two digits. */
export function idToken(raw: string): string | null {
  const m = raw.match(/[A-Z0-9][A-Z0-9-]*[0-9][A-Z0-9-]*/);
  if (!m) return null;
  const v = m[0].replace(/-+$/, '');
  return (v.match(/\d/g)?.length ?? 0) >= 2 ? v : null;
}

/**
 * A person's name: stops at the first descriptor that commonly follows it on titles and
 * certificates ("JUAN DELA CRUZ, Filipino, of legal age…").
 */
export function personName(raw: string, minLetters = 4): string | null {
  const cut = raw
    .split(
      /,\s*(?=FILIPINO|OF LEGAL AGE|SINGLE|MARRIED|WIDOW|RESIDENT|WITH ADDRESS|BOTH|OF\b)|\s+(?:HAS BEEN|IS HEREBY|IS DULY|WITH REGISTRATION|OF LEGAL AGE)\b/,
    )[0]!
    .replace(/[^A-Z\s.,'&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,.\s]+$/, '');
  // A label read where a value should be ("GIVEN NAMES" on the line below "LAST NAME").
  if (/\b(?:NAMES?|DATE|BIRTH|ADDRESS|NATIONALITY|SEX|SIGNATURE)\b/.test(cut)) return null;
  return cut.replace(/[^A-Z]/g, '').length >= minLetters ? cut : null;
}

/**
 * One part of a name printed in its own field. Short parts are real names here — Yap, Lim,
 * Uy, Go, Sy are common surnames — so two letters are enough.
 */
const namePart = (raw: string) => personName(raw, 2);

/** Reads a name printed as separate "Last Name / Given Names / Middle Name" fields (ID cards). */
export function splitName(lines: Lines): ExtractedField {
  // "Gitnang Apelyido" (middle name) must not be read as "Apelyido" (last name).
  const last = labeled(
    lines,
    /\b(?:LAST NAME|SURNAME|(?<!GITNANG )APELYIDO)\b[^:]*?(?=:|$)/,
    namePart,
  );
  const given = labeled(
    lines,
    /\b(?:GIVEN NAMES?|FIRST NAME|MGA PANGALAN)\b[^:]*?(?=:|$)/,
    namePart,
  );
  if (!last.value || !given.value) return NONE;
  // One combined label ("Last Name, First Name, Middle Name") with the whole name below it.
  if (last.value === given.value) return last;
  const middle = labeled(lines, /\b(?:MIDDLE NAME|GITNANG APELYIDO)\b[^:]*?(?=:|$)/, namePart);
  const parts = [given, middle, last].filter((p) => p.value);
  return field(parts.map((p) => p.value).join(' '), Math.min(...parts.map((p) => p.confidence)));
}

export type Extractor = (ocr: OcrResult) => Extracted;
