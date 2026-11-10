/**
 * Labeled evaluation set for Module 1 (SPEC §8.8). Each sample says what the document is,
 * which field values a correct reading gives, and which flags a correct check raises.
 * `generate.ts` renders them to files; `src/modules/docai/eval/evaluate.ts` scores the pipeline.
 * All people and numbers are fictional.
 */
import type { DocType } from '@prisma/client';
import type { CheckContext } from '../../src/modules/docai/checks';
import type { DocFlagCode } from '../../src/modules/docai/types';
import * as m from './mockDocs';

/** Expiry checks are evaluated against this date so the results don't drift over time. */
export const EVAL_TODAY = '2026-11-08';

export type Sample = {
  file: string;
  render: () => Promise<Buffer> | Buffer;
  declaredType: DocType;
  /** Expected classifier output. */
  type: DocType;
  fields: Record<string, string>;
  context: Omit<
    CheckContext,
    'today' | 'declaredType' | 'detectedType' | 'ocrFailed' | 'duplicateFile'
  >;
  flags: DocFlagCode[];
};

const santosListing = {
  listing: {
    sellerName: 'Maria Lourdes Santos',
    titleOwner: 'MARIA LOURDES S. SANTOS',
    titleAreaSqm: 240,
  },
};
const villanuevaListing = {
  listing: {
    sellerName: 'Roberto Villanueva',
    titleOwner: 'ROGELIO C. VILLANUEVA',
    titleAreaSqm: 320,
  },
};

