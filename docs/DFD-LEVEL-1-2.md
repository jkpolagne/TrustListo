# TrustListo — DFD Level 1 and Level 2 Guide (child diagrams)

A drawing guide for the Chapter 3 child data flow diagrams. Every Level 0 process in
**docs/DFD-LEVEL-0.md** gets a **Level 1** child diagram. Three Level 1 processes are still complex,
so they also get a **Level 2** child diagram. Every child balances with its parent. Checked against
the finished system's code on 2026-11-13.

---

## Part 1. How to draw a child diagram (your professor's notation)

These rules follow the professor's sample (Level 1 of process 1, Level 2 of process 4.3):

1. **Caption** under each diagram, in the sample's style:
   `Figure #: Level 1 – Process 4.0 Child DFD` · `Figure #: Level 2 – Process 4.5 Child DFD`
2. **Process shape:** rounded rectangle with the number in the top part and the name below, as in
   the sample. Child numbers continue the parent's number: 4.0 → **4.1, 4.2, …**; 4.5 → **4.5.1, 4.5.2, …**
3. **No entity boxes.** Data from or to an entity (Company Admin, Broker, …) is an **arrow that
   starts or ends at the edge of the diagram**, like "Customer Order" and "Receipt" in the sample. The
   label must be **exactly** the parent's label.
   - In the tables below, this is written as **"Company Admin (edge)"**. The name in brackets is only
     for you, so you know where the arrow goes. Don't write it on the diagram.
4. **Data stores:** draw the parent's data stores inside the child diagram, with the same number and
   name (e.g., D12 Document). Only use stores the parent process already touches.
5. **Arrows between child processes are new.** They get new names, like "Formatted Data" in the sample.
6. **Balancing:** every arrow touching the parent process (from an entity, a data store, or for
   Level 2 a sibling process) appears in the child with the **same label**. Nothing extra comes from
   outside.
7. **The same parent arrow may be drawn more than once**, if two child processes need it.
   Examples: "Activity Entry" to D17, or "Client Conversion Data" going to two steps. Keep the same label.
8. In a **Level 2** diagram, an arrow can come from a **sibling Level 1 process**, written as
   **"4.4 (edge)"**. It is still drawn from the edge of the diagram.

**How to read the tables:** each row is one arrow, **From → To**, plus its label.

---

## Part 2. List of child diagrams

| Module | Level 1 diagrams | Level 2 diagrams |
|---|---|---|
| Shared | 1.0 Manage Company Accounts · 2.0 Manage Consultants and Firm Settings | — |
| Module 1 | 3.0 Upload Credential and License to Sell · 4.0 Read and Check Document (AI) · 5.0 Review and Verify Document (Broker) | **4.5 Cross-check Fields and Raise Flags** |
| Module 2 | 6.0 Manage Developer Projects and Units · 7.0 Browse Listings and Estimate Loan · 8.0 Send Inquiry · 9.0 Receive Property Owner Request · 10.0 Prepare and Review Owner Listing | — |
| Module 3 | 11.0 Manage Leads · 12.0 Schedule Site Visits · 13.0 Manage Clients and Requirements · 14.0 Record Buyer Payments · 15.0 Evaluate Commission Tranches · 16.0 Prepare and Sign Commission Voucher · 17.0 Close Sale and Rate Agent · 18.0 Generate Reports and Activity Log | **13.3 Generate Requirement Checklist** · **15.3 Evaluate Tranche Gates** |

**Why only these three go to Level 2.** Each one holds a rule set the panel will ask about:

- **4.5:** the AI's cross-checks (names, numbers, dates, title vs. tax declaration).
- **13.3:** the checklist engine (payment method × civil status × employment type = 45 combinations).
- **15.3:** the two-gate commission rule.

Every other Level 1 process is one simple action (show, save, compute, sign), so it stops at Level 1.

**Total:** 18 Level 1 diagrams + 3 Level 2 diagrams = **21 child diagrams**.

---

# SHARED — Account and Firm Administration

## Level 1 – Process 1.0 Manage Company Accounts

Processes: **1.1 Register Company** *(Planned)* · **1.2 Update Company Status** *(Planned)* ·
**1.3 Display Company Records** · **1.4 Display Platform Activity Logs** *(Planned)*

