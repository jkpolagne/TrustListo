import { parseArea } from '../text';
import type { OcrResult } from '../types';
import { anywhere, field, idToken, labeled, linesOf, personName, type Lines } from './common';

const ENCUMBRANCES = ['MORTGAGE', 'LIS PENDENS', 'ADVERSE CLAIM', 'LEVY', 'ATTACHMENT'] as const;

type Entry = { no: string | null; text: string; confidence: number };

/** Groups the memorandum into entries; each starts with "Entry No. ####". */
function memorandumEntries(lines: Lines): { entries: Entry[]; found: boolean } {
  const start = lines.findIndex((l) => /\bMEMORANDUM\b/.test(l.norm));
  const body = start >= 0 ? lines.slice(start + 1) : lines;
  const entries: Entry[] = [];
  for (const l of body) {
    const m = l.norm.match(/^ENTRY\s*NO\.?\s*([0-9][0-9-]*)/);
    if (m || !entries.length) {
      entries.push({ no: m?.[1] ?? null, text: l.norm, confidence: l.confidence });
    } else {
      const last = entries[entries.length - 1]!;
      last.text += ` ${l.norm}`;
      last.confidence = Math.min(last.confidence, l.confidence);
    }
  }
  return { entries, found: start >= 0 };
}

/**
 * Encumbrances that were annotated and never cancelled (SPEC §8.3). An encumbrance is
 * cancelled when a later "CANCELLATION" entry names its entry number. If the entries don't
 * reference each other, we fall back to counting cancellations of the same kind.
 */
export function uncancelledEncumbrances(lines: Lines) {
  const { entries, found } = memorandumEntries(lines);
  const cancels = entries.filter((e) => /CANCEL/.test(e.text));
  const referenced = new Set(
    cancels.flatMap((c) =>
      [...c.text.matchAll(/(?:ENTRY\s*NO\.?\s*|\()([0-9][0-9-]{2,})/g)]
        .map((m) => m[1]!)
        .filter((n) => n !== c.no),
    ),
  );
  const open: string[] = [];
  for (const kind of ENCUMBRANCES) {
    const hits = entries.filter((e) => e.text.includes(kind) && !/CANCEL/.test(e.text));
    const unreferenced = hits.filter((e) => !e.no || !referenced.has(e.no));
    // Cancellations of this kind that don't point at a specific entry.
    const looseCancels = cancels.filter(
      (c) => c.text.includes(kind) && !hits.some((h) => h.no && c.text.includes(h.no)),
    ).length;
    for (const e of unreferenced.slice(looseCancels)) {
      open.push(e.no ? `${kind} (Entry No. ${e.no})` : kind);
    }
  }
  const confidence = entries.length ? Math.min(...entries.map((e) => e.confidence)) : 0;
  // Without a memorandum heading we can't be sure we read the right part of the title.
  return { open, confidence: found ? confidence : Math.min(confidence, 50) };
}

export function extractLandTitle(ocr: OcrResult) {
  const lines = linesOf(ocr);
  const enc = uncancelledEncumbrances(lines);
  const owner = labeled(lines, /\bREGISTERED OWNERS?\b|\bIN THE NAME OF\b/, personName);
  return {
    titleNumber: labeled(
      lines,
      /\b(?:TCT|OCT|CCT|TRANSFER CERTIFICATE OF TITLE|ORIGINAL CERTIFICATE OF TITLE)\s*(?:NO\.?|NUMBER|#)/,
      idToken,
    ),
    ownerName: owner.value ? owner : labeled(lines, /\bOWNERS?\s*:/, personName),
    lotNumber: anywhere(lines, /\bLOT\s*(?:NO\.?|NUMBER)?\s*[:.]?\s*([0-9]+[A-Z0-9-]*)/),
    areaSqm: (() => {
      for (const l of lines) {
        if (!/AREA|CONTAINING|SQUARE|SQ\.?\s*M/.test(l.norm)) continue;
        const a = parseArea(l.norm);
        if (a !== null) return field(String(a), l.confidence);
      }
      return field(null, 0);
    })(),
    encumbrances: field(enc.open.length ? enc.open.join('; ') : 'None found', enc.confidence),
  };
}
