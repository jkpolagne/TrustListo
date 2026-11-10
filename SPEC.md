# TrustListo — Prototype Specification

> **Purpose of this file:** the single source of truth for building the TrustListo prototype. Claude Code (and every team member) should read this before writing code. When this spec and the code disagree, fix one of them — don't let them drift.
>
> **Status:** v1.0 — prototype / capstone build
> **Pilot firm:** Advench Realty, Naga City, Camarines Sur
> **Module owners:** Module 1 (AI Document Processing) — Jann Polagne · Module 2 (Marketplace & Property Management) — Sean Dizon · Module 3 (Sales, Client & Commission) — Jerome Salud

---

## 0. How to use this spec with Claude Code

1. Put this file at the repo root as `SPEC.md`. Create a short `CLAUDE.md` that says: *"Read SPEC.md before any task. Follow its rules in §2 (Non-negotiable rules) at all times. Ask before changing the data model in §6."*
2. Build in the order of §15 (Build plan). Each milestone has acceptance criteria — ask Claude Code to verify them before moving on.
3. Anything marked **[OPEN]** in §16 is undecided. Don't let Claude Code silently pick an answer; decide it as a team and update this file.

---

## 1. Product summary

TrustListo is a **multi-tenant web platform** for real estate brokerage firms in Naga City. It has:

- a **public shared marketplace** (no login) where property seekers browse verified listings from all participating firms, check consultant credentials, estimate loans, and send inquiries;
- **firm dashboards** (login) where firms manage consultants, listings, clients, visits, and staged commissions;
- **AI-assisted document processing** (OCR + rule-based extraction + cross-checks) that reads uploaded documents and **flags** issues for a licensed broker, who always makes the final decision.

### 1.1 Out of scope (do NOT build)

| Not included | Notes |
|---|---|
| Processing, holding, or transferring money | Payments and commission payouts happen outside the system. The system only records proofs and statuses. |
| Real-time chat | Consultants contact buyers offline. |
| Buyer / seller accounts or login | Public users never log in. |
| Cross-firm commission splitting (co-broke) | Transactions stay inside the listing firm. |
| Real-time government verification (PRC, DHSUD, ROD, BIR APIs) | AI reads uploaded scans/photos only. Badges ≠ government confirmation. |
| Native mobile app | Responsive web only. |
| Legal processing (contracts, deeds, title transfer) | Only closing-expense computation + checklist tracking. |
| Loan approval | Estimates and developer quotations only. |
| Zonal-value property valuation | Removed from scope → Chapter 5 recommendation. |
| Platform service-fee billing | The business model charges a tiered service fee per transaction, but billing/invoicing is not part of the prototype. |

---

## 2. Non-negotiable rules

These must hold everywhere. Write tests for them (§14).

1. **AI never approves.** Document processing produces flags and suggestions only. Only a user with role `BROKER` can set a listing, document, or credential to `APPROVED`/`VERIFIED`.
2. **No money movement.** No payment gateway, wallet, or payout integration.
3. **Commission always flows through the broker** (RA 9646, Sec. 31). Vouchers are created and signed by the broker first; consultants never receive a commission record that bypasses the broker.
4. **Hard tenant isolation.** Every firm-owned row carries `firmId`. Every authenticated query is scoped by the user's `firmId`. The only cross-firm data is the public marketplace (published listings + public consultant profiles).
5. **SuperAdmin sees no firm internals.** SuperAdmin can see firm records (name, status, counts) and platform logs, never a firm's clients, documents, or commissions.
6. **Public users never need accounts.**
7. **Consultant picker is randomized server-side** on every request. No admin-controlled ordering, no "featured" agents.
8. **No co-broke.** A buyer inquiry on a listing can only be assigned to a consultant of the listing's firm.
9. **Two-gate commission release.** A tranche becomes requestable only when its payment milestone is reached **and** its required documents are complete and verified.
10. **Visits are scheduled by consultants**, approved/declined by CompanyAdmin. Buyers cannot book visits.
11. **Every approval, rejection, signature, and status change is written to the audit log** (who, what, when, before/after).

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS |
| Maps | Leaflet + react-leaflet, GeoJSON | OpenStreetMap tiles |
| Backend | Node.js 20 LTS + Express + TypeScript | Zod for request validation |
| ORM | Prisma | PostGIS columns via `Unsupported(...)` + raw SQL for geo queries |
| Database | PostgreSQL 16 + PostGIS 3 | |
| OCR | Tesseract (`tesseract.js` in Node) + `sharp` for preprocessing | `eng` language data; consider `fil` later |
| File storage | DigitalOcean Spaces (S3-compatible) via `@aws-sdk/client-s3` | Local dev: MinIO in Docker, same code path |
| Auth | Email + password, `argon2` hashing, JWT access token in httpOnly cookie | |
| PDF (vouchers) | `pdfkit` or HTML → PDF | Optional for prototype; on-screen voucher is enough |
| Hosting | DigitalOcean (Droplet or App Platform) + Managed PostgreSQL | |
| Tooling | pnpm workspaces, ESLint, Prettier, Vitest, Supertest, Playwright (optional) | |

Architecture: **three-tier**. Presentation (React) → Application (Express, with the AI document pipeline as an internal service module) → Data (PostgreSQL/PostGIS + Spaces).

---

## 4. Repository structure

```
trustlisto/
├── SPEC.md
├── CLAUDE.md
├── docker-compose.yml          # postgres+postgis, minio
├── .env.example
├── package.json                # pnpm workspaces
├── apps/
│   ├── web/                    # React + Vite
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── public/     # marketplace, property, consultant, list-your-property
│   │       │   ├── auth/
│   │       │   ├── superadmin/
│   │       │   ├── admin/      # CompanyAdmin
│   │       │   ├── broker/
│   │       │   ├── manager/
│   │       │   └── salesperson/
│   │       ├── components/
│   │       ├── lib/            # api client, auth context, formatters (₱)
│   │       └── features/       # module-aligned feature folders
│   └── api/                    # Express
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── src/
│           ├── app.ts
│           ├── middleware/     # auth, requireRole, tenantScope, errorHandler, audit
│           ├── modules/
│           │   ├── auth/
│           │   ├── firms/
│           │   ├── users/              # consultants & hierarchy
│           │   ├── marketplace/        # Module 2 (public)
│           │   ├── properties/         # Module 2 (firm side)
│           │   ├── inquiries/
│           │   ├── clients/            # Module 3
│           │   ├── requirements/       # checklist engine
│           │   ├── commissions/        # Module 3
│           │   ├── visits/
│           │   ├── documents/          # Module 1 (upload, review)
│           │   ├── docai/              # Module 1 (OCR pipeline)
│           │   ├── ratings/
│           │   ├── closing/
│           │   └── audit/
│           └── lib/            # storage, money, randomize, nameMatch
└── packages/
    └── shared/                 # shared TS types, enums, Zod schemas
```

---

## 5. Roles, permissions, and visibility

### 5.1 Roles

| Role | Login | Scope |
|---|---|---|
| `SUPER_ADMIN` | Yes | Platform; no `firmId` |
| `COMPANY_ADMIN` | Yes | One firm, everything |
| `BROKER` | Yes | One firm, everything (read + approvals; **no data entry**) |
| `SALES_MANAGER` | Yes | Own clients + clients of salespersons under them |
| `SALES_PERSON` | Yes | Own clients only |
| Property Seeker | No | Public pages + inquiry form |
| Individual Seller | No | "List Your Property" form |

Hierarchy: `SALES_PERSON.managerId → SALES_MANAGER`, `SALES_MANAGER.brokerId → BROKER`. A salesperson must have a manager; a manager must have a broker.

### 5.2 Permission matrix (✅ full · 👁 read-only · ✍ own/team only · — none)

| Capability | SuperAdmin | CompanyAdmin | Broker | Sales Manager | Sales Person |
|---|---|---|---|---|---|
| Onboard / suspend firms, create CompanyAdmin | ✅ | — | — | — | — |
| Platform activity logs | ✅ | — | — | — | — |
| Firm activity logs / reports | — | ✅ | 👁 | — | — |
| Create/edit consultants, hierarchy, activate/deactivate | — | ✅ | 👁 | 👁 team | — |
| Upload consultant PRC/DHSUD credentials | — | ✅ | — | — | — |
| Approve credentials (badges) | — | — | ✅ | — | — |
| Developers, projects, units, prices, photos, loan quotations | — | ✅ | 👁 | 👁 | 👁 |
| Upload License to Sell | — | ✅ | — | — | — |
| Approve / reject listings & documents | — | — | ✅ | — | — |
| Seller listing requests | — | 👁 all | 👁 all | ✍ own | ✍ own |
| Upload seller listing documents | — | — | — | ✍ own | ✍ own |
| Inquiries / leads | — | 👁 all | 👁 all | ✍ own + team 👁 | ✍ own |
| Clients, payment proofs, buyer documents | — | 👁 all | 👁 all | ✍ own + team 👁 | ✍ own |
| Schedule visits | — | — | — | ✍ own clients | ✍ own clients |
| Approve / decline visits | — | ✅ | 👁 | 👁 team | 👁 own |
| Commission split % & developer templates | — | ✅ | 👁 | — | — |
| Upload developer transmittal | — | ✅ | — | — | — |
| Create & sign commission voucher | — | — | ✅ | — | — |
| Countersign voucher | — | — | — | ✍ own | ✍ own |
| Referral link & referral leads | — | — | — | ✍ own | ✍ own |
| Audit trail | — | 👁 | 👁 | — | — |

