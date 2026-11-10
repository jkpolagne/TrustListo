// Module 1 rules that need no OCR or database: name matching, parsing, classification, checks.
import { describe, expect, it } from 'vitest';
import { computeFlags, sameNumber, taxCurrent, taxPeriodEnd, type CheckContext } from './checks';
import { classify } from './classify';
import { extractLandTitle } from './extractors/landTitle';
import { parsePeriod } from './extractors/rptReceipt';
import { tidy } from './extractors/common';
import { extractValidId } from './extractors/validId';
import { compareNames, nameTokens } from './names';
import { parseArea, parseDate, parseMoney } from './text';
import type { Extracted, OcrResult } from './types';

const ocrOf = (text: string): OcrResult => ({
  text,
  confidence: 90,
  pages: 1,
  lines: text.split('\n').map((t) => ({ text: t, confidence: 90 })),
});
const f = (value: string) => ({ value, confidence: 90 });
const ctx = (over: Partial<CheckContext>): CheckContext => ({
  today: new Date('2026-11-08T08:00:00'),
  declaredType: null,
  detectedType: null,
  ocrFailed: false,
  duplicateFile: false,
  ...over,
});
const codes = (e: Extracted, c: CheckContext) => computeFlags(e, c).map((x) => x.code);

describe('name matching (§8.5)', () => {
  it('normalizes order, honorifics, suffixes, accents and particles', () => {
    expect(nameTokens('DELA CRUZ, Juan P. Jr.')).toEqual(['JUAN', 'P', 'DELACRUZ']);
    expect(nameTokens('Atty. Ma. Peña de los Santos')).toEqual(['MARIA', 'PENA', 'DELOSSANTOS']);
  });
  it('matches the same person written differently', () => {
    expect(compareNames('Juan P. Dela Cruz', 'DELA CRUZ, JUAN PEREZ').verdict).toBe('MATCH');
    expect(compareNames('Maria Lourdes Santos', 'MARIA LOURDES S. SANTOS').verdict).toBe('MATCH');
    expect(compareNames('Juan Dela Cruz', 'JUAN DE LA CRUZ').verdict).toBe('MATCH');
  });
  it('warns on a near miss and blocks a different person', () => {
    expect(compareNames('Juan Dela Cruz', 'Juana Dela Cruz').verdict).toBe('WARNING');
    expect(compareNames('Pedro Santos', 'Maria Santos').verdict).toBe('BLOCKER');
  });
});

describe('parsing', () => {
  it('reads dates the way PH documents print them', () => {
    expect(parseDate('Valid until: March 5, 2027')).toBe('2027-03-05');
    expect(parseDate('15th day of June, 2026')).toBe('2026-06-15');
    expect(parseDate('2028/07/20')).toBe('2028-07-20');
    expect(parseDate('03/05/2027')).toBe('2027-03-05');
    expect(parseDate('February 30, 2027')).toBeNull();
  });
  it('reads money even when OCR swaps commas for periods', () => {
    expect(parseMoney('P 1,440,000.00')).toBe(1_440_000);
    expect(parseMoney('P 1.430.000.00')).toBe(1_430_000);
    expect(parseMoney('₱5,760.50')).toBe(5760.5);
  });
  it('reads areas', () => {
    expect(parseArea('an area of 1,240 square meters')).toBe(1240);
    expect(parseArea('Area: 240 sq. m.')).toBe(240);
    expect(parseArea('320 squarc meters')).toBe(320);
  });
  it('reads RPT periods', () => {
    expect(parsePeriod('1ST-4TH QTR 2026')).toEqual({ year: 2026, quarter: 4 });
    expect(parsePeriod('1ST-2ND QTR 2026')).toEqual({ year: 2026, quarter: 2 });
    expect(parsePeriod('2025')).toEqual({ year: 2025, quarter: 4 });
  });
  it('strips OCR specks around a line', () => {
    expect(tidy('‘Developer: Futura Homes  oi      :')).toBe('DEVELOPER: FUTURA HOMES');
    expect(tidy('| License No.: N01-12-345678')).toBe('LICENSE NO.: N01-12-345678');
    expect(tidy('Area: 240 sq. m.')).toBe('AREA: 240 SQ. M');
  });
});

describe('classification (§8.2)', () => {
  it('names the document type from its signal phrases', () => {
    expect(classify('TRANSFER CERTIFICATE OF TITLE\nTCT No. T-1').type).toBe('LAND_TITLE');
    expect(classify('OFFICIAL RECEIPT\nREAL PROPERTY TAX\nTreasurer').type).toBe('RPT_RECEIPT');
    expect(classify('LICENSE TO SELL\nDHSUD\nName of Project: X').type).toBe('LICENSE_TO_SELL');
    expect(classify('a grocery list').type).toBe('UNKNOWN');
  });
});

