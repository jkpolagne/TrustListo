import type {
  CivilStatus,
  DocType,
  EmploymentType,
  PaymentMethod,
  RequirementStage,
} from '@prisma/client';

/**
 * Requirements checklist rules (SPEC §9), written as data so they can be tested and printed
 * for the manuscript. Each rule says which document is needed, for whom, at which stage, and
 * when it applies (payment method × civil status × employment type).
 *
 * Decided OPEN-4 (2026-11-08): civil-status documents for every method except spot CASH.
 */

export type AppliesTo = 'BUYER' | 'SPOUSE' | 'REPRESENTATIVE';
type Method = Exclude<PaymentMethod, 'NOT_SURE'>;

export type Rule = {
  code: string;
  label: string;
  appliesTo: AppliesTo;
  stage: RequirementStage;
  /** What Module 1 should expect the upload to be (null: no single document type). */
  docType: DocType | null;
  /** Shown but not required (e.g. seaman's book only for seafarers). */
  optional?: boolean;
  when: { methods?: Method[]; civil?: CivilStatus[]; employment?: EmploymentType[] };
};

const ALL: Method[] = ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'];
const NOT_CASH: Method[] = ['DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'];
const LOANS: Method[] = ['BANK', 'PAG_IBIG'];

export const RULES: Rule[] = [
  // ── Reservation stage: everyone (§9.1) ──
  {
    code: 'VALID_ID_1',
    label: 'Valid ID (1st)',
    appliesTo: 'BUYER',
    stage: 'RESERVATION',
    docType: 'VALID_ID',
    when: { methods: ALL },
  },
  {
    code: 'VALID_ID_2',
    label: 'Valid ID (2nd)',
    appliesTo: 'BUYER',
    stage: 'RESERVATION',
    docType: 'VALID_ID',
    when: { methods: ALL },
  },

  // ── Civil status (§9.1, OPEN-4) ──
  {
    code: 'CENOMAR',
    label: 'CENOMAR (PSA)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'CENOMAR',
    when: { methods: NOT_CASH, civil: ['SINGLE'] },
  },
  {
    code: 'MARRIAGE_CONTRACT',
    label: 'Marriage contract (PSA)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'MARRIAGE_CONTRACT',
    when: { methods: NOT_CASH, civil: ['MARRIED'] },
  },
  {
    code: 'VALID_ID_1',
    label: 'Spouse valid ID (1st)',
    appliesTo: 'SPOUSE',
    stage: 'FINANCING',
    docType: 'VALID_ID',
    when: { methods: NOT_CASH, civil: ['MARRIED'] },
  },
  {
    code: 'VALID_ID_2',
    label: 'Spouse valid ID (2nd)',
    appliesTo: 'SPOUSE',
    stage: 'FINANCING',
    docType: 'VALID_ID',
    when: { methods: NOT_CASH, civil: ['MARRIED'] },
  },
  {
    code: 'ANNULMENT_DECREE',
    label: 'Annulment decree or court decision',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'ANNULMENT_DECREE',
    when: { methods: NOT_CASH, civil: ['SEPARATED'] },
  },

  // ── Deferred cash and in-house: proof of income (§9.1) ──
  {
    code: 'PROOF_OF_INCOME',
    label: 'Proof of income (COE or payslips; ITR or permit if in business; contract if OFW)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: null,
    when: { methods: ['DEFERRED_CASH'] },
  },
  {
    code: 'PROOF_OF_INCOME',
    label: 'Proof of income (one document is enough)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: null,
    when: { methods: ['IN_HOUSE'] },
  },

  // ── Bank / Pag-IBIG, common (§9.2) ──
  {
    code: 'BIRTH_CERT',
    label: 'Birth certificate (PSA)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'BIRTH_CERT',
    when: { methods: LOANS },
  },
  {
    code: 'BIRTH_CERT',
    label: 'Spouse birth certificate (PSA)',
    appliesTo: 'SPOUSE',
    stage: 'FINANCING',
    docType: 'BIRTH_CERT',
    when: { methods: LOANS, civil: ['MARRIED'] },
  },
  {
    code: 'PROOF_OF_BILLING',
    label: 'Proof of billing address',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PROOF_OF_BILLING',
    when: { methods: LOANS },
  },
  {
    code: 'TIN_PROOF',
    label: 'Verified TIN (BIR Form 1904 or TIN verification slip)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'TIN_PROOF',
    when: { methods: LOANS },
  },
  {
    code: 'PHOTO_2X2',
    label: '2×2 photo, white background (2 copies)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PHOTO_2X2',
    when: { methods: LOANS },
  },

  // ── Bank / Pag-IBIG, locally employed ──
  {
    code: 'COE',
    label: 'Certificate of employment with compensation',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'COE',
    when: { methods: LOANS, employment: ['LOCALLY_EMPLOYED'] },
  },
  {
    code: 'PAYSLIP_3M',
    label: 'Payslips, last 3 months',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PAYSLIP',
    when: { methods: LOANS, employment: ['LOCALLY_EMPLOYED'] },
  },
  {
    code: 'ITR',
    label: 'Income tax return',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'ITR',
    when: { methods: LOANS, employment: ['LOCALLY_EMPLOYED'] },
  },

  // ── Bank / Pag-IBIG, self-employed / business ──
  {
    code: 'ITR_2Y',
    label: 'Income tax returns, last 2 years',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'ITR',
    when: { methods: LOANS, employment: ['SELF_EMPLOYED'] },
  },
  {
    code: 'AFS_2Y',
    label: 'Audited financial statements, last 2 years',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'AFS',
    when: { methods: LOANS, employment: ['SELF_EMPLOYED'] },
  },
  {
    code: 'BANK_STATEMENT_6M',
    label: 'Bank statements, last 6 months',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'BANK_STATEMENT',
    when: { methods: LOANS, employment: ['SELF_EMPLOYED'] },
  },
  {
    code: 'DTI_OR_BUSINESS_CLEARANCE',
    label: 'DTI registration or business clearance',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'DTI_OR_BUSINESS_CLEARANCE',
    when: { methods: LOANS, employment: ['SELF_EMPLOYED'] },
  },
  {
    code: 'MAYORS_PERMIT',
    label: "Mayor's permit",
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'MAYORS_PERMIT',
    when: { methods: LOANS, employment: ['SELF_EMPLOYED'] },
  },
  {
    code: 'BUSINESS_PHOTO',
    label: 'Photo of the business establishment',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'BUSINESS_PHOTO',
    when: { methods: LOANS, employment: ['SELF_EMPLOYED'] },
  },

  // ── Bank / Pag-IBIG, OFW ──
  {
    code: 'OFW_EMPLOYMENT_PROOF',
    label: 'COE, employment contract or salary certificate',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'COE',
    when: { methods: LOANS, employment: ['OFW'] },
  },
  {
    code: 'PAYSLIP_3M',
    label: 'Payslips (3 months) or payroll bank statements',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PAYSLIP',
    when: { methods: LOANS, employment: ['OFW'] },
  },
  {
    code: 'SPA',
    label: 'Special power of attorney (notarized or consularized)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'SPA',
    when: { methods: LOANS, employment: ['OFW'] },
  },
  {
    code: 'PASSPORT',
    label: 'Passport with entry and exit stamps',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PASSPORT',
    when: { methods: LOANS, employment: ['OFW'] },
  },
  {
    code: 'SEAMANS_BOOK',
    label: "Seaman's book (seafarers only)",
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'SEAMANS_BOOK',
    optional: true,
    when: { methods: LOANS, employment: ['OFW'] },
  },
  {
    code: 'VALID_ID_1',
    label: 'Representative valid ID (1st)',
    appliesTo: 'REPRESENTATIVE',
    stage: 'FINANCING',
    docType: 'VALID_ID',
    when: { methods: LOANS, employment: ['OFW'] },
  },
  {
    code: 'VALID_ID_2',
    label: 'Representative valid ID (2nd)',
    appliesTo: 'REPRESENTATIVE',
    stage: 'FINANCING',
    docType: 'VALID_ID',
    when: { methods: LOANS, employment: ['OFW'] },
  },

  // ── Pag-IBIG additions (§9.2) ──
  {
    code: 'PHOTO_1X1',
    label: '1×1 photo (4 copies)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PHOTO_1X1',
    when: { methods: ['PAG_IBIG'] },
  },
  {
    code: 'ESAV',
    label: 'ESAV (Pag-IBIG)',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'ESAV',
    when: { methods: ['PAG_IBIG'] },
  },
  {
    code: 'PAGIBIG_VIRTUAL_ACCOUNT',
    label: 'Virtual Pag-IBIG account',
    appliesTo: 'BUYER',
    stage: 'FINANCING',
    docType: 'PAGIBIG_VIRTUAL_ACCOUNT',
    when: { methods: ['PAG_IBIG'], employment: ['LOCALLY_EMPLOYED'] },
  },
];

export type ChecklistInput = {
  paymentMethod: Method;
  civilStatus: CivilStatus;
  employmentType: EmploymentType | null;
};

export type ChecklistItem = Omit<Rule, 'when' | 'optional'> & { required: boolean };

/** The checklist for one buyer: every rule whose conditions all match. */
export function buildChecklist(input: ChecklistInput): ChecklistItem[] {
  return RULES.filter(
    ({ when }) =>
      (!when.methods || when.methods.includes(input.paymentMethod)) &&
      (!when.civil || when.civil.includes(input.civilStatus)) &&
      (!when.employment ||
        (input.employmentType !== null && when.employment.includes(input.employmentType))),
  ).map(({ when: _w, optional, ...item }) => ({ ...item, required: !optional }));
}

/** Methods that need the buyer's employment type (§9.2 sets depend on it). */
export const needsEmployment = (m: PaymentMethod) => m === 'BANK' || m === 'PAG_IBIG';
