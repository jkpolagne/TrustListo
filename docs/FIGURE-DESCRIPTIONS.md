# TrustListo — Figure Captions and Descriptions (Chapter 3)

Each block below is one figure: its **label** (where it goes), its **caption**, and its
**description paragraph**. Copy the caption under the figure and the paragraph right after it.
Replace `#` with the real figure number when you assemble the chapter.

The labels point to the guide each figure was drawn from:

| Label prefix | Figures | Guide |
|---|---|---|
| `CD` | Context diagram (1) | `docs/DFD-CONTEXT-DIAGRAM.md` |
| `L0` | Level 0 DFDs (4) | `docs/DFD-LEVEL-0.md` |
| `L1` | Level 1 child DFDs (18) | `docs/DFD-LEVEL-1-2.md` |
| `L2` | Level 2 child DFDs (3) | `docs/DFD-LEVEL-1-2.md` |
| `ERD` | Entity-relationship data models (6) | `docs/DATA-MODELS.md` Part 3 |
| `RDM` | Relational data models (6) | `docs/DATA-MODELS.md` Part 4 |
| `UC` | Use case diagrams (3) | `docs/USE-CASE-DIAGRAMS.md` |
| `AD` | Activity diagrams (3) | `docs/ACTIVITY-DIAGRAMS.md` |
| `SD` | Sequence diagrams (45) | `docs/SEQUENCE-DIAGRAMS.md` |
| `CL` | Class diagrams (3) | `docs/CLASS-DIAGRAMS.md` |

**Total: 92 figures.**

**Notation for the DFDs.** Our DFDs use rounded process boxes with the number on top and open-ended
data stores labeled D1, D2…, which is the **Gane and Sarson** notation (the same as the professor's
sample). If your adviser named a different notation, change only the words in parentheses.

---

# 1. Context Diagram

### [CD-1] — place under the context diagram

**Figure #: Context Diagram of TrustListo (Gane and Sarson Notation)**

The context diagram shows TrustListo as a single process, the TrustListo Real Estate Brokerage
Platform, and the six external entities that exchange data with it. The Super Admin manages company
accounts. The Company Admin, Broker and Sales Consultant run the daily work of a brokerage firm. The
Property Seeker and Property Owner use the public marketplace without logging in. Inputs such as
consultant credentials, listing requests, inquiries, payment receipts and voucher signatures flow
into the system. Outputs such as AI document check results, property listings, commission records,
reports and rating links flow back to the entities. The diagram also marks the system's limits: no
money passes through it, and no government system is connected, since the AI reads only the
documents that users upload.

---

# 2. Level 0 Data Flow Diagrams

### [L0-A] — place under Diagram A (Shared)

**Figure #: Level 0 DFD of TrustListo — Shared: Account and Firm Administration (Gane and Sarson Notation)**

This Level 0 diagram shows the administration processes shared by all modules. Process 1.0, Manage
Company Accounts, lets the Super Admin view the firms on the platform and, as a planned feature,
register and suspend companies. Process 2.0, Manage Consultants and Firm Settings, lets the Company
Admin create consultant accounts and set the firm's loan defaults, closing tax rates, withholding
rate and commission split. These processes read and write the Firm, User Account, Credential,
Commission Setting and Audit Log data stores. Every change is recorded in the audit log.

### [L0-B] — place under Diagram B (Module 1)

**Figure #: Level 0 DFD of TrustListo — Module 1: AI Document Processing and Verification (Gane and Sarson Notation)**

This diagram shows how TrustListo turns an uploaded document into a verified record. In Process 3.0,
the Company Admin uploads consultant credentials and Licenses to Sell, which are stored in the
Document data store. Process 4.0 is the AI: it reads every uploaded document, extracts its fields,
compares them with the existing records and raises flags. It then suggests a status, either Needs
Attention or Ready for Review, but never approves. In Process 5.0, the Broker reviews the documents
with the AI's flags and makes the final decision. This updates the credential, License to Sell,
requirement item and property badge records. The diagram makes the main rule of the system visible:
the AI only flags, and only the Broker can approve.

### [L0-C] — place under Diagram C (Module 2)

**Figure #: Level 0 DFD of TrustListo — Module 2: Marketplace and Property Management (Gane and Sarson Notation)**

This diagram shows how listings enter the marketplace and how buyers reach the firm. The Company
Admin records developer projects, units and loan quotations (Process 6.0). A unit is published only
when its project's License to Sell is approved. Property Seekers browse listings and estimate loans
(7.0), then send inquiries that go only to consultants of the listing's firm (8.0). Property Owners
choose an agent from a randomly ordered list and submit a listing request (9.0). The agent prepares
the listing with its ownership documents, and the Broker approves it before it goes live (10.0).

### [L0-D] — place under Diagram D (Module 3)

**Figure #: Level 0 DFD of TrustListo — Module 3: Sales, Client and Commission Management (Gane and Sarson Notation)**

This diagram follows a deal from lead to completed sale. Consultants manage their leads and referral
links (11.0) and request site visits, which the Company Admin approves (12.0). They convert a
reserving buyer into a client with a requirement checklist (13.0) and record the buyer's payments
from receipts (14.0). The system then evaluates each commission tranche (15.0). A tranche becomes
releasable only when its payment milestone is reached and the required documents are verified,
plus the developer's transmittal when one is required. The Broker prepares and signs the voucher
before the consultants (16.0). The deal ends with the closing checklist and the buyer's rating
(17.0), and the reports and activity log (18.0) summarize the firm's work.

---

# 3. Level 1 Child DFDs

### [L1-1.0] — place under Level 1 – Process 1.0

**Figure #: Level 1 – Process 1.0 Child DFD (Gane and Sarson Notation)**

This child diagram breaks down Manage Company Accounts into four steps. Register Company (1.1) and
Update Company Status (1.2) are planned features that will let the Super Admin create a firm with
its first Company Admin and suspend or reactivate a firm. Display Company Records (1.3) shows each
firm with its status, number of users and number of live listings. Display Platform Activity Logs
(1.4) shows platform-level entries only. The Super Admin never sees a firm's clients, documents or
commissions.

