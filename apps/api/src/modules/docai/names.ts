import { DOCAI } from './config';
import { norm } from './text';

/**
 * Name matching (SPEC §8.5). Explainable on purpose, so the broker and the panel can see
 * why two names did or didn't match.
 *
 * 1. Normalize: uppercase, no accents/punctuation, drop honorifics (MR, ATTY…) and suffixes (JR, III…),
 *    turn "SURNAME, GIVEN MIDDLE" into "GIVEN MIDDLE SURNAME", glue particles ("DE LA CRUZ" → "DELACRUZ").
 * 2. Pair each part of the shorter name with its most similar part in the longer one (token set),
 *    so a missing middle name doesn't count against a match. A single letter matches a part that
 *    starts with it (middle initials).
 * 3. Score = half Jaro–Winkler over the paired names, half the weakest pair. The weakest pair keeps
 *    "JUAN" vs "JUANA" from passing just because the rest of the name agrees.
 */

const HONORIFICS = new Set([
  'MR',
  'MRS',
  'MS',
  'MISS',
  'DR',
  'ATTY',
  'ENGR',
  'ARCH',
  'HON',
  'SPS',
  'SPOUSES',
]);
const SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V']);
const PARTICLES = new Set([
  'DE',
  'DEL',
  'DELA',
  'DELOS',
  'LA',
  'LAS',
  'LOS',
  'SAN',
  'SANTA',
  'STA',
  'STO',
  'VDA',
  'Y',
]);
const ABBREVIATIONS: Record<string, string> = {
  MA: 'MARIA',

  STA: 'SANTA',
  STO: 'SANTO',
};

/** Name → list of comparable parts. */
export function nameTokens(raw: string): string[] {
  let s = norm(raw)
    // Common OCR slips inside names.
    .replace(/(?<=[A-Z])0(?=[A-Z])/g, 'O')
    .replace(/(?<=[A-Z])1(?=[A-Z])/g, 'I');
  // "SANTOS, MARIA L." → "MARIA L. SANTOS" (only when the comma comes first, before any given name).
  const comma = s.indexOf(',');
  if (comma > 0) s = `${s.slice(comma + 1)} ${s.slice(0, comma)}`;
  const words = s
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREVIATIONS[w] ?? w)
    .filter((w) => !HONORIFICS.has(w) && !SUFFIXES.has(w));

  // Glue particles onto the next word: DE LA CRUZ → DELACRUZ, DELA CRUZ → DELACRUZ.
  const out: string[] = [];
  let carry = '';
  for (const [i, w] of words.entries()) {
    if (PARTICLES.has(w) && i < words.length - 1) {
      carry += w;
      continue;
    }
    out.push(carry + w);
    carry = '';
  }
  return out;
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aHit = new Array<boolean>(a.length).fill(false);
  const bHit = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j <= Math.min(b.length - 1, i + range); j++) {
      if (!bHit[j] && a[i] === b[j]) {
        aHit[i] = bHit[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!aHit[i]) continue;
    while (!bHit[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** 1 − edit distance / longer length. Strict on short words, which is what we want for given names. */
function editRatio(a: string, b: string): number {
  const d: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length]! / Math.max(a.length, b.length, 1);
}

function partScore(a: string, b: string): number {
  if (a === b) return 1;
  // Middle initial: "L" matches "LOPEZ".
  if ((a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))) return 1;
  if (a.length === 1 || b.length === 1) return 0;
  return editRatio(a, b);
}

export type NameMatch = { score: number; verdict: 'MATCH' | 'WARNING' | 'BLOCKER' };

export function compareNames(a: string, b: string): NameMatch {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return { score: 0, verdict: 'BLOCKER' };
  // Same letters once spaces are gone ("DELA CRUZ" vs "DE LA CRUZ" already glued; this catches "MARIALOURDES").
  if (ta.join('') === tb.join('')) return { score: 1, verdict: 'MATCH' };

  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  // Greedy pairing: each part of the shorter name takes its best unused partner.
  const used = new Set<number>();
  const pairs: [string, string, number][] = [];
  for (const s of short) {
    let best = -1;
    let bestScore = -1;
    for (const [j, l] of long.entries()) {
      if (used.has(j)) continue;
      const sc = partScore(s, l);
      if (sc > bestScore) [best, bestScore] = [j, sc];
    }
    used.add(best);
    pairs.push([s, long[best]!, bestScore]);
  }
  // Initials can't carry a whole name: only full parts count toward the weakest link.
  const full = pairs.filter(([s, l]) => s.length > 1 && l.length > 1);
  const weakest = Math.min(...(full.length ? full : pairs).map((p) => p[2]));
  const jw = jaroWinkler(pairs.map((p) => p[0]).join(' '), pairs.map((p) => p[1]).join(' '));
  let score = 0.5 * jw + 0.5 * weakest;
  // A one-word name (just a surname) is weak evidence.
  if (full.length < 2) score *= 0.9;
  score = Math.round(score * 100) / 100;

  const verdict =
    score >= DOCAI.name.match ? 'MATCH' : score >= DOCAI.name.warn ? 'WARNING' : 'BLOCKER';
  return { score, verdict };
}

/** Splits an owner line into people: "SPOUSES JUAN and MARIA CRUZ", "A married to B", "A; B". */
export function splitOwners(raw: string): string[] {
  return raw
    .split(/\s+(?:AND|&|MARRIED TO|CO-OWNED WITH)\s+|;|\//i)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^A-Za-z]/g, '').length > 2);
}

/** Best match of one person against any of the listed owners. */
export function bestOwnerMatch(person: string, owners: string): NameMatch & { owner: string } {
  let best = { score: 0, verdict: 'BLOCKER' as NameMatch['verdict'], owner: owners };
  for (const o of splitOwners(owners)) {
    const m = compareNames(person, o);
    if (m.score > best.score) best = { ...m, owner: o };
  }
  return best;
}