| From | To | Data flow label |
|---|---|---|
| Super Admin (edge) | 1.1 | Company Account Data |
| 1.1 | D1 Firm | Firm Details |
| 1.1 | D2 User Account | Company Admin Account |
| 1.1 | D17 Audit Log | Activity Entry |
| Super Admin (edge) | 1.2 | Company Status Update |
| 1.2 | D1 Firm | Firm Details |
| 1.2 | D17 Audit Log | Activity Entry |
| D1 Firm | 1.3 | Firm Details |
| D2 User Account | 1.3 | User Counts |
| D5 Property | 1.3 | Live Listing Counts |
| 1.3 | Super Admin (edge) | Company Records |
| D17 Audit Log | 1.4 | Platform Activity Entries |
| 1.4 | Super Admin (edge) | Platform Activity Logs |

## Level 1 – Process 2.0 Manage Consultants and Firm Settings

Processes: **2.1 Validate Consultant Account** · **2.2 Save Consultant Account** ·
**2.3 Display Team** · **2.4 Validate Firm Settings** · **2.5 Save Firm Settings**

| From | To | Data flow label |
|---|---|---|
| Company Admin (edge) | 2.1 | Consultant Account Data |
| D2 User Account | 2.1 | Consultant Details |
| 2.1 | 2.2 | Valid Consultant Account |
| 2.2 | D2 User Account | Consultant Account |
| 2.2 | D17 Audit Log | Activity Entry |
| 2.2 | 2.3 | Temporary Password and Referral Code |
| D2 User Account | 2.3 | Consultant Details |
| D3 Credential | 2.3 | Credential Status |
| 2.3 | Company Admin (edge) | Consultant Records |
| Company Admin (edge) | 2.4 | Firm Settings |
| 2.4 | 2.5 | Valid Firm Settings |
| 2.5 | D1 Firm | Firm Settings |
| 2.5 | D13 Commission Setting | Commission Split and Templates |
| 2.5 | D17 Audit Log | Activity Entry |

2.1 checks that the email is unused and the supervisor has the right role (a salesperson reports to
a manager, a manager to a broker). 2.4 checks that each commission split totals 100%.

---

# MODULE 1 — AI Document Processing and Verification

## Level 1 – Process 3.0 Upload Credential and License to Sell

Processes: **3.1 Validate Uploaded File** · **3.2 Record Credential** ·
**3.3 Attach License to Project** · **3.4 Store Scan**

| From | To | Data flow label |
|---|---|---|
| Company Admin (edge) | 3.1 | Consultant Credential |
| Company Admin (edge) | 3.1 | License to Sell |
| 3.1 | 3.2 | Valid Credential Scan |
| 3.1 | 3.3 | Valid License Scan |
| 3.2 | D3 Credential | Credential Details |
| 3.2 | 3.4 | Credential Scan |
| D4 Developer and Project | 3.3 | Project Details |
| 3.3 | 3.4 | License Scan |
| 3.4 | D12 Document | Credential and License Scans |

3.1 checks the file type from its content (PDF, JPG, PNG, WebP) and the 10 MB limit. 3.3 allows only
one License to Sell per project waiting for review.

## Level 1 – Process 4.0 Read and Check Document (AI)

Processes: **4.1 Prepare Image** · **4.2 Read Text (OCR)** · **4.3 Identify Document Type** ·
**4.4 Extract Fields** · **4.5 Cross-check Fields and Raise Flags** · **4.6 Suggest Review Status**

