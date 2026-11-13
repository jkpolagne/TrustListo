# TrustListo — DFD Level 0 Guide (one diagram per module)

A drawing guide for the Chapter 3 Level 0 data flow diagrams, drawn **one diagram per module** so
no single diagram is too big. It goes with **docs/DFD-CONTEXT-DIAGRAM.md**. Every external arrow here
has the same name, entity and direction as on the context diagram. Checked against the finished
system (SPEC.md, the API code, the database schema) and docs/FUNCTIONAL-REQUIREMENTS.md on 2026-11-12.

| Diagram | Title to write above it | Processes | Matches Functional Requirements |
|---|---|---|---|
| A | **Shared: Account and Firm Administration — Level 0 DFD** | 1.0 – 2.0 | Sections 1–4 (Shared) |
| B | **Module 1: AI Document Processing and Verification — Level 0 DFD** | 3.0 – 5.0 | Sections 5–9 |
| C | **Module 2: Marketplace and Property Management — Level 0 DFD** | 6.0 – 10.0 | Sections 10–13 |
| D | **Module 3: Sales, Client and Commission Management — Level 0 DFD** | 11.0 – 18.0 | Sections 14–24 |

**Why there is a "Shared" diagram:** the context diagram has 7 arrows that belong to no module:
the Super Admin's company accounts, consultant accounts, and firm settings. Your Functional
Requirements already put them under "Shared requirements". If you leave them out, the module
diagrams won't balance with the context diagram.

---

## Part 1. Background (for anyone reading this file first)

TrustListo is a multi-tenant web platform for real estate brokerage firms.

- **Module 1:** OCR reads every uploaded scan, extracts fields, cross-checks them, and **flags**
  problems. The AI never approves. Only the **Broker** verifies.
- **Module 2:** firms list developer units and property owners' properties. The public browses,
  estimates loans, and sends inquiries without logging in.
- **Module 3:** leads, site visits, clients, payments, buyer requirement checklist, staged
  commissions (released only when the payment milestone **and** verified documents are both met),
  vouchers signed by the broker first, closing, ratings, reports.

No money moves through the system. Buyers and owners never log in. Buyers cannot book site visits.

---

## Part 2. Rules for these diagrams

1. **Process numbers never repeat across the four diagrams** (1.0 to 18.0). When you make Level 1
   later, process 4.0 becomes 4.1, 4.2, … and nobody confuses it with another diagram's 4.0.
2. **Data store numbers are the same in every diagram.** D12 is always "Document". A data store can
   appear in more than one module diagram, because the modules share data. That's normal.
3. **Shared data stores:** a data store may be only **read** in one module diagram because another
   module **writes** it. Each diagram below lists which stores come from other modules. A panelist may
   ask "who writes this store?". The answer is in that list.
4. **Balancing:** every context-diagram arrow appears in exactly one module diagram, with the same
   label (checklist in Part 7).
5. **Entities never connect directly to data stores. Data stores never connect to each other.**
6. **Labels are nouns.** The arrow direction shows saving (process → store) or reading (store → process).
7. **To avoid crossing lines, draw duplicates.**
   - A duplicate **data store** gets an extra vertical line at its left end.
   - A duplicate **entity** gets a small diagonal line in its top-left corner.
   - **D17 Audit Log** is a good one to duplicate.

### The 17 data stores (same in every diagram)