### [L1-2.0] — place under Level 1 – Process 2.0

**Figure #: Level 1 – Process 2.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how the Company Admin manages the team and the firm's settings. A new
consultant account is first validated (2.1): the email must be unused, and the supervisor must have
the right role. It is then saved with a referral code and a temporary password (2.2), and the team
list is displayed with each member's credential status (2.3). Firm settings are validated (2.4),
including the check that each commission split totals 100 percent, then saved to the Firm and
Commission Setting data stores (2.5).

### [L1-3.0] — place under Level 1 – Process 3.0

**Figure #: Level 1 – Process 3.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how credentials and Licenses to Sell enter the system. Every file is first
validated (3.1) by its actual content, which must be a PDF, JPG, PNG or WebP of up to 10 MB. A
credential scan is recorded with its type and number (3.2). A License to Sell is attached to its
project (3.3), and only one may wait for review per project. Both scans are then stored privately in
the Document data store (3.4), where the AI picks them up.

### [L1-4.0] — place under Level 1 – Process 4.0

**Figure #: Level 1 – Process 4.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows the AI document reading pipeline of Module 1. The uploaded image is
prepared for reading (4.1), and its text is read by optical character recognition (4.2). The
document type is identified from the text (4.3), and the important fields are extracted with a
confidence score for each (4.4). The fields are then cross-checked against the system's records,
and flags are raised for any problem found (4.5). Finally, a review status is suggested (4.6):
Needs Attention if a blocking or warning flag exists, otherwise Ready for Review. The AI never sets
a document to Approved.

### [L1-5.0] — place under Level 1 – Process 5.0

**Figure #: Level 1 – Process 5.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows the Broker's verification of documents. The review queue lists the
documents with their AI results, oldest first (5.1). The Broker's decision is recorded (5.2): a
rejection needs a reason, and approving a document with a blocking flag needs an override note.
Expired documents cannot be approved. The decision then updates the record the document belongs to,
such as a credential, a License to Sell or a buyer's requirement item (5.3). Trust badges are
granted only when the approved facts support them (5.4).

### [L1-6.0] — place under Level 1 – Process 6.0

**Figure #: Level 1 – Process 6.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how the Company Admin builds the developer listings. Developers and their
projects are recorded (6.1), and each unit is saved with its price, size, photos and map location
(6.2). A unit is published or unpublished in Process 6.3. Publishing is allowed only if the
project's License to Sell has been approved by a Broker and has not expired. The developer's actual
payment schemes are saved as loan quotations (6.4), and all of the firm's listings can be viewed
with their status and badges (6.5).

### [L1-7.0] — place under Level 1 – Process 7.0

**Figure #: Level 1 – Process 7.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how a Property Seeker uses the public marketplace. Live listings are
filtered by the seeker's search criteria (7.1), and a chosen property's details, photos, badges and
loan quotations are shown (7.2). The loan estimate (7.3) uses the property's price and the firm's
default rates to compute either the monthly payment or the price range the buyer can afford. It is
always labeled as an estimate only, not a loan approval.

### [L1-8.0] — place under Level 1 – Process 8.0

**Figure #: Level 1 – Process 8.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how an inquiry reaches the right consultant. The system first decides the
route (8.1). A property owner's listing always goes to the owner's chosen agent. Otherwise, a valid
referral code from the same firm wins, and if there is none, the buyer picks a consultant. For that
pick, the verified consultants of the listing's firm are shown in a new random order every time
(8.2), and nobody is featured. The inquiry is validated for consent and spam (8.3) and saved as a
new lead (8.4). Inquiries never go to another firm.

### [L1-9.0] — place under Level 1 – Process 9.0

**Figure #: Level 1 – Process 9.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how a property owner submits a property without creating an account. The
verified agents of all firms are listed in random order (9.1). The owner's request is validated
(9.2): the property must have a land title, the owner must give consent, and an agent must be
chosen. The request is then saved and sent to that agent (9.3).

### [L1-10.0] — place under Level 1 – Process 10.0

**Figure #: Level 1 – Process 10.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how an owner's request becomes a live listing. The agent views the request
(10.1) and accepts or declines it with a reason (10.2). After accepting, the agent uploads the land
title, tax declaration, tax receipt and owner's ID (10.3), which the AI reads. The agent then
submits the listing with its description and map pin (10.4). The Broker approves the listing only
when all four documents are approved, or sends it back to the agent with a reason (10.5).

### [L1-11.0] — place under Level 1 – Process 11.0

**Figure #: Level 1 – Process 11.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how consultants work their leads. The inquiries assigned to a consultant
are displayed (11.1), and the consultant updates each lead's status, giving a reason when a lead is
lost (11.2). Process 11.3 generates the consultant's personal referral link from their referral
code. Buyers who inquire through that link are sent directly to the consultant.

### [L1-12.0] — place under Level 1 – Process 12.0

**Figure #: Level 1 – Process 12.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how site visits are scheduled. Buyers cannot book visits themselves; the
consultant requests one. The system checks whether the consultant has another visit within one hour
(12.1), but this is only a warning and does not block the request. The request is saved as pending
(12.2). The Company Admin approves or declines it (12.3), and an approval moves the lead to Visit
Scheduled. All visits are shown on a calendar (12.4).

### [L1-13.0] — place under Level 1 – Process 13.0

**Figure #: Level 1 – Process 13.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how a lead becomes a client with a document checklist. The AI first reads
the reservation receipt (13.1). After the consultant confirms the amount, the client record and the
confirmed reservation payment are created, and the lead is marked Reserved (13.2). A requirement
checklist is generated from the buyer's profile (13.3). The consultant uploads the buyer's
documents for the AI to read and the Broker to verify (13.4). The Broker may waive a requirement
that does not apply (13.5), and the client records are displayed with their progress (13.6).