| From | To | Data flow label |
|---|---|---|
| D12 Document | 4.1 | Uploaded Scan |
| 4.1 | 4.2 | Cleaned Image |
| 4.2 | 4.3 | OCR Text |
| 4.3 | 4.4 | Text and Document Type |
| 4.4 | D12 Document | Extracted Text and Fields |
| 4.4 | 4.5 | Extracted Fields |
| D2 User Account | 4.5 | Consultant Name |
| D3 Credential | 4.5 | Credential Number |
| D4 Developer and Project | 4.5 | Project and Developer Name |
| D6 Seller Listing Request | 4.5 | Owner Name |
| D9 Client | 4.5 | Buyer Name |
| D10 Payment | 4.5 | Receipt Numbers |
| D14 Commission | 4.5 | Tranche Amount |
| D12 Document | 4.5 | Other Uploaded Documents |
| 4.5 | 4.6 | Document Flags |
| 4.6 | D12 Document | Flags and Suggested Status |
| 4.6 | D3 Credential | Suggested Credential Status |
| 4.6 | D4 Developer and Project | Suggested License Status |
| 4.6 | D11 Requirement Item | Requirement Upload Status |
| 4.6 | Company Admin (edge) | Document Check Results |
| 4.6 | Sales Consultant (edge) | Document Check Results |

What each step does:

- **4.1** turns PDF pages into images, then rotates, grayscales, resizes, increases contrast and sharpens the image.
- **4.2** is Tesseract OCR, which works offline.
- **4.3** scores keywords to find the document type.
- **4.4** extracts each type's fields with a confidence level.
- **4.6** marks the document "Ready for review" or "Needs attention". **It never approves.**
- If the text can't be read, the document still goes on with an "OCR failed" flag, so the broker can check it by eye.

**Layout:** draw 4.1 → 4.6 as one line from left to right, like the professor's sample. Put D12 at the
top-left, the cross-check stores in a row above 4.5, and the "suggested" stores (D3, D4, D11) below 4.6.

## Level 2 – Process 4.5 Cross-check Fields and Raise Flags

Processes: **4.5.1 Check Document Type and Sort Fields** · **4.5.2 Compare Names** ·
**4.5.3 Compare Numbers and Amounts** · **4.5.4 Check Dates and Property Details** ·
**4.5.5 Rate Flag Severity**

| From | To | Data flow label |
|---|---|---|
| 4.4 (edge) | 4.5.1 | Extracted Fields |
| 4.5.1 | 4.5.2 | Name Fields |
| 4.5.1 | 4.5.3 | Number and Amount Fields |
| 4.5.1 | 4.5.4 | Date and Property Fields |
| 4.5.1 | 4.5.5 | Type Match Result |
| D2 User Account | 4.5.2 | Consultant Name |
| D6 Seller Listing Request | 4.5.2 | Owner Name |
| D9 Client | 4.5.2 | Buyer Name |
| D12 Document | 4.5.2 | Other Uploaded Documents |
| 4.5.2 | 4.5.5 | Name Match Results |
| D3 Credential | 4.5.3 | Credential Number |
| D10 Payment | 4.5.3 | Receipt Numbers |
| D14 Commission | 4.5.3 | Tranche Amount |
| D12 Document | 4.5.3 | Other Uploaded Documents |
| 4.5.3 | 4.5.5 | Number and Amount Results |
| D4 Developer and Project | 4.5.4 | Project and Developer Name |
| D12 Document | 4.5.4 | Other Uploaded Documents |
| 4.5.4 | 4.5.5 | Date and Property Results |
| 4.5.5 | 4.6 (edge) | Document Flags |

What each check does:

- **4.5.1** compares the uploaded type with the detected type.
- **4.5.2** compares names. The name on the document is matched against the consultant, the owner,
  the buyer, or the owner on the title. A score of 92% or more passes, 80–92% is a warning, and below
  80% is blocking.
- **4.5.3** compares the license number with the one typed in, checks whether the receipt number or
  file was already used, and compares the transmittal amount with the tranche amount (more than ₱1
  off is flagged).
- **4.5.4** checks expired IDs, credentials and licenses; a license expiring within 90 days; unpaid
  real property tax; encumbrances on the title; the lot area against the title; and the project or
  developer name.
- **4.5.5** gives each flag its severity: blocking, warning or information.

## Level 1 – Process 5.0 Review and Verify Document (Broker)

Processes: **5.1 Build Review Queue** · **5.2 Record Verification Decision** ·
**5.3 Update Owner Record** · **5.4 Grant Badges**