| No. | Data store | What is in it |
|---|---|---|
| D1 | **Firm** | Company details, status, firm settings (loan defaults, closing tax rates, withholding %) |
| D2 | **User Account** | All users: role, hierarchy, active status, referral code |
| D3 | **Credential** | Consultant PRC / DHSUD credentials, number, expiry, status |
| D4 | **Developer and Project** | Developers, projects, License to Sell number and expiry |
| D5 | **Property** | Listings, photos, badges, loan quotations, listing status |
| D6 | **Seller Listing Request** | Property owners' requests and status |
| D7 | **Inquiry** | Buyer inquiries (leads) and lead status |
| D8 | **Site Visit** | Visit schedules and status |
| D9 | **Client** | Converted buyers: TCP, payment method, civil status, client status |
| D10 | **Payment** | Payments recorded from receipts |
| D11 | **Requirement Item** | Each buyer's checklist items and status |
| D12 | **Document** | Every uploaded scan + AI results (OCR text, fields, flags) + broker decision |
| D13 | **Commission Setting** | Commission split %, developer commission templates |
| D14 | **Commission** | Commissions, tranches, vouchers, signatures |
| D15 | **Closing Record** | Closing cost computation and checklist |
| D16 | **Rating** | One-time rating links and ratings |
| D17 | **Audit Log** | Every approval, rejection, signature, status change |

**How to read the arrow tables:**

- **IN:** entity → process.
- **OUT:** process → entity.
- **WRITE:** process → data store.
- **READ:** data store → process.

---

## Part 3. Diagram A — Shared: Account and Firm Administration

**Entities:** Super Admin, Company Admin · **Stores:** D1, D2, D3, D5, D13, D17

### 1.0 Manage Company Accounts

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Super Admin | Company Account Data *(Planned)* |
| IN | Super Admin | Company Status Update *(Planned)* |
| OUT | Super Admin | Company Records |
| OUT | Super Admin | Platform Activity Logs *(Planned)* |
| WRITE | D1 Firm | Firm Details |
| READ | D1 Firm | Firm Details |
| WRITE | D2 User Account | Company Admin Account *(Planned)* |
| READ | D2 User Account | User Counts |
| READ | D5 Property | Live Listing Counts |
| READ | D17 Audit Log | Platform Activity Entries |
| WRITE | D17 Audit Log | Activity Entry |

### 2.0 Manage Consultants and Firm Settings

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Company Admin | Consultant Account Data |
| IN | Company Admin | Firm Settings |
| OUT | Company Admin | Consultant Records |
| WRITE | D2 User Account | Consultant Account |
| READ | D2 User Account | Consultant Details |
| READ | D3 Credential | Credential Status |
| WRITE | D1 Firm | Firm Settings |
| WRITE | D13 Commission Setting | Commission Split and Templates |
| WRITE | D17 Audit Log | Activity Entry |

**Layout:**

```
 Super Admin  ──►  [1.0]  ──►  D1 Firm      D5 Property
                     │          D2 User Account
                     ▼          D17 Audit Log
 Company Admin ──►  [2.0]  ──►  D3 Credential   D13 Commission Setting
```

- Entities on the left, processes in the middle, stores on the right.
- Put D1, D2 and D17 **between** 1.0 and 2.0, because both processes use them.

**From other modules:** D3 is written in Module 1. D5 is written in Module 2.

---

## Part 4. Diagram B — Module 1: AI Document Processing and Verification

**Entities:** Company Admin, Broker, Sales Consultant · **Stores:** D2, D3, D4, D5, D6, D9, D10, D11, D12, D14, D17

How it works: 3.0 saves the scan. 4.0 (the AI) reads **every** new scan in D12, including the ones
saved by Modules 2 and 3 (seller documents, receipts, buyer documents, transmittals). 5.0 is the
Broker's decision.

### 3.0 Upload Credential and License to Sell

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Company Admin | Consultant Credential |
| IN | Company Admin | License to Sell |
| WRITE | D3 Credential | Credential Details |
| READ | D4 Developer and Project | Project Details |
| WRITE | D12 Document | Credential and License Scans |

### 4.0 Read and Check Document (AI)

