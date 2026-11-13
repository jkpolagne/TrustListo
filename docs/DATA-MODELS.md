# TrustListo — Data Models (ERD and Relational Model)

A drawing guide for the two Chapter 3 data model figures, in the style of our professor's samples:

1. **Entity-Relationship Data Model (Crow's Foot Notation)**: boxes with every field, lines with
   crow's-foot ends.
2. **Relational Data Model (Crow's Foot)**: tables with sample rows, and arrows from each primary
   key to the foreign keys that use it.

Everything here was checked against the real database (`apps/api/prisma/schema.prisma`) on
2026-11-13: **26 tables, every column, and all 67 relationships**. Field names are written exactly as
in the database, so the panel can match the figure to the system.

---

## Part 1. Why the model is split into 6 figures

The professor's sample has 6 tables. TrustListo has **26 tables**, and two tables connect to almost
everything:

- **Firm** links to 20 tables (every firm-owned row has a `firmId`, so each firm only sees its own data).
- **User** links to 14 tables (owner, consultant, reviewer, uploader, signer…).

Drawn as one figure, those 67 lines cannot avoid crossing. So we do what large systems do:
**one figure per subject area**, matching our DFD modules.

| Figure | Title (write after "Figure #:") | Tables |
|---|---|---|
| **A** | Firm Ownership | Firm + the 20 tables that have `firmId` |
| **B** | Accounts and Document Verification (Shared + Module 1) | User, Credential, Document, AuditLog |
| **C** | Marketplace and Property Management (Module 2) | Developer, Project, Property, PropertyPhoto, PropertyBadge, LoanQuotation, SellerListingRequest |
| **D** | Leads and Site Visits (Module 3) | Inquiry, Visit |
| **E** | Clients, Payments, Requirements, Closing and Ratings (Module 3) | Client, Payment, RequirementItem, ClosingRecord, RatingToken, Rating |
| **F** | Commissions (Module 3) | CommissionSplitConfig, CommissionTemplate, CommissionTemplateTranche, Commission, CommissionTranche, CommissionVoucher |

Rules that keep this correct:

1. **Every table is drawn in full exactly once**, in its home figure (the right column above).
2. When a figure needs a table from another figure, draw a **reference copy**: a gray box with the
   name followed by `*` (e.g. **User\***), showing only `id (primary key)` and a name field. Add one
   note under the figure: *"\* Shown in full in Figure B."* This is the same idea as the duplicate
   entities we used in the DFDs.
3. **The `firmId` lines are drawn only in Figure A.** In Figures B–F, `firmId (foreign key)` is still
   listed inside each box, but without a line. Add this note under Figures B–F:
   *"Every firmId links to Firm (see Figure A)."*
4. Each of the 67 relationships is drawn **once**, in one figure. The tables in Parts 3 and 4 say
   which figure.

Write the captions like this:

- *Figure #: Entity-Relationship Data Model for TrustListo (Crow's Foot Notation) — A. Firm Ownership*
- *Figure #: Relational Data Model for TrustListo (Crow's Foot) — A. Firm Ownership*

---

## Part 2. Crow's foot notation (how to draw each line end)

Each line has a symbol at **both ends**. The symbol at an end tells how many rows of *that* table
can be linked to one row of the table at the other end.

| Symbol | Name | Meaning | draw.io arrow name |
|---|---|---|---|
| `──┼┼` | One and only one | Exactly 1 | `ERmandOne` |
| `──o┼` | Zero or one | 0 or 1 (optional) | `ERzeroToOne` |
| `──┼<` | One or many | 1 or more | `ERoneToMany` |
| `──o<` | Zero or many | 0 or more | `ERzeroToMany` |

In the relationship tables below:

- **Parent end** = the symbol drawn next to the table that owns the primary key (the "one" side).
- **Child end** = the symbol drawn next to the table that holds the foreign key (usually "many").

How to read one line, e.g. `Developer ┼┼──────o< Project`:
*"One project belongs to exactly one developer. One developer has zero or many projects."*

The symbols follow the database exactly:

- A foreign key that may be empty gets `o┼` at the parent end; a required one gets `┼┼`.
- A foreign key marked **unique** makes a one-to-one link, so the child end is `o┼` instead of `o<`.

**draw.io steps:** use *Entity Relation → Table* for boxes. Connect boxes with a plain line, then
in *Edit Style* set `startArrow=` and `endArrow=` to the names above, and `edgeStyle=orthogonalEdgeStyle`
for straight elbows.

**Colors**, like the professor's sample: color each `id (primary key)` row, then color every
foreign key that points to it the **same** color.

| Color | Primary key of | Foreign keys with this color |
|---|---|---|
| Gray | Firm | `firmId` |
| Blue | User | `userId`, `managerId`, `brokerId`, `agentId`, `assignedAgentId`, `consultantId`, `grantedById`, `uploadedById`, `reviewedById`, `confirmedById`, `verifiedById`, `decidedById`, `actorId` |
| Orange | Document | `documentId`, `ltsDocumentId`, `proofDocumentId`, `transmittalDocumentId` |
| Yellow | Developer | `developerId` |
| Light green | Project | `projectId` |
| Green | Property | `propertyId` |
| Pink | SellerListingRequest | `sellerRequestId` |
| Teal | Inquiry | `inquiryId` |
| Purple | Client | `clientId` |
| Red | Visit | `rescheduledFromId` |
| Brown | CommissionTemplate | `templateId` |
| Light blue | Commission | `commissionId` |
| Light purple | CommissionTranche | `trancheId` |

**Type words** used in the boxes (prof's style is `name (type)`):
`string`, `integer`, `decimal`, `float`, `boolean`, `datetime`, `enum` (fixed list of values),
`json` (structured data), `string array`, `geography point` (map location).

---

# Part 3. Entity-Relationship Data Model (Crow's Foot Notation)

For each figure: the boxes (with every field), the lines, and a layout that has **no crossing lines**.
The layouts are grids: draw each box in the cell shown, with an even gap between boxes.

## Figure A. Firm Ownership

### Boxes

**Firm** (full box, only here)

| Field |
|---|
| id (primary key) |
| name (string) |
| slug (string, unique) |
| address (string) |
| logoKey (string) |
| status (enum) |
| loanRatePct (decimal) |
| loanTermYears (integer) |
| loanDownpaymentPct (decimal) |
| loanIncomeRatioPct (decimal) |
| withholdingPct (decimal) |
| cgtRatePct (decimal) |
| dstRatePct (decimal) |
| transferTaxRatePct (decimal) |
| createdAt (datetime) |
| updatedAt (datetime) |

The other 20 boxes in Figure A are **small boxes** with three rows only:
`<TableName>` / `id (primary key)` / `firmId (foreign key)`. Their full fields are in Figures B–F.

### Lines (20)

| # | Parent | Parent end | Child | Child end | Foreign key | Meaning |
|---|---|---|---|---|---|---|
| A1 | Firm | `o┼` | User | `o<` | User.firmId | A firm has users; the Super Admin has no firm |
| A2 | Firm | `o┼` | AuditLog | `o<` | AuditLog.firmId | A firm has log entries; platform entries have no firm |
| A3 | Firm | `┼┼` | Credential | `o<` | Credential.firmId | A firm keeps its consultants' credentials |
| A4 | Firm | `┼┼` | Document | `o<` | Document.firmId | A firm owns its uploaded documents |
| A5 | Firm | `┼┼` | Developer | `o<` | Developer.firmId | A firm has partner developers |
| A6 | Firm | `┼┼` | Project | `o<` | Project.firmId | A firm has projects |
| A7 | Firm | `┼┼` | Property | `o<` | Property.firmId | A firm has listings |
| A8 | Firm | `┼┼` | SellerListingRequest | `o<` | SellerListingRequest.firmId | A firm receives owners' requests |
| A9 | Firm | `┼┼` | Inquiry | `o<` | Inquiry.firmId | A firm receives inquiries |
| A10 | Firm | `┼┼` | Visit | `o<` | Visit.firmId | A firm schedules visits |
| A11 | Firm | `┼┼` | Client | `o<` | Client.firmId | A firm has clients |
| A12 | Firm | `┼┼` | Payment | `o<` | Payment.firmId | A firm records payments |
| A13 | Firm | `┼┼` | RequirementItem | `o<` | RequirementItem.firmId | A firm tracks requirement items |
| A14 | Firm | `┼┼` | ClosingRecord | `o<` | ClosingRecord.firmId | A firm has closing records |
| A15 | Firm | `┼┼` | RatingToken | `o<` | RatingToken.firmId | A firm issues rating links |
| A16 | Firm | `┼┼` | CommissionSplitConfig | `o<` | CommissionSplitConfig.firmId | A firm sets its commission split |
| A17 | Firm | `┼┼` | CommissionTemplate | `o<` | CommissionTemplate.firmId | A firm sets commission templates |
| A18 | Firm | `┼┼` | Commission | `o<` | Commission.firmId | A firm has commissions |
| A19 | Firm | `┼┼` | CommissionTranche | `o<` | CommissionTranche.firmId | A firm has commission tranches |
| A20 | Firm | `┼┼` | CommissionVoucher | `o<` | CommissionVoucher.firmId | A firm issues vouchers |

PropertyPhoto, PropertyBadge, LoanQuotation, CommissionTemplateTranche and Rating have **no**
`firmId`. They belong to a firm through their parent (Property, CommissionTemplate, Client), so they
are not in Figure A.

### Layout (fan, no crossing)

Put **Firm** in the middle. Put 10 small boxes in a column on the left and 10 on the right, in
this order from top to bottom. Draw each line straight from Firm's side to the small box's side.
Because the order is kept, no two lines cross.

```
 User ──────────────┐                    ┌────────────── Client
 AuditLog ──────────┤                    ├────────────── Payment
 Credential ────────┤                    ├────────────── RequirementItem
 Document ──────────┤                    ├────────────── ClosingRecord
 Developer ─────────┤      ┌──────┐      ├────────────── RatingToken
 Project ───────────┼──────┤ Firm ├──────┼────────────── CommissionSplitConfig
 Property ──────────┤      └──────┘      ├────────────── CommissionTemplate
 SellerListingReq. ─┤                    ├────────────── Commission
 Inquiry ───────────┤                    ├────────────── CommissionTranche
 Visit ─────────────┘                    └────────────── CommissionVoucher
```

(The sketch merges lines to save space. In the drawing, give each line its own attachment point on
Firm's side, spread from top to bottom in the same order.)

## Figure B. Accounts and Document Verification

### Boxes

**User**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| role (enum) |
| email (string, unique) |
| passwordHash (string) |
| firstName (string) |
| lastName (string) |
| phone (string) |
| photoKey (string) |
| isActive (boolean) |
| managerId (foreign key) |
| brokerId (foreign key) |
| referralCode (string, unique) |
| bio (string) |
| createdAt (datetime) |
| updatedAt (datetime) |

**Credential**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| userId (foreign key) |
| type (enum) |
| numberEntered (string) |
| documentId (foreign key, unique) |
| expiresAt (datetime) |
| status (enum) |
| reviewedById (foreign key) |
| reviewedAt (datetime) |
| rejectReason (string) |
| createdAt (datetime) |
| updatedAt (datetime) |

**Document**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| ownerType (enum) |
| ownerId (string) |
| declaredType (enum) |
| detectedType (enum) |
| storageKey (string) |
| mimeType (string) |
| sizeBytes (integer) |
| sha256 (string) |
| uploadedById (foreign key) |
| aiStatus (enum) |
| ocrText (string) |
| ocrConfidence (float) |
| extracted (json) |
| flags (json) |
| reviewStatus (enum) |
| reviewedById (foreign key) |
| reviewedAt (datetime) |
| reviewNote (string) |
| createdAt (datetime) |
| updatedAt (datetime) |

**AuditLog**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| actorId (foreign key) |
| action (string) |
| entityType (string) |
| entityId (string) |
| before (json) |
| after (json) |
| ip (string) |
| createdAt (datetime) |

`Document.ownerId` and `AuditLog.entityId` are **not** drawn as foreign keys. They point to a row in
different tables depending on `ownerType` / `entityType` (e.g. a seller's land title points to a
SellerListingRequest). The links that matter for the business are the direct foreign keys drawn in
Figures B, C, E and F.

### Lines (8)

| # | Parent | Parent end | Child | Child end | Foreign key | Meaning |
|---|---|---|---|---|---|---|
| B1 | User | `o┼` | User | `o<` | User.managerId | A Sales Manager leads zero or many Sales Persons |
| B2 | User | `o┼` | User | `o<` | User.brokerId | A Broker supervises zero or many Sales Managers |
| B3 | User | `┼┼` | Credential | `o<` | Credential.userId | A consultant has credentials |
| B4 | User | `o┼` | Credential | `o<` | Credential.reviewedById | A Broker reviews credentials |
| B5 | Document | `o┼` | Credential | `o┼` | Credential.documentId | A credential has at most one scan (one-to-one) |
| B6 | User | `┼┼` | Document | `o<` | Document.uploadedById | A user uploads documents |
| B7 | User | `o┼` | Document | `o<` | Document.reviewedById | A Broker reviews documents |
| B8 | User | `o┼` | AuditLog | `o<` | AuditLog.actorId | A user performs logged actions (public users have no account) |

### Layout (no crossing)

```
                      ┌────────────┐
                      │ Credential │
                      └────────────┘
    ╭─╮                  ▲  ▲    ▲
    │ ┌──────┐ B3 ───────┘  │    │ B5 (straight down
 B1 ╰─┤ User ├─ B4 ─────────┘    │     through the
 B2 ╭─┤      ├─ B6 ─────────┐    │     empty cell)
    │ └──────┘ B7 ───────┐  │    │
    ╰─╯   │              ▼  ▼    │
          │ B8        ┌──────────┴─┐
          ▼           │  Document  │
    ┌──────────┐      └────────────┘
    │ AuditLog │
    └──────────┘
```

| Cell | Column A | Column B |
|---|---|---|
| Row 1 | (empty) | Credential |
| Row 2 | **User** | (empty: B5 passes here) |
| Row 3 | AuditLog | Document |

- **B1 and B2** are self-relationships: loops that leave User's left side and come back to it. Draw B1
  as the upper loop and B2 as the lower loop.
- **B3, B4** leave User's right side (upper half) and enter Credential's left side, as two parallel
  lines.
- **B6, B7** leave User's right side (lower half) and enter Document's left side, as two parallel
  lines.
- **B5** goes straight up from Document's top to Credential's bottom, on the right of B3–B7.
- **B8** goes straight down from User to AuditLog.

## Figure C. Marketplace and Property Management (Module 2)

### Boxes

**Developer**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| name (string) |
| isActive (boolean) |
| createdAt (datetime) |
| updatedAt (datetime) |

**Project**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| developerId (foreign key) |
| name (string) |
| locationText (string) |
| geom (geography point) |
| ltsDocumentId (foreign key, unique) |
| ltsNumber (string) |
| ltsExpiresAt (datetime) |
| ltsStatus (enum) |
| createdAt (datetime) |
| updatedAt (datetime) |

**Property**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| source (enum) |
| projectId (foreign key) |
| sellerRequestId (foreign key, unique) |
| assignedAgentId (foreign key) |
| title (string) |
| slug (string, unique) |
| type (enum) |
| description (string) |
| price (decimal) |
| lotAreaSqm (decimal) |
| floorAreaSqm (decimal) |
| bedrooms (integer) |
| bathrooms (integer) |
| barangay (string) |
| city (string) |
| province (string) |
| geom (geography point) |
| status (enum) |
| publishedAt (datetime) |
| createdAt (datetime) |
| updatedAt (datetime) |

**PropertyPhoto**

| Field |
|---|
| id (primary key) |
| propertyId (foreign key) |
| key (string) |
| sort (integer) |

**PropertyBadge**

| Field |
|---|
| id (primary key) |
| propertyId (foreign key) |
| type (enum) |
| grantedById (foreign key) |
| grantedAt (datetime) |
| validUntil (datetime) |

**LoanQuotation**

| Field |
|---|
| id (primary key) |
| propertyId (foreign key) |
| label (string) |
| paymentMethod (enum) |
| reservationFee (decimal) |
| downpaymentPct (decimal) |
| dpTermMonths (integer) |
| monthlyDp (decimal) |
| loanAmount (decimal) |
| interestRatePct (decimal) |
| loanTermYears (integer) |
| monthlyAmortization (decimal) |
| notes (string) |

**SellerListingRequest**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| agentId (foreign key) |
| sellerName (string) |
| sellerPhone (string) |
| sellerEmail (string) |
| locationText (string) |
| propertyType (enum) |
| lotAreaSqm (decimal) |
| floorAreaSqm (decimal) |
| askingPrice (decimal) |
| hasTitle (boolean) |
| photoKeys (string array) |
| status (enum) |
| consentAt (datetime) |
| createdAt (datetime) |
| updatedAt (datetime) |

Reference copies: **Document\*** (id, storageKey) and **User\*** (id, firstName, lastName), from Figure B.

### Lines (10)

| # | Parent | Parent end | Child | Child end | Foreign key | Meaning |
|---|---|---|---|---|---|---|
| C1 | Developer | `┼┼` | Project | `o<` | Project.developerId | A developer has projects |
| C2 | Document\* | `o┼` | Project | `o┼` | Project.ltsDocumentId | A project has at most one License to Sell scan (one-to-one) |
| C3 | Project | `o┼` | Property | `o<` | Property.projectId | A project has units (owner listings have no project) |
| C4 | SellerListingRequest | `o┼` | Property | `o┼` | Property.sellerRequestId | An owner's request becomes at most one listing (one-to-one) |
| C5 | User\* | `o┼` | Property | `o<` | Property.assignedAgentId | An owner listing is assigned to the agent the owner chose |
| C6 | User\* | `┼┼` | SellerListingRequest | `o<` | SellerListingRequest.agentId | An agent receives owners' requests |
| C7 | Property | `┼┼` | PropertyPhoto | `o<` | PropertyPhoto.propertyId | A listing has photos |
| C8 | Property | `┼┼` | LoanQuotation | `o<` | LoanQuotation.propertyId | A listing has loan quotations |
| C9 | Property | `┼┼` | PropertyBadge | `o<` | PropertyBadge.propertyId | A listing has badges (one of each type) |
| C10 | User\* | `┼┼` | PropertyBadge | `o<` | PropertyBadge.grantedById | A Broker grants badges |

### Layout (no crossing)

```
 ┌───────────┐ C1  ┌─────────┐ C2  ┌───────────┐
 │ Developer ├────►│ Project │◄────┤ Document* │
 └───────────┘     └────┬────┘     └───────────┘
                        │ C3
 ┌───────────────┐ C4 ┌─▼────────┐ C8  ┌───────────────┐
 │ SellerListing ├───►│ Property ├────►│ LoanQuotation │
 │ Request       │    └──┬──┬────┘     └───────────────┘
 └───────▲───────┘   C5 ╱   │ C9 ╲ C7
      C6 │            ╱     │      ╲
 ┌───────┴┐        ╱  ┌─────▼───────┐  ┌───────────────┐
 │ User*  ├──────────►│PropertyBadge│  │ PropertyPhoto │
 └────────┘   C10     └─────────────┘  └───────────────┘
```

| Cell | Column A | Column B | Column C |
|---|---|---|---|
| Row 1 | Developer | Project | Document\* |
| Row 2 | SellerListingRequest | **Property** | LoanQuotation |
| Row 3 | User\* | PropertyBadge | PropertyPhoto |

- **C1, C2:** straight lines into Project's left and right sides.
- **C3, C4, C8, C9:** straight lines between neighboring cells.
- **C5:** diagonal from User\*'s top-right corner to Property's bottom-left corner. It stays below C4.
- **C7:** diagonal from Property's bottom-right corner to PropertyPhoto's top-left corner.
- **C6:** straight up from User\* to SellerListingRequest. **C10:** straight right from User\* to
  PropertyBadge.

## Figure D. Leads and Site Visits (Module 3)

### Boxes

**Inquiry**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| propertyId (foreign key) |
| consultantId (foreign key) |
| source (enum) |
| referralCode (string) |
| buyerName (string) |
| buyerPhone (string) |
| buyerEmail (string) |
| natureOfWork (enum) |
| paymentPref (enum) |
| civilStatus (enum) |
| message (string) |
| status (enum) |
| consentAt (datetime) |
| createdAt (datetime) |
| updatedAt (datetime) |

**Visit**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| propertyId (foreign key) |
| consultantId (foreign key) |
| inquiryId (foreign key) |
| clientId (foreign key) |
| scheduledAt (datetime) |
| status (enum) |
| rescheduledFromId (foreign key) |
| declineReason (string) |
| decidedById (foreign key) |
| notes (string) |
| createdAt (datetime) |
| updatedAt (datetime) |

Reference copies: **Property\*** (id, title) twice, **User\*** (id, firstName, lastName), and
**Client\*** (id, fullName). Client is shown in full in Figure E, but its links to Inquiry,
Property and User are drawn **here**, next to the lead it came from.

### Lines (11)

| # | Parent | Parent end | Child | Child end | Foreign key | Meaning |
|---|---|---|---|---|---|---|
| D1 | Property\* | `┼┼` | Inquiry | `o<` | Inquiry.propertyId | A listing receives inquiries |
| D2 | User\* | `┼┼` | Inquiry | `o<` | Inquiry.consultantId | A consultant handles leads |
| D3 | Inquiry | `o┼` | Client\* | `o┼` | Client.inquiryId | A lead converts to at most one client (one-to-one) |
| D4 | Property\* | `┼┼` | Client\* | `o<` | Client.propertyId | A client buys one property |
| D5 | User\* | `┼┼` | Client\* | `o<` | Client.consultantId | A consultant handles clients (drives the commission split) |
| D6 | Property\* | `┼┼` | Visit | `o<` | Visit.propertyId | A listing has site visits |
| D7 | User\* | `┼┼` | Visit | `o<` | Visit.consultantId | A consultant requests visits |
| D8 | User\* | `o┼` | Visit | `o<` | Visit.decidedById | A Company Admin approves or declines visits |
| D9 | Inquiry | `o┼` | Visit | `o<` | Visit.inquiryId | A lead has visits |
| D10 | Client\* | `o┼` | Visit | `o<` | Visit.clientId | A client has visits |
| D11 | Visit | `o┼` | Visit | `o<` | Visit.rescheduledFromId | A visit can replace an earlier one (reschedule) |

### Layout (no crossing)

```
 ┌────────────┐  D1   ┌─────────┐
 │ Property*  ├──────►│ Inquiry │
 └─────┬──────┘       └┬───▲───┬┘
       │           D9 ╱    │D2  ╲ D3
       │ D6         ╱  ┌───┴───┐  ╲         ┌────────────┐
       │          ╱    │ User* │    ╲       │ Property*  │
       │        ╱      └┬─┬───┬┘      ╲     └─────┬──────┘
       │      ╱  D7, D8╱ ╱     ╲ D5     ╲         │ D4
 ╭─┐ ┌─▼────▼────┐   ╱ ╱         ╲        ╲ ┌─────▼──────┐
 │ └─┤   Visit   │◄─╯─╯           ╰──────►╰►│  Client*   │
 ╰──►│           │◄─────────────────────────┤            │
 D11 └───────────┘          D10             └────────────┘
```

| Cell | Column A | Column B | Column C |
|---|---|---|---|
| Row 1 | Property\* | **Inquiry** | (empty) |
| Row 2 | (empty) | User\* | Property\* (2nd copy) |
| Row 3 | **Visit** | (empty) | Client\* |

- **D1:** straight right from Property\* to Inquiry. **D6:** straight down from Property\* to Visit.
- **D2:** straight up from User\* to Inquiry.
- **D9:** diagonal from Inquiry's bottom-left corner to Visit's top-right area.
- **D3:** diagonal from Inquiry's bottom-right corner to Client\*'s top-left corner.
- **D7, D8:** two parallel diagonals from User\*'s lower-left to Visit's right side (upper half).
- **D5:** diagonal from User\*'s lower-right to Client\*'s left side (upper half).
- **D4:** straight down from the second Property\* copy to Client\*.
- **D10:** straight horizontal line along the bottom, from Client\*'s left side (lower half) to
  Visit's right side (lower half).
- **D11:** a loop on Visit's left side.

Check: D9 stays above D7/D8, D3 stays above D5, and D10 stays below both. No lines cross.

## Figure E. Clients, Payments, Requirements, Closing and Ratings (Module 3)

### Boxes

**Client**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| inquiryId (foreign key, unique) |
| propertyId (foreign key) |
| consultantId (foreign key) |
| fullName (string) |
| phone (string) |
| email (string) |
| civilStatus (enum) |
| paymentMethod (enum) |
| employmentType (enum) |
| tcp (decimal) |
| saleType (enum) |
| reservationPaidAt (datetime) |
| downpaymentAmount (decimal) |
| status (enum) |
| createdAt (datetime) |
| updatedAt (datetime) |

**Payment**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| clientId (foreign key) |
| kind (enum) |
| amount (decimal) |
| paidAt (datetime) |
| proofDocumentId (foreign key, unique) |
| confirmedById (foreign key) |
| createdAt (datetime) |

**RequirementItem**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| clientId (foreign key) |
| code (string) |
| label (string) |
| appliesTo (string) |
| stage (enum) |
| required (boolean) |
| status (enum) |
| documentId (foreign key) |
| verifiedById (foreign key) |
| verifiedAt (datetime) |

**ClosingRecord**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| clientId (foreign key, unique) |
| sellingPrice (decimal) |
| computation (json) |
| checklist (json) |

**RatingToken**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| clientId (foreign key, unique) |
| consultantId (foreign key) |
| tokenHash (string, unique) |
| expiresAt (datetime) |
| usedAt (datetime) |

**Rating**

| Field |
|---|
| id (primary key) |
| consultantId (foreign key) |
| clientId (foreign key, unique) |
| stars (integer) |
| comment (string) |
| createdAt (datetime) |

Reference copies: **Document\*** (id, storageKey) and **User\*** (id, firstName, lastName) twice.

### Lines (11)

| # | Parent | Parent end | Child | Child end | Foreign key | Meaning |
|---|---|---|---|---|---|---|
| E1 | Client | `┼┼` | Payment | `o<` | Payment.clientId | A client makes payments |
| E2 | Document\* | `o┼` | Payment | `o┼` | Payment.proofDocumentId | A payment has at most one receipt scan (one-to-one) |
| E3 | User\* | `o┼` | Payment | `o<` | Payment.confirmedById | A consultant confirms payments |
| E4 | Client | `┼┼` | RequirementItem | `o<` | RequirementItem.clientId | A client has a requirement checklist |
| E5 | Document\* | `o┼` | RequirementItem | `o<` | RequirementItem.documentId | A requirement item is satisfied by an uploaded document |
| E6 | User\* | `o┼` | RequirementItem | `o<` | RequirementItem.verifiedById | A Broker verifies requirement items |
| E7 | Client | `┼┼` | ClosingRecord | `o┼` | ClosingRecord.clientId | A client has at most one closing record (one-to-one) |
| E8 | Client | `┼┼` | RatingToken | `o┼` | RatingToken.clientId | A client gets at most one rating link (one-to-one) |
| E9 | User\* | `┼┼` | RatingToken | `o<` | RatingToken.consultantId | A rating link is for one consultant |
| E10 | Client | `┼┼` | Rating | `o┼` | Rating.clientId | A client gives at most one rating (one-to-one) |
| E11 | User\* | `┼┼` | Rating | `o<` | Rating.consultantId | A consultant receives ratings |

### Layout (no crossing)

```
 ┌─────────┐   E2   ┌───────────┐   E5   ┌─────────────────┐
 │ Payment │◄───────┤ Document* ├───────►│ RequirementItem │
 └─▲─────▲─┘        └───────────┘        └─▲─────────────▲─┘
   │ E3   ╲ E1                         E4 ╱         E6  │
 ┌─┴─────┐ ╲       ┌──────────┐         ╱          ┌────┴───┐
 │ User* │   ╲─────┤  Client  ├────────╱           │ User*  │
 └─┬─────┘   ╱─────┤          ├────────╲           └────┬───┘
   │ E9     ╱ E8   └────┬─────┘     E10 ╲          E11  │
 ┌─▼──────▼───┐    E7   │                ╲ ┌────────────▼┐
 │RatingToken │   ┌─────▼─────────┐       ►│   Rating    │
 └────────────┘   │ ClosingRecord │        └─────────────┘
                  └───────────────┘
```

| Cell | Column A | Column B | Column C |
|---|---|---|---|
| Row 1 | Payment | Document\* | RequirementItem |
| Row 2 | User\* | **Client** | User\* (2nd copy) |
| Row 3 | RatingToken | ClosingRecord | Rating |

- **E2, E5:** straight horizontal lines from Document\* to its neighbors.
- **E1, E4, E8, E10:** diagonals from Client's four corners to the four corner boxes.
- **E3, E9:** straight vertical lines from the left User\*. **E6, E11:** straight vertical lines from
  the right User\*.
- **E7:** straight down from Client to ClosingRecord.

Client's links to Inquiry, Property and its consultant (User) are in Figure D (lines D3–D5).

## Figure F. Commissions (Module 3)

### Boxes

**CommissionSplitConfig**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| handledBy (enum) |
| brokerPct (decimal) |
| salesManagerPct (decimal) |
| salesPersonPct (decimal) |

**CommissionTemplate**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| developerId (foreign key) |
| paymentMethod (enum) |
| grossRatePct (decimal) |
| requiresTransmittal (boolean) |

**CommissionTemplateTranche**

| Field |
|---|
| id (primary key) |
| templateId (foreign key) |
| sequence (integer) |
| label (string) |
| sharePct (decimal) |
| trigger (enum) |
| triggerValue (decimal) |
| requiredStage (enum) |

**Commission**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| clientId (foreign key, unique) |
| templateId (foreign key) |
| grossAmount (decimal) |
| splitSnapshot (json) |

**CommissionTranche**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| commissionId (foreign key) |
| sequence (integer) |
| label (string) |
| amount (decimal) |
| status (enum) |
| milestoneReachedAt (datetime) |
| docsCompleteAt (datetime) |
| transmittalDocumentId (foreign key) |
| transmittalAmount (decimal) |
| awaitingSince (datetime) |
| trigger (enum) |
| triggerValue (decimal) |
| requiredStage (enum) |
| requiresTransmittal (boolean) |
| periodMonth (string) |

**CommissionVoucher**

| Field |
|---|
| id (primary key) |
| firmId (foreign key) |
| trancheId (foreign key, unique) |
| voucherNo (string) |
| lines (json) |
| totalNet (decimal) |
| contentHash (string) |
| brokerSignedAt (datetime) |
| brokerSignature (json) |
| consultantSignatures (json) |
| releasedAt (datetime) |
| createdAt (datetime) |

Reference copies: **Developer\*** (id, name), **Client\*** (id, fullName), **Document\*** (id, storageKey).

The people in a commission (`splitSnapshot`) and the voucher signers (`lines`, `brokerSignature`,
`consultantSignatures`) are stored as **json** copies, on purpose: a later change to the team or the
split must never change a live deal or a signed voucher. So they are not drawn as lines to User.
**CommissionSplitConfig** has no line in this figure. Its only link is `firmId` (Figure A), and its
`handledBy` value (Sales Manager / Sales Person) is matched to the client's consultant when a
commission is created.

### Lines (7)

| # | Parent | Parent end | Child | Child end | Foreign key | Meaning |
|---|---|---|---|---|---|---|
| F1 | Developer\* | `o┼` | CommissionTemplate | `o<` | CommissionTemplate.developerId | A developer has a template per payment method (private-sale templates have no developer) |
| F2 | CommissionTemplate | `┼┼` | CommissionTemplateTranche | `o<` | CommissionTemplateTranche.templateId | A template defines its tranches |
| F3 | CommissionTemplate | `┼┼` | Commission | `o<` | Commission.templateId | A commission is computed from one template |
| F4 | Client\* | `┼┼` | Commission | `o┼` | Commission.clientId | A client deal has at most one commission (one-to-one) |
| F5 | Commission | `┼┼` | CommissionTranche | `o<` | CommissionTranche.commissionId | A commission is split into tranches |
| F6 | Document\* | `o┼` | CommissionTranche | `o<` | CommissionTranche.transmittalDocumentId | A tranche has the developer's transmittal scan |
| F7 | CommissionTranche | `┼┼` | CommissionVoucher | `o┼` | CommissionVoucher.trancheId | A tranche has at most one voucher (one-to-one) |

### Layout (no crossing)

```
 ┌────────────┐ F1 ┌────────────────────┐ F2 ┌───────────────────────────┐
 │ Developer* ├───►│ CommissionTemplate ├───►│ CommissionTemplateTranche │
 └────────────┘    └─────────┬──────────┘    └───────────────────────────┘
                             │ F3
 ┌────────────┐ F4 ┌─────────▼──────────┐    ┌───────────────────────────┐
 │  Client*   ├───►│     Commission     │    │   CommissionSplitConfig   │
 └────────────┘    └─────────┬──────────┘    │   (no lines here)         │
                             │ F5            └───────────────────────────┘
 ┌────────────┐ F6 ┌─────────▼──────────┐ F7 ┌───────────────────────────┐
 │ Document*  ├───►│ CommissionTranche  ├───►│     CommissionVoucher     │
 └────────────┘    └────────────────────┘    └───────────────────────────┘
```

| Cell | Column A | Column B | Column C |
|---|---|---|---|
| Row 1 | Developer\* | CommissionTemplate | CommissionTemplateTranche |
| Row 2 | Client\* | **Commission** | CommissionSplitConfig |
| Row 3 | Document\* | CommissionTranche | CommissionVoucher |

All lines are straight, horizontal or vertical.

### ERD count check

Figure A has 20 lines, B 8, C 10, D 11, E 11 and F 7, for **67 lines** in total. That is one line
for every foreign key in the database. Each table is drawn in full once: Firm in A; User,
Credential, Document and AuditLog in B; 7 tables in C; 2 in D; 6 in E; 6 in F, for **26 tables**.

---

# Part 4. Relational Data Model (Crow's Foot)

This is the professor's second sample: the tables drawn as **grids with sample rows**, with an
**arrow from each primary key column to the foreign key column that uses it**. The arrow points
into the child table, as in the sample. The matching values (e.g. `u4` in both columns) show the
reader how the rows are linked.

### Rules for the relational figures

1. **Same 6 figures (A–F)** and the same reference copies (`*`) as the ERD.
2. **Columns shown:** the primary key, every foreign key, and the 2–4 most important other columns,
   like the professor's sample (which shows 3 columns per table). The full column list is in the ERD.
   Add this note: *"Main columns only; see the ERD for all fields."*
3. **Sample IDs are shortened** (`u4`, `pr1`). The real system uses 25-character codes (cuid), e.g.
   `cm3x9q2a80001…`. Add this note: *"IDs shortened for readability."*
4. **`—` means empty (null).**
5. **How to avoid crossing arrows** (used in every layout below):
   - Put **parent tables above** their child table.
   - Put the child's **foreign key columns in the same left-to-right order** as their parents above.
   - When one key column sends arrows to several tables, the arrow to the **farthest** table uses
     the **highest** horizontal line.
6. The sample data is the same in every figure (the demo story: Advench Realty, consultant Paolo
   Garcia, buyer Mario Fernandez buying an Ella Model unit at Camella Naga).

## Figure A. Firm Ownership (relational)

**Firm** (top center)

| id | name | slug | status |
|---|---|---|---|
| f1 | Advench Realty | advench | ACTIVE |
| f2 | Bicol Prime Realty | bicol-prime | ACTIVE |

Below it, two columns of **mini tables**, 10 on the left and 10 on the right (same order as ERD
Figure A). Each mini table has one sample row and three columns:

| Mini table | Columns and sample row |
|---|---|
| User | id `u4` · name `Paolo Garcia` · firmId `f1` (also add row `u0` · `Platform Admin` · firmId `—`) |
| AuditLog | id `a1` · action `DOCUMENT_APPROVED` · firmId `f1` (also add row `a2` · `LOGIN` · firmId `—`) |
| Credential | id `c1` · type `PRC_LICENSE` · firmId `f1` |
| Document | id `d1` · declaredType `PRC_ID` · firmId `f1` |
| Developer | id `dv1` · name `Vista Land (Camella)` · firmId `f1` |
| Project | id `p1` · name `Camella Naga` · firmId `f1` |
| Property | id `pr1` · title `Ella Model` · firmId `f1` |
| SellerListingRequest | id `s1` · sellerName `Rosa Lim` · firmId `f1` |
| Inquiry | id `i1` · buyerName `Mario Fernandez` · firmId `f1` |
| Visit | id `v1` · status `APPROVED` · firmId `f1` |
| Client | firmId `f1` · id `cl1` · fullName `Mario Fernandez` |
| Payment | firmId `f1` · id `pay1` · kind `RESERVATION` |
| RequirementItem | firmId `f1` · id `r1` · code `VALID_ID_1` |
| ClosingRecord | firmId `f1` · id `cr1` · sellingPrice `2,850,000.00` |
| RatingToken | firmId `f1` · id `rt1` · expiresAt `2026-12-13` |
| CommissionSplitConfig | firmId `f1` · id `sc1` · handledBy `SALES_PERSON` |
| CommissionTemplate | firmId `f1` · id `tp1` · paymentMethod `CASH` |
| Commission | firmId `f1` · id `cm1` · grossAmount `142,500.00` |
| CommissionTranche | firmId `f1` · id `t1` · label `Advance` |
| CommissionVoucher | firmId `f1` · id `vo1` · voucherNo `ADV-2026-0001` |

**Arrows:** one trunk line goes down from Firm's `id` column through the gap between the two
columns of mini tables. From the trunk, one short arrow branches to each mini table's `firmId`
column. That is why `firmId` is the **last** column on the left-hand tables and the **first** column
on the right-hand tables: every arrow reaches its column from the trunk side, without crossing.

## Figure B. Accounts and Document Verification (relational)

**Row 1 — User**

| id | firmId | role | firstName | lastName | managerId | brokerId | referralCode |
|---|---|---|---|---|---|---|---|
| u0 | — | SUPER_ADMIN | Platform | Admin | — | — | — |
| u1 | f1 | COMPANY_ADMIN | Andrea | Villanueva | — | — | — |
| u2 | f1 | BROKER | Bernardo | Reyes | — | — | BREYES |
| u3 | f1 | SALES_MANAGER | Marco | Dela Cruz | — | u2 | MDCRUZ |
| u4 | f1 | SALES_PERSON | Paolo | Garcia | u3 | — | PGARCIA |

**Row 2, left — Document** (under User)

| id | uploadedById | reviewedById | ownerType | ownerId | declaredType | reviewStatus | firmId |
|---|---|---|---|---|---|---|---|
| d1 | u1 | u2 | CREDENTIAL | c1 | PRC_ID | APPROVED | f1 |
| d2 | u1 | — | CREDENTIAL | c2 | DHSUD_CERT | READY_FOR_REVIEW | f1 |

**Row 2, middle — User\*** (reference copy)

| id | firstName | lastName |
|---|---|---|
| u2 | Bernardo | Reyes |
| u3 | Marco | Dela Cruz |
| u4 | Paolo | Garcia |

**Row 2, right — AuditLog**

| id | actorId | action | entityType | entityId | firmId |
|---|---|---|---|---|---|
| a1 | u2 | DOCUMENT_APPROVED | Document | d1 | f1 |
| a2 | u0 | LOGIN | User | u0 | — |

**Row 3 — Credential** (under Document and User\*)

| id | documentId | userId | reviewedById | type | numberEntered | status | firmId |
|---|---|---|---|---|---|---|---|
| c1 | d1 | u4 | u2 | PRC_LICENSE | 0012345 | APPROVED | f1 |
| c2 | d2 | u3 | — | DHSUD_REGISTRATION | DHSUD-0456 | READY_FOR_REVIEW | f1 |

**Arrows (8):**

| From (primary key) | To (foreign key) | Route |
|---|---|---|
| User.id | User.managerId | Loop **above** User (inner loop) |
| User.id | User.brokerId | Loop **above** User (outer loop) |
| User.id | AuditLog.actorId | Down from User, then right at the **highest** level, then down into AuditLog |
| User.id | Document.uploadedById | Down from User, then right at a lower level, into Document |
| User.id | Document.reviewedById | Same as above, next column |
| Document.id | Credential.documentId | Straight down |
| User\*.id | Credential.userId | Down and left into Credential |
| User\*.id | Credential.reviewedById | Down and left into the next column |

## Figure C. Marketplace and Property Management (relational)

| Row | Left | Middle | Right |
|---|---|---|---|
| 1 | Document\* | Developer | User\* (1st copy) |
| 2 | Project (under Document\* and Developer) | SellerListingRequest (under User\*) | User\* (2nd copy) |
| 3 | **Property** (wide, under the three row-2 tables) | | User\* (3rd copy) |
| 4 | PropertyPhoto | LoanQuotation | PropertyBadge |

**Document\*** — `id | storageKey`: `d3 | lts/camella-naga.pdf`

**Developer**

| id | name | isActive | firmId |
|---|---|---|---|
| dv1 | Vista Land (Camella) | true | f1 |

**User\*** — `id | firstName | lastName`: `u2 | Bernardo | Reyes` and `u4 | Paolo | Garcia` (the same rows in all three copies)

**Project**

| id | ltsDocumentId | developerId | name | ltsStatus | firmId |
|---|---|---|---|---|---|
| p1 | d3 | dv1 | Camella Naga | APPROVED | f1 |

**SellerListingRequest**

| id | agentId | sellerName | propertyType | askingPrice | status | firmId |
|---|---|---|---|---|---|---|
| s1 | u4 | Rosa Lim | LOT | 1,100,000.00 | LISTED | f1 |

**Property**

| id | projectId | sellerRequestId | assignedAgentId | title | source | price | status | firmId |
|---|---|---|---|---|---|---|---|---|
| pr1 | p1 | — | — | Ella Model | DEVELOPER | 2,850,000.00 | LIVE | f1 |
| pr2 | — | s1 | u4 | Lot in Pacol | INDIVIDUAL_SELLER | 1,100,000.00 | LIVE | f1 |

**PropertyPhoto**

| id | propertyId | key | sort |
|---|---|---|---|
| ph1 | pr1 | photos/ella-1.jpg | 0 |
| ph2 | pr2 | photos/pacol-1.jpg | 0 |

**LoanQuotation**

| id | propertyId | label | paymentMethod | monthlyAmortization |
|---|---|---|---|---|
| q1 | pr1 | Pag-IBIG 30 yrs | PAG_IBIG | 14,200.00 |
| q2 | pr1 | Bank 20 yrs | BANK | 21,800.00 |

**PropertyBadge**

| id | propertyId | grantedById | type | validUntil |
|---|---|---|---|---|
| b1 | pr1 | u2 | LTS_VERIFIED | 2027-06-30 |
| b2 | pr2 | u2 | OWNERSHIP_VERIFIED | — |

**Arrows (10):**

| From | To | Route |
|---|---|---|
| Document\*.id | Project.ltsDocumentId | Straight down |
| Developer.id | Project.developerId | Down and left |
| User\* (1st).id | SellerListingRequest.agentId | Straight down |
| Project.id | Property.projectId | Straight down |
| SellerListingRequest.id | Property.sellerRequestId | Straight down |
| User\* (2nd).id | Property.assignedAgentId | Down and left |
| Property.id | PropertyPhoto.propertyId | Down (lowest horizontal level) |
| Property.id | LoanQuotation.propertyId | Down (middle level) |
| Property.id | PropertyBadge.propertyId | Down (highest level, farthest table) |
| User\* (3rd).id | PropertyBadge.grantedById | Down and left, into the last column |

## Figure D. Leads and Site Visits (relational)

| Row | Tables, left to right |
|---|---|
| 1 | Property\* · User\* |
| 2 | **Inquiry** · Property\* · User\* |
| 3 | Client\* · Inquiry\* · Property\* · User\* |
| 4 | **Visit** (wide) |

Each row holds exactly the parents of the table below it, in the same order as that table's
foreign key columns. That is what keeps every arrow straight and uncrossed.

**Property\*** — `id | title`: `pr1 | Ella Model`, `pr2 | Lot in Pacol` (same rows in every copy)

**User\*** — `id | firstName | lastName`: `u1 | Andrea | Villanueva`, `u4 | Paolo | Garcia` (same rows in every copy)

**Inquiry**

| id | propertyId | consultantId | buyerName | source | referralCode | status | firmId |
|---|---|---|---|---|---|---|---|
| i1 | pr1 | u4 | Mario Fernandez | REFERRAL | PGARCIA | RESERVED | f1 |
| i2 | pr2 | u4 | Noel Santiago | ORGANIC | — | CONTACTED | f1 |

**Client\*** (row 3) — `id | inquiryId | propertyId | consultantId | fullName`:
`cl1 | i1 | pr1 | u4 | Mario Fernandez`

**Inquiry\*** (row 3) — `id | buyerName`: `i1 | Mario Fernandez`, `i2 | Noel Santiago`

**Visit**

| id | clientId | inquiryId | propertyId | consultantId | decidedById | rescheduledFromId | scheduledAt | status |
|---|---|---|---|---|---|---|---|---|
| v1 | — | i1 | pr1 | u4 | u1 | — | 2026-11-08 09:00 | COMPLETED |
| v2 | — | i2 | pr2 | u4 | u1 | — | 2026-11-15 14:00 | RESCHEDULED |
| v3 | — | i2 | pr2 | u4 | — | v2 | 2026-11-16 10:00 | PENDING |

**Arrows (11):**

| From | To | Route |
|---|---|---|
| Property\* (row 1).id | Inquiry.propertyId | Straight down |
| User\* (row 1).id | Inquiry.consultantId | Down and left |
| Inquiry.id | Client\*.inquiryId | Straight down |
| Property\* (row 2).id | Client\*.propertyId | Down and left |
| User\* (row 2).id | Client\*.consultantId | Down and left |
| Client\*.id | Visit.clientId | Straight down |
| Inquiry\* (row 3).id | Visit.inquiryId | Down |
| Property\* (row 3).id | Visit.propertyId | Down |
| User\* (row 3).id | Visit.consultantId | Down |
| User\* (row 3).id | Visit.decidedById | Down, next column |
| Visit.id | Visit.rescheduledFromId | Loop **under** Visit (v2 was rescheduled; the new visit v3 points back to it) |

Client is shown with its key columns here because its links to Inquiry, Property and User belong
to this figure (as in the ERD). Its full row is in Figure E.

## Figure E. Clients, Payments, Requirements, Closing and Ratings (relational)

The parents of these five tables overlap (Client, Document, User). So draw **five small groups side
by side**. Each group is its parent copies on top and the child table underneath. The main
**Client** table sits at the top-left, above group 1.

**Client** (main table)

| id | inquiryId | propertyId | consultantId | fullName | paymentMethod | tcp | status | firmId |
|---|---|---|---|---|---|---|---|---|
| cl1 | i1 | pr1 | u4 | Mario Fernandez | CASH | 2,850,000.00 | COMPLETED | f1 |

| Group | Parents on top (left to right) | Child underneath |
|---|---|---|
| 1 | Client · Document\* · User\* | Payment |
| 2 | Client\* · Document\* · User\* | RequirementItem |
| 3 | Client\* | ClosingRecord |
| 4 | Client\* · User\* | RatingToken |
| 5 | Client\* · User\* | Rating |

Reference copies: **Client\*** — `id | fullName`: `cl1 | Mario Fernandez` ·
**Document\*** — `id | declaredType`: `d5 | PAYMENT_RECEIPT`, `d6 | VALID_ID` ·
**User\*** — `id | firstName | lastName`: `u2 | Bernardo | Reyes`, `u4 | Paolo | Garcia`

**Payment**

| id | clientId | proofDocumentId | confirmedById | kind | amount | paidAt | firmId |
|---|---|---|---|---|---|---|---|
| pay1 | cl1 | d5 | u4 | RESERVATION | 20,000.00 | 2026-10-05 | f1 |

**RequirementItem**

| id | clientId | documentId | verifiedById | code | appliesTo | stage | status | firmId |
|---|---|---|---|---|---|---|---|---|
| r1 | cl1 | d6 | u2 | VALID_ID_1 | BUYER | RESERVATION | VERIFIED | f1 |
| r2 | cl1 | — | — | VALID_ID_2 | BUYER | RESERVATION | WAIVED | f1 |

**ClosingRecord**

| id | clientId | sellingPrice | firmId |
|---|---|---|---|
| cr1 | cl1 | 2,850,000.00 | f1 |

**RatingToken**

| id | clientId | consultantId | expiresAt | usedAt | firmId |
|---|---|---|---|---|---|
| rt1 | cl1 | u4 | 2026-12-13 | 2026-11-14 | f1 |

**Rating**

| id | clientId | consultantId | stars | comment |
|---|---|---|---|---|
| rg1 | cl1 | u4 | 5 | Very helpful and honest. |

**Arrows (11):** every arrow goes **straight down** from a parent's `id` to the column under it:
Client→Payment.clientId, Document\*→Payment.proofDocumentId, User\*→Payment.confirmedById,
Client\*→RequirementItem.clientId, Document\*→RequirementItem.documentId,
User\*→RequirementItem.verifiedById, Client\*→ClosingRecord.clientId,
Client\*→RatingToken.clientId, User\*→RatingToken.consultantId, Client\*→Rating.clientId,
User\*→Rating.consultantId.

## Figure F. Commissions (relational)

| Row | Left | Right |
|---|---|---|
| 1 | Developer\* | |
| 2 | CommissionTemplate | Client\* |
| 3 | CommissionTemplateTranche | **Commission** |
| 4 | Document\* | CommissionTranche (under Commission, Document\* on its right) |
| 5 | | CommissionVoucher (under CommissionTranche) |
| 6 | CommissionSplitConfig (no arrows; only `firmId`) | |

The exact placement: Document\* sits in row 3, to the **right** of Commission, so its arrow drops
into CommissionTranche's last key column.

**Developer\*** — `id | name`: `dv1 | Vista Land (Camella)`

**CommissionTemplate**

| id | developerId | paymentMethod | grossRatePct | requiresTransmittal | firmId |
|---|---|---|---|---|---|
| tp1 | dv1 | CASH | 5.000 | true | f1 |

**Client\*** — `id | fullName`: `cl1 | Mario Fernandez`

**CommissionTemplateTranche**

| id | templateId | sequence | label | sharePct | trigger | requiredStage |
|---|---|---|---|---|---|---|
| tt1 | tp1 | 1 | Advance | 20.000 | ON_RESERVATION | RESERVATION |
| tt2 | tp1 | 2 | Final | 80.000 | FULL_PAYMENT | RESERVATION |

**Commission**

| id | templateId | clientId | grossAmount | firmId |
|---|---|---|---|---|
| cm1 | tp1 | cl1 | 142,500.00 | f1 |

**Document\*** — `id | declaredType`: `d7 | TRANSMITTAL`

**CommissionTranche**

| id | commissionId | transmittalDocumentId | sequence | label | amount | status | firmId |
|---|---|---|---|---|---|---|---|
| t1 | cm1 | — | 1 | Advance | 28,500.00 | RELEASED | f1 |
| t2 | cm1 | d7 | 2 | Final | 114,000.00 | AWAITING_TRANSMITTAL | f1 |

**CommissionVoucher**

| id | trancheId | voucherNo | totalNet | brokerSignedAt | releasedAt | firmId |
|---|---|---|---|---|---|---|
| vo1 | t1 | ADV-2026-0001 | 28,500.00 | 2026-10-08 10:12 | 2026-10-09 15:40 | f1 |

**CommissionSplitConfig**

| id | handledBy | brokerPct | salesManagerPct | salesPersonPct | firmId |
|---|---|---|---|---|---|
| sc1 | SALES_PERSON | 20.000 | 20.000 | 60.000 | f1 |
| sc2 | SALES_MANAGER | 30.000 | 70.000 | 0.000 | f1 |

**Arrows (7):**

| From | To | Route |
|---|---|---|
| Developer\*.id | CommissionTemplate.developerId | Straight down |
| CommissionTemplate.id | CommissionTemplateTranche.templateId | Straight down (lower level) |
| CommissionTemplate.id | Commission.templateId | Down, then right at the **higher** level |
| Client\*.id | Commission.clientId | Straight down |
| Commission.id | CommissionTranche.commissionId | Straight down |
| Document\*.id | CommissionTranche.transmittalDocumentId | Down and left |
| CommissionTranche.id | CommissionVoucher.trancheId | Straight down |

The sample numbers check out: 2,850,000 × 5% = 142,500 gross. The Advance tranche is 20% = 28,500.
With the Sales Person split (20 / 20 / 60) and 0% withholding, the voucher pays the broker 5,700,
the manager 5,700 and the salesperson 17,100, for a total net of 28,500.

---

## Part 5. Final checklist before submitting

- [ ] 6 ERD figures (A–F) and 6 relational figures (A–F), each with its caption.
- [ ] Every table is drawn in full once; reference copies are gray and end with `*`.
- [ ] The notes are under the figures: "\* Shown in full in Figure …", "Every firmId links to
      Firm (see Figure A)", and, for the relational figures, "Main columns only" and
      "IDs shortened for readability".
- [ ] Every line has a symbol at **both** ends, matching the tables in Part 3.
- [ ] Each foreign key has the same color as the primary key it points to.
- [ ] No two lines or arrows cross. Lines may share a trunk (Figure A) but never cross.
- [ ] Counts: 26 tables, 67 relationships (A 20 · B 8 · C 10 · D 11 · E 11 · F 7).
- [ ] Table and field names are spelled exactly as in the database (e.g. `SellerListingRequest`,
      `assignedAgentId`).