| From | To | Data flow label |
|---|---|---|
| D12 Document | 5.1 | AI Reading Results |
| 5.1 | Broker (edge) | Review Queue with AI Flags |
| Broker (edge) | 5.2 | Verification Decision |
| 5.2 | D12 Document | Review Decision |
| 5.2 | D17 Audit Log | Activity Entry |
| 5.2 | 5.3 | Approved or Rejected Document |
| 5.3 | D3 Credential | Credential Status |
| 5.3 | D4 Developer and Project | License to Sell Status |
| 5.3 | D11 Requirement Item | Requirement Status |
| 5.3 | 5.4 | Approved Document Fields |
| 5.4 | D5 Property | Property Badges |

5.2 requires a reason to reject, and an override note to approve a document with a blocking flag. It
refuses to approve anything expired, and keeps both the AI's reading and the broker's corrections.
5.4 grants badges only when the approved facts support them.

---

# MODULE 2 — Marketplace and Property Management

## Level 1 – Process 6.0 Manage Developer Projects and Units

Processes: **6.1 Record Developer and Project** · **6.2 Record Unit Listing** ·
**6.3 Publish or Unpublish Unit** · **6.4 Record Loan Quotation** · **6.5 Display Property Listing Records**

| From | To | Data flow label |
|---|---|---|
| Company Admin (edge) | 6.1 | Developer and Project Data |
| 6.1 | D4 Developer and Project | Developer and Project Details |
| Company Admin (edge) | 6.2 | Unit Listing Data |
| 6.2 | D5 Property | Unit Details |
| 6.2 | 6.3 | Publish Request |
| D4 Developer and Project | 6.3 | License to Sell Status |
| 6.3 | D5 Property | Unit Listing Status |
| 6.3 | D17 Audit Log | Activity Entry |
| Company Admin (edge) | 6.4 | Loan Quotation Data |
| 6.4 | D5 Property | Loan Quotations |
| D5 Property | 6.5 | Property Details |
| 6.5 | Company Admin (edge) | Property Listing Records |

6.3 publishes a unit only if its project's License to Sell is broker-approved and not expired.

## Level 1 – Process 7.0 Browse Listings and Estimate Loan

Processes: **7.1 Filter Listings** · **7.2 Show Property Details** · **7.3 Compute Loan Estimate**

| From | To | Data flow label |
|---|---|---|
| Property Seeker (edge) | 7.1 | Search and Filter Criteria |
| D5 Property | 7.1 | Live Listings |
| 7.1 | 7.2 | Matching Listings |
| 7.2 | Property Seeker (edge) | Property Listings |
| 7.2 | 7.3 | Property Price |
| Property Seeker (edge) | 7.3 | Loan Computation Data |
| D1 Firm | 7.3 | Loan Calculator Defaults |
| 7.3 | Property Seeker (edge) | Loan Estimate |

7.3 computes the monthly payment from a loan, or the affordable price from a budget, and always shows
"Estimate only — not a loan approval".

## Level 1 – Process 8.0 Send Inquiry

Processes: **8.1 Determine Inquiry Route** · **8.2 List Consultants in Random Order** ·
**8.3 Validate Inquiry** · **8.4 Save Inquiry**

| From | To | Data flow label |
|---|---|---|
| D5 Property | 8.1 | Listing Firm and Agent |
| D2 User Account | 8.1 | Active Consultants |
| 8.1 | 8.2 | Listing Firm |
| 8.1 | 8.4 | Route Decision |
| D2 User Account | 8.2 | Active Consultants |
| D3 Credential | 8.2 | Verified Credentials |
| D16 Rating | 8.2 | Average Ratings |
| D9 Client | 8.2 | Completed Sales Count |
| 8.2 | Property Seeker (edge) | Consultant Profiles |
| Property Seeker (edge) | 8.3 | Inquiry Data |
| 8.3 | 8.4 | Valid Inquiry |
| 8.4 | D7 Inquiry | Inquiry Details |
| 8.4 | Property Seeker (edge) | Inquiry Confirmation |

8.1 decides who gets the inquiry, in this order:

1. An owner's listing always goes to the owner's chosen agent.
2. Otherwise, a valid referral code from the listing's firm wins.
3. Otherwise, the buyer picks a consultant.

8.2 shuffles the verified consultants of the listing's firm on every request. Nobody is featured, and
the list is never sorted by rating. 8.3 checks consent, the honeypot field and the rate limit.

