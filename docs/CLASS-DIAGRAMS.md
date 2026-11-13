# TrustListo — Class Diagrams (UML)

A drawing guide for the Chapter 3 class diagrams, in the style of the sample (three-part class boxes,
association lines with multiplicities at both ends, dashed dependencies). There is **one class
diagram per module**, matching the use case, activity and sequence diagrams.

Every class, attribute and multiplicity was checked against the real system (the database model
`apps/api/prisma/schema.prisma` and the server rules) on 2026-11-13.

Captions:

- *Figure #: Class Diagram of TrustListo — Module 1: AI Document Processing and Verification*
- *Figure #: Class Diagram of TrustListo — Module 2: Marketplace and Property Management*
- *Figure #: Class Diagram of TrustListo — Module 3: Sales, Client and Commission Management*

---

## Part 1. Notation

### The class box (three parts)

```
┌──────────────────────────────┐
│          ClassName           │  ← name (bold, centered); «control» or «enumeration» above it if any
├──────────────────────────────┤
│ - attributeName: Type        │  ← attributes
├──────────────────────────────┤
│ + operationName(param): Type │  ← operations (what the class does)
└──────────────────────────────┘
```

- `-` means **private** (an attribute is changed only through the class's operations), and `+`
  means **public**. This is the usual OO rule. If your professor prefers the sample's style, writing
  `+` on the attributes too is fine; just be consistent.
- **Foreign keys are not attributes in a class diagram.** A link such as `Credential.userId`
  becomes an association **line** between Credential and User. That is why you won't see `firmId`,
  `userId` etc. in the boxes (they are in the ERD).
- Types: `String`, `Integer`, `Decimal`, `Boolean`, `Date` (date and time), `GeoPoint` (map pin),
  and the named types and enumerations listed in Part 5.

### Relationships

| Relationship | Draw it as | Example |
|---|---|---|
| **Association** | Solid line; multiplicity at **both** ends; a short label (verb) in the middle | `SalesConsultant 1 —— handles —— * Inquiry` |
| **Composition** | Solid line with a **filled diamond** at the whole | `Property ◆—— * PropertyPhoto` (photos can't exist without the property) |
| **Generalization** | Solid line with a **hollow triangle** at the parent | `Broker ——▷ User` |
| **Dependency** | **Dashed** arrow, open head, label in guillemets | `DocumentAI ┄┄«reads»┄┄> Document` |

Multiplicity: `1` exactly one · `0..1` zero or one · `*` zero or many · `1..*` one or many.

**Reference copies (`*`).** As in the ERD, a class shown in full in another module is drawn as a
small gray box with only its name followed by `*` (e.g. **Document\***), and drawn again where
needed so lines don't cross. Add under each figure: *"Classes marked \* are shown in full in another
module or are drawn twice to avoid crossing lines."*

**Firm ownership.** Every class except User's subclasses, PropertyPhoto, PropertyBadge,
LoanQuotation, CommissionTemplateTranche, VoucherLine, Signature and Rating belongs to one Firm.
That one link is drawn only in Module 1 (Firm—User, Firm—AuditLog). Add under Modules 2 and 3:
*"Every class belongs to one Firm (see Module 1)."*

### What changed from the old diagram (the sample)

| Old | Correct | Why |
|---|---|---|
| CommissionCheck class | **Removed** | The system never moves money or issues checks. "Released" only records a payout made outside the system |
| Voucher status Pending / Approved / Released | **CommissionTranche.status:** Waiting, Blocked, Awaiting Transmittal, Ready for Release, Released | The real statuses. The voucher has no status of its own; it has signatures and a released date |
| Payment status Pending / Verified | **Payment** is confirmed by the consultant (`confirmedBy`), not "verified" | Only documents are verified by the Broker |
| ESignature as a separate class linked to Sales Person | **Signature** inside **CommissionVoucher** (composition), for the Broker and each consultant | Signatures belong to one voucher and are cancelled if the voucher is edited |
| "Sales Person & Sales Manager" and "Sales Consultant" as two unrelated classes | **SalesConsultant** with subclasses **SalesManager** and **SalesPerson** | Generalization |
| `approvedBy: BrokerID` attribute | An association line to **Broker** | Foreign keys are lines, not attributes |

---

## Part 2. Module 1: AI Document Processing and Verification

### Classes (14)

**Firm**

| Attributes | Operations |
|---|---|
| - name: String<br>- slug: String<br>- address: String<br>- logoKey: String<br>- status: FirmStatus<br>- loanRatePct: Decimal<br>- loanTermYears: Integer<br>- loanDownpaymentPct: Decimal<br>- loanIncomeRatioPct: Decimal<br>- withholdingPct: Decimal<br>- cgtRatePct: Decimal<br>- dstRatePct: Decimal<br>- transferTaxRatePct: Decimal<br>- createdAt: Date | + updateSettings(loanDefaults, withholdingPct, closingRates): void<br>+ suspend(): void *(Planned)*<br>+ activate(): void *(Planned)* |

**User** *(abstract; write the name in italics)*

| Attributes | Operations |
|---|---|
| - email: String<br>- passwordHash: String<br>- firstName: String<br>- lastName: String<br>- phone: String<br>- photoKey: String<br>- isActive: Boolean<br>- createdAt: Date | + logIn(email, password): Session<br>+ logOut(): void<br>+ changePassword(currentPassword, newPassword): void<br>+ fullName(): String |

**SuperAdmin** (subclass of User)

| Attributes | Operations |
|---|---|
| — | + viewFirms(): Firm[]<br>+ viewPlatformLogs(page): AuditLog[] *(screen Planned)* |

**CompanyAdmin** (subclass of User)

| Attributes | Operations |
|---|---|
| — | + addConsultant(role, firstName, lastName, email, phone, supervisor): String *(returns the temporary password)*<br>+ updateConsultant(user, changes): void<br>+ deactivateConsultant(user): void |

**Broker** (subclass of User)

| Attributes | Operations |
|---|---|
| - referralCode: String<br>- bio: String | + viewReviewQueue(): Document[] |

**SalesConsultant** *(abstract)* (subclass of User)

| Attributes | Operations |
|---|---|
| - referralCode: String<br>- bio: String | + referralLink(): String |

**SalesManager** (subclass of SalesConsultant)

| Attributes | Operations |
|---|---|
| — | + viewTeamReport(month): Report |

**SalesPerson** (subclass of SalesConsultant)

| Attributes | Operations |
|---|---|
| — | — |

**Credential**

| Attributes | Operations |
|---|---|
| - type: CredentialType<br>- numberEntered: String<br>- expiresAt: Date<br>- status: ReviewStatus<br>- reviewedAt: Date<br>- rejectReason: String | + approve(expiresAt, numberEntered, overrideNote): void<br>+ reject(reason): void<br>+ isValid(): Boolean *(Approved and not expired)* |

**Document**

| Attributes | Operations |
|---|---|
| - ownerType: DocOwner<br>- declaredType: DocType<br>- detectedType: DocType<br>- storageKey: String<br>- mimeType: String<br>- sizeBytes: Integer<br>- sha256: String<br>- aiStatus: AiStatus<br>- ocrText: String<br>- ocrConfidence: Decimal<br>- reviewStatus: ReviewStatus<br>- reviewedAt: Date<br>- reviewNote: String<br>- createdAt: Date | + approve(correctedFields, overrideNote): void<br>+ reject(reason): void<br>+ hasBlockingFlag(): Boolean<br>+ downloadUrl(): String |

**ExtractedField**

| Attributes | Operations |
|---|---|
| - name: String<br>- value: String<br>- confidence: Decimal<br>- edited: Boolean<br>- aiValue: String | + correct(newValue): void *(keeps the AI's value in aiValue)* |

**DocFlag**

| Attributes | Operations |
|---|---|
| - code: DocFlagCode<br>- severity: FlagSeverity<br>- message: String<br>- evidenceField: String<br>- found: String<br>- expected: String | + isBlocking(): Boolean |

**DocumentAI** «control»

| Attributes | Operations |
|---|---|
| — | + process(document): void<br>+ prepareImage(file): Image<br>+ readText(image): OcrResult<br>+ classify(text): DocType<br>+ extractFields(text, type): ExtractedField[]<br>+ computeFlags(fields, records): DocFlag[]<br>+ suggestStatus(flags): ReviewStatus *(Needs Attention or Ready for Review only)* |

**AuditLog**

| Attributes | Operations |
|---|---|
| - action: String<br>- entityType: String<br>- entityId: String<br>- before: String<br>- after: String<br>- ip: String<br>- createdAt: Date | + record(actor, action, entity, before, after): AuditLog |

### Relationships

| # | From | End at From | Type | End at To | To | Label |
|---|---|---|---|---|---|---|
| 1 | Firm | 0..1 | association | * | User | employs (the Super Admin has no firm) |
| 2 | Firm | 0..1 | association | * | AuditLog | keeps |
| 3 | User | 0..1 | association | * | AuditLog | performs |
| 4 | SuperAdmin | | generalization ▷ | | User | |
| 5 | CompanyAdmin | | generalization ▷ | | User | |
| 6 | Broker | | generalization ▷ | | User | |
| 7 | SalesConsultant | | generalization ▷ | | User | |
| 8 | SalesManager | | generalization ▷ | | SalesConsultant | |
| 9 | SalesPerson | | generalization ▷ | | SalesConsultant | |
| 10 | SalesPerson | * | association | 0..1 | SalesManager | reports to |
| 11 | SalesManager | * | association | 0..1 | Broker | reports to |
| 12 | User | 1 | association | * | Credential | holds `{Broker, Sales Manager or Sales Person only}` |
| 13 | Broker | 0..1 | association | * | Credential | reviews |
| 14 | Credential | 0..1 | association | 0..1 | Document | is proven by (the scan) |
| 15 | User | 1 | association | * | Document | uploads |
| 16 | Broker | 0..1 | association | * | Document | reviews |
| 17 | Document | 1 ◆ | composition | * | ExtractedField | has |
| 18 | Document | 1 ◆ | composition | * | DocFlag | has |
| 19 | DocumentAI | | dependency «reads» | | Document | |

### Layout (no crossing)

```
 ┌──────────┐      ┌──────┐                       ┌─────────────┐
 │ AuditLog │──2───│ Firm │                       │ DocumentAI  │
 └────▲─────┘      └──┬───┘                       └──────┬──────┘
      │3              │1                                 ┆ «reads» 19
      │          ┌────▼─────┐          15          ┌─────▼─────┐ 17 ┌────────────────┐
 ┌────┴──────┐ 4 │          ├──────────────────────┤ Document  ├───◆│ ExtractedField │
 │SuperAdmin ├──▷│   User   │                      │           │    └────────────────┘
 └───────────┘   │          │╲ 12      ┌────────────┐╱ 14       │ 18 ┌────────┐
 ┌────────────┐5 │          │ ╲───────►│ Credential │◄──────────┤───◆│DocFlag │
 │CompanyAdmin├─▷│          │          └─────▲──────┘           │    └────────┘
 └────────────┘  └──▲────▲──┘                │13               │
                    │7    ╲6            ┌────┴───┐   16        │
          ┌─────────┴────┐  ╲───────────┤ Broker ├─────────────┘
          │SalesConsultant│              └───▲────┘
          └──▲────────▲───┘                  │11
           9 │         ╲8               ┌────┴────────┐
     ┌───────┴───┐  10  ╲──────────────┤SalesManager │
     │SalesPerson├─────────────────────►│             │
     └───────────┘                      └─────────────┘
```

| Row | Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|---|
| 1 | AuditLog | Firm | | DocumentAI | |
| 2 | | **User** | | **Document** | ExtractedField |
| 3 | SuperAdmin | | Credential | | DocFlag |
| 4 | CompanyAdmin | SalesConsultant | Broker | | |
| 5 | SalesPerson | | SalesManager | | |

How the lines run:

- **User, Document and Broker form a triangle:** User—Document along the top (15), Document—Broker
  down the right (16), Broker—User up the left (generalization 6).
- **Credential sits inside that triangle**, so its three lines (12 from User, 14 from Document,
  13 from Broker) stay inside it.
- **SuperAdmin and CompanyAdmin** are outside the triangle, on the left. **SalesConsultant** sits
  below User, left of Broker.
- **SalesManager** sits below Broker (line 11 straight up). **SalesPerson** is left of SalesManager
  (10 straight across). The two generalizations to SalesConsultant (8 and 9) go up-left.
- **Firm, AuditLog and User** form a small triangle at the top-left (1, 2, 3).

Under the figure add: *"Credentials: only Brokers, Sales Managers and Sales Persons hold them."*

---

## Part 3. Module 2: Marketplace and Property Management

### Classes (8 + reference copies)

**Developer**

| Attributes | Operations |
|---|---|
| - name: String<br>- isActive: Boolean | + rename(name): void<br>+ deactivate(): void |

**Project**

| Attributes | Operations |
|---|---|
| - name: String<br>- locationText: String<br>- location: GeoPoint<br>- ltsNumber: String<br>- ltsExpiresAt: Date<br>- ltsStatus: ReviewStatus | + uploadLicenseToSell(file): Document<br>+ canPublishUnits(): Boolean *(License to Sell Approved and not expired)* |

**Property**

| Attributes | Operations |
|---|---|
| - source: ListingSource<br>- title: String<br>- slug: String<br>- type: PropertyType<br>- description: String<br>- price: Decimal<br>- lotAreaSqm: Decimal<br>- floorAreaSqm: Decimal<br>- bedrooms: Integer<br>- bathrooms: Integer<br>- barangay: String<br>- city: String<br>- province: String<br>- location: GeoPoint<br>- status: ListingStatus<br>- publishedAt: Date | + publish(): void *(developer units)*<br>+ unpublish(): void<br>+ approveListing(): PropertyBadge[] *(owner listings; Broker)*<br>+ sendBack(reason): void<br>+ addPhoto(file): PropertyPhoto<br>+ addQuotation(details): LoanQuotation |

**PropertyPhoto**

| Attributes | Operations |
|---|---|
| - key: String<br>- sort: Integer | + makeCover(): void |

**PropertyBadge**

| Attributes | Operations |
|---|---|
| - type: BadgeType<br>- grantedAt: Date<br>- validUntil: Date | + isValid(): Boolean |

**LoanQuotation**

| Attributes | Operations |
|---|---|
| - label: String<br>- paymentMethod: PaymentMethod<br>- reservationFee: Decimal<br>- downpaymentPct: Decimal<br>- dpTermMonths: Integer<br>- monthlyDp: Decimal<br>- loanAmount: Decimal<br>- interestRatePct: Decimal<br>- loanTermYears: Integer<br>- monthlyAmortization: Decimal<br>- notes: String | + update(details): void |

**SellerListingRequest**

| Attributes | Operations |
|---|---|
| - sellerName: String<br>- sellerPhone: String<br>- sellerEmail: String<br>- locationText: String<br>- propertyType: PropertyType<br>- lotAreaSqm: Decimal<br>- floorAreaSqm: Decimal<br>- askingPrice: Decimal<br>- hasTitle: Boolean<br>- photoKeys: String[]<br>- status: SellerRequestStatus<br>- consentAt: Date | + accept(): void<br>+ decline(reason): void<br>+ uploadDocument(type, file): Document<br>+ submitForReview(title, description, barangay, city, location): Property |

**LoanCalculator** «control» *(runs in the browser)*

| Attributes | Operations |
|---|---|
| — | + computePayment(price, downpaymentPct, ratePct, years): PaymentEstimate<br>+ computeAffordability(monthlyIncome, incomeSharePct, ratePct, years, downpaymentPct): AffordabilityEstimate |

Reference copies: **Document\*** (twice), **SalesConsultant\***, **Broker\***, **Firm\***.

### Relationships

| # | From | End at From | Type | End at To | To | Label |
|---|---|---|---|---|---|---|
| 1 | Developer | 1 | association | * | Project | develops |
| 2 | Document\* | 0..1 | association | 0..1 | Project | is the License to Sell of |
| 3 | Project | 0..1 | association | * | Property | contains (developer units) |
| 4 | SellerListingRequest | 0..1 | association | 0..1 | Property | becomes |
| 5 | Document\* | * | association | 1 | SellerListingRequest | proves ownership for (title, tax declaration, tax receipt, ID) |
| 6 | SalesConsultant\* | 1 | association | * | SellerListingRequest | is chosen for |
| 7 | SalesConsultant\* | 0..1 | association | * | Property | is assigned to (owner listings) |
| 8 | Property | 1 ◆ | composition | * | PropertyPhoto | has |
| 9 | Property | 1 ◆ | composition | * | LoanQuotation | offers |
| 10 | Property | 1 ◆ | composition | * | PropertyBadge | earns (one of each type) |
| 11 | Broker\* | 1 | association | * | PropertyBadge | grants |
| 12 | LoanCalculator | | dependency «uses price» | | Property | |
| 13 | LoanCalculator | | dependency «uses defaults» | | Firm\* | |

### Layout (no crossing)

| Row | Column Z | Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|---|---|
| 1 | | Developer | Project | Document\* | LoanCalculator | Firm\* |
| 2 | Document\* | SellerListingRequest | **Property** | LoanQuotation | | |
| 3 | | SalesConsultant\* | PropertyBadge | PropertyPhoto | | |
| 4 | | | Broker\* | | | |

- Straight lines: 1 (A1–B1), 2 (C1–B1), 3 (B1–B2), 4 (A2–B2), 5 (Z2–A2), 6 (A3 up to A2),
  9 (B2–C2), 10 (B2–B3), 11 (B4 up to B3), 13 (D1–E1).
- **7:** diagonal from SalesConsultant\*'s top-right corner to Property's bottom-left corner. It stays
  below line 4.
- **8:** diagonal from Property's bottom-right corner to PropertyPhoto's top-left corner.
- **12:** diagonal from LoanCalculator's bottom-left corner to Property's top-right corner, through the
  empty gap between rows 1 and 2 (above line 9, below line 2).

---

## Part 4. Module 3: Sales, Client and Commission Management

The module has three groups of classes. Draw them **side by side in one figure**, as three zones
(left, middle, right). Each zone uses its own reference copies, so **no line goes from one zone to
another**.

### Classes (16 + reference copies)

**Inquiry**

| Attributes | Operations |
|---|---|
| - source: InquirySource<br>- referralCode: String<br>- buyerName: String<br>- buyerPhone: String<br>- buyerEmail: String<br>- natureOfWork: NatureOfWork<br>- paymentPref: PaymentMethod<br>- civilStatus: CivilStatus<br>- message: String<br>- status: LeadStatus<br>- consentAt: Date<br>- createdAt: Date | + updateStatus(status, reason): void<br>+ uploadReservationReceipt(file): Document<br>+ convertToClient(receipt, amount, paidAt, tcp, paymentMethod, civilStatus, employmentType, downpaymentAmount): Client |

**Visit**

| Attributes | Operations |
|---|---|
| - scheduledAt: Date<br>- status: VisitStatus<br>- declineReason: String<br>- notes: String | + approve(): void<br>+ decline(reason): void<br>+ reschedule(newTime): Visit<br>+ markCompleted(): void<br>+ markNoShow(): void<br>+ cancel(): void |

**Client**

| Attributes | Operations |
|---|---|
| - fullName: String<br>- phone: String<br>- email: String<br>- civilStatus: CivilStatus<br>- paymentMethod: PaymentMethod<br>- employmentType: EmploymentType<br>- tcp: Decimal<br>- saleType: SaleType<br>- reservationPaidAt: Date<br>- downpaymentAmount: Decimal<br>- status: ClientStatus | + generateChecklist(): RequirementItem[]<br>+ updateProfile(paymentMethod, civilStatus, employmentType): void *(regenerates the checklist)*<br>+ recordPayment(kind, receiptFile): Payment<br>+ issueRatingLink(): String |

**Payment**

| Attributes | Operations |
|---|---|
| - kind: PaymentKind<br>- amount: Decimal<br>- paidAt: Date | + confirm(amount, paidAt): void<br>+ isConfirmed(): Boolean |

**RequirementItem**

| Attributes | Operations |
|---|---|
| - code: String<br>- label: String<br>- appliesTo: String<br>- stage: RequirementStage<br>- required: Boolean<br>- status: ReqItemStatus<br>- verifiedAt: Date | + upload(file): Document<br>+ waive(reason): void *(Broker)*<br>+ isComplete(): Boolean *(Verified or Waived)* |

**ClosingRecord**

| Attributes | Operations |
|---|---|
| - sellingPrice: Decimal<br>- computation: ClosingComputation<br>- checklist: ClosingStep[] | + compute(rates, taxBase, registrationFee): ClosingComputation<br>+ tickStep(code): void<br>+ isComplete(): Boolean *(all 7 steps done)* |

**RatingToken**

| Attributes | Operations |
|---|---|
| - tokenHash: String<br>- expiresAt: Date<br>- usedAt: Date | + isUsable(): Boolean *(not used, not expired)*<br>+ markUsed(): void |

**Rating**

| Attributes | Operations |
|---|---|
| - stars: Integer `{1..5}`<br>- comment: String<br>- createdAt: Date | — |

**CommissionSplitConfig**

| Attributes | Operations |
|---|---|
| - handledBy: Role<br>- brokerPct: Decimal<br>- salesManagerPct: Decimal<br>- salesPersonPct: Decimal | + isValid(): Boolean *(the three total 100)* |

**CommissionTemplate**

| Attributes | Operations |
|---|---|
| - paymentMethod: PaymentMethod<br>- grossRatePct: Decimal<br>- requiresTransmittal: Boolean | + update(grossRatePct, trancheShares): void |

**CommissionTemplateTranche**

| Attributes | Operations |
|---|---|
| - sequence: Integer<br>- label: String<br>- sharePct: Decimal<br>- trigger: TrancheTrigger<br>- triggerValue: Decimal<br>- requiredStage: RequirementStage | — |

**Commission**

| Attributes | Operations |
|---|---|
| - grossAmount: Decimal<br>- splitSnapshot: SplitSnapshot | + create(client, template, split): Commission *(gross = TCP × rate; copies the split)*<br>+ evaluate(): void *(re-checks every tranche)* |

**CommissionTranche**

| Attributes | Operations |
|---|---|
| - sequence: Integer<br>- label: String<br>- amount: Decimal<br>- status: CommissionStatus<br>- milestoneReachedAt: Date<br>- docsCompleteAt: Date<br>- transmittalAmount: Decimal<br>- awaitingSince: Date<br>- trigger: TrancheTrigger<br>- triggerValue: Decimal<br>- requiredStage: RequirementStage<br>- requiresTransmittal: Boolean<br>- periodMonth: String | + nextStatus(milestoneReached, docsComplete): CommissionStatus<br>+ uploadTransmittal(file): Document<br>+ confirmTransmittal(amount, note): void<br>+ prepareVoucher(deductions): CommissionVoucher *(Broker; only when Ready for Release)* |

**CommissionVoucher**

| Attributes | Operations |
|---|---|
| - voucherNo: String<br>- totalNet: Decimal<br>- contentHash: String<br>- brokerSignedAt: Date<br>- releasedAt: Date<br>- createdAt: Date | + edit(deductions): void *(clears signatures)*<br>+ sign(user, typedName): Signature *(Broker first)*<br>+ isFullySigned(): Boolean<br>+ release(): void *(records a payout made outside the system)* |

**VoucherLine**

| Attributes | Operations |
|---|---|
| - role: Role<br>- grossShare: Decimal<br>- deductions: Deduction[]<br>- net: Decimal | — |

**Signature**

| Attributes | Operations |
|---|---|
| - typedName: String<br>- ip: String<br>- userAgent: String<br>- hash: String<br>- signedAt: Date | + matches(contentHash): Boolean |

Reference copies: **Property\***, **SalesConsultant\***, **CompanyAdmin\***, **Broker\***,
**Document\***, **Developer\***, **Client\***, **User\***.

### Relationships

**Zone 1: leads and visits**

| # | From | End at From | Type | End at To | To | Label |
|---|---|---|---|---|---|---|
| 1 | Property\* | 1 | association | * | Inquiry | receives |
| 2 | SalesConsultant\* | 1 | association | * | Inquiry | handles |
| 3 | Inquiry | 0..1 | association | 0..1 | Client\* | converts to |
| 4 | Property\* | 1 | association | * | Client\* | is bought by |
| 5 | SalesConsultant\* | 1 | association | * | Client\* | handles |
| 6 | Property\* | 1 | association | * | Visit | is visited in |
| 7 | SalesConsultant\* | 1 | association | * | Visit | requests |
| 8 | CompanyAdmin\* | 0..1 | association | * | Visit | decides |
| 9 | Inquiry | 0..1 | association | * | Visit | has |
| 10 | Client\* | 0..1 | association | * | Visit | has |
| 11 | Visit | 0..1 | association (to itself) | * | Visit | is rescheduled as |

**Zone 2: client records**

| # | From | End at From | Type | End at To | To | Label |
|---|---|---|---|---|---|---|
| 12 | Client | 1 ◆ | composition | * | Payment | makes |
| 13 | Client | 1 ◆ | composition | * | RequirementItem | must submit |
| 14 | Client | 1 ◆ | composition | 0..1 | ClosingRecord | is closed in |
| 15 | Client | 1 | association | 0..1 | RatingToken | is sent |
| 16 | Client | 1 | association | 0..1 | Rating | gives |
| 17 | Document\* | 0..1 | association | 0..1 | Payment | is the receipt of |
| 18 | Document\* | 0..1 | association | * | RequirementItem | satisfies |
| 19 | SalesConsultant\* | 0..1 | association | * | Payment | confirms |
| 20 | Broker\* | 0..1 | association | * | RequirementItem | verifies or waives |
| 21 | SalesConsultant\* | 1 | association | * | RatingToken | is rated through |
| 22 | SalesConsultant\* | 1 | association | * | Rating | receives |

**Zone 3: commissions**

| # | From | End at From | Type | End at To | To | Label |
|---|---|---|---|---|---|---|
| 23 | Developer\* | 0..1 | association | * | CommissionTemplate | sets (no developer = private sale) |
| 24 | CommissionTemplate | 1 ◆ | composition | * | CommissionTemplateTranche | defines |
| 25 | CommissionTemplate | 1 | association | * | Commission | is computed from |
| 26 | Client\* | 1 | association | 0..1 | Commission | earns |
| 27 | Commission | | dependency «copies split from» | | CommissionSplitConfig | |
| 28 | Commission | 1 ◆ | composition | * | CommissionTranche | is paid in |
| 29 | Document\* | 0..1 | association | * | CommissionTranche | is the transmittal of |
| 30 | CommissionTranche | 1 | association | 0..1 | CommissionVoucher | is paid by |
| 31 | CommissionVoucher | 1 ◆ | composition | * | VoucherLine | lists |
| 32 | CommissionVoucher | 1 ◆ | composition | * | Signature | is signed with |
| 33 | Signature | * | association | 1 | User\* | is made by |

Why some links are **dependencies or compositions** instead of associations:

- **27:** the commission copies the split percentages when it is created, so a later change to the
  split never changes a live deal. It *uses* the split; it doesn't keep a link to it.
- **31, 32:** voucher lines and signatures exist only inside one voucher.

### Layout (no crossing)

**Zone 1 (left):**

| Row | Column A | Column B | Column C |
|---|---|---|---|
| 1 | Property\* | **Inquiry** | |
| 2 | | SalesConsultant\* | Property\* (2nd) |
| 3 | **Visit** | | Client\* |
| 4 | CompanyAdmin\* | | |

- Straight lines: 1 (A1–B1), 6 (A1 down to A3), 2 (B2 up to B1), 4 (C2 down to C3), 8 (A4 up to A3).
- **10:** along the bottom of row 3, from Client\* to Visit.
- **9:** diagonal from Inquiry's bottom-left to Visit's top-right.
- **3:** diagonal from Inquiry's bottom-right to Client\*'s top-left.
- **7:** diagonal from SalesConsultant\* down-left to Visit's right side, above line 10.
- **5:** diagonal from SalesConsultant\* down-right to Client\*'s left side, above line 10.
- **11:** a loop on Visit's left side.

**Zone 2 (middle):**

| Row | Column A | Column B | Column C | Column D |
|---|---|---|---|---|
| 1 | Payment | Document\* | RequirementItem | |
| 2 | SalesConsultant\* | **Client** | Broker\* | |
| 3 | RatingToken | ClosingRecord | Rating | SalesConsultant\* (2nd) |

- Straight lines: 17 (B1–A1), 18 (B1–C1), 19 (A2 up to A1), 21 (A2 down to A3), 20 (C2 up to C1),
  14 (B2 down to B3), 22 (D3–C3).
- **12, 13, 15, 16:** diagonals from Client's four corners to Payment, RequirementItem, RatingToken
  and Rating.

**Zone 3 (right):**

| Row | Column A | Column B | Column C | Column D |
|---|---|---|---|---|
| 1 | Developer\* | CommissionTemplate | CommissionTemplateTranche | |
| 2 | Client\* | **Commission** | CommissionSplitConfig | |
| 3 | Document\* | CommissionTranche | CommissionVoucher | Signature |
| 4 | | | VoucherLine | User\* |

- All straight lines: 23 (A1–B1), 24 (B1–C1), 25 (B1 down to B2), 26 (A2–B2), 27 (B2–C2, dashed),
  28 (B2 down to B3), 29 (A3–B3), 30 (B3–C3), 32 (C3–D3), 31 (C3 down to C4), 33 (D3 down to D4).

---

## Part 5. Named types and enumerations

You may draw the enumerations as small boxes marked «enumeration» in a corner of each figure,
with **no lines**, or leave them out and keep this table as reference.

| Type | Values / contents |
|---|---|
| FirmStatus | ACTIVE, SUSPENDED |
| Role | SUPER_ADMIN, COMPANY_ADMIN, BROKER, SALES_MANAGER, SALES_PERSON |
| CredentialType | PRC_LICENSE, DHSUD_REGISTRATION |
| ReviewStatus | PENDING_AI, NEEDS_ATTENTION, READY_FOR_REVIEW, APPROVED, REJECTED |
| AiStatus | QUEUED, PROCESSING, DONE, FAILED |
| DocOwner | PROPERTY, PROJECT, CREDENTIAL, CLIENT, PAYMENT, TRANSMITTAL, SELLER_REQUEST |
| DocType | LAND_TITLE, TAX_DECLARATION, RPT_RECEIPT, SELLER_ID, LICENSE_TO_SELL, PRC_ID, DHSUD_CERT, VALID_ID, … (32 values; see the data dictionary, Part 6) |
| DocFlagCode | OWNER_MISMATCH, AREA_MISMATCH, ENCUMBRANCE_FOUND, TAX_DELINQUENT, LTS_EXPIRED, LTS_EXPIRING_SOON, PROJECT_MISMATCH, NAME_MISMATCH, NUMBER_MISMATCH, CREDENTIAL_EXPIRED, ID_EXPIRED, TYPE_MISMATCH, LOW_CONFIDENCE, DUPLICATE_RECEIPT, DUPLICATE_FILE, AMOUNT_MISMATCH, OCR_FAILED |
| FlagSeverity | BLOCKER, WARNING, INFO |
| ListingSource | DEVELOPER, INDIVIDUAL_SELLER |
| PropertyType | HOUSE_AND_LOT, LOT, CONDO, TOWNHOUSE, COMMERCIAL, OTHER |
| ListingStatus | DRAFT, PENDING_REVIEW, NEEDS_ATTENTION, LIVE, REJECTED, SUSPENDED, SOLD |
| BadgeType | PRC_VERIFIED, DHSUD_REGISTERED, OWNERSHIP_VERIFIED, LTS_VERIFIED, TAX_CURRENT, TITLE_CLEAN |
| SellerRequestStatus | NEW, ACCEPTED, DOCUMENTS_IN_PROGRESS, SUBMITTED_FOR_REVIEW, LISTED, DECLINED |
| InquirySource | ORGANIC, REFERRAL |
| LeadStatus | NEW, CONTACTED, QUALIFIED, VISIT_SCHEDULED, RESERVED, LOST |
| NatureOfWork | EMPLOYED, OFW, BUSINESS, OTHER |
| PaymentMethod | CASH, DEFERRED_CASH, IN_HOUSE, BANK, PAG_IBIG, NOT_SURE |
| CivilStatus | SINGLE, MARRIED, SEPARATED |
| EmploymentType | LOCALLY_EMPLOYED, OFW, SELF_EMPLOYED |
| SaleType | DEVELOPER_SALE, PRIVATE_SALE |
| ClientStatus | ACTIVE, CLOSING, COMPLETED, CANCELLED |
| VisitStatus | PENDING, APPROVED, DECLINED, COMPLETED, NO_SHOW, RESCHEDULED, CANCELLED |
| PaymentKind | RESERVATION, DOWNPAYMENT, FULL_CASH, DEFERRED_INSTALLMENT, IN_HOUSE_INSTALLMENT, LOAN_RELEASE, OTHER |
| RequirementStage | RESERVATION, FINANCING |
| ReqItemStatus | MISSING, UPLOADED, NEEDS_ATTENTION, VERIFIED, WAIVED |
| TrancheTrigger | ON_RESERVATION, FULL_PAYMENT, TCP_PERCENT_PAID, DP_PERCENT_PAID, DP_FULLY_PAID, LOAN_RELEASED, MONTHLY |
| CommissionStatus | WAITING, BLOCKED, AWAITING_TRANSMITTAL, READY_FOR_RELEASE, RELEASED |
| GeoPoint | latitude, longitude |
| ClosingComputation | sellingPrice, taxBase, taxBaseOverride, registrationFee, rates, cost lines (code, label, ratePct, amount, paidBy), totals per payer |
| ClosingStep | code, label, done, doneAt, doneById |
| SplitSnapshot | the split percentages and the people (broker, manager, salesperson) at creation time |
| Deduction | label, amount |

`DocFlag`, `ExtractedField`, `VoucherLine` and `Signature` are drawn as classes because they have
their own meaning and rules. In the database they are stored inside their parent row (as
structured data), which is why they are not tables in the ERD.

---

## Part 6. Checklist before submitting

- [ ] 3 class diagrams, one per module, each with its caption.
- [ ] Every class box has three parts (name, attributes, operations); `User` and `SalesConsultant`
      are abstract, with their names in *italics*.
- [ ] Every association has a multiplicity at **both** ends.
- [ ] Filled diamonds only for the compositions in the tables; hollow triangles for the
      generalizations; dashed arrows for the dependencies.
- [ ] No foreign key attributes in the boxes (they are lines).
- [ ] No CommissionCheck class, and no voucher "Approved" status.
- [ ] Notes under the figures: reference copies (\*), Firm ownership, credential holders.
- [ ] No two lines cross.
