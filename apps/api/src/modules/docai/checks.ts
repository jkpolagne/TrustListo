import type { DocType } from '@prisma/client';
import { DOCAI } from './config';
import { sameKind } from './classify';
import { FIELD_LABELS, REQUIRED } from './extractors';
import { bestOwnerMatch, compareNames, type NameMatch } from './names';
import { parsePeriod } from './extractors/rptReceipt';
import { alnum } from './text';
import type { DocFlag, DocFlagCode, Extracted } from './types';

/**
 * Everything the cross-checks compare against (SPEC §8.3). Loaded from the database by the
 * pipeline; plain data here so the rules are easy to test.
 */
export type CheckContext = {
  today: Date;
  declaredType: DocType | null;
  detectedType: DocType | null;
  ocrFailed: boolean;
  duplicateFile: boolean;
  /** Consultant credential: who it's for and the number the admin typed. */
  credential?: { holderName: string; numberEntered: string };
  /** Developer project the License to Sell is for. */
  project?: { name: string; developerName: string };
  /** Buyer checklist document: the client's name and whose document it is (§8.3 Stage 2). */
  client?: { name: string; appliesTo: string };
  /** Developer transmittal: the tranche amount it should release. */
  transmittal?: { expectedAmount: number };
  /** Payment receipt: true when another receipt in the firm has the same OR number. */
  duplicateReceipt?: boolean;
  /** Individual seller listing: the seller, and what the title (if read already) says. */
  listing?: {
    sellerName: string;
    titleOwner: string | null;
    titleAreaSqm: number | null;
  };
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const DAY = 86_400_000;

function nameFlag(
  code: DocFlagCode,
  m: NameMatch,
  what: string,
  found: string,
  expected: string,
): DocFlag | null {
  if (m.verdict === 'MATCH') return null;
  return {
    code,
    severity: m.verdict,
    message: `${what} '${found}' doesn't match '${expected}' (${pct(m.score)} match).`,
    evidence: { field: 'name', found, expected },
  };
}

function expiryFlags(
  value: string | null | undefined,
  today: Date,
  expired: DocFlagCode,
  soon: DocFlagCode | null,
  what: string,
): DocFlag[] {
  if (!value) return [];
  const until = new Date(`${value}T23:59:59`);
  if (Number.isNaN(until.getTime())) return [];
  const days = Math.floor((until.getTime() - today.getTime()) / DAY);
  if (days < 0) {
    return [
      {
        code: expired,
        severity: 'BLOCKER',
        message: `${what} expired on ${value}.`,
        evidence: { field: 'expiry', found: value },
      },
    ];
  }
  if (soon && days <= DOCAI.ltsSoonDays) {
    return [
      {
        code: soon,
        severity: 'INFO',
        message: `${what} expires in ${days} day${days === 1 ? '' : 's'} (${value}).`,
        evidence: { field: 'expiry', found: value },
      },
    ];
  }
  return [];
}

/** Which type's rules apply: what the uploader said it is, else what we detected. */
export const effectiveType = (ctx: Pick<CheckContext, 'declaredType' | 'detectedType'>) =>
  ctx.declaredType ?? ctx.detectedType ?? 'UNKNOWN';

export function computeFlags(extracted: Extracted, ctx: CheckContext): DocFlag[] {
  const flags: DocFlag[] = [];
  const v = (k: string) => extracted[k]?.value ?? null;
  const type = effectiveType(ctx);

  if (ctx.ocrFailed) {
    flags.push({
      code: 'OCR_FAILED',
      severity: 'WARNING',
      message: "The document couldn't be read automatically. Check it by eye.",
    });
  }
  if (ctx.duplicateFile) {
    flags.push({
      code: 'DUPLICATE_FILE',
      severity: 'WARNING',
      message: 'This exact file was already uploaded for another record in your firm.',
    });
  }
  if (!ctx.ocrFailed && ctx.declaredType && ctx.detectedType) {
    if (ctx.detectedType === 'UNKNOWN') {
      flags.push({
        code: 'TYPE_MISMATCH',
        severity: 'WARNING',
        message: `Couldn't confirm this is a ${typeName(ctx.declaredType)}.`,
        evidence: { field: 'type', found: 'unrecognized', expected: ctx.declaredType },
      });
    } else if (!sameKind(ctx.declaredType, ctx.detectedType)) {
      flags.push({
        code: 'TYPE_MISMATCH',
        severity: 'BLOCKER',
        message: `Uploaded as a ${typeName(ctx.declaredType)} but looks like a ${typeName(ctx.detectedType)}.`,
        evidence: { field: 'type', found: ctx.detectedType, expected: ctx.declaredType },
      });
    }
  }
  if (!ctx.ocrFailed) {
    for (const key of REQUIRED[type] ?? []) {
      const f = extracted[key];
      if (f?.edited) continue;
      if (!f?.value || f.confidence < DOCAI.lowConfidence) {
        flags.push({
          code: 'LOW_CONFIDENCE',
          severity: 'WARNING',
          message: f?.value
            ? `${FIELD_LABELS[key] ?? key} was hard to read ('${f.value}', ${f.confidence}% sure).`
            : `Couldn't find the ${(FIELD_LABELS[key] ?? key).toLowerCase()}.`,
          evidence: { field: key, found: f?.value ?? '' },
        });
      }
    }
  }

  // ── Consultant credentials ──
  if (ctx.credential && (type === 'PRC_ID' || type === 'DHSUD_CERT')) {
    const name = v('fullName');
    if (name) {
      const f = nameFlag(
        'NAME_MISMATCH',
        compareNames(name, ctx.credential.holderName),
        'Name on the document',
        name,
        ctx.credential.holderName,
      );
      if (f) flags.push(f);
    }
    const num = v('registrationNumber');
    if (num && !sameNumber(num, ctx.credential.numberEntered)) {
      flags.push({
        code: 'NUMBER_MISMATCH',
        severity: 'WARNING',
        message: `Number on the document '${num}' differs from the one entered '${ctx.credential.numberEntered}'.`,
        evidence: {
          field: 'registrationNumber',
          found: num,
          expected: ctx.credential.numberEntered,
        },
      });
    }
    flags.push(
      ...expiryFlags(v('validUntil'), ctx.today, 'CREDENTIAL_EXPIRED', null, 'This credential'),
    );
  }

  // ── License to Sell ──
  if (ctx.project && type === 'LICENSE_TO_SELL') {
    flags.push(
      ...expiryFlags(
        v('expiryDate'),
        ctx.today,
        'LTS_EXPIRED',
        'LTS_EXPIRING_SOON',
        'The license to sell',
      ),
    );
    for (const [key, expected, what] of [
      ['projectName', ctx.project.name, 'Project name'],
      ['developerName', ctx.project.developerName, 'Developer'],
    ] as const) {
      const found = v(key);
      if (!found) continue;
      const m = compareLoose(found, expected);
      const f = nameFlag('PROJECT_MISMATCH', m, `${what} on the license`, found, expected);
      if (f) flags.push({ ...f, evidence: { field: key, found, expected } });
    }
  }

  // ── Buyer documents (Stage 2): an ID must be the buyer's own ──
  // Spouse and representative names aren't recorded, so only the buyer's documents are compared.
  if (ctx.client && ctx.client.appliesTo === 'BUYER') {
    const name = v('fullName');
    if (name) {
      const f = nameFlag(
        'NAME_MISMATCH',
        compareNames(name, ctx.client.name),
        'Name on the document',
        name,
        ctx.client.name,
      );
      if (f) flags.push(f);
    }
    flags.push(...expiryFlags(v('expiryDate'), ctx.today, 'ID_EXPIRED', null, 'The ID'));
  }

  // ── Payment receipts ──
  if (ctx.duplicateReceipt) {
    flags.push({
      code: 'DUPLICATE_RECEIPT',
      severity: 'BLOCKER',
      message: `Receipt no. ${v('orNumber')} was already used for another payment in your firm.`,
      evidence: { field: 'orNumber', found: v('orNumber') ?? '' },
    });
  }

  // ── Transmittals: amount must match the tranche within ₱1 (§8.3) ──
  if (ctx.transmittal) {
    const amount = Number(v('amount'));
    if (v('amount') && Math.abs(amount - ctx.transmittal.expectedAmount) > 1) {
      flags.push({
        code: 'AMOUNT_MISMATCH',
        severity: 'WARNING',
        message: `Transmittal amount ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} differs from the tranche ₱${ctx.transmittal.expectedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
        evidence: {
          field: 'amount',
          found: String(amount),
          expected: String(ctx.transmittal.expectedAmount),
        },
      });
    }
  }

  // ── Individual seller listing ──
  if (ctx.listing) {
    const { sellerName, titleOwner, titleAreaSqm } = ctx.listing;
    if (type === 'LAND_TITLE') {
      const owner = v('ownerName');
      if (owner) {
        const m = bestOwnerMatch(sellerName, owner);
        const f = nameFlag('OWNER_MISMATCH', m, 'Seller', sellerName, owner);
        if (f)
          flags.push({
            ...f,
            message: `Seller '${sellerName}' doesn't match title owner '${owner}' (${pct(m.score)} match).`,
            evidence: { field: 'ownerName', found: owner, expected: sellerName },
          });
      }
      const enc = v('encumbrances');
      if (enc && !isNone(enc)) {
        flags.push({
          code: 'ENCUMBRANCE_FOUND',
          severity: 'WARNING',
          message: `The title has an encumbrance with no cancellation entry: ${enc}.`,
          evidence: { field: 'encumbrances', found: enc },
        });
      }
    }
    if (type === 'TAX_DECLARATION') {
      const owner = v('ownerName');
      const against = titleOwner ?? sellerName;
      if (owner) {
        const m = bestOwnerMatch(owner, against);
        const f = nameFlag('OWNER_MISMATCH', m, 'Owner on the tax declaration', owner, against);
        if (f)
          flags.push({ ...f, evidence: { field: 'ownerName', found: owner, expected: against } });
      }
      const area = Number(v('areaSqm'));
      if (v('areaSqm') && titleAreaSqm && !areaClose(area, titleAreaSqm)) {
        flags.push({
          code: 'AREA_MISMATCH',
          severity: 'WARNING',
          message: `Lot area ${area} sqm differs from the title's ${titleAreaSqm} sqm.`,
          evidence: { field: 'areaSqm', found: String(area), expected: String(titleAreaSqm) },
        });
      }
    }
    if (type === 'RPT_RECEIPT') {
      const year = Number(v('yearCovered'));
      const quarter = Number(v('quarterCovered') ?? 4);
      if (year && !taxCurrent(year, quarter, ctx.today)) {
        flags.push({
          code: 'TAX_DELINQUENT',
          severity: 'WARNING',
          message: `Real property tax is paid only through ${quarter < 4 ? `Q${quarter} ` : ''}${year}.`,
          evidence: {
            field: 'yearCovered',
            found: `${year}`,
            expected: `${ctx.today.getFullYear()}`,
          },
        });
      }
    }
    if (type === 'SELLER_ID' || type === 'VALID_ID' || type === 'PASSPORT') {
      const name = v('fullName');
      const against = titleOwner ?? sellerName;
      if (name) {
        const m = bestOwnerMatch(name, against);
        const f = nameFlag('OWNER_MISMATCH', m, 'Name on the ID', name, against);
        if (f)
          flags.push({ ...f, evidence: { field: 'fullName', found: name, expected: against } });
      }
      flags.push(...expiryFlags(v('expiryDate'), ctx.today, 'ID_EXPIRED', null, 'The ID'));
    }
  }

  return flags;
}