## Level 1 – Process 9.0 Receive Property Owner Request

Processes: **9.1 List Agents in Random Order** · **9.2 Validate Listing Request** · **9.3 Save Listing Request**

| From | To | Data flow label |
|---|---|---|
| D2 User Account | 9.1 | Active Consultants |
| D3 Credential | 9.1 | Verified Credentials |
| 9.1 | Property Owner (edge) | Agent List |
| Property Owner (edge) | 9.2 | Property Listing Request |
| 9.2 | 9.3 | Valid Listing Request |
| 9.3 | D6 Seller Listing Request | Seller Request Details |
| 9.3 | Property Owner (edge) | Request Confirmation |

9.2 refuses a property without a land title, and requires consent and a chosen agent.

## Level 1 – Process 10.0 Prepare and Review Owner Listing

Processes: **10.1 Display Seller Requests** · **10.2 Accept or Decline Request** ·
**10.3 Upload Seller Documents** · **10.4 Submit Listing for Review** · **10.5 Approve or Send Back Listing**

| From | To | Data flow label |
|---|---|---|
| D6 Seller Listing Request | 10.1 | Seller Request Details |
| 10.1 | Sales Consultant (edge) | Seller Listing Requests |
| Sales Consultant (edge) | 10.2 | Seller Request Response |
| 10.2 | D6 Seller Listing Request | Request Status |
| 10.2 | D17 Audit Log | Activity Entry |
| Sales Consultant (edge) | 10.3 | Seller Listing Documents |
| 10.3 | D12 Document | Seller Document Scans |
| 10.3 | 10.4 | Listing Description and Map Pin |
| 10.4 | D5 Property | Owner Listing Details |
| 10.4 | D6 Seller Listing Request | Request Status |
| Broker (edge) | 10.5 | Listing Review Decision |
| D12 Document | 10.5 | Document Review Status |
| 10.5 | D5 Property | Listing Status |
| 10.5 | D6 Seller Listing Request | Request Status |
| 10.5 | D17 Audit Log | Activity Entry |

10.5 approves only when the title, tax declaration, tax receipt and owner's ID are all
broker-approved. "Send back" returns the request to the agent with a reason.

---

# MODULE 3 — Sales, Client and Commission Management

## Level 1 – Process 11.0 Manage Leads

Processes: **11.1 Display Assigned Leads** · **11.2 Update Lead Status** · **11.3 Generate Referral Link**

| From | To | Data flow label |
|---|---|---|
| D7 Inquiry | 11.1 | Inquiry Details |
| 11.1 | Sales Consultant (edge) | Assigned Leads |
| Sales Consultant (edge) | 11.2 | Lead Status Update |
| 11.2 | D7 Inquiry | Lead Status |
| 11.2 | D17 Audit Log | Activity Entry |
| D2 User Account | 11.3 | Referral Code |
| 11.3 | Sales Consultant (edge) | Referral Link |

## Level 1 – Process 12.0 Schedule Site Visits

Processes: **12.1 Check Visit Clash** · **12.2 Save Visit Request** ·
**12.3 Approve or Decline Visit** · **12.4 Display Visit Calendar**

| From | To | Data flow label |
|---|---|---|
| Sales Consultant (edge) | 12.1 | Site Visit Request |
| D8 Site Visit | 12.1 | Visit Details |
| 12.1 | 12.2 | Visit Request with Clash Warning |
| 12.2 | D8 Site Visit | Visit Schedule |
| 12.2 | D17 Audit Log | Activity Entry |
| Company Admin (edge) | 12.3 | Site Visit Decision |
| 12.3 | D8 Site Visit | Visit Decision |
| 12.3 | D7 Inquiry | Lead Status |
| 12.3 | D17 Audit Log | Activity Entry |
| D8 Site Visit | 12.4 | Visit Details |
| 12.4 | Company Admin (edge) | Site Visit Requests |
| 12.4 | Sales Consultant (edge) | Site Visit Status |

12.1 warns if the same consultant has another visit within 1 hour. The warning never blocks the
request. 12.3 moves the lead to "Visit scheduled" when a visit is approved.

