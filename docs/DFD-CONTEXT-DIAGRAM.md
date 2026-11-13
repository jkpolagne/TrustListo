# TrustListo — Context Diagram Guide

A drawing guide for the Chapter 3 context diagram. It replaces the old diagram. Every data flow here
was checked against the finished system (SPEC.md, the API code, and docs/USE-CASES.md) on 2026-11-12.

---

## Part 1. What TrustListo is (short background)

TrustListo is a multi-tenant web platform for real estate brokerage firms in Naga City.

- **Public marketplace (no login):** property seekers browse verified listings, view consultant
  profiles, estimate loans, and send inquiries. Property owners submit their property for listing.
- **Firm dashboards (login):** Company Admin, Broker, Sales Manager, Sales Person manage consultants,
  listings, leads, clients, site visits, and staged commissions.
- **Module 1 — AI document processing:** OCR reads uploaded documents and **flags** problems.
  The AI never approves. Only the **Broker** approves or rejects.
- **Module 2 — Marketplace and property management.**
- **Module 3 — Sales, client and commission management:** commission is released in tranches
  only when the payment milestone is reached **and** the buyer's documents are verified. The broker
  prepares and signs the voucher first, then the consultants sign.

Rules that affect the diagram:

1. No money passes through the system. It only records receipts, statuses and vouchers.
2. Buyers and property owners never log in and **cannot book site visits**. Consultants request
   visits and the Company Admin approves them.
3. There are no government system connections (PRC, DHSUD, BIR, Registry of Deeds). The AI only
   reads uploaded scans.
4. Zonal-value property valuation is **out of scope**.
5. The developer never uses the system. The Company Admin uploads the developer's transmittal.

---

## Part 2. Context diagram rules (check these before you submit)

1. **Exactly one process**, numbered **0**, in the center. Label it
   **"TrustListo Real Estate Brokerage Platform"**.
2. **No data stores** on the context diagram. They first appear on Level 0 (see docs/DFD-LEVEL-0.md).
3. **No arrows between two external entities.** Things that happen outside the system are not
   drawn, for example the consultant handing the rating link to the buyer in person, or the
   commission cash payout.
4. **Every arrow has a label** that is a **noun** (the data), not an action.
   ✔ "Site Visit Decision" ✘ "Approve visit"
5. **Every external entity has at least one arrow in and one arrow out.**
6. **Arrow direction:**
   - **Entity → System** means the user **gives** data (enters, uploads, decides, signs).
   - **System → Entity** means the system **shows or sends** data (records, reports, results).
7. Login/logout is usually **not** drawn, because it is a mechanism, not business data. If your
   adviser wants it, add one "Login Credentials" arrow into the system from each logged-in entity
   and one "Account Access" arrow back.

---

## Part 3. External entities (6 boxes)

| # | Entity name to write in the box | Who it is | Logs in? |
|---|---|---|---|
| 1 | **Super Admin** | Platform owner; manages company accounts | Yes |
| 2 | **Company Admin** | Runs one firm: consultants, listings, settings, visit approvals | Yes |
| 3 | **Broker** | Licensed broker; the only one who verifies documents and prepares vouchers | Yes |
| 4 | **Sales Consultant** *(Sales Manager / Sales Person)* | Handles leads, clients, payments, buyer documents | Yes |
| 5 | **Property Seeker** | Public buyer | No |
| 6 | **Property Owner** | Public individual seller | No |

**Why one "Sales Consultant" box instead of two?** The Sales Manager and Sales Person send and
receive the **same data** (docs/USE-CASES.md groups them as one actor for scenarios 26–38). Two boxes
would repeat the same 19 arrows twice. The only difference is that the Sales Manager also gets the
**Team Performance Report**, which is labeled on that arrow.
*If your adviser wants them separate:* draw both boxes, give both the full list in 3.4, and give
the Team Performance Report arrow to the Sales Manager only.

**Why "Property Owner"?** It matches the actor name in the use case scenarios (scenario 43).
Use the same name in every chapter.

---

### 3.1 Super Admin

| Direction | Data flow label | What is inside it |
|---|---|---|
| Super Admin → System | **Company Account Data** *(Planned)* | Company name, address, Company Admin's name and email |
| Super Admin → System | **Company Status Update** *(Planned)* | Active / Suspended |
| System → Super Admin | **Company Records** | Firm list with status, number of users, number of live listings |
| System → Super Admin | **Platform Activity Logs** *(Planned)* | Platform-level events only, never a firm's clients or documents |

*(Planned)* means it's in the design, but the prototype doesn't have it yet (same as the use case
scenarios). Draw it like the other arrows. If the panel asks, say it's planned.

### 3.2 Company Admin