### [L1-14.0] — place under Level 1 – Process 14.0

**Figure #: Level 1 – Process 14.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how buyer payments are recorded from official receipts. The consultant
uploads the receipt (14.1). The system pre-fills the payment with the amount and date the AI read
(14.2). The payment counts toward the commission milestones only after the consultant confirms it
(14.3). A receipt whose number was already used is flagged and cannot be confirmed, which prevents
the same payment from being counted twice.

### [L1-15.0] — place under Level 1 – Process 15.0

**Figure #: Level 1 – Process 15.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how commissions are tracked in tranches. When a client is created, the
commission is computed as the total contract price times the developer's rate, then split into
tranches, and the firm's commission split is saved at that moment (15.1). The Company Admin records
the developer's transmittal, and the AI checks its amount (15.2). Every tranche is evaluated against
its gates (15.3). The commission records show each tranche's status and how long it has been waiting
for a transmittal (15.4).

### [L1-16.0] — place under Level 1 – Process 16.0

**Figure #: Level 1 – Process 16.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how a ready tranche is paid out through a signed voucher. The system
computes each person's share, minus the withholding rate and any extra deductions (16.1), and saves
the voucher (16.2). The Broker always signs first (16.3), and then each consultant signs (16.4). A
signature is the typed full name with the time and a fingerprint of the voucher's content, and
editing the voucher cancels earlier signatures. Once everyone has signed, the tranche is marked
Released (16.5). This only records that the payout was made outside the system.

### [L1-17.0] — place under Level 1 – Process 17.0

**Figure #: Level 1 – Process 17.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how a sale is closed and rated. The system estimates the capital gains tax,
documentary stamp tax and transfer tax at the firm's rates (17.1), and the client moves to Closing.
The consultant ticks the closing steps as they are done (17.2), and the last step completes the
sale. A one-time rating link is then created (17.3). The buyer uses it to rate the consultant from
one to five stars (17.4). The link works once and expires after 30 days.

### [L1-18.0] — place under Level 1 – Process 18.0

**Figure #: Level 1 – Process 18.0 Child DFD (Gane and Sarson Notation)**

This child diagram shows how the firm's reports are produced. The monthly sales summary (18.1)
counts reservations, new leads, completed sales and released commissions. Team performance (18.2)
shows each consultant's open leads, active clients and reservations, and a Sales Manager sees only
their own team. The firm activity log (18.3) shows every approval, rejection, signature and status
change, with who made it and when.

---

# 4. Level 2 Child DFDs

### [L2-4.5] — place under Level 2 – Process 4.5

**Figure #: Level 2 – Process 4.5 Child DFD (Gane and Sarson Notation)**

This Level 2 diagram details how the AI cross-checks a document. The declared and detected document
types are compared, and the extracted fields are sorted by kind (4.5.1). Names are compared with the
records, counting as a match at 92 percent similarity and as a possible match from 80 percent
(4.5.2). Numbers and amounts are checked for mismatches and for duplicate receipts and files
(4.5.3). Dates and property details are checked for expiry, unpaid taxes, area differences and
encumbrances (4.5.4). Each result is finally given a severity of Blocker, Warning or Info (4.5.5).

### [L2-13.3] — place under Level 2 – Process 13.3

**Figure #: Level 2 – Process 13.3 Child DFD (Gane and Sarson Notation)**

This Level 2 diagram details how the buyer's requirement checklist is generated. The documents
needed at reservation are determined first (13.3.1). Items for the buyer's civil status are added,
such as the marriage contract and the spouse's ID for married buyers (13.3.2). Items for the payment
method and employment type are added, such as payslips, a certificate of employment or income tax
returns (13.3.3). The three lists are merged without duplicates and saved as the client's checklist
(13.3.4).

### [L2-15.3] — place under Level 2 – Process 15.3

**Figure #: Level 2 – Process 15.3 Child DFD (Gane and Sarson Notation)**

This Level 2 diagram details the gates every commission tranche must pass. The system checks whether
the buyer's confirmed payments have reached the tranche's milestone (15.3.1). It checks whether all
documents of the required stage are verified or waived (15.3.2). It checks whether a developer
transmittal is needed and confirmed (15.3.3). The status is then set (15.3.4): Waiting, Blocked,
Awaiting Transmittal or Ready for Release. A tranche that already has a voucher is never changed.

---

# 5. Entity-Relationship Data Models

### [ERD-A] — place under ERD Figure A

**Figure #: Entity-Relationship Data Model for TrustListo — A. Firm Ownership (Crow's Foot Notation)**

This figure shows how TrustListo keeps each brokerage firm's data separate. The Firm entity is
linked by a one-to-many relationship to the 20 tables that store a firm identifier. Every row in
those tables belongs to exactly one firm, and every query of a logged-in user is limited to that
user's firm. User and Audit Log are the only links where the firm is optional, because the Super
Admin and platform-level events belong to no firm.

### [ERD-B] — place under ERD Figure B

**Figure #: Entity-Relationship Data Model for TrustListo — B. Accounts and Document Verification (Crow's Foot Notation)**

This figure shows the user accounts and the records of Module 1. A user may supervise other users,
which forms the team structure of Broker, Sales Manager and Sales Person. A user may hold
credentials, and each credential has at most one scanned document. Every document records who
uploaded it and which Broker reviewed it. The Audit Log records the user behind every important
action.

### [ERD-C] — place under ERD Figure C

**Figure #: Entity-Relationship Data Model for TrustListo — C. Marketplace and Property Management (Crow's Foot Notation)**

This figure shows the data of the marketplace. A developer has projects, each with at most one
License to Sell document, and a project contains the units listed for sale. A property owner's
listing request becomes at most one property and is assigned to the agent the owner chose. Each
property has its own photos, loan quotations and trust badges, and a Broker grants each badge.

### [ERD-D] — place under ERD Figure D