> **Assumption:** the Broker "approval" queue covers both listing documents and buyer documents flagged by the AI. Buyer documents that the AI reads with no flags still need broker verification before they count toward a commission gate (see §10.4). **Decided 2026-11-08 (OPEN-3): broker only** — every buyer document, flagged or clean, is verified by a Broker.

### 5.3 Scoping rules (implement as middleware + service helpers)

```ts
// pseudo
function clientScope(user): Prisma.ClientWhereInput {
  switch (user.role) {
    case 'COMPANY_ADMIN':
    case 'BROKER':        return { firmId: user.firmId };
    case 'SALES_MANAGER': return { firmId: user.firmId, OR: [
                              { consultantId: user.id },
                              { consultant: { managerId: user.id } } ] };
    case 'SALES_PERSON':  return { firmId: user.firmId, consultantId: user.id };
    default: throw Forbidden();
  }
}
```

- Every firm-owned Prisma query goes through a scope helper. **Never** accept `firmId` from the request body or query string for authenticated routes — take it from the session.
- Requests for a record outside scope return **404** (not 403) so record existence isn't leaked.
- Document files in Spaces are private; the API issues short-lived (5 min) pre-signed URLs only after a scope check. Object keys: `firms/{firmId}/{entity}/{entityId}/{uuid}.{ext}`.

---

## 6. Data model (Prisma)

Conventions: `id` = `cuid()`; money = `Decimal @db.Decimal(14,2)` in PHP; percentages = `Decimal @db.Decimal(6,3)` stored as percent (e.g., `30.000`); all tables have `createdAt`, `updatedAt`. Firm-owned tables have `firmId` + index.

> This is the target schema. Claude Code should generate `schema.prisma` from it and propose changes rather than improvise.