| Direction | Data flow label | What is inside it |
|---|---|---|
| Company Admin → System | **Consultant Account Data** | Name, email, role, assigned manager/broker, active/inactive |
| Company Admin → System | **Consultant Credential** | PRC ID / DHSUD certificate scan + license number |
| Company Admin → System | **Developer and Project Data** | Developer name, project name, location |
| Company Admin → System | **License to Sell** | Project's LTS document scan |
| Company Admin → System | **Unit Listing Data** | Unit details, price, photos, map pin, publish/unpublish |
| Company Admin → System | **Loan Quotation Data** | Developer's actual payment breakdowns |
| Company Admin → System | **Site Visit Decision** | Approve / Decline + reason |
| Company Admin → System | **Developer Transmittal** | Transmittal scan + amount confirmation |
| Company Admin → System | **Firm Settings** | Commission split %, commission templates, loan calculator defaults, closing tax rates, withholding % |
| System → Company Admin | **Consultant Records** | Consultant list, credential status, referral codes |
| System → Company Admin | **Document Check Results** | AI flags on uploaded credentials, LTS, transmittal (e.g., expired, amount mismatch) |
| System → Company Admin | **Property Listing Records** | Listings, badges, LTS expiry warnings |
| System → Company Admin | **Site Visit Requests** | Pending visits from consultants (calendar) |
| System → Company Admin | **Lead and Client Records** | All of the firm's inquiries and clients |
| System → Company Admin | **Commission Records** | Tranches by status, awaiting transmittal |
| System → Company Admin | **Sales Reports** | Monthly sales summary, pipeline counts |
| System → Company Admin | **Firm Activity Log** | Audit trail of approvals and status changes |

### 3.3 Broker

| Direction | Data flow label | What is inside it |
|---|---|---|
| Broker → System | **Verification Decision** | Approve / Reject + reason, corrected fields, override note, for credentials, LTS, seller documents, buyer documents |
| Broker → System | **Listing Review Decision** | Approve / Send back a property owner's listing |
| Broker → System | **Requirement Waiver** | Waived requirement item + reason |
| Broker → System | **Commission Voucher Data** | Tranche, per-person breakdown, extra deductions |
| Broker → System | **Broker Voucher Signature** | Typed full name (broker signs first) |
| System → Broker | **Review Queue with AI Flags** | Document image, OCR text, extracted fields, flags, oldest first |
| System → Broker | **Commission Records** | Tranches by status, ready-for-release list, transmittal aging, expected payouts |
| System → Broker | **Commission Voucher** | Voucher with signature status |
| System → Broker | **Team Performance Report** | Sales summary and pipeline per consultant |
| System → Broker | **Firm Activity Log** | Audit trail |

### 3.4 Sales Consultant (Sales Manager / Sales Person)

| Direction | Data flow label | What is inside it |
|---|---|---|
| Consultant → System | **Lead Status Update** | Contacted / Qualified / Lost + reason |
| Consultant → System | **Site Visit Request** | Property, lead, date and time, notes; later Completed / No-show / Cancelled |
| Consultant → System | **Client Conversion Data** | Payment method, civil status, employment type, total contract price, reservation receipt |
| Consultant → System | **Payment Receipt Details** | Receipt scan + confirmed amount and date |
| Consultant → System | **Buyer Requirement Documents** | Valid IDs, CENOMAR, payslips, ITR, etc. |
| Consultant → System | **Seller Request Response** | Accept / Decline + reason |
| Consultant → System | **Seller Listing Documents** | Land title, tax declaration, RPT receipt, owner's ID, listing description, map pin |
| Consultant → System | **Closing Data** | Selling price, tax base, registration fee, closing checklist ticks |
| Consultant → System | **Consultant Voucher Signature** | Typed full name (after the broker) |
| System → Consultant | **Assigned Leads** | New inquiries from buyers (organic or referral) |
| System → Consultant | **Seller Listing Requests** | Property owners who chose this consultant |
| System → Consultant | **Site Visit Status** | Pending / Approved / Declined + reason |
| System → Consultant | **Client Records** | Clients, requirement checklist and progress, payments |
| System → Consultant | **Document Check Results** | AI flags and pre-filled receipt amounts |
| System → Consultant | **Commission Status** | Own tranches and milestone status (waiting, blocked, ready, released) |
| System → Consultant | **Commission Voucher** | Voucher to countersign, own share and net |
| System → Consultant | **Closing Cost Estimate** | Capital gains tax, documentary stamp tax, transfer tax |
| System → Consultant | **Referral Link** | Own referral link to share with buyers |
| System → Consultant | **Rating Link** | One-time rating link for a completed client (given to the buyer outside the system) |
| System → Consultant | **Team Performance Report** *(Sales Manager only)* | Each salesperson's leads, clients, reservations this month |

### 3.5 Property Seeker

| Direction | Data flow label | What is inside it |
|---|---|---|
| Seeker → System | **Search and Filter Criteria** | Type, price range, location, badges, map area |
| Seeker → System | **Loan Computation Data** | Loan amount or monthly budget, rate, term, downpayment % |
| Seeker → System | **Inquiry Data** | Name, phone, email, nature of work, payment preference, civil status, message, consent, chosen consultant, referral code |
| Seeker → System | **Agent Rating** | 1–5 stars + comment (from the one-time link) |
| System → Seeker | **Property Listings** | Details, photos, badges, loan quotations |
| System → Seeker | **Consultant Profiles** | Randomized consultant list, badges, average rating |
| System → Seeker | **Loan Estimate** | Monthly payment or affordable price range ("estimate only") |
| System → Seeker | **Inquiry Confirmation** | "Your consultant will contact you" |