| Type | Connects to | Data flow label |
|---|---|---|
| READ | D12 Document | Uploaded Scan |
| WRITE | D12 Document | Extracted Text and Fields |
| WRITE | D12 Document | Flags and Suggested Status |
| READ | D12 Document | Other Uploaded Documents |
| READ | D2 User Account | Consultant Name |
| READ | D3 Credential | Credential Number |
| READ | D4 Developer and Project | Project and Developer Name |
| READ | D6 Seller Listing Request | Owner Name |
| READ | D9 Client | Buyer Name |
| READ | D10 Payment | Receipt Numbers |
| READ | D14 Commission | Tranche Amount |
| WRITE | D3 Credential | Suggested Credential Status |
| WRITE | D4 Developer and Project | Suggested License Status |
| WRITE | D11 Requirement Item | Requirement Upload Status |
| OUT | Company Admin | Document Check Results |
| OUT | Sales Consultant | Document Check Results |

The READ arrows from D2, D3, D4, D6, D9, D10, D14 and "Other Uploaded Documents" from D12 are
the **AI cross-checks**: name match, number match, project match, owner match, title vs. tax
declaration, duplicate file, duplicate receipt, transmittal amount. The three "suggested" WRITE arrows
put the AI's "Ready for review" or "Needs attention" on the credential, the License to Sell, or the
buyer's checklist item. Only the broker (5.0) can make any of them approved or verified.

### 5.0 Review and Verify Document (Broker)

| Type | Connects to | Data flow label |
|---|---|---|
| OUT | Broker | Review Queue with AI Flags |
| IN | Broker | Verification Decision |
| READ | D12 Document | AI Reading Results |
| WRITE | D12 Document | Review Decision |
| WRITE | D3 Credential | Credential Status |
| WRITE | D4 Developer and Project | License to Sell Status |
| WRITE | D5 Property | Property Badges |
| WRITE | D11 Requirement Item | Requirement Status |
| WRITE | D17 Audit Log | Activity Entry |

**Layout:** the processes go left to right in one row: **3.0 → 4.0 → 5.0**.

```
            D2   D3   D4   D6   D9   D10   D14        ← cross-check stores (top row, read by 4.0)

 Company Admin ──► [3.0] ──► D12 Document ◄──► [4.0]        [5.0] ◄──► Broker
                                  ▲                            │
                                  └────────────────────────────┘

 Sales Consultant (bottom-left)    D3*  D4*  D5  D11  D17     ← stores written by 4.0 and 5.0 (bottom row)
```

- Put **D12** in the center, because all three processes use it.
- Route **Document Check Results** from 4.0 to Company Admin **above** 3.0, and to Sales
  Consultant **below**, so they don't cross.
- D3 and D4 appear in both rows, so draw them as duplicates (*).

**From other modules:** D2 (Shared), D6 (Module 2), D9, D10, D14 (Module 3) are written elsewhere.
D12 is also written by Modules 2 and 3 (their scans), and 4.0 reads those scans too.

---

## Part 5. Diagram C — Module 2: Marketplace and Property Management

**Entities:** Company Admin, Property Seeker, Property Owner, Sales Consultant, Broker ·
**Stores:** D1, D2, D3, D4, D5, D6, D7, D9, D12, D16, D17

### 6.0 Manage Developer Projects and Units

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Company Admin | Developer and Project Data |
| IN | Company Admin | Unit Listing Data |
| IN | Company Admin | Loan Quotation Data |
| OUT | Company Admin | Property Listing Records |
| WRITE | D4 Developer and Project | Developer and Project Details |
| READ | D4 Developer and Project | License to Sell Status |
| WRITE | D5 Property | Unit Details |
| WRITE | D5 Property | Unit Listing Status |
| WRITE | D5 Property | Loan Quotations |
| READ | D5 Property | Property Details |
| WRITE | D17 Audit Log | Activity Entry |

### 7.0 Browse Listings and Estimate Loan

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Property Seeker | Search and Filter Criteria |
| IN | Property Seeker | Loan Computation Data |
| OUT | Property Seeker | Property Listings |
| OUT | Property Seeker | Loan Estimate |
| READ | D5 Property | Live Listings |
| READ | D1 Firm | Loan Calculator Defaults |