**Figure #: Entity-Relationship Data Model for TrustListo — D. Leads and Site Visits (Crow's Foot Notation)**

This figure shows how a buyer's inquiry connects to the rest of the sales process. Each inquiry is
for one property and is handled by one consultant, and it can convert into at most one client. Site
visits link the property, the requesting consultant, the Company Admin who decided, and the lead or
client. A rescheduled visit points back to the visit it replaced.

### [ERD-E] — place under ERD Figure E

**Figure #: Entity-Relationship Data Model for TrustListo — E. Clients, Payments, Requirements, Closing and Ratings (Crow's Foot Notation)**

This figure shows the records kept for each client. A client makes many payments, each with at most
one receipt document, and has a checklist of requirement items satisfied by uploaded documents. Each
client has at most one closing record, one rating link and one rating. Consultants confirm the
payments, and Brokers verify the requirement items.

### [ERD-F] — place under ERD Figure F

**Figure #: Entity-Relationship Data Model for TrustListo — F. Commissions (Crow's Foot Notation)**

This figure shows the structure of staged commissions. Each developer has a commission template per
payment method, and the template defines its tranches. A client's deal has at most one commission,
computed from one template and divided into tranches. A tranche may carry the developer's
transmittal document and has at most one voucher. The firm's commission split is stored separately
and copied into each commission when it is created.

---

# 6. Relational Data Models

### [RDM-A] — place under Relational Figure A

**Figure #: Relational Data Model for TrustListo — A. Firm Ownership (Crow's Foot)**

This figure shows the firm ownership with sample rows. The Firm table's primary key appears as the
firmId foreign key in each firm-owned table. For example, a property, a client and a voucher of
Advench Realty all carry the value f1. The Super Admin's row and platform-level log entries have an
empty firmId, which shows that they belong to no firm.

### [RDM-B] — place under Relational Figure B

**Figure #: Relational Data Model for TrustListo — B. Accounts and Document Verification (Crow's Foot)**

This figure shows the user, credential, document and audit log tables with sample rows. Sales Person
u4 reports to Sales Manager u3 through the managerId column, and u3 reports to Broker u2 through
brokerId. Credential c1 belongs to u4, points to its scan d1 and was reviewed by u2, and the audit
log entry a1 records that approval. The arrows show how each foreign key value matches a primary key
in another table.

### [RDM-C] — place under Relational Figure C

**Figure #: Relational Data Model for TrustListo — C. Marketplace and Property Management (Crow's Foot)**

This figure shows the property tables with sample rows. The developer unit pr1, the Ella Model,
belongs to project p1, Camella Naga, whose License to Sell is document d3. The owner listing pr2
comes from seller request s1 and is assigned to agent u4. The photo, loan quotation and badge rows
point to their property through propertyId, and Broker u2 granted both badges.

### [RDM-D] — place under Relational Figure D

**Figure #: Relational Data Model for TrustListo — D. Leads and Site Visits (Crow's Foot)**

This figure shows the inquiry and visit tables with sample rows. Inquiry i1, a referral lead for
property pr1 handled by u4, was converted into client cl1. The visit rows reference their property,
consultant, lead and deciding Company Admin. Visit v3 points back to v2 through rescheduledFromId,
which shows how a rescheduled visit keeps its history.

### [RDM-E] — place under Relational Figure E

**Figure #: Relational Data Model for TrustListo — E. Clients, Payments, Requirements, Closing and Ratings (Crow's Foot)**

This figure shows the records of client cl1, Mario Fernandez, with sample rows. The reservation
payment pay1 is linked to receipt d5 and was confirmed by consultant u4. Requirement item r1 was
verified by Broker u2 using document d6, and item r2 was waived. The closing record, rating link and
five-star rating all point to the same client through clientId.

### [RDM-F] — place under Relational Figure F

**Figure #: Relational Data Model for TrustListo — F. Commissions (Crow's Foot)**

This figure shows how a commission is built from its template, with sample rows. Template tp1 for
Vista Land cash sales sets a 5 percent rate with two tranches. Commission cm1 for client cl1 is
therefore ₱142,500 out of a ₱2,850,000 contract price. Tranche t1 was released through voucher vo1,
and tranche t2 is waiting for the developer's transmittal d7. The split table shows the 20/20/60
division used when a Sales Person handles the deal.

---

# 7. Use Case Diagrams

### [UC-1] — place under the Module 1 use case diagram

**Figure #: Use Case Diagram of TrustListo — Module 1: AI Document Processing and Verification (Unified Modeling Language)**

The use case diagram represents the interactions between users and the system. This diagram shows
the account and verification use cases of Module 1. The Super Admin views firms and logs. The
Company Admin adds and manages consultants and uploads credentials and Licenses to Sell, and both
uploads include Read Uploaded Document, the AI's reading of the file. The Broker reviews credentials
and documents. Every firm user, generalized as Firm User, can log in, change their password and log
out.

### [UC-2] — place under the Module 2 use case diagram

**Figure #: Use Case Diagram of TrustListo — Module 2: Marketplace and Property Management (Unified Modeling Language)**

The use case diagram represents the interactions between users and the system. This diagram shows
the marketplace use cases. The Company Admin adds developers, manages projects and unit listings,
and may publish or unpublish a unit as an extension of managing it. The Property Seeker browses
properties and may compute a loan estimate or send an inquiry as extensions. The Property Owner
submits a property, the Sales Consultant responds to the request and prepares the listing, and the
Broker reviews the listing before it goes live.

### [UC-3] — place under the Module 3 use case diagram

**Figure #: Use Case Diagram of TrustListo — Module 3: Sales, Client and Commission Management (Unified Modeling Language)**

The use case diagram represents the interactions between users and the system. This diagram shows
the sales and commission use cases. The Sales Consultant manages leads and visits, converts leads to
clients, uploads requirements, records payments, signs vouchers and closes sales. The Company Admin
approves visits, uploads transmittals and manages firm settings, while the Broker waives
requirements and prepares vouchers. Payments, transmittals and waivers include Update Commission
Status, the system's evaluation of the tranche gates. The Property Seeker rates the agent after the
sale.