describe('encumbrances (§8.3)', () => {
  const title = (memo: string) =>
    extractLandTitle(ocrOf(`TRANSFER CERTIFICATE OF TITLE\nMEMORANDUM OF ENCUMBRANCES\n${memo}`))
      .encumbrances.value;
  it('ignores a mortgage that was cancelled', () => {
    expect(
      title(
        'Entry No. 4521 - REAL ESTATE MORTGAGE\nEntry No. 6107 - CANCELLATION OF MORTGAGE under Entry No. 4521.',
      ),
    ).toBe('None found');
  });
  it('reports one that was not', () => {
    expect(
      title(
        'Entry No. 3310 - ADVERSE CLAIM\nEntry No. 3488 - CANCELLATION OF ADVERSE CLAIM under Entry No. 3310.\nEntry No. 5120 - REAL ESTATE MORTGAGE in favor of a bank',
      ),
    ).toBe('MORTGAGE (Entry No. 5120)');
  });
});

describe('cross-checks (§8.3)', () => {
  it('flags an expired or soon-expiring license to sell', () => {
    const project = { name: 'Camella Naga', developerName: 'Vista Land (Camella)' };
    const base = {
      ltsNumber: f('LTS-1'),
      projectName: f('Camella Naga'),
      developerName: f('Vista Land'),
    };
    const lts = (expiryDate: string) =>
      codes(
        { ...base, expiryDate: f(expiryDate) },
        ctx({ declaredType: 'LICENSE_TO_SELL', detectedType: 'LICENSE_TO_SELL', project }),
      );
    expect(lts('2026-01-01')).toEqual(['LTS_EXPIRED']);
    expect(lts('2027-01-15')).toEqual(['LTS_EXPIRING_SOON']);
    expect(lts('2028-01-01')).toEqual([]);
  });
  it('flags a credential for someone else, with a different number', () => {
    const out = computeFlags(
      { fullName: f('PEDRO REYES'), registrationNumber: f('0099999'), validUntil: f('2028-01-01') },
      ctx({
        declaredType: 'PRC_ID',
        detectedType: 'PRC_ID',
        credential: { holderName: 'Ramon Aquino', numberEntered: 'PRC-0012345' },
      }),
    );
    expect(out.map((x) => x.code)).toEqual(['NAME_MISMATCH', 'NUMBER_MISMATCH']);
    expect(out[0]!.severity).toBe('BLOCKER');
  });
  it('treats OCR look-alike characters in numbers as the same number', () => {
    expect(sameNumber('DHSUD-RS-1001', 'DHSUD-R5-1001')).toBe(true);
    expect(sameNumber('0012345', 'PRC-0012345')).toBe(true);
    expect(sameNumber('0012346', 'PRC-0012345')).toBe(false);
  });
  it('compares a tax declaration with the title', () => {
    const listing = {
      sellerName: 'Rogelio Villanueva',
      titleOwner: 'ROGELIO C. VILLANUEVA',
      titleAreaSqm: 320,
    };
    const td = (area: string) =>
      codes(
        {
          tdNumber: f('1'),
          ownerName: f('ROGELIO C. VILLANUEVA'),
          areaSqm: f(area),
          assessedValue: f('1'),
        },
        ctx({ declaredType: 'TAX_DECLARATION', detectedType: 'TAX_DECLARATION', listing }),
      );
    expect(td('320')).toEqual([]);
    expect(td('300')).toEqual(['AREA_MISMATCH']);
  });
  it('knows when real property tax is current', () => {
    const now = new Date('2026-11-08');
    expect(taxCurrent(2026, 4, now)).toBe(true);
    expect(taxCurrent(2026, 3, now)).toBe(false);
    expect(taxCurrent(2025, 4, now)).toBe(false);
    expect(taxPeriodEnd('2026', '4')?.toISOString().slice(0, 10)).toBe('2026-12-31');
  });
  it('flags a document that is not what the uploader said', () => {
    expect(codes({}, ctx({ declaredType: 'LAND_TITLE', detectedType: 'RPT_RECEIPT' }))).toContain(
      'TYPE_MISMATCH',
    );
    expect(codes({}, ctx({ declaredType: 'SELLER_ID', detectedType: 'PRC_ID' }))).not.toContain(
      'TYPE_MISMATCH',
    );
  });
});

describe('ID names', () => {
  it('reads short surnames (Yap, Uy) and never takes the middle name for the last name', () => {
    const id = extractValidId(
      ocrOf(
        'Philippine Identification Card\nApelyido / Last Name:\nYAP\nMga Pangalan / Given Names:\nDENNIS\nGitnang Apelyido / Middle Name:\nREYES',
      ),
    );
    expect(id.fullName.value).toBe('DENNIS REYES YAP');
    const uy = extractValidId(ocrOf('Last Name:\nUY\nFirst Name:\nGRACE\nMiddle Name:\nTAN'));
    expect(uy.fullName.value).toBe('GRACE TAN UY');
  });
});