### 8.0 Send Inquiry

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Property Seeker | Inquiry Data |
| OUT | Property Seeker | Consultant Profiles |
| OUT | Property Seeker | Inquiry Confirmation |
| READ | D5 Property | Listing Firm and Agent |
| READ | D2 User Account | Active Consultants |
| READ | D3 Credential | Verified Credentials |
| READ | D16 Rating | Average Ratings |
| READ | D9 Client | Completed Sales Count |
| WRITE | D7 Inquiry | Inquiry Details |

### 9.0 Receive Property Owner Request

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Property Owner | Property Listing Request |
| OUT | Property Owner | Agent List |
| OUT | Property Owner | Request Confirmation |
| READ | D2 User Account | Active Consultants |
| READ | D3 Credential | Verified Credentials |
| WRITE | D6 Seller Listing Request | Seller Request Details |

### 10.0 Prepare and Review Owner Listing

| Type | Connects to | Data flow label |
|---|---|---|
| OUT | Sales Consultant | Seller Listing Requests |
| IN | Sales Consultant | Seller Request Response |
| IN | Sales Consultant | Seller Listing Documents |
| IN | Broker | Listing Review Decision |
| READ | D6 Seller Listing Request | Seller Request Details |
| WRITE | D6 Seller Listing Request | Request Status |
| WRITE | D12 Document | Seller Document Scans |
| READ | D12 Document | Document Review Status |
| WRITE | D5 Property | Owner Listing Details |
| WRITE | D5 Property | Listing Status |
| WRITE | D17 Audit Log | Activity Entry |

**Layout:**

```
 Company Admin ──► [6.0] ──► D4 Developer and Project
                     │
                     ▼
                 D5 Property  ◄── read by 7.0, 8.0; written by 6.0, 10.0   (center of the page)
                     ▲
 Property  ──► [7.0] ── D1 Firm
 Seeker    ──► [8.0] ── D7 Inquiry, D16 Rating, D9 Client
                     \
                      D2 User Account, D3 Credential  (between 8.0 and 9.0, both read them)
                     /
 Property  ──► [9.0] ──► D6 Seller Listing Request ◄──► [10.0] ◄── Sales Consultant
 Owner                                                     ▲
                                              D12, D17     └── Broker
```

- Processes go in a column on the left: 6.0, 7.0, 8.0, 9.0. Put 10.0 to the right of 9.0.
- Public entities (Property Seeker, Property Owner) go on the **left**. Firm users go on the
  **top** and **right**.
- **D5 Property** sits in the center, because four processes use it.

**From other modules:** D1, D2 (Shared), D3 (Module 1), D9, D16 (Module 3) are written elsewhere.
10.0 reads the broker's document decisions from D12, which Module 1's 5.0 writes.

---

## Part 6. Diagram D — Module 3: Sales, Client and Commission Management

**Entities:** Sales Consultant, Company Admin, Broker, Property Seeker ·
**Stores:** D1, D2, D5, D7, D8, D9, D10, D11, D12, D13, D14, D15, D16, D17

### 11.0 Manage Leads

| Type | Connects to | Data flow label |
|---|---|---|
| OUT | Sales Consultant | Assigned Leads |
| IN | Sales Consultant | Lead Status Update |
| OUT | Sales Consultant | Referral Link |
| READ | D7 Inquiry | Inquiry Details |
| WRITE | D7 Inquiry | Lead Status |
| READ | D2 User Account | Referral Code |
| WRITE | D17 Audit Log | Activity Entry |

### 12.0 Schedule Site Visits

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Sales Consultant | Site Visit Request |
| OUT | Sales Consultant | Site Visit Status |
| OUT | Company Admin | Site Visit Requests |
| IN | Company Admin | Site Visit Decision |
| WRITE | D8 Site Visit | Visit Schedule |
| WRITE | D8 Site Visit | Visit Decision |
| READ | D8 Site Visit | Visit Details |
| WRITE | D7 Inquiry | Lead Status |
| WRITE | D17 Audit Log | Activity Entry |