---

# 8. Activity Diagrams

### [AD-1] — place under the Module 1 activity diagram

**Figure #: Activity Diagram of TrustListo — Module 1: AI Document Processing and Verification (Unified Modeling Language)**

The activity diagram shows the flow of actions across the people and the system involved in a
process. This diagram follows a document from upload to decision, in three swimlanes: Uploader,
System (AI) and Broker. The system checks the file, reads its text, identifies its type, extracts
and cross-checks the fields, raises flags and suggests a status. Payment receipts and transmittals
return to the uploader to confirm the amount; every other document goes to the Broker. The Broker
approves it, with an override note if a blocking flag exists, or rejects it with a reason so that
the uploader can send a corrected file.

### [AD-2] — place under the Module 2 activity diagram

**Figure #: Activity Diagram of TrustListo — Module 2: Marketplace and Property Management (Unified Modeling Language)**

The activity diagram shows the flow of actions across the people and the system involved in a
process. This diagram follows an owner's property from the listing request to a buyer's inquiry,
across five swimlanes. The owner chooses an agent and submits the request. The agent accepts it,
uploads the four ownership documents and submits the listing. The Broker approves the listing only
when all four documents are approved, or sends it back. Once the listing is live, the Property Seeker
can estimate a loan and send an inquiry, which the system routes to the owner's chosen agent.

### [AD-3] — place under the Module 3 activity diagram

**Figure #: Activity Diagram of TrustListo — Module 3: Sales, Client and Commission Management (Unified Modeling Language)**

The activity diagram shows the flow of actions across the people and the system involved in a
process. This diagram follows a deal from a new lead to a completed and rated sale. After an
optional site visit approved by the Company Admin, the consultant converts the reserving buyer, and
the system creates the client, checklist and commission. The flow then forks into two parallel
branches. In the commission branch, each tranche passes its gates and is released after the Broker
and the consultants sign the voucher. In the closing branch, the closing steps are completed and the
buyer rates the consultant. A join waits for both branches before the flow ends.

---

# 9. Sequence Diagrams

The sequence diagram shows the interactions between objects over time. Each paragraph below
describes one use case.

## Module 1

### [SD1] — place under Sequence Diagram SD1

**Figure #: Sequence Diagram of TrustListo — Manage Company Account (Unified Modeling Language)**

This sequence diagram shows the planned interaction for creating and suspending a company. The
Super Admin enters the company and its first Company Admin. The web application sends them to the
server, which creates the firm and the admin account and records the action in the audit log. An
optional frame shows how the Super Admin changes a firm's status to Active or Suspended. This
feature is designed but not yet built.

### [SD2] — place under Sequence Diagram SD2

**Figure #: Sequence Diagram of TrustListo — View Firm List (Unified Modeling Language)**

This sequence diagram shows how the Super Admin views the firms on the platform. The web application
requests the firm list from the server. The server reads each firm's name, status and number of
users, then counts its live listings from the database. The result is shown without any of the
firm's clients, documents or commissions.

### [SD3] — place under Sequence Diagram SD3

**Figure #: Sequence Diagram of TrustListo — View Platform Activity Logs (Unified Modeling Language)**

This sequence diagram shows how platform-level activity is retrieved. The server reads only the
audit log entries that belong to no firm, newest first and one page at a time, and returns them to
the web application. The server function exists, while the screen for it is planned.

### [SD4] — place under Sequence Diagram SD4

**Figure #: Sequence Diagram of TrustListo — Log In (Unified Modeling Language)**

This sequence diagram shows the login interaction and its checks. The server first checks whether
the account is locked after five failed attempts. It then finds the user and verifies the password.
Alternative frames show the responses for a wrong password, which is also recorded in the audit
log, and for a deactivated account or suspended firm. On success, the server starts a signed session
and records the login, and the web application opens the dashboard for the user's role.

### [SD5] — place under Sequence Diagram SD5

**Figure #: Sequence Diagram of TrustListo — Change Password (Unified Modeling Language)**

This sequence diagram shows how a firm user changes their password. The server checks that the new
password has at least ten characters with a letter and a number, then verifies the current password
against the database. If it is correct, the new password is saved in hashed form and the change is
recorded in the audit log. Otherwise, the server returns an error.

### [SD6] — place under Sequence Diagram SD6

**Figure #: Sequence Diagram of TrustListo — Log Out (Unified Modeling Language)**

This sequence diagram shows the logout interaction. The user signs out, and the web application asks
the server to end the session. The server clears the session cookie, and the user is returned to the
sign-in page.

### [SD7] — place under Sequence Diagram SD7

**Figure #: Sequence Diagram of TrustListo — Add Consultant (Unified Modeling Language)**

This sequence diagram shows how the Company Admin adds a team member. The server checks that the
email is unused and that the chosen supervisor has the right role. It then creates a referral code
and a temporary password and saves the account. The action is recorded in the audit log, and the
one-time password is shown to the Company Admin to hand over.

### [SD8] — place under Sequence Diagram SD8

**Figure #: Sequence Diagram of TrustListo — Manage Consultant Account (Unified Modeling Language)**

This sequence diagram shows how the Company Admin edits a team member's account. When deactivating,
the server first counts the active team members who report to that person and refuses until they
are reassigned. The changes are saved and recorded as updated, deactivated or reactivated. An
optional frame shows how a new referral code is generated.

### [SD9] — place under Sequence Diagram SD9

**Figure #: Sequence Diagram of TrustListo — Upload Consultant Credential (Unified Modeling Language)**

This sequence diagram shows how a credential enters the system. The server checks the file's type
and size, stores the file privately, and creates the credential and document records. It then hands
the document to the AI without waiting, shown as an asynchronous message. A reference frame points
to Read Uploaded Document, which describes the AI's work, and the result is shown to the Company
Admin.

