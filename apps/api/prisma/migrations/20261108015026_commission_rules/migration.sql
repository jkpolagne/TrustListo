-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "downpaymentAmount" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "CommissionTranche" ADD COLUMN     "periodMonth" TEXT,
ADD COLUMN     "requiredStage" "RequirementStage",
ADD COLUMN     "requiresTransmittal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trigger" "TrancheTrigger",
ADD COLUMN     "triggerValue" DECIMAL(6,3);

-- AlterTable
ALTER TABLE "Firm" ADD COLUMN     "withholdingPct" DECIMAL(6,3) NOT NULL DEFAULT 0;