### 3.6 Property Owner

| Direction | Data flow label | What is inside it |
|---|---|---|
| Owner → System | **Property Listing Request** | Property type, location, areas, asking price, photos, chosen agent, name, mobile number, consent |
| System → Owner | **Agent List** | Verified agents of all firms, random order |
| System → Owner | **Request Confirmation** | "Your request was sent to the agent" |

The owner does **not** upload the title or other documents. The chosen agent does that
(see "Seller Listing Documents" in 3.4).

---

## Part 4. How to draw it (draw.io, step by step)

1. Draw one big rectangle in the center and write **0** in its header strip and
   **TrustListo Real Estate Brokerage Platform** inside.
2. Put the 6 entity boxes around it, in the same spots as the old diagram so the layout stays familiar:

   ```
        Super Admin                         Company Admin
              \                               /
   Broker  ──── [ 0  TrustListo Real Estate ] ──── Sales Consultant
              /     Brokerage Platform      \
     Property Seeker                     (right side continues)
                        Property Owner
   ```

   - **Top-left:** Super Admin · **Top-right:** Company Admin
   - **Left middle:** Broker · **Right middle:** Sales Consultant
   - **Bottom-left:** Property Seeker · **Bottom center:** Property Owner
3. For each entity, draw **all "→ System" arrows first, then all "System →" arrows**, so inputs
   and outputs stay in two neat groups on that side.
4. Use orthogonal (elbow) connectors and put each label beside its arrow. Don't let arrows cross a box.
5. Company Admin and Sales Consultant have the most arrows (17 and 20). Give them the **longest
   sides** of the process box.
6. Run the checklist in Part 2 one last time.

**Total:** 6 entities and 62 data flows (30 into the system, 32 out of it).

---

## Part 5. What changed from the old diagram (and why)

| Old diagram | What happened | Why |
|---|---|---|
| Process: "Real Estate Management System" | Renamed **TrustListo Real Estate Brokerage Platform** | Use the system's real name |
| Company Admin → "Verification Decision" | **Moved to Broker** | Only the Broker can verify (Rule 1: AI flags, Broker approves) |
| Company Admin → "Schedule Decision" | Renamed **Site Visit Decision** | Clearer; consultants request visits, the Admin approves or declines |
| Company Admin → "Consultant Link Records" | Merged into **Consultant Records** | Referral codes are part of the consultant record |
| Company Admin → "Developer Information", "Property Data" | Now **Developer and Project Data**, **Unit Listing Data** | Matches the developer → project → unit structure |
| Company Admin (missing) | Added Consultant Credential, License to Sell, Developer Transmittal, Firm Settings, Document Check Results, Site Visit Requests, Lead and Client Records, Commission Records, Firm Activity Log | These features exist in the system |
| Broker → "Commission Approval Decision" | **Removed** | Commissions aren't "approved". A tranche becomes ready automatically (two gates), then the broker prepares the voucher |
| Broker → "Check Details" | **Removed** | No money or cheques go through the system |
| Broker → "Payment Monitoring Report" | Replaced by **Commission Records** | Shows tranche status and transmittal aging |
| Broker (missing) | Added Verification Decision, Listing Review Decision, Requirement Waiver, Broker Voucher Signature, Review Queue with AI Flags, Team Performance Report, Firm Activity Log | Reviewing is the broker's main job in Module 1 |
| Sales Person + Sales Manager (two boxes) | Combined into **Sales Consultant** | Same data flows. Team Performance Report is marked Sales Manager only |
| "Payment Details", "Client Data" | Now **Payment Receipt Details**, **Client Conversion Data** | Receipts are uploaded and read by the AI, then confirmed |
| "Milestone Status" | Renamed **Commission Status** | Covers waiting / blocked / ready / released |
| "Sales Monitoring Request" | Replaced by **Team Performance Report** (output) | A report is an output, not a "request" |
| Consultant (missing) | Added leads, site visits, buyer documents, seller requests and documents, closing, voucher signature, referral and rating links | These features exist in the system |
| Property Seeker → "Schedule Visit Request" | **Removed** | Buyers cannot book visits (Rule 10) |
| System → Property Seeker "Valuation Result" | **Removed** | Zonal valuation is out of scope |
| "Loan Computation Request" / "Loan Estimate Result" | Now **Loan Computation Data** / **Loan Estimate** | Data names, not actions |
| Property Seeker (missing) | Added Inquiry Data, Agent Rating, Consultant Profiles, Inquiry Confirmation | The inquiry is the seeker's main flow |
| "Individual Property Seller" | Renamed **Property Owner** | Matches the use case actor |
| "Seller Inquiry Data" / "Inquiry Confirmation" | Now **Property Listing Request** / **Request Confirmation**; added **Agent List** | It's a listing request, not an inquiry. The owner picks an agent |