```prisma
generator client { provider = "prisma-client-js"; previewFeatures = ["postgresqlExtensions"] }
datasource db   { provider = "postgresql"; url = env("DATABASE_URL"); extensions = [postgis] }

// ───────────── Tenancy & users ─────────────
enum FirmStatus { ACTIVE SUSPENDED }
enum Role { SUPER_ADMIN COMPANY_ADMIN BROKER SALES_MANAGER SALES_PERSON }

model Firm {
  id         String     @id @default(cuid())
  name       String
  slug       String     @unique
  address    String?
  logoKey    String?
  status     FirmStatus @default(ACTIVE)
  users      User[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  // Loan calculator defaults (§7.4), edited by CompanyAdmin. Added 2026-11-07.
  loanRatePct        Decimal @default(6.25) @db.Decimal(6,3)
  loanTermYears      Int     @default(30)
  loanDownpaymentPct Decimal @default(10)   @db.Decimal(6,3)
  loanIncomeRatioPct Decimal @default(35)   @db.Decimal(6,3)
}

model User {
  id            String   @id @default(cuid())
  firmId        String?                  // null only for SUPER_ADMIN
  firm          Firm?    @relation(fields: [firmId], references: [id])
  role          Role
  email         String   @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  photoKey      String?
  isActive      Boolean  @default(true)
  managerId     String?                  // SALES_PERSON → SALES_MANAGER
  manager       User?    @relation("ManagerTeam", fields: [managerId], references: [id])
  team          User[]   @relation("ManagerTeam")
  brokerId      String?                  // SALES_MANAGER → BROKER
  broker        User?    @relation("BrokerManagers", fields: [brokerId], references: [id])
  managers      User[]   @relation("BrokerManagers")
  referralCode  String?  @unique         // consultants only, e.g. "JKPOL"
  bio           String?
  credentials   Credential[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([firmId, role])
}

// ───────────── Credentials & badges ─────────────
enum CredentialType { PRC_LICENSE DHSUD_REGISTRATION }
enum ReviewStatus  { PENDING_AI NEEDS_ATTENTION READY_FOR_REVIEW APPROVED REJECTED }

model Credential {
  id             String         @id @default(cuid())
  firmId         String
  userId         String
  user           User           @relation(fields: [userId], references: [id])
  type           CredentialType
  numberEntered  String          // typed by CompanyAdmin
  documentId     String?  @unique
  document       Document?      @relation(fields: [documentId], references: [id])
  expiresAt      DateTime?       // from AI extraction, confirmed by broker
  status         ReviewStatus   @default(PENDING_AI)
  reviewedById   String?
  reviewedAt     DateTime?
  rejectReason   String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  @@index([firmId, userId])
}

// ───────────── Developers & properties ─────────────
model Developer {
  id        String   @id @default(cuid())
  firmId    String                      // a firm's partner record
  name      String                      // e.g. "Vista Land (Camella)"
  isActive  Boolean  @default(true)
  projects  Project[]
  commissionTemplates CommissionTemplate[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([firmId, name])
}

model Project {
  id            String   @id @default(cuid())
  firmId        String
  developerId   String
  developer     Developer @relation(fields: [developerId], references: [id])
  name          String
  locationText  String
  // geom geography(Point,4326) — added via raw migration
  geom          Unsupported("geography(Point,4326)")?
  ltsDocumentId String?  @unique
  ltsDocument   Document? @relation("ProjectLTS", fields: [ltsDocumentId], references: [id])
  ltsNumber     String?
  ltsExpiresAt  DateTime?
  ltsStatus     ReviewStatus @default(PENDING_AI)
  properties    Property[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum ListingSource   { DEVELOPER INDIVIDUAL_SELLER }
enum PropertyType    { HOUSE_AND_LOT LOT CONDO TOWNHOUSE COMMERCIAL OTHER }
enum ListingStatus   { DRAFT PENDING_REVIEW NEEDS_ATTENTION LIVE REJECTED SUSPENDED SOLD }

model Property {
  id               String        @id @default(cuid())
  firmId           String
  source           ListingSource
  projectId        String?        // DEVELOPER listings (a unit/model)
  project          Project?      @relation(fields: [projectId], references: [id])
  sellerRequestId  String?  @unique // INDIVIDUAL_SELLER listings
  sellerRequest    SellerListingRequest? @relation(fields: [sellerRequestId], references: [id])
  assignedAgentId  String?        // INDIVIDUAL_SELLER: the agent the seller chose (all inquiries go here)
  title            String
  slug             String  @unique
  type             PropertyType
  description      String?
  price            Decimal @db.Decimal(14,2)   // TCP / asking price
  lotAreaSqm       Decimal? @db.Decimal(10,2)
  floorAreaSqm     Decimal? @db.Decimal(10,2)
  bedrooms         Int?
  bathrooms        Int?
  barangay         String?
  city             String  @default("Naga City")
  province         String  @default("Camarines Sur")
  geom             Unsupported("geography(Point,4326)")?
  status           ListingStatus @default(DRAFT)
  photos           PropertyPhoto[]
  badges           PropertyBadge[]
  loanQuotations   LoanQuotation[]
  publishedAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([firmId, status])
}

model PropertyPhoto { id String @id @default(cuid()); propertyId String; property Property @relation(fields:[propertyId], references:[id]); key String; sort Int @default(0) }

enum BadgeType { PRC_VERIFIED DHSUD_REGISTERED OWNERSHIP_VERIFIED LTS_VERIFIED TAX_CURRENT TITLE_CLEAN }

model PropertyBadge {
  id          String    @id @default(cuid())
  propertyId  String
  property    Property  @relation(fields: [propertyId], references: [id])
  type        BadgeType                  // OWNERSHIP_VERIFIED | LTS_VERIFIED | TAX_CURRENT | TITLE_CLEAN
  grantedById String                     // broker
  grantedAt   DateTime  @default(now())
  validUntil  DateTime?                  // e.g. LTS expiry, tax period end
  @@unique([propertyId, type])
}
// Consultant badges (PRC_VERIFIED, DHSUD_REGISTERED) are derived from APPROVED, unexpired Credential rows — not stored separately.

model LoanQuotation {
  id           String   @id @default(cuid())
  propertyId   String
  property     Property @relation(fields: [propertyId], references: [id])
  label        String          // e.g. "Pag-IBIG 30 yrs", "Bank 20 yrs", "In-house 5 yrs"
  paymentMethod PaymentMethod
  reservationFee Decimal @db.Decimal(14,2)
  downpaymentPct Decimal @db.Decimal(6,3)
  dpTermMonths   Int
  monthlyDp      Decimal @db.Decimal(14,2)
  loanAmount     Decimal @db.Decimal(14,2)
  interestRatePct Decimal? @db.Decimal(6,3)
  loanTermYears   Int?
  monthlyAmortization Decimal? @db.Decimal(14,2)
  notes          String?
}

// ───────────── Individual seller requests ─────────────
enum SellerRequestStatus { NEW ACCEPTED DOCUMENTS_IN_PROGRESS SUBMITTED_FOR_REVIEW LISTED DECLINED }

model SellerListingRequest {
  id            String   @id @default(cuid())
  firmId        String                 // firm of the chosen agent
  agentId       String                 // chosen agent (any firm)
  sellerName    String
  sellerPhone   String
  sellerEmail   String?
  locationText  String
  propertyType  PropertyType
  lotAreaSqm    Decimal? @db.Decimal(10,2)
  floorAreaSqm  Decimal? @db.Decimal(10,2)
  askingPrice   Decimal  @db.Decimal(14,2)
  hasTitle      Boolean
  photoKeys     String[]
  status        SellerRequestStatus @default(NEW)
  consentAt     DateTime              // Data Privacy Act consent checkbox
  property      Property?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([firmId, agentId])
}

// ───────────── Inquiries, leads, clients ─────────────
enum NatureOfWork  { EMPLOYED OFW BUSINESS OTHER }      // public form wording
enum PaymentMethod { CASH DEFERRED_CASH IN_HOUSE BANK PAG_IBIG NOT_SURE }
enum CivilStatus   { SINGLE MARRIED SEPARATED }
enum InquirySource { ORGANIC REFERRAL }
enum LeadStatus    { NEW CONTACTED QUALIFIED VISIT_SCHEDULED RESERVED LOST }

model Inquiry {
  id             String        @id @default(cuid())
  firmId         String                  // = property.firmId
  propertyId     String
  consultantId   String                  // picked, referral, or seller's chosen agent
  source         InquirySource
  referralCode   String?
  buyerName      String
  buyerPhone     String
  buyerEmail     String?
  natureOfWork   NatureOfWork
  paymentPref    PaymentMethod
  civilStatus    CivilStatus
  message        String?
  status         LeadStatus    @default(NEW)
  consentAt      DateTime
  client         Client?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  @@index([firmId, consultantId, status])
}

enum EmploymentType { LOCALLY_EMPLOYED OFW SELF_EMPLOYED }   // checklist engine wording
enum ClientStatus   { ACTIVE CLOSING COMPLETED CANCELLED }

model Client {
  id              String         @id @default(cuid())
  firmId          String
  inquiryId       String?  @unique
  inquiry         Inquiry? @relation(fields: [inquiryId], references: [id])
  propertyId      String
  consultantId    String                 // who HANDLES the client → drives commission split
  fullName        String
  phone           String
  email           String?
  civilStatus     CivilStatus
  paymentMethod   PaymentMethod          // NOT_SURE not allowed here
  employmentType  EmploymentType?        // required for BANK / PAG_IBIG
  tcp             Decimal  @db.Decimal(14,2)  // total contract price (may differ from list price)
  saleType        SaleType
  reservationPaidAt DateTime
  status          ClientStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([firmId, consultantId])
}
enum SaleType { DEVELOPER_SALE PRIVATE_SALE }

// ───────────── Payments ─────────────
enum PaymentKind { RESERVATION DOWNPAYMENT FULL_CASH DEFERRED_INSTALLMENT IN_HOUSE_INSTALLMENT LOAN_RELEASE OTHER }

model Payment {
  id             String      @id @default(cuid())
  firmId         String
  clientId       String
  kind           PaymentKind
  amount         Decimal     @db.Decimal(14,2)  // confirmed amount (AI-suggested, human-confirmed)
  paidAt         DateTime
  proofDocumentId String?   @unique
  confirmedById  String?                          // uploader confirms AI-read amount
  createdAt      DateTime    @default(now())
  @@index([firmId, clientId])
}

// ───────────── Requirements checklist ─────────────
enum RequirementStage { RESERVATION FINANCING }
enum ReqItemStatus    { MISSING UPLOADED NEEDS_ATTENTION VERIFIED WAIVED }

model RequirementItem {
  id          String           @id @default(cuid())
  firmId      String
  clientId    String
  code        String            // e.g. "VALID_ID_1", "CENOMAR", "PAYSLIP_3M" (see §9)
  label       String
  appliesTo   String            // "BUYER" | "SPOUSE" | "REPRESENTATIVE"
  stage       RequirementStage
  required    Boolean @default(true)
  status      ReqItemStatus @default(MISSING)
  documentId  String?
  verifiedById String?
  verifiedAt  DateTime?
  @@unique([clientId, code, appliesTo])
}

// ───────────── Documents & AI results (Module 1) ─────────────
enum DocType {
  LAND_TITLE TAX_DECLARATION RPT_RECEIPT SELLER_ID LICENSE_TO_SELL
  PRC_ID DHSUD_CERT
  VALID_ID BIRTH_CERT MARRIAGE_CONTRACT CENOMAR ANNULMENT_DECREE
  COE PAYSLIP PROOF_OF_BILLING TIN_PROOF ITR AFS BANK_STATEMENT
  DTI_OR_BUSINESS_CLEARANCE MAYORS_PERMIT SPA PASSPORT SEAMANS_BOOK
  PHOTO_2X2 PHOTO_1X1 ESAV PAGIBIG_VIRTUAL_ACCOUNT BUSINESS_PHOTO
  PAYMENT_RECEIPT TRANSMITTAL UNKNOWN
}
enum DocOwner { PROPERTY PROJECT CREDENTIAL CLIENT PAYMENT TRANSMITTAL SELLER_REQUEST }
enum AiStatus { QUEUED PROCESSING DONE FAILED }

model Document {
  id             String     @id @default(cuid())
  firmId         String
  ownerType      DocOwner
  ownerId        String
  declaredType   DocType?               // what the uploader said it is
  detectedType   DocType?               // what the classifier thinks
  storageKey     String
  mimeType       String
  sizeBytes      Int
  sha256         String                 // duplicate detection
  uploadedById   String
  aiStatus       AiStatus   @default(QUEUED)
  ocrText        String?
  ocrConfidence  Float?                 // 0–100 from Tesseract
  extracted      Json?                  // field → { value, confidence }
  flags          Json?                  // DocFlag[] (see §8.4)
  reviewStatus   ReviewStatus @default(PENDING_AI)
  reviewedById   String?
  reviewedAt     DateTime?
  reviewNote     String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  @@index([firmId, ownerType, ownerId])
  @@index([firmId, reviewStatus])
}

// ───────────── Commissions (Module 3) ─────────────
enum TrancheTrigger {
  ON_RESERVATION          // first tranche right away (e.g. cash 20% advance)
  FULL_PAYMENT            // buyer fully paid (spot cash)
  TCP_PERCENT_PAID        // buyer has paid ≥ X% of TCP (in-house, deferred: 50)
  DP_PERCENT_PAID         // buyer has paid ≥ X% of required downpayment
  DP_FULLY_PAID
  LOAN_RELEASED           // retention tranche
  MONTHLY                 // Futura-style: one tranche per paid month
}
enum CommissionStatus { WAITING BLOCKED AWAITING_TRANSMITTAL READY_FOR_RELEASE RELEASED }

model CommissionSplitConfig {           // per firm, set by CompanyAdmin
  id        String  @id @default(cuid())
  firmId    String
  handledBy Role                          // SALES_MANAGER or SALES_PERSON
  brokerPct       Decimal @db.Decimal(6,3)
  salesManagerPct Decimal @db.Decimal(6,3)
  salesPersonPct  Decimal @db.Decimal(6,3) // must be 0 when handledBy = SALES_MANAGER
  @@unique([firmId, handledBy])
  // invariant: brokerPct + salesManagerPct + salesPersonPct = 100
}

model CommissionTemplate {               // per developer × payment method
  id            String  @id @default(cuid())
  firmId        String
  developerId   String?                    // null = private sale template
  developer     Developer? @relation(fields: [developerId], references: [id])
  paymentMethod PaymentMethod
  grossRatePct  Decimal @db.Decimal(6,3)   // commission as % of TCP, e.g. 5.000
  requiresTransmittal Boolean @default(true) // false for private sales
  tranches      CommissionTemplateTranche[]
  @@unique([firmId, developerId, paymentMethod])
}

model CommissionTemplateTranche {
  id           String  @id @default(cuid())
  templateId   String
  template     CommissionTemplate @relation(fields: [templateId], references: [id])
  sequence     Int
  label        String                       // "Tranche 1", "Retention"
  sharePct     Decimal @db.Decimal(6,3)     // % of total commission; template sums to 100 (except MONTHLY)
  trigger      TrancheTrigger
  triggerValue Decimal? @db.Decimal(6,3)    // e.g. 50 for TCP_PERCENT_PAID
  requiredStage RequirementStage            // docs that must be VERIFIED/WAIVED
}

model Commission {                         // one per client deal
  id            String  @id @default(cuid())
  firmId        String
  clientId      String  @unique
  templateId    String
  grossAmount   Decimal @db.Decimal(14,2)  // tcp × grossRatePct (snapshot)
  splitSnapshot Json                        // percentages + userIds at creation time
  tranches      CommissionTranche[]
}

model CommissionTranche {
  id             String  @id @default(cuid())
  firmId         String
  commissionId   String
  commission     Commission @relation(fields: [commissionId], references: [id])
  sequence       Int
  label          String
  amount         Decimal @db.Decimal(14,2)
  status         CommissionStatus @default(WAITING)
  milestoneReachedAt   DateTime?
  docsCompleteAt       DateTime?
  transmittalDocumentId String?
  transmittalAmount    Decimal? @db.Decimal(14,2)
  awaitingSince        DateTime?          // for aging
  voucher        CommissionVoucher?
  @@index([firmId, status])
}

model CommissionVoucher {
  id             String  @id @default(cuid())
  firmId         String
  trancheId      String  @unique
  tranche        CommissionTranche @relation(fields: [trancheId], references: [id])
  voucherNo      String              // per firm sequence, e.g. ADV-2026-0001
  lines          Json                // [{ userId, role, grossShare, deductions:[{label, amount}], net }]
  totalNet       Decimal @db.Decimal(14,2)
  contentHash    String              // sha256 of canonical voucher JSON
  brokerSignedAt DateTime?
  brokerSignature Json?              // { userId, typedName, imageKey?, ip, userAgent, hash }
  consultantSignatures Json?         // one entry per payee consultant
  releasedAt     DateTime?
  createdAt      DateTime @default(now())
  @@unique([firmId, voucherNo])
}

// ───────────── Visits ─────────────
enum VisitStatus { PENDING APPROVED DECLINED COMPLETED NO_SHOW RESCHEDULED CANCELLED }

model Visit {
  id             String  @id @default(cuid())
  firmId         String
  propertyId     String
  consultantId   String
  inquiryId      String?
  clientId       String?
  scheduledAt    DateTime
  status         VisitStatus @default(PENDING)
  rescheduledFromId String?
  declineReason  String?
  decidedById    String?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([firmId, scheduledAt])
}

// ───────────── Closing ─────────────
model ClosingRecord {
  id           String  @id @default(cuid())
  firmId       String
  clientId     String  @unique
  sellingPrice Decimal @db.Decimal(14,2)
  computation  Json     // see §11
  checklist    Json     // [{ code, label, done, doneAt, doneById }]
}

// ───────────── Ratings ─────────────
model RatingToken {          // one-time link, since buyers have no accounts
  id          String  @id @default(cuid())
  firmId      String
  clientId    String  @unique
  consultantId String
  tokenHash   String  @unique
  expiresAt   DateTime
  usedAt      DateTime?
}
model Rating {
  id           String  @id @default(cuid())
  consultantId String
  clientId     String  @unique
  stars        Int     // 1–5
  comment      String?
  createdAt    DateTime @default(now())
}

// ───────────── Audit ─────────────
model AuditLog {
  id         String   @id @default(cuid())
  firmId     String?               // null = platform-level
  actorId    String?
  action     String                // e.g. "LISTING_APPROVED", "VOUCHER_SIGNED"
  entityType String
  entityId   String
  before     Json?
  after      Json?
  ip         String?
  createdAt  DateTime @default(now())
  @@index([firmId, createdAt])
}
```