const titleSantos: m.TitleInput = {
  titleNumber: 'T-2018-04417',
  owner: 'MARIA LOURDES S. SANTOS',
  ownerDescription: 'Filipino, of legal age, single',
  lotNumber: '12',
  block: '3',
  areaSqm: 240,
  barangay: 'Concepcion Pequena',
  entered: '2018-03-03',
  entries: [
    { no: '4521', text: 'REAL ESTATE MORTGAGE in favor of Bicol Savings Bank for P800,000.00.' },
    { no: '6107', text: 'CANCELLATION OF MORTGAGE under Entry No. 4521.' },
  ],
};
const titleVillanueva: m.TitleInput = {
  titleNumber: 'T-2015-01932',
  owner: 'ROGELIO C. VILLANUEVA',
  ownerDescription: 'Filipino, of legal age, married',
  lotNumber: '7',
  areaSqm: 320,
  barangay: 'Pacol',
  entered: '2015-08-21',
  entries: [
    { no: '3310', text: 'ADVERSE CLAIM filed by Jose R. Ramos.' },
    { no: '3488', text: 'CANCELLATION OF ADVERSE CLAIM under Entry No. 3310.' },
    { no: '5120', text: 'REAL ESTATE MORTGAGE in favor of Naga Lending Corp. for P1,200,000.00.' },
  ],
};
const taxSantos: m.TaxDecInput = {
  tdNumber: '2024-05-0123',
  owner: 'MARIA LOURDES S. SANTOS',
  barangay: 'Concepcion Pequena',
  lotNumber: '12',
  areaSqm: 240,
  marketValue: 1_440_000,
  assessedValue: 288_000,
  effectivity: 2024,
};
const taxVillanueva: m.TaxDecInput = {
  tdNumber: '2023-05-0877',
  owner: 'ROGELIO C. VILLANUEVA',
  barangay: 'Pacol',
  lotNumber: '7',
  areaSqm: 300,
  marketValue: 1_500_000,
  assessedValue: 300_000,
  effectivity: 2023,
};
const rptSantos: m.RptInput = {
  orNumber: '7845123',
  date: '2026-01-15',
  payor: 'MARIA LOURDES S. SANTOS',
  tdNumber: '2024-05-0123',
  period: '1st-4th Qtr 2026',
  basic: 2_880,
};
const rptVillanueva: m.RptInput = {
  orNumber: '6612004',
  date: '2024-02-10',
  payor: 'ROGELIO C. VILLANUEVA',
  tdNumber: '2023-05-0877',
  period: '1st-4th Qtr 2024',
  basic: 3_000,
};
const idSantos: m.IdInput = {
  kind: 'drivers',
  last: 'SANTOS',
  given: 'MARIA LOURDES',
  middle: 'SALCEDO',
  idNumber: 'N01-12-345678',
  birth: '1985-03-14',
  expiry: '2029-03-14',
};
const idVillanueva: m.IdInput = {
  kind: 'philsys',
  last: 'VILLANUEVA',
  given: 'ROBERTO',
  middle: 'CRUZ',
  idNumber: '1234-5678-9012-3456',
  birth: '1979-11-02',
};
const ltsCamella: m.LtsInput = {
  ltsNumber: 'LTS-R5-2024-0101',
  project: 'Camella Naga',
  developer: 'Vista Land (Camella)',
  location: 'Barangay Cararayan, Naga City',
  issued: '2024-03-01',
  validUntil: '2028-05-31',
};
const ltsParkview: m.LtsInput = {
  ltsNumber: 'LTS-R5-2022-0333',
  project: 'Parkview Homes Pili',
  developer: 'Parkview Land Inc.',
  location: 'San Jose, Pili, Camarines Sur',
  issued: '2022-02-14',
  validUntil: '2027-01-15',
};
const ltsExpired: m.LtsInput = {
  ltsNumber: 'LTS-R5-2020-0042',
  project: 'Futura Homes Naga',
  developer: 'Futura Homes',
  location: 'Barangay Del Rosario, Naga City',
  issued: '2020-06-01',
  validUntil: '2025-12-31',
};
const prcOk: m.PrcInput = {
  last: 'AQUINO',
  first: 'RAMON',
  middle: 'BELTRAN',
  registrationNumber: '0012345',
  registered: '2016-07-20',
  validUntil: '2028-07-20',
};
const prcExpired: m.PrcInput = {
  last: 'REYES',
  first: 'CORAZON',
  middle: 'DIAZ',
  registrationNumber: '0023456',
  registered: '2014-01-10',
  validUntil: '2026-01-10',
};
const dhsudOk: m.DhsudInput = {
  name: 'Paolo Mendoza',
  registrationNumber: 'DHSUD-R5-1001',
  issued: '2025-04-01',
  validUntil: '2027-04-01',
};
const dhsudMismatch: m.DhsudInput = {
  name: 'Kristine Navarro',
  registrationNumber: 'DHSUD-R5-2099',
  issued: '2025-09-15',
  validUntil: '2027-09-15',
};

const titleFields = (t: m.TitleInput, enc: string) => ({
  titleNumber: t.titleNumber,
  ownerName: t.owner,
  lotNumber: t.lotNumber,
  areaSqm: String(t.areaSqm),
  encumbrances: enc,
});
const taxFields = (t: m.TaxDecInput) => ({
  tdNumber: t.tdNumber,
  ownerName: t.owner,
  lotNumber: t.lotNumber,
  areaSqm: String(t.areaSqm),
  assessedValue: t.assessedValue.toFixed(2),
});
const rptFields = (r: m.RptInput, year: string) => ({
  orNumber: r.orNumber,
  paymentDate: r.date,
  amount: (r.basic * 2).toFixed(2),
  yearCovered: year,
  quarterCovered: '4',
});