## Level 1 – Process 13.0 Manage Clients and Requirements

Processes: **13.1 Read Reservation Receipt** · **13.2 Create Client Record** ·
**13.3 Generate Requirement Checklist** · **13.4 Upload Buyer Document** · **13.5 Waive Requirement** ·
**13.6 Display Client Records**

| From | To | Data flow label |
|---|---|---|
| Sales Consultant (edge) | 13.1 | Client Conversion Data |
| 13.1 | D12 Document | Receipt and Buyer Document Scans |
| D12 Document | 13.1 | Receipt Reading |
| 13.1 | 13.2 | Conversion Details with Receipt Reading |
| D7 Inquiry | 13.2 | Inquiry Details |
| D5 Property | 13.2 | Property Details |
| 13.2 | D9 Client | Client Details |
| 13.2 | D10 Payment | Reservation Payment |
| 13.2 | D7 Inquiry | Lead Status |
| 13.2 | D17 Audit Log | Activity Entry |
| 13.2 | 13.3 | Buyer Profile |
| D11 Requirement Item | 13.3 | Requirement Status |
| 13.3 | D11 Requirement Item | Requirement Checklist |
| Sales Consultant (edge) | 13.4 | Buyer Requirement Documents |
| 13.4 | D12 Document | Receipt and Buyer Document Scans |
| Broker (edge) | 13.5 | Requirement Waiver |
| 13.5 | D11 Requirement Item | Waived Item |
| 13.5 | D17 Audit Log | Activity Entry |
| D9 Client | 13.6 | Client Details |
| D10 Payment | 13.6 | Payment Details |
| D11 Requirement Item | 13.6 | Requirement Status |
| D7 Inquiry | 13.6 | Inquiry Details |
| 13.6 | Sales Consultant (edge) | Client Records |
| 13.6 | Company Admin (edge) | Lead and Client Records |

What each step does:

- **13.1 and 13.2** are the two steps of converting a lead. First the AI reads the reservation receipt.
  Then the consultant confirms the amount, and the system creates the client and the confirmed
  reservation payment, and marks the lead "Reserved".
- **Buyer Profile** is the payment method, civil status and employment type.
- **13.4:** the uploaded buyer document is read by Module 1 (4.0), which sets the item to "Uploaded"
  or "Needs attention". The broker (5.0) verifies it.

## Level 2 – Process 13.3 Generate Requirement Checklist

Processes: **13.3.1 Determine Reservation Items** · **13.3.2 Determine Civil Status Items** ·
**13.3.3 Determine Financing Items** · **13.3.4 Merge and Save Checklist**

| From | To | Data flow label |
|---|---|---|
| 13.2 (edge) | 13.3.1 | Buyer Profile |
| 13.2 (edge) | 13.3.2 | Buyer Profile |
| 13.2 (edge) | 13.3.3 | Buyer Profile |
| 13.3.1 | 13.3.4 | Reservation Items |
| 13.3.2 | 13.3.4 | Civil Status Items |
| 13.3.3 | 13.3.4 | Financing Items |
| D11 Requirement Item | 13.3.4 | Requirement Status |
| 13.3.4 | D11 Requirement Item | Requirement Checklist |

What each rule produces:

- **13.3.1:** the buyer's 2 valid IDs, for everyone.
- **13.3.2:** single → CENOMAR; married → marriage contract + spouse's 2 IDs; separated → annulment
  decree. Spot cash buyers don't need these.
- **13.3.3:** deferred cash and in-house → proof of income. Bank and Pag-IBIG → the full set for the
  employment type (locally employed, self-employed, OFW), plus the Pag-IBIG extras.
- **13.3.4:** when the buyer's profile changes, the checklist is regenerated. Uploaded, verified and
  waived items are kept.

## Level 1 – Process 14.0 Record Buyer Payments

Processes: **14.1 Upload Payment Receipt** · **14.2 Pre-fill Payment from Receipt** · **14.3 Confirm Payment**

