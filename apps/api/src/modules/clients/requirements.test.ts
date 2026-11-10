// SPEC §9.3: the checklist for every combination of payment method × civil status × employment.
import { describe, expect, it } from 'vitest';
import { buildChecklist, type ChecklistInput } from './requirements.rules';

const METHODS = ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'] as const;
const CIVIL = ['SINGLE', 'MARRIED', 'SEPARATED'] as const;
const EMPLOYMENT = ['LOCALLY_EMPLOYED', 'SELF_EMPLOYED', 'OFW'] as const;

const codes = (input: ChecklistInput) =>
  buildChecklist(input).map(
    (i) => `${i.appliesTo === 'BUYER' ? '' : `${i.appliesTo}:`}${i.code}${i.required ? '' : '?'}`,
  );

describe('requirements checklist (§9)', () => {
  it('matches the snapshot for all 45 combinations', () => {
    const table: Record<string, string[]> = {};
    for (const paymentMethod of METHODS)
      for (const civilStatus of CIVIL)
        for (const employmentType of EMPLOYMENT)
          table[`${paymentMethod} ${civilStatus} ${employmentType}`] = codes({
            paymentMethod,
            civilStatus,
            employmentType,
          });
    expect(Object.keys(table)).toHaveLength(45);
    expect(table).toMatchSnapshot();
  });

  it('spot cash needs only the two IDs, whatever the civil status (OPEN-4)', () => {
    for (const civilStatus of CIVIL) {
      expect(codes({ paymentMethod: 'CASH', civilStatus, employmentType: null })).toEqual([
        'VALID_ID_1',
        'VALID_ID_2',
      ]);
    }
  });

  it('every other method adds civil-status documents (OPEN-4)', () => {
    expect(
      codes({ paymentMethod: 'IN_HOUSE', civilStatus: 'MARRIED', employmentType: null }),
    ).toEqual([
      'VALID_ID_1',
      'VALID_ID_2',
      'MARRIAGE_CONTRACT',
      'SPOUSE:VALID_ID_1',
      'SPOUSE:VALID_ID_2',
      'PROOF_OF_INCOME',
    ]);
    expect(
      codes({ paymentMethod: 'DEFERRED_CASH', civilStatus: 'SINGLE', employmentType: null }),
    ).toContain('CENOMAR');
    expect(
      codes({ paymentMethod: 'BANK', civilStatus: 'SEPARATED', employmentType: 'SELF_EMPLOYED' }),
    ).toContain('ANNULMENT_DECREE');
  });

  it('Pag-IBIG, married, OFW — the §17 demo buyer', () => {
    const c = codes({ paymentMethod: 'PAG_IBIG', civilStatus: 'MARRIED', employmentType: 'OFW' });
    for (const code of [
      'MARRIAGE_CONTRACT',
      'SPOUSE:VALID_ID_1',
      'BIRTH_CERT',
      'SPOUSE:BIRTH_CERT',
      'PROOF_OF_BILLING',
      'TIN_PROOF',
      'PHOTO_2X2',
      'OFW_EMPLOYMENT_PROOF',
      'PAYSLIP_3M',
      'SPA',
      'PASSPORT',
      'SEAMANS_BOOK?',
      'REPRESENTATIVE:VALID_ID_1',
      'REPRESENTATIVE:VALID_ID_2',
      'PHOTO_1X1',
      'ESAV',
    ]) {
      expect(c, code).toContain(code);
    }
    expect(c).not.toContain('PAGIBIG_VIRTUAL_ACCOUNT'); // locally employed only
    expect(c).not.toContain('CENOMAR');
  });

  it('employment type picks the income documents for loans', () => {
    const local = codes({
      paymentMethod: 'PAG_IBIG',
      civilStatus: 'SINGLE',
      employmentType: 'LOCALLY_EMPLOYED',
    });
    expect(local).toEqual(
      expect.arrayContaining(['COE', 'PAYSLIP_3M', 'ITR', 'PAGIBIG_VIRTUAL_ACCOUNT', 'CENOMAR']),
    );
    const business = codes({
      paymentMethod: 'BANK',
      civilStatus: 'SINGLE',
      employmentType: 'SELF_EMPLOYED',
    });
    expect(business).toEqual(
      expect.arrayContaining([
        'ITR_2Y',
        'AFS_2Y',
        'BANK_STATEMENT_6M',
        'DTI_OR_BUSINESS_CLEARANCE',
        'MAYORS_PERMIT',
        'BUSINESS_PHOTO',
      ]),
    );
    expect(business).not.toContain('ESAV'); // Pag-IBIG only
  });

  it('never lists the same item twice', () => {
    for (const paymentMethod of METHODS)
      for (const civilStatus of CIVIL)
        for (const employmentType of EMPLOYMENT) {
          const c = codes({ paymentMethod, civilStatus, employmentType });
          expect(new Set(c).size).toBe(c.length);
        }
  });
});