export const SAMPLES: Sample[] = [
  {
    file: 'title-santos.png',
    render: () => m.landTitle(titleSantos),
    declaredType: 'LAND_TITLE',
    type: 'LAND_TITLE',
    fields: titleFields(titleSantos, 'None found'),
    context: santosListing,
    flags: [],
  },
  {
    file: 'title-santos-photo.jpg',
    render: async () => m.scanify(await m.landTitle(titleSantos), 2),
    declaredType: 'LAND_TITLE',
    type: 'LAND_TITLE',
    fields: titleFields(titleSantos, 'None found'),
    context: santosListing,
    flags: [],
  },
  {
    file: 'title-villanueva.png',
    render: () => m.landTitle(titleVillanueva),
    declaredType: 'LAND_TITLE',
    type: 'LAND_TITLE',
    fields: titleFields(titleVillanueva, 'MORTGAGE (Entry No. 5120)'),
    context: villanuevaListing,
    flags: ['OWNER_MISMATCH', 'ENCUMBRANCE_FOUND'],
  },
  {
    file: 'taxdec-santos.png',
    render: () => m.taxDeclaration(taxSantos),
    declaredType: 'TAX_DECLARATION',
    type: 'TAX_DECLARATION',
    fields: taxFields(taxSantos),
    context: santosListing,
    flags: [],
  },
  {
    file: 'taxdec-santos-photo.jpg',
    render: async () => m.scanify(await m.taxDeclaration(taxSantos), 3),
    declaredType: 'TAX_DECLARATION',
    type: 'TAX_DECLARATION',
    fields: taxFields(taxSantos),
    context: santosListing,
    flags: [],
  },
  {
    file: 'taxdec-villanueva.png',
    render: () => m.taxDeclaration(taxVillanueva),
    declaredType: 'TAX_DECLARATION',
    type: 'TAX_DECLARATION',
    fields: taxFields(taxVillanueva),
    context: villanuevaListing,
    flags: ['AREA_MISMATCH'],
  },
  {
    file: 'rpt-santos.png',
    render: () => m.rptReceipt(rptSantos),
    declaredType: 'RPT_RECEIPT',
    type: 'RPT_RECEIPT',
    fields: rptFields(rptSantos, '2026'),
    context: santosListing,
    flags: [],
  },
  {
    file: 'rpt-santos-photo.jpg',
    render: async () => m.scanify(await m.rptReceipt(rptSantos), 4),
    declaredType: 'RPT_RECEIPT',
    type: 'RPT_RECEIPT',
    fields: rptFields(rptSantos, '2026'),
    context: santosListing,
    flags: [],
  },
  {
    file: 'rpt-villanueva.png',
    render: () => m.rptReceipt(rptVillanueva),
    declaredType: 'RPT_RECEIPT',
    type: 'RPT_RECEIPT',
    fields: rptFields(rptVillanueva, '2024'),
    context: villanuevaListing,
    flags: ['TAX_DELINQUENT'],
  },
  {
    file: 'id-santos.png',
    render: () => m.validId(idSantos),
    declaredType: 'SELLER_ID',
    type: 'VALID_ID',
    fields: {
      fullName: 'SANTOS, MARIA LOURDES SALCEDO',
      idNumber: idSantos.idNumber,
      birthDate: idSantos.birth,
      expiryDate: idSantos.expiry!,
    },
    context: santosListing,
    flags: [],
  },
  {
    file: 'id-santos-photo.jpg',
    render: async () => m.scanify(await m.validId(idSantos), 5),
    declaredType: 'SELLER_ID',
    type: 'VALID_ID',
    fields: {
      fullName: 'SANTOS, MARIA LOURDES SALCEDO',
      idNumber: idSantos.idNumber,
      birthDate: idSantos.birth,
      expiryDate: idSantos.expiry!,
    },
    context: santosListing,
    flags: [],
  },
  {
    file: 'id-villanueva.png',
    render: () => m.validId(idVillanueva),
    declaredType: 'SELLER_ID',
    type: 'VALID_ID',
    fields: {
      fullName: 'ROBERTO CRUZ VILLANUEVA',
      idNumber: idVillanueva.idNumber,
      birthDate: idVillanueva.birth,
    },
    context: villanuevaListing,
    flags: ['OWNER_MISMATCH'],
  },
  {
    file: 'lts-camella.png',
    render: () => m.licenseToSell(ltsCamella),
    declaredType: 'LICENSE_TO_SELL',
    type: 'LICENSE_TO_SELL',
    fields: {
      ltsNumber: ltsCamella.ltsNumber,
      projectName: ltsCamella.project,
      developerName: ltsCamella.developer,
      issueDate: ltsCamella.issued,
      expiryDate: ltsCamella.validUntil,
    },
    context: { project: { name: 'Camella Naga', developerName: 'Vista Land (Camella)' } },
    flags: [],
  },
  {
    file: 'lts-parkview.pdf',
    render: () => m.licenseToSellPdf(ltsParkview),
    declaredType: 'LICENSE_TO_SELL',
    type: 'LICENSE_TO_SELL',
    fields: {
      ltsNumber: ltsParkview.ltsNumber,
      projectName: ltsParkview.project,
      developerName: ltsParkview.developer,
      issueDate: ltsParkview.issued,
      expiryDate: ltsParkview.validUntil,
    },
    context: { project: { name: 'Parkview Homes Pili', developerName: 'Parkview Land Inc.' } },
    flags: ['LTS_EXPIRING_SOON'],
  },
  {
    file: 'lts-futura-photo.jpg',
    render: async () => m.scanify(await m.licenseToSell(ltsExpired), 6),
    declaredType: 'LICENSE_TO_SELL',
    type: 'LICENSE_TO_SELL',
    fields: {
      ltsNumber: ltsExpired.ltsNumber,
      projectName: ltsExpired.project,
      developerName: ltsExpired.developer,
      issueDate: ltsExpired.issued,
      expiryDate: ltsExpired.validUntil,
    },
    context: { project: { name: 'Futura Homes Naga', developerName: 'Futura Homes' } },
    flags: ['LTS_EXPIRED'],
  },
  {
    file: 'prc-aquino.png',
    render: () => m.prcId(prcOk),
    declaredType: 'PRC_ID',
    type: 'PRC_ID',
    fields: {
      fullName: 'RAMON BELTRAN AQUINO',
      registrationNumber: prcOk.registrationNumber,
      validUntil: prcOk.validUntil,
    },
    context: { credential: { holderName: 'Ramon Aquino', numberEntered: 'PRC-0012345' } },
    flags: [],
  },
  {
    file: 'prc-reyes-photo.jpg',
    render: async () => m.scanify(await m.prcId(prcExpired), 7),
    declaredType: 'PRC_ID',
    type: 'PRC_ID',
    fields: {
      fullName: 'CORAZON DIAZ REYES',
      registrationNumber: prcExpired.registrationNumber,
      validUntil: prcExpired.validUntil,
    },
    context: { credential: { holderName: 'Corazon Reyes', numberEntered: 'PRC-0023456' } },
    flags: ['CREDENTIAL_EXPIRED'],
  },
  {
    file: 'dhsud-mendoza.png',
    render: () => m.dhsudCert(dhsudOk),
    declaredType: 'DHSUD_CERT',
    type: 'DHSUD_CERT',
    fields: {
      fullName: 'PAOLO MENDOZA',
      registrationNumber: dhsudOk.registrationNumber,
      validUntil: dhsudOk.validUntil,
    },
    context: { credential: { holderName: 'Paolo Mendoza', numberEntered: 'DHSUD-R5-1001' } },
    flags: [],
  },
  {
    file: 'dhsud-navarro.png',
    render: () => m.dhsudCert(dhsudMismatch),
    declaredType: 'DHSUD_CERT',
    type: 'DHSUD_CERT',
    fields: {
      fullName: 'KRISTINE NAVARRO',
      registrationNumber: dhsudMismatch.registrationNumber,
      validUntil: dhsudMismatch.validUntil,
    },
    context: { credential: { holderName: 'Kris Navarro', numberEntered: 'DHSUD-R5-2001' } },
    flags: ['NAME_MISMATCH', 'NUMBER_MISMATCH'],
  },
];