| From | To | Data flow label |
|---|---|---|
| Sales Consultant (edge) | 14.1 | Payment Receipt Details |
| 14.1 | D12 Document | Receipt Scan |
| 14.1 | 14.2 | Receipt Reference |
| D12 Document | 14.2 | Receipt Reading |
| 14.2 | D10 Payment | Payment Details |
| 14.2 | 14.3 | Unconfirmed Payment |
| Sales Consultant (edge) | 14.3 | Payment Receipt Details |
| 14.3 | D10 Payment | Payment Details |
| 14.3 | D17 Audit Log | Activity Entry |

A payment counts only after the consultant confirms it (14.3). A receipt whose number was already
used is flagged by Module 1 and can't be confirmed.

## Level 1 – Process 15.0 Evaluate Commission Tranches

Processes: **15.1 Create Commission and Tranches** · **15.2 Record Developer Transmittal** ·
**15.3 Evaluate Tranche Gates** · **15.4 Display Commission Records**

| From | To | Data flow label |
|---|---|---|
| D9 Client | 15.1 | Client Deal Details |
| D13 Commission Setting | 15.1 | Commission Split and Templates |
| 15.1 | D14 Commission | Commission and Tranches |
| Company Admin (edge) | 15.2 | Developer Transmittal |
| 15.2 | D12 Document | Transmittal Scan |
| D12 Document | 15.2 | Transmittal Reading |
| 15.2 | D17 Audit Log | Activity Entry |
| 15.2 | 15.3 | Confirmed Transmittal |
| D9 Client | 15.3 | Client Deal Details |
| D10 Payment | 15.3 | Confirmed Payments |
| D11 Requirement Item | 15.3 | Requirement Status |
| D14 Commission | 15.3 | Commission Details |
| 15.3 | D14 Commission | Tranche Status |
| 15.3 | D17 Audit Log | Activity Entry |
| D14 Commission | 15.4 | Commission Details |
| 15.4 | Company Admin (edge) | Commission Records |
| 15.4 | Broker (edge) | Commission Records |
| 15.4 | Sales Consultant (edge) | Commission Status |

15.1 computes the gross commission as TCP × the developer's rate, splits it into tranches from the
template, and saves the commission split at that moment. 15.4 also shows how long tranches have been
waiting for a transmittal (0–30, 31–60, 61–90, 90+ days).

## Level 2 – Process 15.3 Evaluate Tranche Gates

Processes: **15.3.1 Check Payment Milestone** · **15.3.2 Check Required Documents** ·
**15.3.3 Check Transmittal** · **15.3.4 Set Tranche Status**

| From | To | Data flow label |
|---|---|---|
| D14 Commission | 15.3.1 | Commission Details |
| D9 Client | 15.3.1 | Client Deal Details |
| D10 Payment | 15.3.1 | Confirmed Payments |
| 15.3.1 | 15.3.4 | Milestone Result |
| D14 Commission | 15.3.2 | Commission Details |
| D11 Requirement Item | 15.3.2 | Requirement Status |
| 15.3.2 | 15.3.4 | Document Gate Result |
| 15.2 (edge) | 15.3.3 | Confirmed Transmittal |
| D14 Commission | 15.3.3 | Commission Details |
| 15.3.3 | 15.3.4 | Transmittal Result |
| 15.3.4 | D14 Commission | Tranche Status |
| 15.3.4 | D17 Audit Log | Activity Entry |

What each check does:

- **15.3.1 (gate 1):** has the payment milestone been reached? It checks the share of the TCP paid,
  the downpayment paid, full payment, or loan release, counting only confirmed payments.
- **15.3.2 (gate 2):** are all required documents for the tranche's stage verified or waived?
- **15.3.3:** is a transmittal needed, and has it been confirmed?
- **15.3.4** sets the status:
  - No milestone → **Waiting**.
  - Milestone but missing documents → **Blocked**.
  - Waiting for the transmittal → **Awaiting transmittal**.
  - Otherwise → **Ready for voucher**.
  - Statuses only move forward. The one exception: a document problem pulls a tranche back to
    Blocked, but only if it has no voucher yet.

## Level 1 – Process 16.0 Prepare and Sign Commission Voucher

Processes: **16.1 Compute Voucher Amounts** · **16.2 Save Voucher** · **16.3 Record Broker Signature** ·
**16.4 Record Consultant Signatures** · **16.5 Release Tranche**