### 13.0 Manage Clients and Requirements

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Sales Consultant | Client Conversion Data |
| IN | Sales Consultant | Buyer Requirement Documents |
| OUT | Sales Consultant | Client Records |
| OUT | Company Admin | Lead and Client Records |
| IN | Broker | Requirement Waiver |
| READ | D7 Inquiry | Inquiry Details |
| WRITE | D7 Inquiry | Lead Status |
| READ | D5 Property | Property Details |
| WRITE | D9 Client | Client Details |
| READ | D9 Client | Client Details |
| WRITE | D10 Payment | Reservation Payment |
| READ | D10 Payment | Payment Details |
| WRITE | D11 Requirement Item | Requirement Checklist |
| WRITE | D11 Requirement Item | Waived Item |
| READ | D11 Requirement Item | Requirement Status |
| WRITE | D12 Document | Receipt and Buyer Document Scans |
| READ | D12 Document | Receipt Reading |
| WRITE | D17 Audit Log | Activity Entry |

**Requirement Checklist** is generated from payment method × civil status × employment type.
**Receipt Reading** is the amount and date the AI read (Module 1), which the consultant confirms.

### 14.0 Record Buyer Payments

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Sales Consultant | Payment Receipt Details |
| WRITE | D12 Document | Receipt Scan |
| READ | D12 Document | Receipt Reading |
| WRITE | D10 Payment | Payment Details |
| WRITE | D17 Audit Log | Activity Entry |

### 15.0 Evaluate Commission Tranches

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Company Admin | Developer Transmittal |
| OUT | Company Admin | Commission Records |
| OUT | Broker | Commission Records |
| OUT | Sales Consultant | Commission Status |
| READ | D9 Client | Client Deal Details |
| READ | D13 Commission Setting | Commission Split and Templates |
| READ | D10 Payment | Confirmed Payments |
| READ | D11 Requirement Item | Requirement Status |
| WRITE | D12 Document | Transmittal Scan |
| READ | D12 Document | Transmittal Reading |
| WRITE | D14 Commission | Commission and Tranches |
| WRITE | D14 Commission | Tranche Status |
| READ | D14 Commission | Commission Details |
| WRITE | D17 Audit Log | Activity Entry |

**The two gates are the two READ arrows:** **Confirmed Payments** (D10) is the payment milestone,
and **Requirement Status** (D11) is the documents gate.

### 16.0 Prepare and Sign Commission Voucher

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Broker | Commission Voucher Data |
| IN | Broker | Broker Voucher Signature |
| OUT | Broker | Commission Voucher |
| IN | Sales Consultant | Consultant Voucher Signature |
| OUT | Sales Consultant | Commission Voucher |
| READ | D14 Commission | Ready Tranche Details |
| READ | D2 User Account | Payee Details |
| READ | D1 Firm | Withholding Rate |
| WRITE | D14 Commission | Voucher and Signatures |
| WRITE | D14 Commission | Tranche Release Status |
| WRITE | D17 Audit Log | Activity Entry |

### 17.0 Close Sale and Rate Agent

| Type | Connects to | Data flow label |
|---|---|---|
| IN | Sales Consultant | Closing Data |
| OUT | Sales Consultant | Closing Cost Estimate |
| OUT | Sales Consultant | Rating Link |
| IN | Property Seeker | Agent Rating |
| READ | D1 Firm | Closing Tax Rates |
| WRITE | D15 Closing Record | Closing Computation and Checklist |
| READ | D15 Closing Record | Closing Details |
| WRITE | D9 Client | Client Status |
| WRITE | D16 Rating | Rating Link |
| READ | D16 Rating | Rating Link Status |
| WRITE | D16 Rating | Agent Rating |
| WRITE | D17 Audit Log | Activity Entry |

### 18.0 Generate Reports and Activity Log

