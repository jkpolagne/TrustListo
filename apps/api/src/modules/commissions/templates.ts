import type { Prisma, RequirementStage, TrancheTrigger } from '@prisma/client';

/**
 * Default commission templates (SPEC §10.3), one per developer × payment method, plus the
 * private-sale one. Used by the seed and whenever a CompanyAdmin adds a developer, so every
 * developer's sales earn a commission from day one. Gross 5% and the DP thresholds are
 * PLACEHOLDERS (OPEN-5, OPEN-8); the CompanyAdmin edits them in Settings.
 */

type Tx = Prisma.TransactionClient;
type TrancheDef = [
  label: string,
  share: number,
  trigger: TrancheTrigger,
  value: number | null,
  stage: RequirementStage,
];
type Method = 'CASH' | 'DEFERRED_CASH' | 'IN_HOUSE' | 'BANK' | 'PAG_IBIG';

export const DEFAULT_GROSS_PCT = 5; // PLACEHOLDER (OPEN-5)

const CASH: TrancheDef[] = [
  ['Advance (20%)', 20, 'FULL_PAYMENT', null, 'RESERVATION'], // OPEN-7: on full cash payment
  ['Balance (80%)', 80, 'FULL_PAYMENT', null, 'RESERVATION'],
];
const HALF_TCP: TrancheDef[] = [['Full commission', 100, 'TCP_PERCENT_PAID', 50, 'FINANCING']];
const CAMELLA: TrancheDef[] = [
  ['Tranche 1', 30, 'DP_PERCENT_PAID', 30, 'RESERVATION'], // X₁ PLACEHOLDER (OPEN-8)
  ['Tranche 2', 30, 'DP_PERCENT_PAID', 60, 'RESERVATION'], // X₂ PLACEHOLDER (OPEN-8)
  ['Tranche 3', 30, 'DP_FULLY_PAID', null, 'FINANCING'],
  ['Retention', 10, 'LOAN_RELEASED', null, 'FINANCING'],
];
const PARKVIEW: TrancheDef[] = [
  ['First DP milestone', 20, 'DP_PERCENT_PAID', 50, 'RESERVATION'], // PLACEHOLDER (OPEN-8)
  ['DP fully paid', 80, 'DP_FULLY_PAID', null, 'FINANCING'],
];
const MONTHLY: TrancheDef[] = [['Monthly', 100, 'MONTHLY', null, 'RESERVATION']];
const PRIVATE: TrancheDef[] = [['Full commission', 100, 'FULL_PAYMENT', null, 'RESERVATION']];

function create(
  tx: Tx,
  firmId: string,
  developerId: string | null,
  method: Method,
  tranches: TrancheDef[],
  requiresTransmittal = true,
) {
  return tx.commissionTemplate.create({
    data: {
      firmId,
      developerId,
      paymentMethod: method,
      grossRatePct: DEFAULT_GROSS_PCT,
      requiresTransmittal,
      tranches: {
        create: tranches.map(([label, sharePct, trigger, triggerValue, requiredStage], i) => ({
          sequence: i + 1,
          label,
          sharePct,
          trigger,
          triggerValue,
          requiredStage,
        })),
      },
    },
  });
}

/** The §10.3 templates for one developer: Futura pays monthly; Parkview has its own DP split. */
export async function createDeveloperTemplates(
  tx: Tx,
  firmId: string,
  developer: { id: string; name: string },
): Promise<number> {
  if (/futura/i.test(developer.name)) {
    for (const m of ['CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG'] as const) {
      await create(tx, firmId, developer.id, m, MONTHLY);
    }
    return 5;
  }
  await create(tx, firmId, developer.id, 'CASH', CASH);
  await create(tx, firmId, developer.id, 'DEFERRED_CASH', HALF_TCP);
  await create(tx, firmId, developer.id, 'IN_HOUSE', HALF_TCP);
  // Vista Land / St. Andrew per §10.3; other developers use the same until confirmed.
  const loan = /parkview/i.test(developer.name) ? PARKVIEW : CAMELLA;
  await create(tx, firmId, developer.id, 'BANK', loan);
  await create(tx, firmId, developer.id, 'PAG_IBIG', loan);
  return 5;
}

/** Private (individual seller) sales: spot cash, no developer transmittal. One per firm. */
export async function createPrivateSaleTemplate(tx: Tx, firmId: string) {
  const exists = await tx.commissionTemplate.findFirst({
    where: { firmId, developerId: null, paymentMethod: 'CASH' },
  });
  if (!exists) await create(tx, firmId, null, 'CASH', PRIVATE, false);
}

/** A new firm's commission starting point: split placeholders (OPEN-5) and private-sale template. */
export async function createFirmCommissionDefaults(tx: Tx, firmId: string) {
  await tx.commissionSplitConfig.createMany({
    data: [
      { firmId, handledBy: 'SALES_PERSON', brokerPct: 20, salesManagerPct: 20, salesPersonPct: 60 },
      { firmId, handledBy: 'SALES_MANAGER', brokerPct: 30, salesManagerPct: 70, salesPersonPct: 0 },
    ],
    skipDuplicates: true,
  });
  await createPrivateSaleTemplate(tx, firmId);
}
