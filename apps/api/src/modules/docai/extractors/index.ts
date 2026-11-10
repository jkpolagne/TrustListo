import type { DocType } from '@prisma/client';
import type { Extracted, OcrResult } from '../types';
import { extractDhsudCert, extractPrcId } from './credentials';
import { extractLandTitle } from './landTitle';
import { extractLicenseToSell } from './licenseToSell';
import { extractRptReceipt } from './rptReceipt';
import { extractTaxDeclaration } from './taxDeclaration';
import { extractPaymentReceipt } from './paymentReceipt';
import { extractTransmittal } from './transmittal';
import { extractValidId } from './validId';

/** Which extractor reads which document type (SPEC §8.3). Other types are only classified for now. */
const EXTRACTORS: Partial<Record<DocType, (ocr: OcrResult) => Extracted>> = {
  LAND_TITLE: extractLandTitle,
  TAX_DECLARATION: extractTaxDeclaration,
  RPT_RECEIPT: extractRptReceipt,
  SELLER_ID: extractValidId,
  VALID_ID: extractValidId,
  PASSPORT: extractValidId,
  LICENSE_TO_SELL: extractLicenseToSell,
  PRC_ID: extractPrcId,
  DHSUD_CERT: extractDhsudCert,
  PAYMENT_RECEIPT: extractPaymentReceipt,
  TRANSMITTAL: extractTransmittal,
};

/** Fields the document is useless without; a missing or unclear one raises LOW_CONFIDENCE. */
export const REQUIRED: Partial<Record<DocType, string[]>> = {
  LAND_TITLE: ['titleNumber', 'ownerName', 'areaSqm'],
  TAX_DECLARATION: ['tdNumber', 'ownerName', 'areaSqm', 'assessedValue'],
  RPT_RECEIPT: ['orNumber', 'amount', 'yearCovered'],
  SELLER_ID: ['fullName', 'idNumber'],
  VALID_ID: ['fullName', 'idNumber'],
  PASSPORT: ['fullName', 'idNumber'],
  LICENSE_TO_SELL: ['ltsNumber', 'projectName', 'developerName', 'expiryDate'],
  PRC_ID: ['fullName', 'registrationNumber', 'validUntil'],
  DHSUD_CERT: ['fullName', 'registrationNumber', 'validUntil'],
  PAYMENT_RECEIPT: ['amount', 'orNumber'],
  TRANSMITTAL: ['amount'],
};

/** Plain-language labels for the broker review screen and flag messages. */
export const FIELD_LABELS: Record<string, string> = {
  titleNumber: 'Title number',
  ownerName: 'Registered owner',
  lotNumber: 'Lot number',
  areaSqm: 'Lot area (sqm)',
  encumbrances: 'Uncancelled encumbrances',
  tdNumber: 'Tax declaration no.',
  assessedValue: 'Assessed value (₱)',
  improvements: 'Improvements',
  orNumber: 'Official receipt no.',
  paymentDate: 'Payment date',
  amount: 'Amount paid (₱)',
  yearCovered: 'Year covered',
  quarterCovered: 'Paid through quarter',
  fullName: 'Name',
  idNumber: 'ID number',
  birthDate: 'Date of birth',
  expiryDate: 'Expiry date',
  ltsNumber: 'License to sell no.',
  projectName: 'Project name',
  developerName: 'Developer',
  issueDate: 'Date issued',
  registrationNumber: 'Registration no.',
  validUntil: 'Valid until',
  profession: 'Profession',
  receivedFrom: 'Received from',
  buyerName: 'Buyer',
  unit: 'Unit',
  transmittalDate: 'Transmittal date',
};

export function extract(type: DocType, ocr: OcrResult): Extracted {
  return EXTRACTORS[type]?.(ocr) ?? {};
}