| From | To | Data flow label |
|---|---|---|
| Broker (edge) | 16.1 | Commission Voucher Data |
| D14 Commission | 16.1 | Ready Tranche Details |
| D2 User Account | 16.1 | Payee Details |
| D1 Firm | 16.1 | Withholding Rate |
| 16.1 | 16.2 | Voucher Breakdown |
| 16.2 | D14 Commission | Voucher and Signatures |
| 16.2 | Broker (edge) | Commission Voucher |
| 16.2 | D17 Audit Log | Activity Entry |
| Broker (edge) | 16.3 | Broker Voucher Signature |
| 16.3 | D14 Commission | Voucher and Signatures |
| 16.3 | D17 Audit Log | Activity Entry |
| 16.3 | 16.4 | Broker-Signed Voucher |
| Sales Consultant (edge) | 16.4 | Consultant Voucher Signature |
| 16.4 | Sales Consultant (edge) | Commission Voucher |
| 16.4 | D14 Commission | Voucher and Signatures |
| 16.4 | D17 Audit Log | Activity Entry |
| 16.4 | 16.5 | Fully Signed Voucher |
| 16.5 | D14 Commission | Tranche Release Status |
| 16.5 | D17 Audit Log | Activity Entry |

What each step does:

- **16.1:** each person's share (broker, manager, salesperson) minus the withholding percentage and
  any extra deductions.
- **16.3 → 16.4:** the broker always signs first. A signature is the typed full name plus the time
  and a content fingerprint. Editing the voucher after a signature cancels the signatures.
- **16.5:** "Released" only records that the money was handed over **outside** the system.

## Level 1 – Process 17.0 Close Sale and Rate Agent

Processes: **17.1 Compute Closing Costs** · **17.2 Update Closing Checklist** ·
**17.3 Create Rating Link** · **17.4 Record Agent Rating**

| From | To | Data flow label |
|---|---|---|
| Sales Consultant (edge) | 17.1 | Closing Data |
| D1 Firm | 17.1 | Closing Tax Rates |
| 17.1 | D15 Closing Record | Closing Computation and Checklist |
| 17.1 | D9 Client | Client Status |
| 17.1 | Sales Consultant (edge) | Closing Cost Estimate |
| Sales Consultant (edge) | 17.2 | Closing Data |
| D15 Closing Record | 17.2 | Closing Details |
| 17.2 | D15 Closing Record | Closing Computation and Checklist |
| 17.2 | D9 Client | Client Status |
| 17.2 | D17 Audit Log | Activity Entry |
| 17.2 | 17.3 | Completed Sale |
| 17.3 | D16 Rating | Rating Link |
| 17.3 | Sales Consultant (edge) | Rating Link |
| Property Seeker (edge) | 17.4 | Agent Rating |
| D16 Rating | 17.4 | Rating Link Status |
| 17.4 | D16 Rating | Agent Rating |

What each step does:

- **17.1:** capital gains tax 6%, documentary stamp tax 1.5%, and transfer tax 0.5%, at the firm's
  rates. The first save moves the client to "Closing".
- **17.2:** the last tick moves the client to "Completed".
- **17.4:** the link works once and expires after 30 days.

## Level 1 – Process 18.0 Generate Reports and Activity Log

Processes: **18.1 Compute Monthly Sales Summary** · **18.2 Compute Team Performance** ·
**18.3 Display Firm Activity Log**

| From | To | Data flow label |
|---|---|---|
| D9 Client | 18.1 | Client Sales |
| D7 Inquiry | 18.1 | Lead Pipeline |
| 18.1 | Company Admin (edge) | Sales Reports |
| D2 User Account | 18.2 | Team Members |
| D7 Inquiry | 18.2 | Lead Pipeline |
| D9 Client | 18.2 | Client Sales |
| 18.2 | Broker (edge) | Team Performance Report |
| 18.2 | Sales Consultant (edge) | Team Performance Report |
| D17 Audit Log | 18.3 | Activity Entries |
| 18.3 | Company Admin (edge) | Firm Activity Log |
| 18.3 | Broker (edge) | Firm Activity Log |

18.2 limits a Sales Manager's report to their own team.