| Type | Connects to | Data flow label |
|---|---|---|
| OUT | Company Admin | Sales Reports |
| OUT | Company Admin | Firm Activity Log |
| OUT | Broker | Team Performance Report |
| OUT | Broker | Firm Activity Log |
| OUT | Sales Consultant | Team Performance Report *(Sales Manager only)* |
| READ | D7 Inquiry | Lead Pipeline |
| READ | D9 Client | Client Sales |
| READ | D2 User Account | Team Members |
| READ | D17 Audit Log | Activity Entries |

**Layout:** two rows of processes, with the data stores in a band between them.

```
 Sales        ──►  [11.0]   [12.0]   [13.0]   [14.0]   ◄──  Company Admin
 Consultant         Leads   Visits   Clients  Payments       (top-right)
 (top-left)
           D2   D7   D8   D5   D9   D10   D11   D12   D13   D14   ← stores band (middle)

 Sales        ──►  [17.0]   [16.0]   [15.0]   [18.0]   ◄──  Broker (right)
 Consultant*        Close   Voucher  Tranches Reports        Company Admin* (bottom-right)
 (bottom-left)       │
              Property Seeker   D1   D15   D16      D17 Audit Log (duplicate 2–3 times)
```

- Draw the **Sales Consultant** twice (top-left and bottom-left) and the **Company Admin** twice
  (top-right and bottom-right), as duplicates (*). That removes most long lines.
- Keep **D9 Client, D10 Payment, D11 Requirement Item, D12 Document** in the **middle** of the
  band. Both rows use them.
- **Still too crowded?** Draw Module 3 on two pages, 3A (11.0–14.0, sales and clients) and 3B
  (15.0–18.0, commissions, closing, reports), with the same title plus "(continued)".

**From other modules:** D1, D2, D13 (Shared), D5 (Module 2) are written elsewhere. D7 is first
written by Module 2's 8.0 (new inquiry). Receipt Reading and Transmittal Reading in D12 are written
by Module 1's 4.0. Requirement Status in D11 is also written by Module 1's 5.0 when the broker
verifies a buyer document.

---

## Part 7. Balancing checklist (context diagram → module diagrams)

Every context arrow is in exactly one diagram. Tick them off as you draw.