Notes:
- `geom` columns are created/managed via a raw SQL migration (`ALTER TABLE ... ADD COLUMN geom geography(Point,4326)` + GIST index) and read/written with `$queryRaw`. Also store plain `lat`/`lng` floats if it makes the frontend simpler.
- `NatureOfWork` (what the buyer said) maps to `EmploymentType` (what the checklist uses): `EMPLOYED→LOCALLY_EMPLOYED`, `OFW→OFW`, `BUSINESS→SELF_EMPLOYED`, `OTHER→` consultant must choose when converting to client.
- `PaymentMethod.NOT_SURE` is allowed on inquiries but must be resolved before a lead becomes a client.

---

## 7. Module 2 — Marketplace & property management

### 7.1 Public pages (no login)

| Route | Content |
|---|---|
| `/` | Landing: hero search, featured = newest LIVE listings (not admin-picked), how verification works, "List Your Property" CTA |
| `/properties` | Search + filters (type, price range, city/barangay, source, badges, payment method available) + list/map toggle + pagination |
| `/properties/map` | Leaflet map with markers clustered; bbox query via PostGIS |
| `/properties/:slug` | Photos, details, firm name, listing source, badges with tooltips explaining what each badge means *and does not mean*, loan quotations, loan calculator, "Inquire" button |
| `/properties/:slug?ref=CODE` | Same page; referral code stored in sessionStorage-free form state and sent with the inquiry |
| `/consultants/:id` | Name, photo, firm, PRC/DHSUD badges, average rating + count, completed sales count, live listings |
| `/list-your-property` | Seller form → agent picker (all firms) → consent → submit |
| `/rate/:token` | One-time rating form |
| `/about-badges` | Plain-language explanation: badges mean a document was uploaded, read by AI, and reviewed by a licensed broker — **not** a government database check |

Only `status = LIVE` properties of `ACTIVE` firms appear publicly.

### 7.2 Inquiry flow

1. Buyer clicks **Inquire** → form: name, phone, email (optional), nature of work, payment preference, civil status, message, Data Privacy consent.
2. Consultant assignment (server decides, never trust the client):
   - **Referral:** if `ref` maps to an *active* consultant **of the listing's firm** → auto-assign, `source = REFERRAL`, skip picker. If the code is invalid or from another firm, ignore it and fall back to organic.
   - **Individual seller listing:** always assign to `property.assignedAgentId` (no picker).
   - **Organic developer listing:** buyer picks from `GET /public/properties/:id/consultants` (randomized).
3. Creates `Inquiry` (status `NEW`) → appears in consultant's dashboard. Confirmation screen tells the buyer the consultant will contact them; no chat.
4. Basic abuse protection: rate limit per IP (e.g., 5 inquiries / 10 min), honeypot field.

### 7.3 Consultant picker (randomization)