### [SD10] — place under Sequence Diagram SD10

**Figure #: Sequence Diagram of TrustListo — Upload License to Sell (Unified Modeling Language)**

This sequence diagram shows how a project's License to Sell is uploaded. The server refuses an
invalid file, or a second license while one is still waiting for review. Otherwise, it stores the
file, creates the document, sets the project's license status to Pending AI and hands the document
to the AI. A reference frame points to Read Uploaded Document.

### [SD11] — place under Sequence Diagram SD11

**Figure #: Sequence Diagram of TrustListo — Review Consultant Credential (Unified Modeling Language)**

This sequence diagram shows how the Broker decides on a consultant's credential. The Broker opens the
review queue and the credential with its scan, AI text, fields and flags. To approve, the Broker
confirms the expiry date. The server refuses an expired credential, or a blocking flag without an
override note. To reject, the Broker gives a reason. Both decisions are saved and recorded in the
audit log.

### [SD12] — place under Sequence Diagram SD12

**Figure #: Sequence Diagram of TrustListo — Review Document (Unified Modeling Language)**

This sequence diagram shows how the Broker decides on a License to Sell, an owner's document or a
buyer's document. If the Broker corrects any field the AI misread, the server re-checks the flags.
It then refuses an approval with a blocking flag and no note, or an expired License to Sell. An
approval updates the record the document belongs to. For a buyer's document, a reference frame
points to Update Commission Status, because a verified document may open a commission tranche.

### [SD13] — place under Sequence Diagram SD13

**Figure #: Sequence Diagram of TrustListo — Read Uploaded Document (Unified Modeling Language)**

This sequence diagram shows the AI's work on every uploaded document, which the other diagrams
reference. The AI retrieves the file from storage, prepares the image and reads the text. If no text
can be read, it flags the document. Otherwise, it identifies the type, extracts the fields, compares
them with the records and computes the flags. It saves its results and suggests Needs Attention or
Ready for Review, and it never approves a document.

## Module 2

### [SD14] — place under Sequence Diagram SD14

**Figure #: Sequence Diagram of TrustListo — Add Developer (Unified Modeling Language)**

This sequence diagram shows how the Company Admin adds a partner developer. The server checks that
the firm does not already have a developer with the same name, then saves the developer and records
the action in the audit log. The updated developer list is shown.

### [SD15] — place under Sequence Diagram SD15

**Figure #: Sequence Diagram of TrustListo — Manage Project Records (Unified Modeling Language)**

This sequence diagram shows how the Company Admin adds or edits a developer project with its name,
location and map pin. An alternative frame separates creating a project from editing one. A
reference frame points to Upload License to Sell, which the Company Admin uses to attach the
project's license.

### [SD16] — place under Sequence Diagram SD16

**Figure #: Sequence Diagram of TrustListo — Manage Unit Listing (Unified Modeling Language)**

This sequence diagram shows how the Company Admin builds a developer unit listing. The unit is saved
as a draft with its details, price and map location. Two loops show the upload of up to twenty
photos to file storage and the entry of the developer's loan quotations.

### [SD17] — place under Sequence Diagram SD17

**Figure #: Sequence Diagram of TrustListo — Publish or Unpublish Unit (Unified Modeling Language)**

This sequence diagram shows how a unit goes live or is taken down. To publish, the server reads the
project's License to Sell status and refuses if it is not approved or has expired. Otherwise, it sets
the unit to Live and grants the License to Sell Verified badge. Unpublishing returns the unit to
Draft. Both actions are recorded in the audit log.

### [SD18] — place under Sequence Diagram SD18

**Figure #: Sequence Diagram of TrustListo — Browse Properties (Unified Modeling Language)**

This sequence diagram shows how a Property Seeker searches the public marketplace without logging
in. The server returns the live listings of active firms that match the filters, along with the
map pins for the visible area. An optional frame shows the seeker opening a property to see its
photos, badges and loan quotations.

### [SD19] — place under Sequence Diagram SD19

**Figure #: Sequence Diagram of TrustListo — Compute Loan Estimate (Unified Modeling Language)**

This sequence diagram shows the loan calculator, which runs entirely in the web application using
the firm's default rates. An alternative frame separates the two modes. One computes the monthly
payment for a price, and the other computes the price the buyer can afford from their income. The
result is always labeled as an estimate, not a loan approval.

### [SD20] — place under Sequence Diagram SD20

**Figure #: Sequence Diagram of TrustListo — Send Inquiry (Unified Modeling Language)**

This sequence diagram shows how a buyer's inquiry reaches a consultant. If the listing has no
owner's agent and no referral code, the server returns the firm's verified consultants in a new
random order for the buyer to pick. On submission, the server checks consent and spam and routes
the inquiry to the owner's agent, the referring consultant or the buyer's pick. The inquiry is saved
as a new lead, and the buyer is told who will contact them.

### [SD21] — place under Sequence Diagram SD21

**Figure #: Sequence Diagram of TrustListo — Submit Property for Listing (Unified Modeling Language)**

This sequence diagram shows how a property owner submits a property. The server first returns the
verified agents of all firms in random order. It then validates the request: it must have a land
title, consent and a valid mobile number, and an asking price of at least ₱10,000. If valid, the
server stores the photos and saves the request for the chosen agent.

### [SD22] — place under Sequence Diagram SD22

**Figure #: Sequence Diagram of TrustListo — Respond to Seller Request (Unified Modeling Language)**

This sequence diagram shows how an agent answers a property owner's request. The agent opens their
requests and either accepts one or declines it with a reason. The server updates the request's
status and records the decision, including the reason, in the audit log.

### [SD23] — place under Sequence Diagram SD23

**Figure #: Sequence Diagram of TrustListo — Prepare Seller Listing (Unified Modeling Language)**

