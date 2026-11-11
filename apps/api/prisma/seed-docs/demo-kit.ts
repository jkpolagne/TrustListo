/**
 * Demo kit for the §17 panel walkthrough: mock files to upload, in order, for one fictional
 * buyer (Rosa Mendiola, Camella Naga – Ella Model, Pag-IBIG) and one fictional seller.
 * Amounts match the seeded unit (₱2,150,000) so the AI's amount checks pass.
 *   pnpm --filter api demo:kit      → writes D:/TrustListooo/demo-kit/ (git-ignored)
 * Mock documents only, never real IDs or titles (SPEC §17).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as mock from './mockDocs';

const out = path.resolve(import.meta.dirname, '../../../../demo-kit');
mkdirSync(out, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

const BUYER = { given: 'ROSA', last: 'MENDIOLA', middle: 'CRUZ' };
const TCP = 2_150_000;
const DP = 215_000; // 10% downpayment, entered when converting
const TRANCHE_1 = 32_250; // 5% commission × 30% (Camella tranche 1)
const SELLER = 'TEODORO LAGMAN';

const inYears = (n: number) => `${Number(today.slice(0, 4)) + n}${today.slice(4)}`;
const dhsud = (name: string, registrationNumber: string) =>
  mock.dhsudCert({ name, registrationNumber, issued: inYears(-1), validUntil: inYears(2) });

const files: [string, Promise<Buffer> | Buffer][] = [
  // Module 2 setup: consultant licenses (the admin enters the number shown in the file name).
  ['01a-dhsud-JOY-OCAMPO-DHSUD-R5-2001.png', dhsud('JOY OCAMPO', 'DHSUD-R5-2001')],
  ['01b-dhsud-MARCO-DELA-CRUZ-DHSUD-R5-1001.png', dhsud('MARCO DELA CRUZ', 'DHSUD-R5-1001')],
  ['01c-dhsud-RICO-SALAZAR-DHSUD-R5-3002.png', dhsud('RICO SALAZAR', 'DHSUD-R5-3002')],
  // Deliberately wrong: the certificate says Kristine, the consultant is Kris → flagged.
  [
    '01d-WRONG-dhsud-for-KRIS-NAVARRO-DHSUD-R5-2005.png',
    dhsud('KRISTINE NAVARRO', 'DHSUD-R5-2005'),
  ],
  // Module 2 setup: the project's License to Sell, and one that has expired.
  [
    '02a-lts-CAMELLA-NAGA.png',
    mock.licenseToSell({
      ltsNumber: 'LTS-R5-2024-0101',
      project: 'Camella Naga',
      developer: 'Vista Land (Camella)',
      location: 'Del Rosario, Naga City',
      issued: inYears(-1),
      validUntil: inYears(2),
    }),
  ],
  [
    '02b-EXPIRED-lts-CAMELLA-NAGA.png',
    mock.licenseToSell({
      ltsNumber: 'LTS-R5-2019-0101',
      project: 'Camella Naga',
      developer: 'Vista Land (Camella)',
      location: 'Del Rosario, Naga City',
      issued: inYears(-6),
      validUntil: inYears(-1),
    }),
  ],
  [
    '06a-reservation-receipt.png',
    mock.paymentReceipt({
      orNumber: 'CN-77101',
      date: today,
      payor: `${BUYER.given} ${BUYER.last}`,
      amount: 20_000,
      issuer: 'Vista Land (Camella)',
      purpose: 'Reservation fee, Camella Naga Ella Model',
    }),
  ],
  [
    '06b-downpayment-receipt.png',
    mock.paymentReceipt({
      orNumber: 'CN-77102',
      date: today,
      payor: `${BUYER.given} ${BUYER.last}`,
      amount: 45_000,
      issuer: 'Vista Land (Camella)',
      purpose: 'Downpayment, Camella Naga Ella Model',
    }),
  ],
  [
    '07a-buyer-id-philsys.png',
    mock.validId({
      kind: 'philsys',
      ...BUYER,
      idNumber: '5555-6666-7777-8888',
      birth: '1988-04-12',
    }),
  ],
  [
    '07b-WRONG-id-someone-else.png',
    mock.validId({
      kind: 'philsys',
      last: 'SANTOS',
      given: 'PEDRO',
      middle: 'REYES',
      idNumber: '1234-5678-9012-3456',
      birth: '1979-09-30',
    }),
  ],
  [
    '07c-buyer-id-drivers-license.png',
    mock.validId({
      kind: 'drivers',
      ...BUYER,
      idNumber: 'N01-88-123456',
      birth: '1988-04-12',
      expiry: '2030-04-12',
    }),
  ],
  [
    '08-transmittal-tranche-1.png',
    mock.transmittal({
      developer: 'Vista Land (Camella)',
      firm: 'Advench Realty',
      date: today,
      buyer: `${BUYER.given} ${BUYER.last}`,
      unit: 'Camella Naga – Ella Model',
      tranche: 'Tranche 1',
      amount: TRANCHE_1,
    }),
  ],
  [
    '09a-seller-land-title.png',
    mock.landTitle({
      titleNumber: 'T-128844',
      owner: SELLER,
      lotNumber: '1182-B',
      areaSqm: 240,
      barangay: 'Triangulo',
      entered: '2015-06-18',
      entries: [],
    }),
  ],
  [
    '09b-seller-tax-declaration.png',
    mock.taxDeclaration({
      tdNumber: '06-0021-01182',
      owner: SELLER,
      barangay: 'Triangulo',
      lotNumber: '1182-B',
      areaSqm: 240,
      marketValue: 1_440_000,
      assessedValue: 288_000,
      effectivity: 2024,
    }),
  ],
  [
    '09c-seller-tax-receipt.png',
    mock.rptReceipt({
      orNumber: '4417820',
      date: today,
      payor: SELLER,
      tdNumber: '06-0021-01182',
      period: `1st-4th Qtr ${today.slice(0, 4)}`,
      basic: 2_880,
    }),
  ],
  [
    '09d-seller-id.png',
    mock.validId({
      kind: 'drivers',
      last: 'LAGMAN',
      given: 'TEODORO',
      middle: 'DIAZ',
      idNumber: 'N03-71-654321',
      birth: '1971-02-03',
      expiry: '2029-02-03',
    }),
  ],
];

for (const [name, data] of files) {
  writeFileSync(path.join(out, name), await data);
  console.log(`  ${name}`);
}
console.log(
  `\nDemo kit in ${out}\nBuyer Rosa Mendiola: TCP ₱${TCP.toLocaleString()}, downpayment ₱${DP.toLocaleString()}, transmittal ₱${TRANCHE_1.toLocaleString()}.`,
);
