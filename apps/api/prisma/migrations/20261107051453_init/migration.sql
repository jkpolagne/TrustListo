-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "FirmStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER', 'SALES_PERSON');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('PRC_LICENSE', 'DHSUD_REGISTRATION');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_AI', 'NEEDS_ATTENTION', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingSource" AS ENUM ('DEVELOPER', 'INDIVIDUAL_SELLER');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE_AND_LOT', 'LOT', 'CONDO', 'TOWNHOUSE', 'COMMERCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'NEEDS_ATTENTION', 'LIVE', 'REJECTED', 'SUSPENDED', 'SOLD');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('PRC_VERIFIED', 'DHSUD_REGISTERED', 'OWNERSHIP_VERIFIED', 'LTS_VERIFIED', 'TAX_CURRENT', 'TITLE_CLEAN');

-- CreateEnum
CREATE TYPE "SellerRequestStatus" AS ENUM ('NEW', 'ACCEPTED', 'DOCUMENTS_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'LISTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "NatureOfWork" AS ENUM ('EMPLOYED', 'OFW', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'DEFERRED_CASH', 'IN_HOUSE', 'BANK', 'PAG_IBIG', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SINGLE', 'MARRIED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "InquirySource" AS ENUM ('ORGANIC', 'REFERRAL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'VISIT_SCHEDULED', 'RESERVED', 'LOST');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('LOCALLY_EMPLOYED', 'OFW', 'SELF_EMPLOYED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'CLOSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('DEVELOPER_SALE', 'PRIVATE_SALE');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('RESERVATION', 'DOWNPAYMENT', 'FULL_CASH', 'DEFERRED_INSTALLMENT', 'IN_HOUSE_INSTALLMENT', 'LOAN_RELEASE', 'OTHER');

-- CreateEnum
CREATE TYPE "RequirementStage" AS ENUM ('RESERVATION', 'FINANCING');

-- CreateEnum
CREATE TYPE "ReqItemStatus" AS ENUM ('MISSING', 'UPLOADED', 'NEEDS_ATTENTION', 'VERIFIED', 'WAIVED');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('LAND_TITLE', 'TAX_DECLARATION', 'RPT_RECEIPT', 'SELLER_ID', 'LICENSE_TO_SELL', 'PRC_ID', 'DHSUD_CERT', 'VALID_ID', 'BIRTH_CERT', 'MARRIAGE_CONTRACT', 'CENOMAR', 'ANNULMENT_DECREE', 'COE', 'PAYSLIP', 'PROOF_OF_BILLING', 'TIN_PROOF', 'ITR', 'AFS', 'BANK_STATEMENT', 'DTI_OR_BUSINESS_CLEARANCE', 'MAYORS_PERMIT', 'SPA', 'PASSPORT', 'SEAMANS_BOOK', 'PHOTO_2X2', 'PHOTO_1X1', 'ESAV', 'PAGIBIG_VIRTUAL_ACCOUNT', 'BUSINESS_PHOTO', 'PAYMENT_RECEIPT', 'TRANSMITTAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DocOwner" AS ENUM ('PROPERTY', 'PROJECT', 'CREDENTIAL', 'CLIENT', 'PAYMENT', 'TRANSMITTAL', 'SELLER_REQUEST');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TrancheTrigger" AS ENUM ('ON_RESERVATION', 'FULL_PAYMENT', 'TCP_PERCENT_PAID', 'DP_PERCENT_PAID', 'DP_FULLY_PAID', 'LOAN_RELEASED', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('WAITING', 'BLOCKED', 'AWAITING_TRANSMITTAL', 'READY_FOR_RELEASE', 'RELEASED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "logoKey" TEXT,
    "status" "FirmStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firmId" TEXT,
    "role" "Role" NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "photoKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "managerId" TEXT,
    "brokerId" TEXT,
    "referralCode" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "numberEntered" TEXT NOT NULL,
    "documentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_AI',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationText" TEXT NOT NULL,
    "geom" geography(Point,4326),
    "ltsDocumentId" TEXT,
    "ltsNumber" TEXT,
    "ltsExpiresAt" TIMESTAMP(3),
    "ltsStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_AI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "source" "ListingSource" NOT NULL,
    "projectId" TEXT,
    "sellerRequestId" TEXT,
    "assignedAgentId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "description" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "lotAreaSqm" DECIMAL(10,2),
    "floorAreaSqm" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "barangay" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Naga City',
    "province" TEXT NOT NULL DEFAULT 'Camarines Sur',
    "geom" geography(Point,4326),
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPhoto" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyBadge" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "PropertyBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanQuotation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reservationFee" DECIMAL(14,2) NOT NULL,
    "downpaymentPct" DECIMAL(6,3) NOT NULL,
    "dpTermMonths" INTEGER NOT NULL,
    "monthlyDp" DECIMAL(14,2) NOT NULL,
    "loanAmount" DECIMAL(14,2) NOT NULL,
    "interestRatePct" DECIMAL(6,3),
    "loanTermYears" INTEGER,
    "monthlyAmortization" DECIMAL(14,2),
    "notes" TEXT,

    CONSTRAINT "LoanQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerListingRequest" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "sellerPhone" TEXT NOT NULL,
    "sellerEmail" TEXT,
    "locationText" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "lotAreaSqm" DECIMAL(10,2),
    "floorAreaSqm" DECIMAL(10,2),
    "askingPrice" DECIMAL(14,2) NOT NULL,
    "hasTitle" BOOLEAN NOT NULL,
    "photoKeys" TEXT[],
    "status" "SellerRequestStatus" NOT NULL DEFAULT 'NEW',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerListingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "source" "InquirySource" NOT NULL,
    "referralCode" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "natureOfWork" "NatureOfWork" NOT NULL,
    "paymentPref" "PaymentMethod" NOT NULL,
    "civilStatus" "CivilStatus" NOT NULL,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "inquiryId" TEXT,
    "propertyId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "civilStatus" "CivilStatus" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "employmentType" "EmploymentType",
    "tcp" DECIMAL(14,2) NOT NULL,
    "saleType" "SaleType" NOT NULL,
    "reservationPaidAt" TIMESTAMP(3) NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "proofDocumentId" TEXT,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementItem" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "stage" "RequirementStage" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "ReqItemStatus" NOT NULL DEFAULT 'MISSING',
    "documentId" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "RequirementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "ownerType" "DocOwner" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "declaredType" "DocType",
    "detectedType" "DocType",
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "aiStatus" "AiStatus" NOT NULL DEFAULT 'QUEUED',
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "extracted" JSONB,
    "flags" JSONB,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_AI',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionSplitConfig" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "handledBy" "Role" NOT NULL,
    "brokerPct" DECIMAL(6,3) NOT NULL,
    "salesManagerPct" DECIMAL(6,3) NOT NULL,
    "salesPersonPct" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "CommissionSplitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTemplate" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "developerId" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "grossRatePct" DECIMAL(6,3) NOT NULL,
    "requiresTransmittal" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CommissionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTemplateTranche" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sharePct" DECIMAL(6,3) NOT NULL,
    "trigger" "TrancheTrigger" NOT NULL,
    "triggerValue" DECIMAL(6,3),
    "requiredStage" "RequirementStage" NOT NULL,

    CONSTRAINT "CommissionTemplateTranche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "splitSnapshot" JSONB NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTranche" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'WAITING',
    "milestoneReachedAt" TIMESTAMP(3),
    "docsCompleteAt" TIMESTAMP(3),
    "transmittalDocumentId" TEXT,
    "transmittalAmount" DECIMAL(14,2),
    "awaitingSince" TIMESTAMP(3),

    CONSTRAINT "CommissionTranche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionVoucher" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "trancheId" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "totalNet" DECIMAL(14,2) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "brokerSignedAt" TIMESTAMP(3),
    "brokerSignature" JSONB,
    "consultantSignatures" JSONB,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "inquiryId" TEXT,
    "clientId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "rescheduledFromId" TEXT,
    "declineReason" TEXT,
    "decidedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingRecord" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sellingPrice" DECIMAL(14,2) NOT NULL,
    "computation" JSONB NOT NULL,
    "checklist" JSONB NOT NULL,

    CONSTRAINT "ClosingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingToken" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "RatingToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "firmId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Firm_slug_key" ON "Firm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_firmId_role_idx" ON "User"("firmId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_documentId_key" ON "Credential"("documentId");

-- CreateIndex
CREATE INDEX "Credential_firmId_userId_idx" ON "Credential"("firmId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_firmId_name_key" ON "Developer"("firmId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_ltsDocumentId_key" ON "Project"("ltsDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_sellerRequestId_key" ON "Property"("sellerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_firmId_status_idx" ON "Property"("firmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyBadge_propertyId_type_key" ON "PropertyBadge"("propertyId", "type");

-- CreateIndex
CREATE INDEX "SellerListingRequest_firmId_agentId_idx" ON "SellerListingRequest"("firmId", "agentId");

-- CreateIndex
CREATE INDEX "Inquiry_firmId_consultantId_status_idx" ON "Inquiry"("firmId", "consultantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Client_inquiryId_key" ON "Client"("inquiryId");

-- CreateIndex
CREATE INDEX "Client_firmId_consultantId_idx" ON "Client"("firmId", "consultantId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_proofDocumentId_key" ON "Payment"("proofDocumentId");

-- CreateIndex
CREATE INDEX "Payment_firmId_clientId_idx" ON "Payment"("firmId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementItem_clientId_code_appliesTo_key" ON "RequirementItem"("clientId", "code", "appliesTo");

-- CreateIndex
CREATE INDEX "Document_firmId_ownerType_ownerId_idx" ON "Document"("firmId", "ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Document_firmId_reviewStatus_idx" ON "Document"("firmId", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionSplitConfig_firmId_handledBy_key" ON "CommissionSplitConfig"("firmId", "handledBy");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionTemplate_firmId_developerId_paymentMethod_key" ON "CommissionTemplate"("firmId", "developerId", "paymentMethod");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_clientId_key" ON "Commission"("clientId");

-- CreateIndex
CREATE INDEX "CommissionTranche_firmId_status_idx" ON "CommissionTranche"("firmId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionVoucher_trancheId_key" ON "CommissionVoucher"("trancheId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionVoucher_firmId_voucherNo_key" ON "CommissionVoucher"("firmId", "voucherNo");

-- CreateIndex
CREATE INDEX "Visit_firmId_scheduledAt_idx" ON "Visit"("firmId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingRecord_clientId_key" ON "ClosingRecord"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "RatingToken_clientId_key" ON "RatingToken"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "RatingToken_tokenHash_key" ON "RatingToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_clientId_key" ON "Rating"("clientId");

-- CreateIndex
CREATE INDEX "AuditLog_firmId_createdAt_idx" ON "AuditLog"("firmId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ltsDocumentId_fkey" FOREIGN KEY ("ltsDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_sellerRequestId_fkey" FOREIGN KEY ("sellerRequestId") REFERENCES "SellerListingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyBadge" ADD CONSTRAINT "PropertyBadge_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanQuotation" ADD CONSTRAINT "LoanQuotation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTemplate" ADD CONSTRAINT "CommissionTemplate_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTemplateTranche" ADD CONSTRAINT "CommissionTemplateTranche_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommissionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTranche" ADD CONSTRAINT "CommissionTranche_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionVoucher" ADD CONSTRAINT "CommissionVoucher_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "CommissionTranche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