This sequence diagram shows how the agent prepares an owner's listing. A loop covers the upload of
the four ownership documents, each stored and handed to the AI through a reference to Read Uploaded
Document. When the agent submits the listing, the server refuses it if a document is missing or
still being read. Otherwise, it creates the listing as Pending Review or Needs Attention and marks the
request Submitted for Review.

### [SD24] — place under Sequence Diagram SD24

**Figure #: Sequence Diagram of TrustListo — Review Seller Listing (Unified Modeling Language)**

This sequence diagram shows how the Broker reviews an owner's listing. The documents still waiting
are decided through a reference to Review Document. To approve, the server requires all four
documents to be approved, then sets the listing Live, grants the earned badges and marks the request
Listed. To send it back, the Broker gives a reason and the request returns to the agent.

## Module 3

### [SD25] — place under Sequence Diagram SD25

**Figure #: Sequence Diagram of TrustListo — View To-Do List (Unified Modeling Language)**

This sequence diagram shows how the Overview page is built for a Company Admin, Sales Manager or
Sales Person. The web application requests the user's leads, visits, clients, commissions and
seller requests, each limited to the user's scope. From these, it counts the deals at each stage and
lists the most urgent tasks first. An optional frame shows the user opening a task.

### [SD26] — place under Sequence Diagram SD26

**Figure #: Sequence Diagram of TrustListo — Manage Lead (Unified Modeling Language)**

This sequence diagram shows how a consultant works a lead. The consultant opens their leads and
updates one lead's status. The server refuses the change if the user is not the handling consultant
or if a lost lead has no reason. Otherwise, it saves the status and records it in the audit log.

### [SD27] — place under Sequence Diagram SD27

**Figure #: Sequence Diagram of TrustListo — Request Site Visit (Unified Modeling Language)**

This sequence diagram shows how a consultant requests a site visit for a lead. The server looks for
the consultant's other visits within one hour and saves the request as Pending. An optional frame
shows the clash warning, which informs the consultant but does not block the request. The request is
sent to the Company Admin for approval.

### [SD28] — place under Sequence Diagram SD28

**Figure #: Sequence Diagram of TrustListo — Update Site Visit (Unified Modeling Language)**

This sequence diagram shows how a consultant records what happened to a visit. When the visit is
rescheduled, the old visit is kept as Rescheduled and a new pending visit is created that points back
to it. Otherwise, the visit is marked Completed, No-show or Cancelled. Each change is recorded in the
audit log.

### [SD29] — place under Sequence Diagram SD29

**Figure #: Sequence Diagram of TrustListo — Convert Lead to Client (Unified Modeling Language)**

This sequence diagram shows how a reserving buyer becomes a client. The reservation receipt is
uploaded and read by the AI through a reference to Read Uploaded Document, which pre-fills the
amount. When the consultant confirms the amount and the deal details, the server creates the client,
the confirmed reservation payment and the requirement checklist. It also creates the commission and
its tranches from the developer's template and marks the lead Reserved. A reference to Update
Commission Status evaluates the new tranches.

### [SD30] — place under Sequence Diagram SD30

**Figure #: Sequence Diagram of TrustListo — Upload Buyer Requirement (Unified Modeling Language)**

This sequence diagram shows how a buyer's document is attached to a checklist item. The server
refuses an item that is already verified or waived. Otherwise, it stores the file, links it to the
item and hands it to the AI through a reference to Read Uploaded Document. The AI sets the item to
Uploaded or Needs Attention, and the Broker later verifies it.

### [SD31] — place under Sequence Diagram SD31

**Figure #: Sequence Diagram of TrustListo — Record Buyer Payment (Unified Modeling Language)**

This sequence diagram shows the two steps of recording a payment. First, the receipt is uploaded,
an unconfirmed payment is created, and the AI reads the receipt. Second, the consultant confirms the
amount and date. The server refuses the confirmation if the receipt is still being read, was already
confirmed, or reuses a receipt number. A confirmed payment triggers Update Commission Status.

### [SD32] — place under Sequence Diagram SD32

**Figure #: Sequence Diagram of TrustListo — Approve or Decline Site Visit (Unified Modeling Language)**

This sequence diagram shows how the Company Admin decides on visit requests from the calendar. An
approval marks the visit Approved and moves the lead to Visit Scheduled. A decline saves the reason
for the consultant. Both decisions record who decided and are written to the audit log.

### [SD33] — place under Sequence Diagram SD33

**Figure #: Sequence Diagram of TrustListo — Upload Developer Transmittal (Unified Modeling Language)**

This sequence diagram shows how the Company Admin records the developer's transmittal for a tranche.
The file is stored and read by the AI, which compares its amount with the tranche. When the Company
Admin confirms the amount, the server requires a note if it differs by more than ₱1. It then saves
the amount and triggers Update Commission Status, which can make the tranche Ready for Release.

### [SD34] — place under Sequence Diagram SD34

**Figure #: Sequence Diagram of TrustListo — Manage Firm Settings (Unified Modeling Language)**

This sequence diagram shows how the Company Admin changes the firm's settings. Three optional frames
cover the loan defaults, withholding and closing tax rates; the commission split, which must total
100 percent; and a developer's commission template. Each change is saved and recorded in the audit
log. Deals already in progress keep the split saved when they started.

### [SD35] — place under Sequence Diagram SD35

**Figure #: Sequence Diagram of TrustListo — View Reports (Unified Modeling Language)**

This sequence diagram shows how reports are produced for the Company Admin, Broker or Sales Manager.
The server computes the monthly summary of reservations, new leads, completed sales and released
commissions. It then computes the pipeline of leads and clients by status and the counts for each
consultant. A Sales Manager receives only their own team's figures.

### [SD36] — place under Sequence Diagram SD36

**Figure #: Sequence Diagram of TrustListo — View Activity Log (Unified Modeling Language)**

This sequence diagram shows how the Company Admin or Broker reviews the firm's audit trail. The
server reads the firm's audit log entries, optionally filtered by the kind of record, and returns
them newest first. Each entry shows who did what and when, with the values before and after.