export const isNone = (s: string) => /^\s*(NONE|NONE FOUND|N\/?A|-)?\s*$/i.test(s);

export function areaClose(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff <= DOCAI.areaTolerance.sqm || diff / Math.max(a, b) <= DOCAI.areaTolerance.pct;
}

/** Paid through the current year (annual), or through the current quarter (quarterly payers). */
export function taxCurrent(year: number, quarter: number, today: Date): boolean {
  const y = today.getFullYear();
  if (year !== y) return year > y;
  return quarter >= Math.floor(today.getMonth() / 3) + 1;
}

/** Last day of the period an RPT receipt covers (for the Tax Payments Current badge). */
export function taxPeriodEnd(
  yearCovered: string | null,
  quarterCovered: string | null,
): Date | null {
  const p = parsePeriod(`${yearCovered ?? ''} Q${quarterCovered ?? 4}`);
  if (!p) return null;
  return new Date(p.year, p.quarter * 3, 0, 23, 59, 59); // day 0 of the next quarter = last day of this one
}

/** Characters OCR mixes up in ID numbers: O/0, I/L/1, S/5, B/8, Z/2. */
const confusable = (s: string) =>
  alnum(s)
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2');

/**
 * "PRC-0012345" and "0012345" are the same number written two ways, and "DHSUD-RS-1001" is
 * "DHSUD-R5-1001" read with a 5 that looked like an S.
 */
export function sameNumber(a: string, b: string): boolean {
  if (alnum(a) === alnum(b) || confusable(a) === confusable(b)) return true;
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  return da.length >= 4 && da === db;
}

/** Project and company names: contained names count ("Camella" in "Vista Land (Camella)"). */
function compareLoose(found: string, expected: string): NameMatch {
  const a = alnum(found);
  const b = alnum(expected);
  if (a && b && (a.includes(b) || b.includes(a))) return { score: 1, verdict: 'MATCH' };
  return compareNames(found, expected);
}

function typeName(t: DocType): string {
  return t
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace('rpt', 'RPT')
    .replace('prc', 'PRC')
    .replace('dhsud', 'DHSUD');
}