| Context arrow (entity, direction) | Diagram | Process |
|---|---|---|
| Company Account Data (Super Admin, in) | A | 1.0 |
| Company Status Update (Super Admin, in) | A | 1.0 |
| Company Records (Super Admin, out) | A | 1.0 |
| Platform Activity Logs (Super Admin, out) | A | 1.0 |
| Consultant Account Data (Company Admin, in) | A | 2.0 |
| Firm Settings (Company Admin, in) | A | 2.0 |
| Consultant Records (Company Admin, out) | A | 2.0 |
| Consultant Credential (Company Admin, in) | B | 3.0 |
| License to Sell (Company Admin, in) | B | 3.0 |
| Document Check Results (Company Admin, out) | B | 4.0 |
| Document Check Results (Sales Consultant, out) | B | 4.0 |
| Verification Decision (Broker, in) | B | 5.0 |
| Review Queue with AI Flags (Broker, out) | B | 5.0 |
| Developer and Project Data (Company Admin, in) | C | 6.0 |
| Unit Listing Data (Company Admin, in) | C | 6.0 |
| Loan Quotation Data (Company Admin, in) | C | 6.0 |
| Property Listing Records (Company Admin, out) | C | 6.0 |
| Search and Filter Criteria (Property Seeker, in) | C | 7.0 |
| Loan Computation Data (Property Seeker, in) | C | 7.0 |
| Property Listings (Property Seeker, out) | C | 7.0 |
| Loan Estimate (Property Seeker, out) | C | 7.0 |
| Inquiry Data (Property Seeker, in) | C | 8.0 |
| Consultant Profiles (Property Seeker, out) | C | 8.0 |
| Inquiry Confirmation (Property Seeker, out) | C | 8.0 |
| Property Listing Request (Property Owner, in) | C | 9.0 |
| Agent List (Property Owner, out) | C | 9.0 |
| Request Confirmation (Property Owner, out) | C | 9.0 |
| Seller Listing Requests (Sales Consultant, out) | C | 10.0 |
| Seller Request Response (Sales Consultant, in) | C | 10.0 |
| Seller Listing Documents (Sales Consultant, in) | C | 10.0 |
| Listing Review Decision (Broker, in) | C | 10.0 |
| Assigned Leads (Sales Consultant, out) | D | 11.0 |
| Lead Status Update (Sales Consultant, in) | D | 11.0 |
| Referral Link (Sales Consultant, out) | D | 11.0 |
| Site Visit Request (Sales Consultant, in) | D | 12.0 |
| Site Visit Status (Sales Consultant, out) | D | 12.0 |
| Site Visit Requests (Company Admin, out) | D | 12.0 |
| Site Visit Decision (Company Admin, in) | D | 12.0 |
| Client Conversion Data (Sales Consultant, in) | D | 13.0 |
| Buyer Requirement Documents (Sales Consultant, in) | D | 13.0 |
| Client Records (Sales Consultant, out) | D | 13.0 |
| Lead and Client Records (Company Admin, out) | D | 13.0 |
| Requirement Waiver (Broker, in) | D | 13.0 |
| Payment Receipt Details (Sales Consultant, in) | D | 14.0 |
| Developer Transmittal (Company Admin, in) | D | 15.0 |
| Commission Records (Company Admin, out) | D | 15.0 |
| Commission Records (Broker, out) | D | 15.0 |
| Commission Status (Sales Consultant, out) | D | 15.0 |
| Commission Voucher Data (Broker, in) | D | 16.0 |
| Broker Voucher Signature (Broker, in) | D | 16.0 |
| Commission Voucher (Broker, out) | D | 16.0 |
| Consultant Voucher Signature (Sales Consultant, in) | D | 16.0 |
| Commission Voucher (Sales Consultant, out) | D | 16.0 |
| Closing Data (Sales Consultant, in) | D | 17.0 |
| Closing Cost Estimate (Sales Consultant, out) | D | 17.0 |
| Rating Link (Sales Consultant, out) | D | 17.0 |
| Agent Rating (Property Seeker, in) | D | 17.0 |
| Sales Reports (Company Admin, out) | D | 18.0 |
| Firm Activity Log (Company Admin, out) | D | 18.0 |
| Team Performance Report (Broker, out) | D | 18.0 |
| Firm Activity Log (Broker, out) | D | 18.0 |
| Team Performance Report (Sales Consultant, out) | D | 18.0 |

**62 arrows:** A = 7, B = 6, C = 18, D = 31. This matches the context diagram's 62.

---

## Part 8. What was wrong in the old Level 0 (and why)

| Old diagram | Problem | Fix |
|---|---|---|
| One giant diagram, many crossing lines | Hard to read | One diagram per module + Shared, with duplicates |
| No process for the AI reading and broker verification | **Module 1 was missing** | Diagram B: 3.0, 4.0, 5.0 |
| "1.0 Marketplace and Trust Verification" | Mixed marketplace, listings and verification | Split across Module 1 and Module 2 |
| No document store | Every scan and its AI flags are stored | **D12 Document** |
| Store names end in "Database" | A store is named by its data | **D1 Firm**, **D9 Client**, … |
| "D5 Loan and Schedule Database", "D8 Payment Commission and Database" | Mixed unrelated data | D5 Property, D8 Site Visit, D10 Payment, D14 Commission |
| Labels like "Saves Client Records", "Retrieve Payment Records" | Labels must be nouns | "Client Details", "Payment Details" |
| Company Admin → "Verification Decision" | Only the Broker verifies | Broker → 5.0 |
| Property Seeker → "Schedule Visit Request"; "Valuation Result" | Buyers can't book visits; valuation is out of scope | Removed |
| Broker → "Check Details", "Commission Approval Decision" | No money moves; tranches become ready by the two gates | Voucher Data + Broker Voucher Signature (16.0) |
| Separate Sales Manager and Sales Person | Must match the context diagram (balancing) | One **Sales Consultant** |