- Pool (developer listing): active `SALES_MANAGER` + `SALES_PERSON` users of the listing's firm. Brokers and CompanyAdmins are excluded. **Decided 2026-11-08 (OPEN-1):** only consultants with at least one broker-approved, unexpired PRC/DHSUD credential appear in either picker.
- Pool (seller's agent picker): same roles across **all active firms**.
- Order: Fisher–Yates shuffle with `crypto.randomInt` on every request. No caching of order. No sort by rating.
- Card shows: photo, name, firm, badges, average rating (or "New"), completed sales.

### 7.4 Loan calculator (client-side + shared util)

Two modes, both pure functions in `packages/shared`:

- **Payment from loan:** `M = P · r(1+r)^n / ((1+r)^n − 1)`, where `r = annualRate/12`, `n = years×12`. If `r = 0`, `M = P/n`.
- **Affordable range from budget:** buyer enters monthly budget `M` (or gross monthly income × max ratio), rate, term, downpayment % →
  `maxLoan = M · ((1+r)^n − 1) / (r(1+r)^n)`; `maxPrice = maxLoan / (1 − dp%)`.
- Default rate/term/income-ratio values are **editable firm settings**, shown as assumptions on screen. Always display "Estimate only — not a loan approval."
- Loan Quotations are the developer's actual breakdowns entered by CompanyAdmin; show them alongside, never overwrite with the calculator.

### 7.5 Firm-side property management (CompanyAdmin)

- CRUD developers → projects → units (Property with `source = DEVELOPER`).
- Upload License to Sell on the project → Module 1 processes → broker approves → `LTS_VERIFIED` badge on all units of that project, `validUntil = ltsExpiresAt`.
- A developer unit can go `LIVE` only if its project's LTS is `APPROVED` and not expired.
- **Decided 2026-11-07:** the CompanyAdmin publishes developer units directly once the project's LTS is broker-approved; individual units don't need a separate broker approval. (Individual seller listings still go through broker review, §7.6.)
- **Decided 2026-11-07:** loan calculator defaults (rate, term, downpayment %, income ratio) are stored on `Firm` and edited by the CompanyAdmin (§6 `Firm.loan*` fields).
- Nightly job (or on-read check for the prototype): LTS expired → listing auto-moves to `SUSPENDED`, badge hidden; warn at 30 days before expiry on admin dashboard.

### 7.6 Individual seller listing flow

```
Seller form → SellerListingRequest(NEW, agent chosen)
 → Agent ACCEPTS (or DECLINES with reason)
 → Agent uploads: land title, tax declaration, RPT receipt, seller valid ID  (DOCUMENTS_IN_PROGRESS)
 → Module 1 processes each document → flags
 → Agent submits for review (SUBMITTED_FOR_REVIEW) → Property created as PENDING_REVIEW / NEEDS_ATTENTION
 → Agent's firm Broker approves → Property LIVE with earned badges   (LISTED)
```

**Decided 2026-11-08 (OPEN-2):** a property without a land title cannot go live. The public form tells an untitled seller that a title is required and does not submit the request; the broker can approve a listing only when its land title, tax declaration, RPT receipt and seller ID are all broker-approved.

**Decided 2026-11-08 (M5 build):**
- Firm endpoints live under `/seller-requests` (§13). Only the chosen agent accepts, declines (reason audited), uploads and submits; CompanyAdmin and Broker read all of the firm's requests.
- One current document per type. A wrong upload is replaced only after the broker rejects it (uploads stay open while the listing is with the broker).
- The agent writes the listing title/description and **must** place the map pin when submitting; the first submit creates the Property, later submits reuse it.
- Broker "send back" (`/reviews/properties/:id/reject`) sets the Property to `REJECTED` and the request back to `DOCUMENTS_IN_PROGRESS`; the agent sees the reason and can resubmit.
- `GET /public/agents` returns all pickable agents, shuffled per request; the page shows 6 at a time.

---

## 8. Module 1 — AI document processing & verification

> **The rule:** AI reads and flags. Broker approves. The pipeline must have no code path that sets `reviewStatus = APPROVED`.

### 8.1 Pipeline

```
upload (multipart) → validate (pdf/jpg/png/webp, ≤ 10 MB) → sha256 → store in Spaces
 → Document(aiStatus=QUEUED) → job runner (in-process queue for prototype)
 → [PDF? rasterize pages at 300 DPI with pdftoppm/pdf-to-img]
 → preprocess (sharp): auto-rotate (EXIF), grayscale, resize so text height ≈ 30px (min width 2000px),
   normalize contrast, slight median denoise, adaptive/threshold binarization; optional deskew
 → Tesseract OCR (eng, psm 3 → fallback psm 6) → text + mean confidence
 → classify document type
 → extract fields (per-type extractor)
 → cross-check against DB
 → produce flags + suggested reviewStatus (NEEDS_ATTENTION or READY_FOR_REVIEW)
 → aiStatus=DONE; update linked checklist item to UPLOADED / NEEDS_ATTENTION
```

- Run OCR off the request thread (simple queue with concurrency 1–2; a `tesseract.js` worker pool is fine). The upload endpoint returns immediately; the UI polls `GET /documents/:id`.
- Failures set `aiStatus = FAILED` with a flag `OCR_FAILED`; a human can still review manually.
- Store OCR text so the broker can see what the AI "read" next to the image.

### 8.2 Classification

Rule-based keyword scoring is enough for the prototype (and explainable for the manuscript):

| Type | Example signals (case-insensitive, fuzzy) |
|---|---|
| LAND_TITLE | "TRANSFER CERTIFICATE OF TITLE", "ORIGINAL CERTIFICATE OF TITLE", "REGISTRY OF DEEDS", "TCT No." |
| TAX_DECLARATION | "TAX DECLARATION OF REAL PROPERTY", "ARP No.", "ASSESSED VALUE", "PROVINCIAL/CITY ASSESSOR" |
| RPT_RECEIPT | "OFFICIAL RECEIPT", "REAL PROPERTY TAX", "BASIC", "SEF", "TREASURER" |
| LICENSE_TO_SELL | "LICENSE TO SELL", "DHSUD" / "HLURB", "PROJECT NAME" |
| PRC_ID | "PROFESSIONAL REGULATION COMMISSION", "REGISTRATION NO.", "REAL ESTATE" |
| DHSUD_CERT | "DEPARTMENT OF HUMAN SETTLEMENTS AND URBAN DEVELOPMENT", "CERTIFICATE OF REGISTRATION" |
| PAYMENT_RECEIPT | "OFFICIAL RECEIPT", "ACKNOWLEDGEMENT RECEIPT", "AMOUNT", "RECEIVED FROM" |
| TRANSMITTAL | "TRANSMITTAL", "COMMISSION", developer name |
| CENOMAR / BIRTH_CERT / MARRIAGE_CONTRACT | "PHILIPPINE STATISTICS AUTHORITY", "CERTIFICATE OF NO MARRIAGE", "CERTIFICATE OF LIVE BIRTH", "CERTIFICATE OF MARRIAGE" |
| PAYSLIP / COE / ITR / … | "PAYSLIP", "NET PAY"; "CERTIFICATE OF EMPLOYMENT"; "BIR FORM 2316/1700/1701" |

Score = weighted matches; top score ≥ threshold → `detectedType`, else `UNKNOWN`. If `detectedType ≠ declaredType` → flag `TYPE_MISMATCH`.

### 8.3 Extraction & cross-checks

Each extractor returns `{ field: { value, confidence } }`. Confidence is a mix of OCR word confidence and whether the regex anchor was found. Fields below threshold produce `LOW_CONFIDENCE` flags rather than silent nulls.

**Stage 1 — Listing verification (individual seller)**

| Document | Extract | Cross-check → flag |
|---|---|---|
| Land title | owner name(s), title no., lot no., lot area (sqm), annotations / memorandum of encumbrances text | owner ≈ seller name (`OWNER_MISMATCH`); encumbrance keywords present ("MORTGAGE", "LIS PENDENS", "ADVERSE CLAIM", "LEVY", "ATTACHMENT") without a matching "CANCELLED/CANCELLATION" entry (`ENCUMBRANCE_FOUND`) |
| Tax declaration | owner, TD/ARP no., lot area, improvements, assessed value | lot area ≈ title lot area within tolerance (`AREA_MISMATCH`); owner ≈ title owner (`OWNER_MISMATCH`) |
| RPT receipt | OR no., payment date, amount, period/year covered | covered year ≥ current year (or current quarter for quarterly payers) → else `TAX_DELINQUENT` |
| Seller valid ID | name, ID no., expiry if present | name ≈ title owner (`OWNER_MISMATCH`); expired (`ID_EXPIRED`) |

**Stage 1 — Developer listing**

| Document | Extract | Cross-check → flag |
|---|---|---|
| License to Sell | LTS no., project name, developer name, issue/expiry date | expired (`LTS_EXPIRED`); expires ≤ 90 days (`LTS_EXPIRING_SOON`); project/developer name ≈ record (`PROJECT_MISMATCH`) |

**Consultant credentials**

| Document | Extract | Cross-check → flag |
|---|---|---|
| PRC ID / DHSUD certificate | name, number, expiry | name ≈ consultant (`NAME_MISMATCH`); number = number typed by admin (`NUMBER_MISMATCH`); expired (`CREDENTIAL_EXPIRED`) |

**Stage 2 — Buyer documents:** classify → match to an open checklist item for that client → extract name → name ≈ client (or spouse/representative) → set item `UPLOADED` (clean) or `NEEDS_ATTENTION`. Broker verification moves it to `VERIFIED`.

**Payment receipts:** extract amount, date, OR no. → pre-fill the Payment form; the uploader **confirms** the amount before the payment counts. Flag `DUPLICATE_RECEIPT` if same OR no. or same file hash already exists in the firm.

**Transmittal:** extract amount + client/unit reference → compare to tranche amount → flag `AMOUNT_MISMATCH` if difference > ₱1.

### 8.4 Flags and output

```ts
type DocFlag = {
  code: 'OWNER_MISMATCH' | 'AREA_MISMATCH' | 'ENCUMBRANCE_FOUND' | 'TAX_DELINQUENT'
      | 'LTS_EXPIRED' | 'LTS_EXPIRING_SOON' | 'PROJECT_MISMATCH' | 'NAME_MISMATCH'
      | 'NUMBER_MISMATCH' | 'CREDENTIAL_EXPIRED' | 'ID_EXPIRED' | 'TYPE_MISMATCH'
      | 'LOW_CONFIDENCE' | 'DUPLICATE_RECEIPT' | 'DUPLICATE_FILE' | 'AMOUNT_MISMATCH'
      | 'OCR_FAILED';
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  message: string;          // human-readable, e.g. "Seller name 'Juan Dela Cruz' doesn't match title owner 'Juana Dela Cruz' (82% match)"
  evidence?: { field: string; found: string; expected?: string };
};
```

Summary shown to broker: **"Ready for review"** (no BLOCKER/WARNING) or **"Needs attention: <first flag message> (+N more)"**.

### 8.5 Name matching

Normalize (uppercase, strip accents/punctuation, remove honorifics and suffix noise, collapse spaces, handle "SURNAME, GIVEN MIDDLE" ordering) → token-set comparison + Jaro–Winkler. `≥ 0.92` match, `0.80–0.92` WARNING, `< 0.80` BLOCKER. Thresholds live in config.

### 8.6 Broker review screen

Side-by-side: document image (zoomable) | OCR text | extracted fields (editable by broker, edits logged) | flags. Actions: **Approve** / **Reject (reason required)**. Approve on a document with BLOCKER flags requires an override note. All actions audited.

### 8.7 Badges

| Badge | Granted when (broker approval of) | Expires |
|---|---|---|
| PRC Verified | PRC credential, unexpired | credential expiry |
| DHSUD Registered | DHSUD credential, unexpired | credential expiry |
| Ownership Verified | Title + seller ID with owner match | — |
| License to Sell Verified | Project LTS | LTS expiry |
| Tax Payments Current | RPT receipt covering current period | end of covered period |
| Title Clean | Title with no uncancelled encumbrances | — |

Expired badges are hidden automatically (computed on read).

**Decided 2026-11-08 (M4 build):**
- Flag severities: BLOCKER = `NAME_MISMATCH`/`OWNER_MISMATCH` below 0.80, `TYPE_MISMATCH` to another known type, `LTS_EXPIRED`, `CREDENTIAL_EXPIRED`, `ID_EXPIRED`. INFO = `LTS_EXPIRING_SOON`. Everything else is WARNING. Thresholds live in `apps/api/src/modules/docai/config.ts`.
- Badges are recomputed from the broker-approved documents' final (broker-corrected) field values after every decision. Approving a flagged document with an override note does **not** grant a badge the facts don't support (e.g. owner mismatch → no Ownership Verified).
- License to Sell upload: `POST /catalog/projects/:id/lts`, one pending upload per project. A renewal doesn't touch the currently approved license until the broker approves it; approval sets `ltsNumber`/`ltsExpiresAt` from the confirmed fields and grants `LTS_VERIFIED` to every unit.
- Broker review of non-credential documents: `GET /reviews/documents/:id`, `POST /reviews/documents/:id/approve` (optional `fields` corrections, audited with the AI's original reading) and `/reject`.
- Seed: undecided demo documents are left `QUEUED`; the API reads them with Module 1 on start-up.
- §8.8 evaluation: `pnpm --filter api docai:samples` renders the labeled mock set to `apps/api/prisma/seed-docs/samples/`; `pnpm --filter api docai:eval` scores it and writes `apps/api/src/modules/docai/eval/results.md`.

### 8.8 Module 1 accuracy evaluation (for Chapter 4)

Keep a `docai/eval/` folder with labeled sample documents (redacted / mock — **no real personal data in the repo**) and a script that reports per-type classification accuracy and per-field extraction accuracy. This gives measurable results for the manuscript.

---

## 9. Requirements checklist engine

Inputs: `paymentMethod × civilStatus × employmentType`. Output: list of `RequirementItem` rows. Generated when the lead becomes a client; **regenerated** (preserving already-uploaded items) if any input changes.

### 9.1 Base rules

- **Reservation stage (everyone):** `VALID_ID_1`, `VALID_ID_2` (buyer).
- **Civil status (all payment methods except CASH-only IDs case — see below):**
  - SINGLE → `CENOMAR`
  - MARRIED → `MARRIAGE_CONTRACT` + spouse `VALID_ID_1`, `VALID_ID_2`
  - SEPARATED → `ANNULMENT_DECREE` (or court decision)
  - *Applied for DEFERRED_CASH, IN_HOUSE, BANK, PAG_IBIG.* **Decided 2026-11-08 (OPEN-4):** every method except spot CASH needs civil-status documents; CASH needs only the buyer's 2 valid IDs.

| Payment method | Financing-stage items |
|---|---|
| CASH | none beyond 2 valid IDs |
| DEFERRED_CASH | 2 IDs + income documents (`PROOF_OF_INCOME`: COE/payslips for employed, ITR/permit for business, contract for OFW) |
| IN_HOUSE | 2 IDs + income documents (less strict: 1 proof of income accepted) |
| BANK / PAG_IBIG | full set by employment type (below) |

### 9.2 BANK / PAG-IBIG sets

**Common to all employment types:** 2 valid IDs (buyer; + spouse if married), birth certificate (buyer; + spouse if married), marriage contract (married) / CENOMAR (single), proof of billing address, verified TIN (BIR Form 1904 / TIN verification slip), (2) 2×2 photo white background.

| Locally employed | Self-employed / business | OFW |
|---|---|---|
| Certificate of Employment w/ compensation | ITR (last 2 years) | COE / employment contract / salary certificate |
| Payslips (last 3 months) | Audited financial statements (last 2 years) | Payslips (3 months) or payroll bank statements |
| ITR | Bank statements (last 6 months) | Special Power of Attorney (7 notarized / 3 consularized) |
| | DTI registration / business clearance | Passport w/ entry & exit stamps |
| | Mayor's permit | Seaman's book (if seafarer — optional flag) |
| | Picture of business establishment | 2 valid IDs of authorized representative |

**Pag-IBIG additions:** (4) 1×1 photo, ESAV, and — for locally employed — Virtual Pag-IBIG account.

### 9.3 Implementation

- Encode the rules as data (`requirements.rules.ts`), not nested `if`s, so it's testable and printable for the manuscript.
- Every item is tagged `stage = RESERVATION | FINANCING`.
- Snapshot test: every combination of (5 payment methods × 3 civil statuses × 3 employment types) produces the expected item codes.

**Decided 2026-11-08 (M7 build):**
- Rules live in `apps/api/src/modules/clients/requirements.rules.ts`; the 45-combination table is the snapshot in `__snapshots__/requirements.test.ts.snap`. Civil-status documents are FINANCING stage; the two buyer IDs are RESERVATION stage. Spouse and representative items share the buyer's codes with `appliesTo` = SPOUSE / REPRESENTATIVE. The seaman's book is listed but optional.
- Conversion is two steps: `POST /inquiries/:id/receipt` (Module 1 reads amount and date) → `POST /inquiries/:id/convert` (consultant confirms them; creates Client, confirmed RESERVATION Payment and checklist; lead → RESERVED). `saleType` follows the listing source. Commission and tranches are created in M8.
- Other payments: `POST /clients/:id/payments` creates an **unconfirmed** Payment from the receipt; it counts only after `POST /payments/:id/confirm`. A receipt whose OR/AR number was already used in the firm raises `DUPLICATE_RECEIPT` (BLOCKER) and cannot be confirmed. Receipts don't go to the broker's queue.
- Buyer documents: Module 1 checks the type and, for the buyer's own items, the name (`NAME_MISMATCH`); spouse/representative names aren't recorded, so theirs aren't compared. Broker approval → item `VERIFIED`; rejection → item `MISSING` for a new upload. Re-uploading replaces an unverified copy. Only a Broker may waive an item (reason audited).
- Regeneration (§9) removes untouched items that no longer apply and keeps uploaded/verified/waived ones as "no longer required".

---

## 10. Module 3 — Sales, client & commission management

### 10.1 Lead → client lifecycle

```
Inquiry NEW → CONTACTED → QUALIFIED → VISIT_SCHEDULED → RESERVED (becomes Client)
                                                       ↘ LOST (reason)
```

Converting to a client requires: reservation payment recorded (with proof), `paymentMethod ≠ NOT_SURE`, `employmentType` set if BANK/PAG_IBIG, TCP, sale type. Conversion creates: `Client`, checklist items, `Commission` + tranches (from template + split snapshot).

### 10.2 Commission computation

```
grossCommission = TCP × template.grossRatePct / 100
trancheAmount_i = grossCommission × tranche_i.sharePct / 100   (round to centavo; put rounding remainder on last tranche)
```

Split (from `CommissionSplitConfig`, snapshotted at conversion):

| Handled by | Broker | Sales Manager | Sales Person |
|---|---|---|---|
| Sales Manager | brokerPct | salesManagerPct | 0 |
| Sales Person | brokerPct | salesManagerPct (their manager **always** gets a cut) | salesPersonPct |

- Split depends on **who handles the client**, not on organic vs referral.
- Percentages are firm-configured; the seed uses placeholders only. **[OPEN-5]** get Advench's real split and gross rates.
- Deductions: **Decided 2026-11-08 (OPEN-6):** a fixed withholding % (`Firm.withholdingPct`, CompanyAdmin setting; seed placeholder 5%) is computed on each person's share automatically; the broker can add more deduction lines. Not a tax engine.

### 10.3 Milestone templates (seed data — editable per firm)

| Developer / case | Payment method | Tranches |
|---|---|---|
| Any developer | CASH | 20% `FULL_PAYMENT`* (advance), 80% `FULL_PAYMENT` (+ transmittal) |
| Private sale | CASH (spot) | 100% `FULL_PAYMENT`, no transmittal |
| Any | IN_HOUSE | 100% `TCP_PERCENT_PAID` 50 |
| Any | DEFERRED_CASH | 100% `TCP_PERCENT_PAID` 50 |
| Vista Land (Camella) | BANK / PAG_IBIG | 30% `DP_PERCENT_PAID` X₁, 30% `DP_PERCENT_PAID` X₂, 30% `DP_FULLY_PAID`, 10% `LOAN_RELEASED` (retention) |
| St. Andrew | BANK / PAG_IBIG | same as Vista Land |
| Parkview | BANK / PAG_IBIG | 20% first DP milestone, 80% `DP_FULLY_PAID` |
| Futura | any | `MONTHLY` — one tranche per month of payment received while docs complete |

\* "Advance: 20%" — **Decided 2026-11-08 (OPEN-7):** triggered by **full cash payment** (`FULL_PAYMENT`), together with the 80%. **Decided (OPEN-8):** X₁ = 30%, X₂ = 60% of the downpayment and Parkview's first milestone = 50% of DP are **placeholders** in the seed, editable per template by the CompanyAdmin.

### 10.4 Tranche state machine (the two gates)

```
                       payment milestone reached?
WAITING ────────────── yes ──────────────► docs for requiredStage all VERIFIED/WAIVED?
   ▲                                          │ no  → BLOCKED   (re-evaluates on every doc verify)
   │                                          │ yes ↓
   │                     template.requiresTransmittal?
   │                          │ yes → AWAITING_TRANSMITTAL (awaitingSince = now; aging shown)
   │                          │        └─ transmittal uploaded + AI amount check + admin confirm ↓
   │                          │ no  ↓
   │                     READY_FOR_RELEASE
   │                          └─ broker creates voucher → broker signs → each payee consultant signs ↓
   │                     RELEASED (money handed over OUTSIDE the system)
```

- Re-evaluate a client's tranches whenever: a payment is confirmed, a requirement item changes status, a transmittal is confirmed.
- "Docs complete" = every `required` item with `stage ≤ tranche.requiredStage` is `VERIFIED` or `WAIVED` (waive requires broker + reason).
- **Payment done, docs missing → BLOCKED. Docs complete, payment not done → WAITING.**
- Statuses only move forward, except: a requirement item reverting from VERIFIED (e.g., broker rejects a re-upload) moves an un-vouchered tranche back to BLOCKED. Vouchered/RELEASED tranches never move back.
- Paid-% calculations use confirmed `Payment` rows only.

### 10.5 Vouchers & e-signatures

- Broker creates a voucher for a `READY_FOR_RELEASE` tranche: property, client, milestone/tranche, gross, per-person breakdown, deductions, net.
- Signature = authenticated user action + typed full name (+ optional drawn signature image), storing timestamp, IP, user agent, and `contentHash`. Any edit after a signature invalidates signatures (hash mismatch).
- Order enforced: **broker signs first**, then each payee consultant (manager, salesperson). All signed → `RELEASED`.
- This is a simple electronic signature for record-keeping, not a certified digital signature.

### 10.6 Dashboards

- **CompanyAdmin:** pipeline counts by lead/client status, filter by consultant/status/payment method; monthly sales summary (count + total TCP of clients reserved that month); active deals; visit calendar; activity log.
- **Broker:** approval queue (listings, documents, credentials) sorted oldest first with flag summaries; commissions by status; awaiting-transmittal list with aging buckets (0–30, 31–60, 61–90, 90+ days); expected payouts; team performance; audit trail.
- **Sales Manager:** My Team (per salesperson: leads, clients, reserved this month), My Clients, My Commissions, referral link + referral leads, visits.
- **Sales Person:** My Clients (checklist progress %, milestone progress), My Commissions, referral link + leads, visits.

### 10.7 Referral links

- Format: `https://<host>/properties/<slug>?ref=<CODE>`. Codes: 5–6 uppercase alphanumerics, unique, generated at account creation (e.g., from initials + random suffix), regenerable by CompanyAdmin.
- "Copy link" button on every property card in the consultant dashboard (own firm's listings only — a consultant's referral to another firm's listing is ignored per §7.2).

### 10.8 Visits

- Consultant creates a visit (property + inquiry/client + date/time + notes) → `PENDING`.
- CompanyAdmin: `APPROVED` / `DECLINED` (reason).
- Consultant after the date: `COMPLETED` / `NO_SHOW`. Either side can `CANCELLED`. Reschedule = mark old `RESCHEDULED`, create new `PENDING` with `rescheduledFromId`.
- Visibility: Admin all, Broker all read-only, Manager their team, Person own.
- Calendar (month/week) + list view. Basic clash warning: same consultant within 1 hour.

**Decided 2026-11-08 (M6 build):**
- Routing order: an individual seller's listing **always** goes to the seller's chosen agent, even with a referral link (§7.2 "always"); otherwise a valid referral (active consultant of the listing's firm) wins; otherwise the buyer picks from the verified, shuffled pool. `GET /public/properties/:id/consultants?ref=` tells the page which case applies; the server re-decides on submit.
- A referral code only needs an **active** consultant of the listing firm (OPEN-1 governs the pickers, not shared links).
- Lead "lost" reasons and visit decline reasons are kept in the audit log / `Visit.declineReason`; no schema change. `RESERVED` is set only by client conversion (M7).
- Approving a visit moves its lead to `VISIT_SCHEDULED` if it wasn't further along. Clash warnings never block a request.
- Referral codes regenerated by the CompanyAdmin are initials + 4 characters without look-alikes (`POST /users/:id/referral-code`); existing seeded codes keep their older format.
- The calendar is a month view with a day list (no week view yet).

---

## 11. Closing & transfer (no AI)

Computation helper (all rates **configurable per firm**; show "estimate — verify with BIR/LGU"):

| Item | Default basis | Default rate | Usually paid by |
|---|---|---|---|
| Capital Gains Tax | selling price* | 6% | Seller |
| Documentary Stamp Tax | selling price* | 1.5% | Buyer (negotiable) |
| Local transfer tax | selling price* | 0.5% (verify Naga City rate) | Buyer |
| Registration fee | Registry of Deeds schedule | manual entry | Buyer |

\* BIR uses the **higher** of selling price, zonal value, or assessor's FMV. Zonal value is out of scope, so the prototype computes on selling price and allows a manual "tax base" override with a visible note.

Closing checklist (consultant ticks, timestamps logged): deed of sale signed, CGT/DST paid, tax clearance / eCAR obtained, transfer tax paid, title transferred, new tax declaration issued, keys turned over. Marking all done → client `COMPLETED` → generates a rating link.

---

## 12. Ratings

- Buyers have no accounts, so ratings use a **one-time token link** created when a client reaches `COMPLETED`. The consultant/admin copies and sends it offline (or it's emailed if the buyer gave an email). Token is hashed in the DB, expires in 30 days, single use.
- 1–5 stars + optional comment. One rating per completed client.
- Profile and picker show average (1 decimal) and count; under 1 rating → "New".

---

## 13. API surface

Base `/api/v1`. JSON. Errors: `{ error: { code, message, details? } }`. Pagination: `?page=&pageSize=` → `{ data, page, pageSize, total }`.

**Public (no auth, rate limited)**
```
GET  /public/properties?type=&minPrice=&maxPrice=&city=&source=&badge=&bbox=&page=
GET  /public/properties/:slug
GET  /public/properties/:id/consultants        # randomized pool
GET  /public/consultants/:id
GET  /public/agents?page=                       # seller's agent picker, all firms, randomized
POST /public/inquiries
POST /public/seller-requests                    # multipart (photos)
GET  /public/ratings/:token   POST /public/ratings/:token
```

**Auth**
```
POST /auth/login   POST /auth/logout   GET /auth/me   POST /auth/change-password
```

**SuperAdmin**
```
GET/POST /admin/firms   PATCH /admin/firms/:id (status)   POST /admin/firms/:id/company-admin   GET /admin/logs
```

**Firm (auth + tenant scope; role checks per §5.2)**
```
users:        GET/POST /users  PATCH /users/:id  POST /users/:id/credentials (multipart)
developers:   GET/POST /developers  PATCH /developers/:id
projects:     GET/POST /projects  PATCH /projects/:id  POST /projects/:id/lts (multipart)
properties:   GET/POST /properties  PATCH /properties/:id  POST /properties/:id/photos  POST /properties/:id/submit
quotations:   GET/POST /properties/:id/quotations  PATCH/DELETE /quotations/:id
seller-req:   GET /seller-requests  POST /seller-requests/:id/accept|decline  POST /seller-requests/:id/documents  POST /seller-requests/:id/submit
inquiries:    GET /inquiries  PATCH /inquiries/:id (status)  POST /inquiries/:id/convert
clients:      GET /clients  GET /clients/:id  PATCH /clients/:id
payments:     POST /clients/:id/payments (proof upload → AI prefill)  POST /payments/:id/confirm
requirements: GET /clients/:id/requirements  POST /requirements/:id/documents  POST /requirements/:id/waive
documents:    GET /documents/:id  GET /documents/:id/url (pre-signed)
reviews:      GET /reviews/queue  POST /reviews/documents/:id/approve|reject  POST /reviews/properties/:id/approve|reject  POST /reviews/credentials/:id/approve|reject
commissions:  GET /commissions  GET /commissions/:id  POST /tranches/:id/transmittal  POST /tranches/:id/transmittal/confirm
vouchers:     POST /tranches/:id/voucher  GET /vouchers/:id  POST /vouchers/:id/sign
settings:     GET/PUT /settings/commission-splits  GET/POST/PUT /settings/commission-templates  GET/PUT /settings/firm (loan calc defaults, closing rates)
visits:       GET /visits?from=&to=  POST /visits  PATCH /visits/:id (status)
closing:      GET/PUT /clients/:id/closing
reports:      GET /reports/summary?month=  GET /reports/pipeline
audit:        GET /audit?entityType=&entityId=
```

---

## 14. Security, privacy, quality

- **Data Privacy Act (RA 10173):** consent checkbox on every public form with a link to a privacy notice; collect only listed fields; documents private by default; pre-signed URLs; no PII in logs; seed/demo data is fictional.
- Auth: argon2id, httpOnly + `SameSite=Lax` + `Secure` cookies, CSRF protection for cookie auth (double-submit token or `SameSite=Strict` on mutating routes), login rate limit + lockout after repeated failures, inactive users and suspended firms cannot log in.
- Input validation with Zod on every route; file type checked by magic bytes, not extension; size limits.
- `helmet`, CORS restricted to the web origin, parameterized queries only (`$queryRaw` with tagged templates — never string concatenation).
- **Required tests:**
  - tenant isolation: a user of Firm A gets 404 for every Firm B resource type;
  - role matrix: each forbidden cell in §5.2 returns 403/404;
  - "AI never approves": docai service has no path producing `APPROVED`;
  - checklist snapshot tests (§9.3);
  - commission math + state machine (WAITING/BLOCKED/AWAITING/READY/RELEASED transitions, rounding);
  - randomizer: consultant order varies across calls and never includes other firms or inactive users;
  - loan calculator formulas, including `r = 0`.
- Quality targets mapped to ISO/IEC 25010 (for Chapter 4 evaluation): functional suitability (features above), usability (mobile-responsive, Lighthouse accessibility ≥ 90 on public pages), reliability (OCR failure never blocks manual review), performance (public list page < 2 s on 4G for 20 listings; OCR of one page < 30 s), security (tests above).

---

## 15. Build plan (milestones)

Each milestone ends with: lint + typecheck + tests pass, seed runs, acceptance criteria verified.

| # | Milestone | Owner(s) | Acceptance criteria |
|---|---|---|---|
| M0 | Repo scaffold, Docker (Postgres+PostGIS, MinIO), Prisma schema + migrations, seed, CI scripts | All | `pnpm dev` runs web + api; `pnpm db:seed` loads demo firm |
| M1 | Auth, roles, tenant scope middleware, audit log, layout per role | All | Each seeded user lands on correct dashboard; isolation tests pass |
| M2 | Consultants & hierarchy, credential upload (stub AI) | Jerome / Jann | Admin creates SP under SM under Broker; credential appears in broker queue |
| M3 | Developers/projects/units, photos, loan quotations; public marketplace list, detail, map, loan calculator | Sean | Live seeded listings searchable and on map; calculator matches test vectors |
| M4 | Document pipeline: upload → storage → preprocess → OCR → classify → extract → flags; broker review screen; badges | Jann | Sample LTS, title, tax dec, RPT receipt, PRC ID produce expected fields/flags; approve grants badge |
| M5 | Seller "List Your Property" + agent picker + seller-request workflow → broker approval → live | Sean / Jann | End-to-end seller listing goes live with earned badges |
| M6 | Inquiries (organic + referral + seller-agent routing), randomized picker, leads dashboard, visits | Sean / Jerome | Referral link auto-assigns; organic shows randomized same-firm pool; visit approve/decline works |
| M7 | Lead → client conversion, checklist engine, buyer document upload via Module 1, payments with receipt prefill | Jerome / Jann | Checklist matches §9 for all combos; receipt amount prefilled and confirmed |
| M8 | Commission templates & splits, tranche state machine, transmittal + aging, vouchers + signatures | Jerome | Scenario tests: cash dev sale, in-house 50%, Camella 30/30/30/10, private spot cash |
| M9 | Closing computation + checklist, ratings via token, reports, polish, responsive QA | All | Full demo script (§17) runs without manual DB edits |

---

## 16. Open questions (decide, then update this spec)

| ID | Question |
|---|---|
| OPEN-1 | ~~Should consultants without an approved PRC/DHSUD credential appear in the pickers?~~ **Decided 2026-11-08: no, hidden** (§7.3). |
| OPEN-2 | ~~Can an individual seller property without a title go live?~~ **Decided 2026-11-08: no** (§7.6). |
| OPEN-3 | ~~Who verifies buyer documents?~~ **Decided 2026-11-08: Broker only** (§5.2). |
| OPEN-4 | ~~Civil-status documents for CASH / IN_HOUSE?~~ **Decided 2026-11-08: all methods except CASH** (§9.1). |
| OPEN-5 | Advench's actual commission split % (Broker/SM/SP) and gross commission rate per developer. |
| OPEN-6 | ~~Deductions computed or manual?~~ **Decided 2026-11-08: fixed withholding % computed automatically, plus manual lines** (§10.2). |
| OPEN-7 | ~~20% advance trigger?~~ **Decided 2026-11-08: full cash payment** (§10.3). |
| OPEN-8 | DP thresholds — **placeholders seeded (30/60, Parkview 50)**, still to be confirmed with Advench (§10.3). |
| OPEN-9 | Who marks a client `COMPLETED` (consultant, admin, broker)? This triggers the rating link. |
| OPEN-10 | Should "completed sales" on a profile count only TrustListo-recorded deals, or allow admin-entered historical counts? |

---

## 17. Seed data & demo script

**Seed (fictional people, real-sounding structure):**
- SuperAdmin: `superadmin@trustlisto.test`
- Firm 1: **Advench Realty** (pilot) — 1 CompanyAdmin, 2 Brokers, 3 Sales Managers, 6 Sales Persons (subset of real headcount is enough), each with PRC/DHSUD credentials in mixed states (approved, pending, expired).
- Firm 2: a fictional second firm (e.g., "Bicol Prime Realty") with 1 admin, 1 broker, 1 SM, 2 SP and a few listings — **needed to prove tenant isolation and the shared marketplace**.
- Developers for Advench: Vista Land (Camella), St. Andrew, Parkview, Futura — each with one project in/near Naga City, valid LTS (one expiring within 60 days), 3–5 units, loan quotations.
- 2 individual seller listings (one clean, one with an `OWNER_MISMATCH` flag pending review).
- Commission templates per §10.3 with placeholder percentages; split config placeholder (e.g., SP-handled 20/20/60, SM-handled 30/70/0 — **placeholders only**).
- Inquiries, clients in each commission status, visits in each status.
- All passwords `Password123!` in dev only; seeding refuses to run when `NODE_ENV=production`.
- Sample documents for Module 1 in `apps/api/prisma/seed-docs/` — **mock documents only**, never real IDs or titles.

**Demo script (for panel defense):**
1. Buyer browses marketplace (both firms visible), filters by badge, opens a Camella unit, checks loan quotation + calculator.
2. Buyer inquires → randomized Advench-only picker → lead appears in that salesperson's dashboard.
3. Salesperson shares referral link → second buyer inquires → auto-assigned.
4. Salesperson schedules visit → CompanyAdmin approves.
5. Lead converted to client (Pag-IBIG, married, OFW) → checklist auto-generated.
6. Salesperson uploads a receipt → amount prefilled → milestone reached → tranche **BLOCKED** (docs missing).
7. Uploads documents → AI flags a name mismatch on one → broker reviews → tranche moves to **AWAITING TRANSMITTAL** with aging.
8. Admin uploads transmittal → AI amount check → **READY FOR RELEASE** → broker creates & signs voucher → SP and SM sign → **RELEASED**.
9. Seller submits "List Your Property", picks an agent from Firm 2 → agent uploads title/tax docs → AI flags → Firm 2 broker approves → listing live with badges.
10. Log in as Firm 2 user → cannot see any Advench client or commission. SuperAdmin → sees firms, not their data.

---

## 18. Environment variables (`.env.example`)

```
NODE_ENV=development
PORT=4000
WEB_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://trustlisto:trustlisto@localhost:5432/trustlisto
JWT_SECRET=change-me
JWT_EXPIRES_IN=8h
S3_ENDPOINT=http://localhost:9000          # DO Spaces: https://sgp1.digitaloceanspaces.com
S3_REGION=us-east-1                        # DO Spaces: sgp1
S3_BUCKET=trustlisto-dev
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true                   # true for MinIO, false for Spaces
UPLOAD_MAX_MB=10
OCR_LANG=eng
OCR_CONCURRENCY=1
NAME_MATCH_OK=0.92
NAME_MATCH_WARN=0.80
```

---

## 19. Glossary

- **TCP** — Total Contract Price.
- **DP** — Downpayment (often paid monthly over a term before loan takeout).
- **LTS** — License to Sell, issued by DHSUD (formerly HLURB) for a subdivision/condo project.
- **TCT / OCT** — Transfer / Original Certificate of Title, from the Registry of Deeds.
- **Tax Declaration** — Assessor's record of a property's classification and assessed value.
- **RPT** — Real Property Tax, paid to the City/Municipal Treasurer.
- **Transmittal** — Developer document confirming a commission tranche is due to the firm.
- **Retention** — Final commission tranche held until bank/Pag-IBIG loan release.
- **CENOMAR** — Certificate of No Marriage (PSA).
- **ESAV** — Pag-IBIG Employee's Statement of Accumulated Value.
- **SPA** — Special Power of Attorney (OFW buyers' representative).
- **Co-broke** — Two firms splitting one commission (not supported).