### [SD37] — place under Sequence Diagram SD37

**Figure #: Sequence Diagram of TrustListo — Waive Requirement (Unified Modeling Language)**

This sequence diagram shows how the Broker waives a requirement that does not apply to a buyer. The
server refuses an item that is already verified or waived, or a reason that is too short. Otherwise,
it marks the item Waived and records the reason. Because a waived item counts as complete, a
reference to Update Commission Status follows.

### [SD38] — place under Sequence Diagram SD38

**Figure #: Sequence Diagram of TrustListo — Prepare Commission Voucher (Unified Modeling Language)**

This sequence diagram shows how the Broker prepares the voucher for a ready tranche. The server
refuses a tranche that is not Ready for Release or that already has a voucher. It then computes each
person's share minus withholding and deductions, numbers the voucher and saves its content
fingerprint. An optional frame shows that editing the deductions clears any signatures. The Broker
then signs first, through a reference to Sign Commission Voucher.

### [SD39] — place under Sequence Diagram SD39

**Figure #: Sequence Diagram of TrustListo — Sign Commission Voucher (Unified Modeling Language)**

This sequence diagram shows how a voucher is signed. Before accepting a signature, the server checks
four things: the voucher has not changed, the typed name matches the account, the Broker has already
signed, and the person has not signed before. The signature is saved with the time, device and
content fingerprint. When every payee consultant has signed, the tranche is marked Released, which
records that the payout was made outside the system.

### [SD40] — place under Sequence Diagram SD40

**Figure #: Sequence Diagram of TrustListo — View Commissions (Unified Modeling Language)**

This sequence diagram shows how users follow their commissions. The server returns the tranches
within the user's scope, so a consultant sees only the deals they are part of, together with the
transmittal aging. An optional frame shows the user opening one deal to see its gross amount, its
tranches and what each one is waiting for.

### [SD41] — place under Sequence Diagram SD41

**Figure #: Sequence Diagram of TrustListo — Close the Sale (Unified Modeling Language)**

This sequence diagram shows how the handling consultant closes a sale. A loop covers each save of
the closing record. The server computes the capital gains tax, documentary stamp tax and transfer
tax at the firm's rates and records the ticked steps, and the first save moves the client to
Closing. When the consultant confirms the last step, the client is marked Completed and a one-time
rating link valid for 30 days is created.

### [SD42] — place under Sequence Diagram SD42

**Figure #: Sequence Diagram of TrustListo — Send Rating Link (Unified Modeling Language)**

This sequence diagram shows how the consultant gives the rating link to the buyer. If the link is
still valid, it is simply copied. If it was lost or has expired, the server checks that the sale is
completed and not yet rated, then creates a new link and disables the old one. The link is sent to
the buyer outside the system.

### [SD43] — place under Sequence Diagram SD43

**Figure #: Sequence Diagram of TrustListo — Rate Agent (Unified Modeling Language)**

This sequence diagram shows how a buyer rates the consultant without an account. The server looks up
the link by its scrambled code and rejects it if it is unknown, already used or expired. Otherwise,
the buyer gives one to five stars and a comment with consent. The server saves the rating, marks the
link used and records the event.

### [SD44] — place under Sequence Diagram SD44

**Figure #: Sequence Diagram of TrustListo — Update Commission Status (Unified Modeling Language)**

This sequence diagram shows the system's evaluation of commission tranches, which the other diagrams
reference. The server reads the client's confirmed payments, requirement items and tranches. For
each tranche without a voucher, it decides the next status: Waiting if the payment milestone is not
reached, Blocked if documents are missing, Awaiting Transmittal if the developer's transmittal is
still needed, and Ready for Release otherwise. A status that changes is saved and recorded in the
audit log.

### [SD45] — place under Sequence Diagram SD45

**Figure #: Sequence Diagram of TrustListo — Share Referral Link (Unified Modeling Language)**

This sequence diagram shows how a consultant obtains their referral link. The web application reads
the consultant's referral code from the server and builds the link, which the consultant copies and
shares with buyers outside the system. A reference to Send Inquiry shows that any inquiry made
through the link is routed to this consultant.

---

# 10. Class Diagrams

### [CL-1] — place under the Module 1 class diagram

**Figure #: Class Diagram of TrustListo — Module 1: AI Document Processing and Verification (Unified Modeling Language)**

A class diagram represents the static structure of a system, showing classes, their attributes and
their relationships. This diagram shows the user and document classes of Module 1. The abstract User
class is specialized into Super Admin, Company Admin, Broker and Sales Consultant, and Sales
Consultant is further specialized into Sales Manager and Sales Person. A Document is composed of its
extracted fields and flags, which the DocumentAI control class produces. Credentials and documents
are reviewed by a Broker, and every important action is kept in the Audit Log.

### [CL-2] — place under the Module 2 class diagram

**Figure #: Class Diagram of TrustListo — Module 2: Marketplace and Property Management (Unified Modeling Language)**

A class diagram represents the static structure of a system, showing classes, their attributes and
their relationships. This diagram shows the marketplace classes. A Developer has Projects, and a
Project contains the Property units it sells. A Seller Listing Request can become a Property assigned
to the owner's chosen agent. Each Property is composed of its photos, loan quotations and badges,
which Brokers grant. The LoanCalculator control class depends on the property's price and the firm's
default rates.

### [CL-3] — place under the Module 3 class diagram

**Figure #: Class Diagram of TrustListo — Module 3: Sales, Client and Commission Management (Unified Modeling Language)**

A class diagram represents the static structure of a system, showing classes, their attributes and
their relationships. This diagram shows the sales and commission classes in three zones. In the
first, an Inquiry converts into a Client, and Visits link the lead, the property and the
consultants. In the second, a Client is composed of its payments, requirement items and closing
record, and has a rating link and rating. In the third, a Commission is computed from a template,
composed of tranches, and paid through a Commission Voucher made of voucher lines and signatures.
