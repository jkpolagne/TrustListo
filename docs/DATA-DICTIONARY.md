# TrustListo — Data Dictionary

A data dictionary for Chapter 3. It describes every data flow and data store in our data flow
diagrams: what data items each flow carries, and each item's **meaning, format, usage, and
relationship to other data**, using the columns of our old table.

Every item was checked against the finished system on 2026-11-13: the database model
(`apps/api/prisma/schema.prisma`), the input forms the server accepts, and the screens. Names match
the diagrams exactly:

- `docs/DFD-CONTEXT-DIAGRAM.md` (context diagram)
- `docs/DFD-LEVEL-0.md` (Level 0, one diagram per module)
- `docs/DFD-LEVEL-1-2.md` (Level 1 and Level 2 child diagrams)

---

## How this dictionary is organized

| Part | What it covers | Example |
|---|---|---|
| **Part 1** | Login (not drawn on the DFDs, but kept from our old dictionary) | Login Credentials |
| **Part 2** | Every data flow between an **external entity** and the system (57 flows), one table each | Inquiry Data: what is inside it? |
| **Part 3** | The **17 data stores** (D1–D17) and every data item in them, one table each | D7 Inquiry |
| **Part 4** | Every flow between a **process and a data store** (88 flows), and which items it carries | "Inquiry Details" = items from D7 |
| **Part 5** | Every flow **between two processes** in the Level 1 and Level 2 diagrams (49 flows) | "OCR Text" (4.2 → 4.3) |
| **Part 6** | The fixed choice lists used in the Format column | Lead status values |

Parts 4 and 5 point back to Parts 2 and 3 instead of repeating long tables. A data item is defined
once, so the definitions never contradict each other.

### Words used in the Format column

| Format | Meaning |
|---|---|
| **Text (max N)** | Letters and numbers, at most N characters |
| **Whole number** | A number without decimals, e.g. 3 |
| **Money** | Philippine pesos (₱) with 2 decimal places, e.g. 1,250,000.00 |
| **Percent** | A percentage with up to 3 decimal places, e.g. 6.250 |
| **Date** / **Date and time** | A calendar date, or a date with the time |
| **Choice** | One value from a fixed list (see Part 6) |
| **Yes/No** | True or false |
| **File** | An uploaded PDF, JPG, PNG or WebP file, at most 10 MB. The system checks the real file type from its content, not its name |
| **System ID** | A unique code the system creates automatically (the user never types it) |
| **Map point** | Latitude and longitude of a pin placed on the map |

---

# Part 1. Login (kept from our old dictionary)

Login is not drawn on the DFDs, because it is a mechanism, not business data (see the context
diagram guide). We keep this table because our old dictionary had it. Note one correction: the
**user role is not typed at login**. The system reads it from the account after the password is
checked.

**Table 1.0: Data Dictionary for Login Credentials**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Email Address | The registered email the user signs in with | Text / email format (saved in lowercase) | Identifies the user account | Unique in D2 User Account; one email = one account |
| Password | The secret password the user types | Text / hidden while typing; saved only as a one-way scrambled code (Argon2 hash), never as plain text | Proves the user owns the account. 5 wrong tries lock the account for 15 minutes | Checked against the Password Hash in D2 User Account |
| User Role | The type of user signing in | Choice: Super Admin / Company Admin / Broker / Sales Manager / Sales Person | Not typed. After login the system uses it to choose the dashboard and features the user can access | Read from D2 User Account; every role except Super Admin belongs to one firm (D1) |

---

# Part 2. Data flows between external entities and the system

One table per data flow, in diagram order. A flow sent to two entities with the same contents (e.g.
"Commission Voucher" to the Broker and to the Sales Consultant) has one table.
*(Planned)* marks flows that are designed but not yet built.

## A. Shared: Account and Firm Administration

### Process 1.0 Manage Company Accounts

**Table 2.0: Data Dictionary for Company Account Data** *(Planned)* — Super Admin → 1.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Company Name | The brokerage firm's registered name | Text (max 120) | Shown on the firm's dashboard, listings and vouchers | Saved as Firm Name in D1 Firm |
| Company Address | The firm's office address | Text | Shown on the firm's records | Saved as Address in D1 Firm |
| Company Admin First Name / Last Name | Name of the person who will run the firm's account | Text (max 80 each) | Creates the firm's first Company Admin account | Saved in D2 User Account with role Company Admin, linked to the new firm |
| Company Admin Email | Email the Company Admin will sign in with | Text / email format | Login and account identity | Unique in D2 User Account |

**Table 3.0: Data Dictionary for Company Status Update** *(Planned)* — Super Admin → 1.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Company | The firm whose access is being changed | System ID | Selects the firm to update | Refers to one row in D1 Firm |
| Company Status | Whether the firm may use the platform | Choice: Active / Suspended | A suspended firm's users cannot sign in and its listings are hidden | Saved as Firm Status in D1 Firm |

**Table 4.0: Data Dictionary for Company Records** — 1.0 → Super Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Company Name | The firm's name | Text | Identifies each firm in the list | From D1 Firm |
| Company Code (Slug) | Short web name of the firm | Text, lowercase, unique | Identifies the firm in links | From D1 Firm |
| Company Status | Active or Suspended | Choice | Shows which firms can use the platform | From D1 Firm |
| Date Created | When the firm was added | Date | Record keeping | From D1 Firm |
| Number of Users | How many accounts the firm has | Whole number | Monitors platform use | Counted from D2 User Account |
| Number of Live Listings | How many of the firm's listings are public | Whole number | Monitors platform use | Counted from D5 Property (status Live) |

The Super Admin never sees a firm's clients, documents or commissions (system rule 5).

**Table 5.0: Data Dictionary for Platform Activity Logs** *(Planned)* — 1.0 → Super Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Date and Time | When the platform-level event happened | Date and time | Orders the log, newest first | From D17 Audit Log |
| Action | What happened, e.g. a firm suspended | Text (code) | Monitoring and accountability | From D17 Audit Log; only rows with no firm |
| Record Type / Record | Which record was affected | Text + System ID | Traces the event to its record | From D17 Audit Log |
| Actor | Who did it | System ID / name | Accountability | Refers to D2 User Account |

### Process 2.0 Manage Consultants and Firm Settings

**Table 6.0: Data Dictionary for Consultant Account Data** — Company Admin → 2.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Role | The person's position | Choice: Broker / Sales Manager / Sales Person | Decides the person's access and commission share | Saved in D2 User Account; Sales Manager and Sales Person match the "Handled By" rows in D13 |
| First Name | Consultant's first name | Text (max 80) | Shown on profiles, leads and vouchers | Saved in D2; first letter used for the referral code |
| Last Name | Consultant's last name | Text (max 80) | Shown on profiles, leads and vouchers | Saved in D2; used for the referral code |
| Email Address | Email the consultant signs in with | Text / email format | Login | Must be unused in D2 User Account |
| Phone Number | Consultant's contact number | Text (max 30), optional | Contact | Saved in D2 |
| Manager | The Sales Manager a Sales Person reports to | System ID (chosen from a list) | Builds the team; drives the commission split | Must be an active Sales Manager in D2 of the same firm |
| Broker | The Broker a Sales Manager reports to | System ID (chosen from a list) | Builds the team; drives the commission split | Must be an active Broker in D2 of the same firm |
| Active / Inactive | Whether the account may be used | Yes/No | Deactivated consultants cannot sign in or receive leads | Saved as Is Active in D2 |

**Table 7.0: Data Dictionary for Firm Settings** — Company Admin → 2.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Loan Interest Rate | Yearly interest rate shown first in the loan calculator | Percent (0–30) | Starting value for buyers' loan estimates | Saved in D1 Firm; read by 7.0 |
| Loan Term | Loan length shown first in the calculator | Whole number, years (1–40) | Starting value for loan estimates | Saved in D1 Firm |
| Downpayment Percentage | Downpayment shown first in the calculator | Percent (0–90) | Starting value for loan estimates | Saved in D1 Firm |
| Income Share for Loan | Part of monthly income that may go to the loan | Percent (5–60) | Computes the affordable price | Saved in D1 Firm |
| Withholding Percentage | Tax withheld from each person's commission share | Percent (0–35) | Deducted on every commission voucher | Saved in D1 Firm; read by 16.0 |
| Capital Gains Tax Rate | Rate for the capital gains tax estimate (usually 6%) | Percent (0–20) | Closing cost estimate | Saved in D1 Firm; read by 17.0 |
| Documentary Stamp Tax Rate | Rate for the documentary stamp tax estimate (usually 1.5%) | Percent (0–20) | Closing cost estimate | Saved in D1 Firm; read by 17.0 |
| Transfer Tax Rate | Rate for the local transfer tax estimate (usually 0.5%) | Percent (0–5) | Closing cost estimate | Saved in D1 Firm; read by 17.0 |
| Commission Split | Each role's share of a commission, for deals handled by a Sales Manager and by a Sales Person | Percent per role (Broker, Sales Manager, Sales Person); each row must total 100% | Divides each commission among the team | Saved in D13 Commission Setting; read by 15.0 |
| Commission Template Rate | The developer's gross commission rate for a payment method | Percent (0–20) of the total contract price | Computes the total commission of a sale | Saved in D13; one template per developer × payment method |
| Tranche Share and Trigger Value | Each tranche's share of the commission and its milestone value (e.g. 50% of the price paid) | Percent | Decides when each commission tranche may be requested | Saved in D13 Commission Template Tranche |

**Table 8.0: Data Dictionary for Consultant Records** — 2.0 → Company Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Consultant Name, Role, Email, Phone | The consultant's basic details | Text / Choice | Lists the firm's team | From D2 User Account |
| Manager / Broker | Who the consultant reports to | Name | Shows the team structure | From D2 (Manager ID, Broker ID) |
| Account Status | Active or inactive | Yes/No | Shows who can work | From D2 |
| Referral Code | The consultant's own code, e.g. JOCAMPO | Text (max 12 letters, plus a number if already taken), unique | Shared with buyers so their inquiries go to this consultant | From D2; used by 8.0 and 11.0 |
| Credential Status and Expiry | Review status of the PRC license and DHSUD registration | Choice (Part 6, Review Status) + Date | Shows who is verified and whose license is expiring | From D3 Credential |
| Temporary Password | One-time password for a new account | Text (12 characters) | Shown once when the account is created; the consultant changes it after first sign-in | Only its hash is saved in D2 |

## B. Module 1: AI Document Processing and Verification

### Process 3.0 Upload Credential and License to Sell

**Table 9.0: Data Dictionary for Consultant Credential** — Company Admin → 3.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Consultant | Whose credential this is | System ID (chosen) | Links the credential to the person | Refers to D2 User Account |
| Credential Type | Which credential | Choice: PRC License / DHSUD Registration | Decides what the AI checks and which badge it gives | Saved in D3 Credential |
| License / Registration Number | The number typed by the Company Admin | Text (3–40) | The AI compares it with the number it reads on the scan | Saved as Number Entered in D3 |
| Credential Scan | Photo or PDF of the PRC ID or DHSUD certificate | File | Read by the AI, then verified by the Broker | Saved in D12 Document (owner = credential) |

**Table 10.0: Data Dictionary for License to Sell** — Company Admin → 3.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Project | The developer project the license is for | System ID (chosen) | Links the license to the project | Refers to D4 Developer and Project |
| License to Sell Scan | The DHSUD License to Sell document | File | The AI reads the number, project, developer and expiry; the Broker verifies it | Saved in D12 Document (owner = project). Only one may wait for review per project |

### Process 4.0 Read and Check Document (AI)

**Table 11.0: Data Dictionary for Document Check Results** — 4.0 → Company Admin and Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Document | Which uploaded file was checked | System ID + file name / type | Shows the result next to the right document | From D12 Document |
| AI Status | Progress of the AI reading | Choice: Queued / Processing / Done / Failed | Tells the uploader when results are ready | From D12 |
| Detected Document Type | What the AI thinks the document is | Choice (Part 6, Document Type) | Warns if it is not what the uploader said | From D12; compared with the Declared Type |
| Extracted Fields | Values the AI read, e.g. receipt amount, OR number, expiry date | Field name → value + confidence (0–100) | Pre-fills forms such as the payment amount | From D12 Extracted Fields |
| Flags | Problems the AI found | List of: Flag Code (Part 6), Severity (Blocker / Warning / Info), Message, Evidence (field, value found, value expected) | Tells the uploader what to fix before the Broker reviews it | From D12 Flags |
| Suggested Status | The AI's suggestion only | Choice: Needs Attention / Ready for Review | Shows whether the document is ready for the Broker. The AI can never approve | From D12 Review Status |

### Process 5.0 Review and Verify Document (Broker)

**Table 12.0: Data Dictionary for Review Queue with AI Flags** — 5.0 → Broker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Document Image | The uploaded file | File (shown on screen) | The Broker looks at the original | From D12 Storage Key |
| Declared and Detected Type | What the uploader said vs. what the AI thinks | Choice (Part 6) | Spots wrong uploads | From D12 |
| OCR Text and Confidence | All the text the AI read, and how sure it was | Long text + number (0–100) | Lets the Broker check the AI's reading | From D12 |
| Extracted Fields | Values the AI read, each with its confidence | Field name → value + confidence | The Broker confirms or corrects them | From D12 |
| Flags | Problems found, with severity and evidence | List (see Table 11.0) | Shows the Broker what to check first | From D12 |
| Owner Record | What the document belongs to (consultant, project, listing, buyer, payment, transmittal) | Name + type | Gives context for the review | From D12 Owner Type / Owner ID → D3, D4, D6, D9, D10 or D14 |
| Uploaded By and Date | Who uploaded it and when | Name + Date and time | The queue is sorted oldest first | From D12 + D2 |

**Table 13.0: Data Dictionary for Verification Decision** — Broker → 5.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Document | The document being decided | System ID | Selects the document | Refers to D12 Document |
| Decision | The Broker's verdict | Choice: Approve / Reject | Only the Broker can approve (system rule 1) | Saved as Review Status in D12 and copied to the owner record (D3, D4, D11) |
| Rejection Reason | Why it was rejected | Text (5–500), required when rejecting | Tells the uploader what to fix | Saved as Review Note in D12 (Reject Reason in D3 for credentials) |
| Corrected Fields | Values the Broker fixed | Field name → value (max 300 each) | Corrects the AI's reading; the AI's original value is kept | Saved in D12 Extracted Fields (marked "edited") and in D17 |
| Override Note | Why the Broker approves despite a blocking flag | Text (max 500); required to approve a document with a blocking flag | Accountability | Saved in D12 and D17 |
| Confirmed Expiry Date | Expiry date printed on a credential | Date (credentials only) | Expired documents cannot be approved; badges end on this date | Saved as Expires At in D3 |
| Corrected Credential Number | Fixes a number the Company Admin mistyped | Text (3–40), optional, credentials only | Keeps the record accurate | Updates Number Entered in D3; logged in D17 |

## C. Module 2: Marketplace and Property Management

### Process 6.0 Manage Developer Projects and Units

**Table 14.0: Data Dictionary for Developer and Project Data** — Company Admin → 6.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Developer Name | The partner developer, e.g. "Vista Land (Camella)" | Text (2–120), unique within the firm | Groups projects; selects the commission template | Saved in D4; linked to templates in D13 |
| Developer Active | Whether the firm still sells for this developer | Yes/No | Hides old developers | Saved in D4 |
| Project Developer | The developer that owns the project | System ID (chosen) | Links the project | Refers to a developer in D4 |
| Project Name | Name of the subdivision or building | Text (2–120) | Shown on listings; compared with the License to Sell by the AI | Saved in D4 |
| Project Location | Where the project is | Text (2–200) + Map point (optional) | Shown on listings and the map | Saved in D4 |

**Table 15.0: Data Dictionary for Unit Listing Data** — Company Admin → 6.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Project | The project the unit belongs to | System ID (chosen) | Links the unit to its project and License to Sell | Refers to D4 |
| Title | Listing headline | Text (2–140) | Shown on the marketplace | Saved in D5 Property |
| Property Type | Kind of property | Choice (Part 6, Property Type) | Search filter | Saved in D5 |
| Description | Details about the unit | Text (max 4000), optional | Shown on the listing page | Saved in D5 |
| Price | Total contract price / list price | Money | Shown to buyers; used by the loan calculator | Saved in D5 |
| Lot Area / Floor Area | Size in square meters | Number (2 decimals), optional | Shown to buyers | Saved in D5 |
| Bedrooms / Bathrooms | Number of rooms | Whole number, optional | Shown to buyers | Saved in D5 |
| Barangay | Location of the unit | Text (max 80), optional | Search filter | Saved in D5 (city defaults to Naga City, province to Camarines Sur) |
| Map Pin | Exact location | Map point, optional | Shows the unit on the public map | Saved in D5 |
| Photos | Pictures of the unit | Image files, in display order | Shown on the listing | Saved in D5 Property Photo |
| Publish / Unpublish | Whether the unit is shown to the public | Choice | A unit can be published only if its project's License to Sell is broker-approved and not expired | Sets Listing Status in D5 (Live / Draft) |

**Table 16.0: Data Dictionary for Loan Quotation Data** — Company Admin → 6.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Label | Name of the payment scheme, e.g. "Pag-IBIG 30 yrs" | Text (2–60) | Shown to buyers | Saved in D5 Loan Quotation, linked to one property |
| Payment Method | How the buyer pays | Choice: Cash / Deferred Cash / In-house / Bank / Pag-IBIG | Groups quotations | Saved in D5; same list as Client Payment Method (D9) |
| Reservation Fee | Amount to reserve the unit | Money | Shown to buyers | Saved in D5 |
| Downpayment Percentage and Term | Downpayment as % of price, and how many months to pay it | Percent + Whole number (0–120 months) | Shown to buyers | Saved in D5 |
| Monthly Downpayment | Amount per month during the downpayment term | Money | Shown to buyers | Saved in D5 |
| Loan Amount | Balance to be financed | Money | Shown to buyers | Saved in D5 |
| Interest Rate, Loan Term, Monthly Amortization | The developer's actual financing figures | Percent, Whole number (years, max 40), Money; optional | Shown to buyers | Saved in D5 |
| Notes | Extra conditions | Text (max 500), optional | Shown to buyers | Saved in D5 |

**Table 17.0: Data Dictionary for Property Listing Records** — 6.0 → Company Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Listing Details | Title, type, price, location, project, photos | Text / Money / Choice | Manage the firm's listings | From D5 Property and D4 |
| Listing Source | Developer unit or property owner's listing | Choice: Developer / Individual Seller | Separates the two kinds of listings | From D5 |
| Listing Status | Where the listing is in its life | Choice (Part 6, Listing Status) | Shows what is live, waiting, or sent back | From D5 |
| Badges | Trust badges earned | List of Choice (Part 6, Badge Type) + valid-until date | Shows which listings are verified | From D5 Property Badge |
| License to Sell Status and Expiry | Review status of the project's License to Sell | Choice + Date | Warns before a license expires | From D4 |

### Process 7.0 Browse Listings and Estimate Loan

**Table 18.0: Data Dictionary for Search and Filter Criteria** — Property Seeker → 7.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Keyword | Words to look for | Text (max 80), optional | Searches listing titles, barangays, cities and project names | Matched against D5 |
| Property Type | Kind of property wanted | Choice, optional | Filter | Matches Property Type in D5 |
| Minimum / Maximum Price | Price range | Money, optional | Filter | Matches Price in D5 |
| City / Barangay | Location wanted | Text (max 60 each), optional | Filter | Matches D5 |
| Listing Source | Developer or owner listings | Choice, optional | Filter | Matches D5 |
| Badge | Show only listings with this badge | Choice, optional | Filter on verified facts | Matches D5 Property Badge |
| Payment Method | Show only listings with this kind of quotation | Choice, optional | Filter | Matches D5 Loan Quotation |
| Map Area | The visible part of the map | Four map coordinates, optional | Shows listings inside the map view | Matches the Map Point in D5 |
| Sort and Page | Order and page of results | Choice: Newest / Price low–high / Price high–low; Whole numbers (12 per page by default, max 48) | Arranges the results | — |

**Table 19.0: Data Dictionary for Loan Computation Data** — Property Seeker → 7.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Mode | What the buyer wants to know | Choice: Monthly Payment / What Can I Afford | Selects the computation | — |
| Property Price | Price used in the computation | Money (starts at the listing's price) | Base of the loan | From D5 Price |
| Downpayment Percentage | Part of the price paid up front | Percent | Computes the loan amount | Starts at the firm's default (D1) |
| Interest Rate | Yearly loan interest | Percent | Computes the monthly payment | Starts at the firm's default (D1) |
| Loan Term | Years to pay | Whole number | Computes the monthly payment | Starts at the firm's default (D1) |
| Gross Monthly Income | Buyer's monthly income | Money (affordability mode) | Computes the monthly budget | Not saved anywhere |
| Income Share for Loan | Part of income that may go to the loan | Percent (affordability mode) | Computes the monthly budget | Starts at the firm's default (D1) |

**Table 20.0: Data Dictionary for Property Listings** — 7.0 → Property Seeker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Title, Type, Description | What the property is | Text / Choice | Lets the buyer judge the property | From D5 (only Live listings of Active firms) |
| Price | Asking or list price | Money | Comparison and loan estimate | From D5 |
| Location and Map Point | Barangay, city, province, pin | Text + Map point | Shows where it is | From D5 |
| Lot Area, Floor Area, Bedrooms, Bathrooms | Size and rooms | Numbers | Comparison | From D5 |
| Photos | Pictures | Images | Shown in a gallery | From D5 Property Photo |
| Badges | Broker-verified trust badges (gold) | List of Choice | Shows which facts a Broker verified | From D5 Property Badge |
| Loan Quotations | The developer's actual payment schemes | List (see Table 16.0) | Shows real payment options | From D5 Loan Quotation |
| Listing Firm | The firm selling the property | Text | Shows who handles the listing | From D1 Firm via D5 |

**Table 21.0: Data Dictionary for Loan Estimate** — 7.0 → Property Seeker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Estimated Monthly Payment | Monthly loan payment | Money | Monthly-payment mode | Computed from Table 19.0; not saved |
| Downpayment and Loan Amount | Up-front amount and balance financed | Money | Monthly-payment mode | Computed; not saved |
| Total Interest | Interest over the whole term | Money | Monthly-payment mode | Computed; not saved |
| Affordable Price | Homes up to about this price | Money | Affordability mode | Computed; not saved |
| Monthly Budget and Largest Loan | Budget for the loan and the largest loan it pays for | Money | Affordability mode | Computed; not saved |
| Fits Budget | Whether this listing fits the budget | Yes/No message | Affordability mode | Compares with D5 Price |
| Disclaimer | "Estimate only, not a loan approval" | Text | Always shown | — |

### Process 8.0 Send Inquiry

**Table 22.0: Data Dictionary for Inquiry Data** — Property Seeker → 8.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Property | The listing the buyer asks about | System ID (from the page) | Links the inquiry to the listing and its firm | Refers to D5; the inquiry goes only to that firm (no co-broke) |
| Chosen Consultant | Consultant picked by the buyer | System ID, optional | Receives the inquiry when there is no owner's agent or referral | Refers to D2; must be a verified consultant of the listing's firm |
| Referral Code | Code from a consultant's referral link | Text (max 12), optional | Sends the inquiry to the referring consultant | Matches Referral Code in D2 (same firm only) |
| Buyer Name | The buyer's full name | Text (3–120) | Contact | Saved in D7 Inquiry |
| Buyer Phone | Mobile number | Text, Philippine mobile format | Contact | Saved in D7 |
| Buyer Email | Email address | Text / email format, optional | Contact | Saved in D7 |
| Nature of Work | Buyer's source of income | Choice: Employed / OFW / Business / Other | Helps the consultant qualify the buyer | Saved in D7 |
| Payment Preference | How the buyer plans to pay | Choice: Cash / Deferred Cash / In-house / Bank / Pag-IBIG / Not Sure | Helps the consultant qualify the buyer | Saved in D7; becomes the Payment Method in D9 (Not Sure not allowed there) |
| Civil Status | Buyer's civil status | Choice: Single / Married / Separated | Predicts the documents needed | Saved in D7; copied to D9 |
| Message | Buyer's question | Text (max 1000), optional | Read by the consultant | Saved in D7 |
| Consent | Agreement to the Data Privacy Act notice | Yes (required) | Legal basis for keeping the data | Saved as Consent Date in D7 |

**Table 23.0: Data Dictionary for Consultant Profiles** — 8.0 → Property Seeker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Consultant Name and Role | Who the consultant is | Text / Choice | Buyer chooses a consultant | From D2 (active consultants of the listing's firm only) |
| Bio | Short introduction | Text | Helps the buyer choose | From D2 |
| Firm Name | The consultant's firm | Text | Shows the firm | From D1 |
| Credential Badges | PRC Verified / DHSUD Registered | List of Choice | Shows only approved, unexpired credentials | Derived from D3 (never stored as badges) |
| Average Rating and Count | Average stars and number of ratings | Number (1 decimal) + Whole number; none if not yet rated | Helps the buyer choose | Computed from D16 Rating |
| Completed Sales | Number of finished sales | Whole number | Helps the buyer choose | Counted from D9 (status Completed) |
| Display Order | Order of the cards | Random, reshuffled every time | Fairness: no featured or top-ranked agents (system rule 7) | Done by the server |

**Table 24.0: Data Dictionary for Inquiry Confirmation** — 8.0 → Property Seeker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Confirmation Message | Notice that the inquiry was received | Text | Reassures the buyer | — |
| Assigned Consultant and Firm | Who will contact the buyer | Name + firm name | Tells the buyer who to expect | From D2 and D1, for the consultant saved in D7 |

### Process 9.0 Receive Property Owner Request

**Table 25.0: Data Dictionary for Property Listing Request** — Property Owner → 9.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Owner Name | The property owner's full name | Text (3–120) | Contact; the AI compares it with the land title | Saved as Seller Name in D6 |
| Mobile Number | Owner's mobile number | Text, e.g. 09171234567 | Contact | Saved in D6 |
| Email | Owner's email | Text / email format, optional | Contact | Saved in D6 |
| Barangay and City | Where the property is | Text (2–80 each) | Location | Saved as Location in D6 |
| Property Type | Kind of property | Choice (Part 6, Property Type) | Listing category | Saved in D6 |
| Lot Area / Floor Area | Size in square meters | Number, optional | Listing details; the AI compares it with the tax declaration | Saved in D6 |
| Asking Price | Price the owner wants | Money (at least ₱10,000) | Listing price | Saved in D6 |
| Has Land Title | Whether the property has a title | Yes (required) | Properties without a title are not accepted | Saved in D6 |
| Photos | Pictures of the property | Image files | Shown to the agent | Saved in D6 |
| Chosen Agent | The agent the owner picked (any firm) | System ID | Receives the request; later receives all inquiries for this listing | Refers to D2; decides the firm of the request |
| Consent | Agreement to the Data Privacy Act notice | Yes (required) | Legal basis for keeping the data | Saved as Consent Date in D6 |

**Table 26.0: Data Dictionary for Agent List** — 9.0 → Property Owner

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Agent Cards | Name, role, bio, firm, credential badges, average rating, completed sales | Same items as Table 23.0 | Owner picks an agent | From D2, D3, D16, D9 — verified consultants of **all** active firms |
| Display Order | Order of the cards | Random, reshuffled every time | Fairness: no featured agents | Done by the server |

**Table 27.0: Data Dictionary for Request Confirmation** — 9.0 → Property Owner

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Confirmation Message | Notice that the request was sent to the chosen agent | Text | Reassures the owner | Refers to the request saved in D6 |

### Process 10.0 Prepare and Review Owner Listing

**Table 28.0: Data Dictionary for Seller Listing Requests** — 10.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Owner Details | Name, mobile number, email | Text | Contact the owner | From D6 |
| Property Details | Location, type, areas, asking price, has title, photos | See Table 25.0 | Decide whether to accept | From D6 |
| Request Status | Progress of the request | Choice (Part 6, Seller Request Status) | Shows what to do next | From D6 |
| Date Received | When the request came in | Date and time | Follow-up | From D6 |
| Decline Reason | Why a request was declined | Text | Record for the Company Admin | From D17 Audit Log |

**Table 29.0: Data Dictionary for Seller Request Response** — Sales Consultant → 10.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Request | The request being answered | System ID | Selects the request | Refers to D6 |
| Response | The agent's answer | Choice: Accept / Decline | Accept starts the document stage | Sets Request Status in D6 (Accepted / Declined) |
| Decline Reason | Why the agent declined | Text (5–500), required to decline | Record for the Company Admin | Saved in D17 Audit Log |

**Table 30.0: Data Dictionary for Seller Listing Documents** — Sales Consultant → 10.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Document Type | Which document | Choice: Land Title / Tax Declaration / Real Property Tax Receipt / Seller ID | All four are required before submitting | Saved as Declared Type in D12 |
| Document Scan | The document file | File | Read by the AI, verified by the Broker | Saved in D12 (owner = seller request) |
| Listing Title | Headline for the listing | Text (8–120) | Shown on the marketplace | Saved in D5 Property |
| Listing Description | Details | Text (max 4000), optional | Shown on the marketplace | Saved in D5 |
| Barangay and City | Location | Text (2–80 each) | Search and display | Saved in D5 |
| Map Pin | Exact location | Map point (required) | Every live listing must appear on the map | Saved in D5 |

**Table 31.0: Data Dictionary for Listing Review Decision** — Broker → 10.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Listing | The owner listing under review | System ID | Selects the listing | Refers to D5 and D6 |
| Decision | The Broker's verdict | Choice: Approve / Send Back | Approve makes it Live; allowed only when all four documents are broker-approved | Sets Listing Status in D5 and Request Status in D6 |
| Reason | What the agent must fix | Text (5–500), required to send back | Guides the agent | Saved in D17 Audit Log |

## D. Module 3: Sales, Client and Commission Management

### Process 11.0 Manage Leads

**Table 32.0: Data Dictionary for Assigned Leads** — 11.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Buyer Details | Name, phone, email | Text | Contact the buyer | From D7 |
| Property | The listing asked about | Title + link | Context | From D5 |
| Buyer Profile | Nature of work, payment preference, civil status, message | Choice / Text | Qualify the buyer | From D7 |
| Source | How the lead came | Choice: Organic / Referral | Shows referral leads | From D7 |
| Lead Status | Stage of the lead | Choice (Part 6, Lead Status) | Shows what to do next | From D7 |
| Date Received | When the inquiry came | Date and time | Follow-up order | From D7 |

**Table 33.0: Data Dictionary for Lead Status Update** — Sales Consultant → 11.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Lead | The inquiry being updated | System ID | Selects the lead; only the handling consultant may update it | Refers to D7 |
| New Status | The lead's new stage | Choice: New / Contacted / Qualified / Visit Scheduled / Lost ("Reserved" is set only by converting to a client) | Tracks the sales pipeline | Saved as Lead Status in D7 |
| Lost Reason | Why the lead was lost | Text (3–500), required for Lost | Learning and reporting | Saved in D17 Audit Log |

**Table 34.0: Data Dictionary for Referral Link** — 11.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Referral Code | The consultant's unique code | Text (max 12 letters, plus a number if taken) | Identifies the referring consultant | From D2 |
| Referral Link | Marketplace web address carrying the code | Web address (URL) | Shared with buyers; inquiries through it go to this consultant | Code is matched in 8.0 against D2 |

### Process 12.0 Schedule Site Visits

**Table 35.0: Data Dictionary for Site Visit Request** — Sales Consultant → 12.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Lead | The buyer's inquiry the visit is for | System ID (chosen) | Gives the buyer and property | Refers to D7 (and its property in D5) |
| Date and Time | When the visit is planned | Date and time | Scheduling; a warning shows if the consultant has another visit within 1 hour | Saved as Scheduled At in D8 |
| Notes | Extra details | Text (max 500), optional | For the Company Admin | Saved in D8 |
| Visit Outcome (later) | What happened after an approved visit | Choice: Completed / No-show / Cancelled | Keeps the record complete | Sets Visit Status in D8 |

Buyers cannot book visits. Only consultants request them (system rule 10).

**Table 36.0: Data Dictionary for Site Visit Status** — 12.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Visit Details | Property, buyer, date and time | Text + Date and time | Reminds the consultant | From D8, D7, D5 |
| Visit Status | Decision or outcome | Choice (Part 6, Visit Status) | Shows if the visit can go ahead | From D8 |
| Decline Reason | Why the Company Admin declined | Text | Lets the consultant re-plan | From D8 |

**Table 37.0: Data Dictionary for Site Visit Requests** — 12.0 → Company Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Property | Where the visit will be | Title, barangay, city | Plan staff and access | From D5 |
| Consultant | Who requested it | Name + role | Accountability | From D2 |
| Buyer | Who will visit | Name + phone | Contact | From D7 |
| Date and Time, Notes | When, and extra details | Date and time + Text | Shown on the calendar | From D8 |
| Visit Status | Pending, approved, etc. | Choice | Shows which requests wait for a decision | From D8 |

**Table 38.0: Data Dictionary for Site Visit Decision** — Company Admin → 12.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Visit | The request being decided | System ID | Selects the visit | Refers to D8 |
| Decision | The Company Admin's answer | Choice: Approve / Decline | Approval moves the lead to "Visit Scheduled" | Sets Visit Status in D8 and Lead Status in D7 |
| Decline Reason | Why it was declined | Text (max 500) | Tells the consultant | Saved in D8 |

### Process 13.0 Manage Clients and Requirements

**Table 39.0: Data Dictionary for Client Conversion Data** — Sales Consultant → 13.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Lead | The inquiry being converted | System ID | Turns the lead into a client | Refers to D7; lead becomes "Reserved" |
| Reservation Receipt | Scan of the reservation receipt | File | The AI reads the amount and receipt number | Saved in D12 (owner = payment) |
| Reservation Amount | Amount on the receipt, confirmed by the consultant | Money (pre-filled by the AI) | First confirmed payment | Saved in D10 Payment (kind = Reservation) |
| Reservation Date | When the reservation was paid | Date | Starts the deal; counted in monthly reports | Saved in D9 and D10 |
| Total Contract Price (TCP) | Agreed price of the sale | Money | Base of the commission and payment milestones | Saved in D9; may differ from the list price in D5 |
| Required Downpayment | Downpayment the buyer must complete | Money; required for Bank and Pag-IBIG | Downpayment milestones of commission tranches | Saved in D9 |
| Payment Method | How the buyer will pay | Choice: Cash / Deferred Cash / In-house / Bank / Pag-IBIG | Picks the commission template and checklist | Saved in D9; links to D13 |
| Civil Status | Buyer's civil status | Choice: Single / Married / Separated | Picks the checklist items | Saved in D9 |
| Employment Type | Buyer's work type | Choice: Locally Employed / OFW / Self-Employed; required for Bank and Pag-IBIG | Picks the financing documents | Saved in D9 |
| Buyer Name, Phone, Email | Corrected contact details | Text, optional (defaults to the inquiry's) | Client record | Saved in D9 |

**Table 40.0: Data Dictionary for Buyer Requirement Documents** — Sales Consultant → 13.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Requirement Item | The checklist item being satisfied, e.g. Valid ID 1, CENOMAR, Payslip (3 months) | System ID (chosen from the checklist) | Links the file to the item | Refers to D11 |
| Document Scan | The buyer's document | File | Read by the AI, verified by the Broker | Saved in D12 (owner = client); item becomes Uploaded or Needs Attention |

**Table 41.0: Data Dictionary for Requirement Waiver** — Broker → 13.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Requirement Item | The item not needed for this buyer | System ID | Selects the item | Refers to D11 |
| Waiver Reason | Why the document is not needed | Text (5–500) | Accountability | Status saved as Waived in D11; reason in D17 |

**Table 42.0: Data Dictionary for Client Records** — 13.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Client Details | Name, contact, property, TCP, payment method, civil status, employment type | Text / Money / Choice | Manage the buyer | From D9 and D5 |
| Client Status | Stage of the deal | Choice (Part 6, Client Status) | Shows progress | From D9 |
| Requirement Checklist | Each required item, for whom, at what stage, and its status | List: label, applies to (Buyer / Spouse / Representative), stage (Reservation / Financing), status | Shows what documents are still missing | From D11 |
| Payments | Payments recorded for the buyer | List: kind, amount, date, confirmed or not | Tracks the buyer's progress | From D10 |

**Table 43.0: Data Dictionary for Lead and Client Records** — 13.0 → Company Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| All Leads | Every inquiry of the firm with buyer, property, consultant, source and status | List (see Table 32.0) | Oversight of the firm's pipeline | From D7 |
| All Clients | Every client of the firm with details, status, checklist progress and payments | List (see Table 42.0) | Oversight of the firm's deals | From D9, D10, D11 |

### Process 14.0 Record Buyer Payments

**Table 44.0: Data Dictionary for Payment Receipt Details** — Sales Consultant → 14.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Client | The buyer who paid | System ID | Links the payment | Refers to D9 |
| Payment Kind | What the payment is for | Choice: Downpayment / Full Cash / Deferred Installment / In-house Installment / Loan Release / Other | Milestones of commission tranches | Saved in D10 |
| Receipt Scan | The official receipt | File | The AI reads the amount, OR number and date; a used OR number is flagged | Saved in D12 (owner = payment) |
| Confirmed Amount | Amount on the receipt, checked by the consultant | Money (pre-filled by the AI) | Counts toward milestones only after confirmation | Saved in D10 with Confirmed By |
| Payment Date | When the buyer paid | Date | Payment history | Saved in D10 |

### Process 15.0 Evaluate Commission Tranches

**Table 45.0: Data Dictionary for Developer Transmittal** — Company Admin → 15.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Tranche | The commission tranche the developer paid | System ID (tranche must be Awaiting Transmittal) | Links the transmittal | Refers to D14 Commission Tranche |
| Transmittal Scan | The developer's transmittal document | File | The AI reads the amount; mismatches are flagged | Saved in D12 (owner = transmittal) |
| Confirmed Amount | Amount the developer released, as confirmed by the Company Admin | Money | Second gate before a tranche is ready | Saved as Transmittal Amount in D14 |
| Note | Explanation of a difference | Text (max 500); required when the confirmed amount differs from the tranche by more than ₱1 | Accountability | Saved in D17 |

**Table 46.0: Data Dictionary for Commission Records** — 15.0 → Company Admin and Broker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Client and Property | The deal the commission is for | Names | Context | From D9, D5 |
| Gross Commission | Total commission of the deal (TCP × rate) | Money | Expected payout | From D14 Commission |
| Tranches | Each part of the commission | List: label, amount, status (Part 6, Commission Status) | Shows what is waiting, blocked or ready | From D14 Commission Tranche |
| Status Meaning | Plain words for each status: Waiting for payment, Documents missing, Waiting for transmittal, Ready for release / Waiting for signatures, Released | Text | Shows what the tranche still needs | Derived from the tranche status in D14 |
| Transmittal Aging | How long a tranche has waited for the developer | Days, grouped 0–30 / 31–60 / 61–90 / 90+ | Follow up with developers | From D14 Awaiting Since |

**Table 47.0: Data Dictionary for Commission Status** — 15.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Own Deals and Tranches | The consultant's commissions and their tranches | List: client, tranche label, amount, status | Know what is coming and when | From D14 (only deals the consultant is part of) |
| Status Meaning | Plain words for the status, e.g. "Documents missing" | Text | Know what to follow up (e.g. buyer documents) | Derived from the tranche status in D14 |

### Process 16.0 Prepare and Sign Commission Voucher

**Table 48.0: Data Dictionary for Commission Voucher Data** — Broker → 16.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Tranche | The Ready-for-Release tranche to pay | System ID | Only one voucher per tranche | Refers to D14 |
| Extra Deductions | Additional deductions per payee | List: payee, label (2–80 characters), amount (Money) | Lowers that person's net share | Saved in the voucher lines in D14; editing removes existing signatures |

**Table 49.0: Data Dictionary for Broker Voucher Signature / Consultant Voucher Signature** — Broker → 16.0, Sales Consultant → 16.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Typed Full Name | The signer types their full name | Text (3–120); must match the account name exactly | Electronic signature. The Broker must sign first, then each consultant | Saved in D14 (Broker Signature / Consultant Signatures) |
| Signed Date and Time | When the signature was made | Date and time (recorded by the system) | Proof of signing | Saved in D14 and D17 |
| Device Details | IP address and browser of the signer | Text (recorded by the system) | Proof of signing | Saved in D14 |
| Voucher Fingerprint | Code of the exact voucher content that was signed | SHA-256 hash (recorded by the system) | Detects any change after signing | Must equal the voucher's Content Hash in D14 |

**Table 50.0: Data Dictionary for Commission Voucher** — 16.0 → Broker and Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Voucher Number | Number of the voucher, unique within the firm | Text, firm code + year + sequence, e.g. ADV-2026-0001 | Reference | From D14 |
| Tranche and Deal | Which tranche and client | Text + Money | Context | From D14, D9 |
| Payee Lines | One line per person | List: name, role, gross share, deductions (withholding + extras), net | Shows each person's share | From D14; shares follow the commission split saved when the deal started (D13 snapshot) |
| Total Net | Sum of all net shares | Money | Amount to release | From D14 |
| Signature Status | Who has signed and when | Names + Date and time | Shows who still needs to sign | From D14 |
| Released Date | When the tranche was marked released | Date and time | Set automatically when all consultants have signed. The money is paid **outside** the system | From D14 |

### Process 17.0 Close Sale and Rate Agent

**Table 51.0: Data Dictionary for Closing Data** — Sales Consultant → 17.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Client | The sale being closed | System ID | Only the handling consultant may edit | Refers to D9 |
| Selling Price | Final price on the deed of sale | Money | Base of the tax estimate | Saved in D15 |
| Tax Base Override | A higher value to tax on (zonal value or assessor's fair market value), if known | Money, optional | Taxes use the higher value | Saved in D15 Computation |
| Registration Fee | Registry of Deeds fee | Money, optional (typed by hand) | Added to the buyer's costs | Saved in D15 Computation |
| Checklist Ticks | Which closing steps are done | List of: step code (Part 6, Closing Steps) + done Yes/No | The last tick completes the sale | Saved in D15 Checklist with date and who ticked it |

**Table 52.0: Data Dictionary for Closing Cost Estimate** — 17.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Tax Base | The value the rates were applied to | Money | Shows how taxes were computed | Selling price, or the override |
| Capital Gains Tax | Estimate at the firm's rate (usually 6%), usually paid by the seller | Money + rate + payer | Planning | Rate from D1 |
| Documentary Stamp Tax | Estimate at the firm's rate (usually 1.5%) | Money + rate + payer | Planning | Rate from D1 |
| Transfer Tax | Estimate at the firm's rate (usually 0.5%) | Money + rate + payer | Planning | Rate from D1 |
| Registration Fee | Fee typed by hand | Money + payer | Planning | From D15 |
| Totals | Total for the buyer and total for the seller | Money | Planning | Computed; saved in D15 |
| Disclaimer | Estimate to verify with the BIR and the LGU | Text | Always shown | — |

**Table 53.0: Data Dictionary for Rating Link** — 17.0 → Sales Consultant

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Rating Link | One-time web address for the buyer to rate the consultant | Web address with a random secret code | Given to the buyer outside the system after the sale is completed | Only a scrambled copy (hash) of the code is saved in D16 |
| Expiry Date | When the link stops working | Date (30 days after it is made) | Limits misuse | Saved in D16 |

**Table 54.0: Data Dictionary for Agent Rating** — Property Seeker → 17.0

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Stars | The buyer's rating of the consultant | Whole number 1–5 | Average rating on consultant profiles | Saved in D16 Rating; one per client |
| Comment | The buyer's feedback | Text (max 500), optional | Feedback | Saved in D16 |
| Consent | Agreement to the Data Privacy Act notice | Yes (required) | Legal basis | — |

### Process 18.0 Generate Reports and Activity Log

**Table 55.0: Data Dictionary for Sales Reports** — 18.0 → Company Admin

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Month | The month reported | Year-month, e.g. 2026-11 | Selects the period | — |
| Reservations | Number of new clients and their total TCP | Whole number + Money | Sales volume | Counted from D9 |
| New Leads | Number of new inquiries | Whole number | Marketing result | Counted from D7 |
| Completed Sales | Number of deals completed | Whole number | Closed sales | From D17 (client status changes) |
| Commissions Released | Number and total of released tranches | Whole number + Money | Payouts | From D14 |
| Pipeline Counts | Leads by status and clients by status | Whole numbers | Pipeline health | From D7, D9 |

**Table 56.0: Data Dictionary for Team Performance Report** — 18.0 → Broker, and Sales Consultant (Sales Manager only)

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Consultant | Each team member | Name + role | One row per person; a Sales Manager sees only their team | From D2 |
| Open Leads | Leads not yet reserved or lost | Whole number | Workload | Counted from D7 |
| Active Clients | Clients still active or closing | Whole number | Workload | Counted from D9 |
| Reserved This Month | Number and total TCP of new reservations | Whole number + Money | Performance | Counted from D9 |
| Completed | Completed sales | Whole number | Performance | Counted from D9 |

**Table 57.0: Data Dictionary for Firm Activity Log** — 18.0 → Company Admin and Broker

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Date and Time | When it happened | Date and time | Newest first | From D17 |
| Actor | Who did it | Name | Accountability | From D2 via D17 |
| Action | What was done, e.g. Listing Approved, Voucher Signed | Text (code) | Audit trail of every approval, rejection, signature and status change | From D17 (this firm only) |
| Record Type and Record | What was affected | Text + System ID | Traces the change | From D17 |
| Before and After | The values before and after the change | Structured data | Shows exactly what changed | From D17 |

---

# Part 3. Data stores

Every firm-owned store has a **Firm ID**, so each firm only sees its own data (system rule 4). The
"Record ID" of every store is a System ID and is not repeated in each table.

**Table 58.0: Data Dictionary for D1 Firm**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm Name | Company's name | Text | Display | One firm has many users (D2) |
| Slug | Short unique web name | Text, unique | Links; voucher number prefix | — |
| Address | Office address | Text, optional | Display | — |
| Logo | Firm's logo image | File key, optional | Display | — |
| Firm Status | Active or Suspended | Choice | Suspended firms cannot sign in | Set by the Super Admin |
| Loan Defaults | Interest rate, term, downpayment %, income share % | Percent / Whole number (defaults 6.25%, 30 years, 10%, 35%) | Loan calculator starting values | Read by 7.0 |
| Withholding % | Withheld from each voucher share | Percent (default 0) | Voucher deductions | Read by 16.0 |
| Closing Tax Rates | Capital gains tax, documentary stamp tax, transfer tax | Percent (defaults 6%, 1.5%, 0.5%) | Closing estimate | Read by 17.0 |
| Date Created / Updated | Record dates | Date and time | Record keeping | — |

**Table 59.0: Data Dictionary for D2 User Account**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID | The user's firm | System ID; empty only for the Super Admin | Data scoping | Refers to D1 |
| Role | Type of user | Choice (Part 6, Role) | Access control | — |
| Email | Login email | Text, unique | Login | — |
| Password Hash | Scrambled password | Argon2 hash | Login check; the password itself is never stored | — |
| First Name / Last Name | Person's name | Text (max 80 each) | Display, signatures | — |
| Phone | Contact number | Text, optional | Contact | — |
| Photo | Profile picture | File key, optional | Display | — |
| Is Active | Whether the account can be used | Yes/No | Deactivation | — |
| Manager ID | Sales Manager of a Sales Person | System ID, optional | Team structure, commission split | Refers to another row in D2 |
| Broker ID | Broker of a Sales Manager | System ID, optional | Team structure, commission split | Refers to another row in D2 |
| Referral Code | Consultant's code | Text, unique, optional | Referral inquiries | Used by 8.0, 11.0 |
| Bio | Short introduction | Text, optional | Public profile | — |

**Table 60.0: Data Dictionary for D3 Credential**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / User ID | Firm and consultant | System IDs | Scoping; owner | Refer to D1, D2 |
| Credential Type | PRC License or DHSUD Registration | Choice | Badge type | — |
| Number Entered | Number typed by the Company Admin | Text | Compared by the AI | — |
| Document ID | The scan | System ID | Evidence | Refers to D12 |
| Expires At | Expiry confirmed by the Broker | Date | Badge validity | — |
| Status | Review status | Choice (Part 6, Review Status) | Only Approved and unexpired credentials give badges | Set by AI (suggestion) and Broker (decision) |
| Reviewed By / Reviewed At | Broker who decided and when | System ID + Date and time | Accountability | Refers to D2 |
| Reject Reason | Why it was rejected | Text, optional | Guidance | — |

**Table 61.0: Data Dictionary for D4 Developer and Project**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Developer Name / Is Active | Partner developer | Text (unique per firm) / Yes/No | Groups projects | One developer has many projects and commission templates (D13) |
| Project Name | Project's name | Text | Display, AI comparison | Belongs to one developer |
| Location Text / Map Point | Where the project is | Text + Map point | Display, map | — |
| License to Sell Document ID | The LTS scan | System ID, optional | Evidence | Refers to D12 |
| License to Sell Number / Expiry | From the document | Text / Date | Validity | — |
| License to Sell Status | Review status | Choice (Part 6, Review Status) | Units may be published only when Approved and unexpired | Set by AI (suggestion) and Broker (decision) |

**Table 62.0: Data Dictionary for D5 Property**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID | Listing firm | System ID | Scoping; inquiries go only to this firm | Refers to D1 |
| Source | Developer or Individual Seller | Choice | Listing kind | — |
| Project ID | Developer unit's project | System ID, optional | Links to LTS | Refers to D4 |
| Seller Request ID | Owner listing's request | System ID, optional, unique | Links to the owner | Refers to D6 |
| Assigned Agent ID | Owner's chosen agent | System ID, optional | Receives all inquiries for the listing | Refers to D2 |
| Title / Slug / Description | Listing text and web name | Text | Display | — |
| Property Type | Kind of property | Choice (Part 6) | Filter | — |
| Price | List or asking price | Money | Display, loan estimate | — |
| Lot Area / Floor Area | Size | Number (2 decimals), sqm | Display | — |
| Bedrooms / Bathrooms | Rooms | Whole number | Display | — |
| Barangay / City / Province / Map Point | Location | Text + Map point | Search, map | — |
| Listing Status | Life stage | Choice (Part 6, Listing Status) | Only Live is public | — |
| Published At | When it went live | Date and time | Display, "newest" sort | — |
| Photos | Pictures with display order | File key + Whole number | Gallery | Property Photo rows |
| Badges | Badge type, granted by, granted at, valid until | Choice + System ID + Dates | Trust signals; one of each type per property | Property Badge rows; Granted By refers to a Broker in D2 |
| Loan Quotations | Payment schemes (see Table 16.0) | Several values | Display | Loan Quotation rows |

**Table 63.0: Data Dictionary for D6 Seller Listing Request**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Agent ID | Firm of the chosen agent; the agent | System IDs | Routing | Refer to D1, D2 |
| Seller Name / Phone / Email | Owner's details | Text (email optional) | Contact; AI name check | — |
| Location Text | Barangay and city | Text | Display | — |
| Property Type / Lot Area / Floor Area / Asking Price | Property facts | Choice / Number / Money | Listing | — |
| Has Title | Property has a land title | Yes/No | Acceptance rule | — |
| Photo Keys | Owner's photos | List of file keys | Display | — |
| Status | Request stage | Choice (Part 6, Seller Request Status) | Workflow | — |
| Consent At | When the owner agreed to the privacy notice | Date and time | Legal record | — |
| Date Created / Updated | Record dates | Date and time | Follow-up | Becomes one listing in D5 when submitted |

**Table 64.0: Data Dictionary for D7 Inquiry**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Property ID | Listing firm and listing | System IDs | Scoping | Refer to D1, D5 (firm always equals the property's firm) |
| Consultant ID | Who handles the lead | System ID | Routing | Refers to D2 |
| Source / Referral Code | Organic or Referral, and the code used | Choice / Text | Reporting | — |
| Buyer Name / Phone / Email | Buyer's details | Text | Contact | — |
| Nature of Work / Payment Preference / Civil Status | Buyer profile | Choice (Part 6) | Qualifying | Copied to D9 on conversion |
| Message | Buyer's question | Text | Contact | — |
| Lead Status | Pipeline stage | Choice (Part 6, Lead Status) | Workflow, reports | — |
| Consent At / Date Created | Privacy consent; arrival time | Date and time | Legal; follow-up | One inquiry can become one client (D9) |

**Table 65.0: Data Dictionary for D8 Site Visit**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Property ID / Consultant ID | Firm, place, requester | System IDs | Scoping | Refer to D1, D5, D2 |
| Inquiry ID / Client ID | The buyer | System IDs, optional | Context | Refer to D7, D9 |
| Scheduled At | Visit date and time | Date and time | Calendar, clash check | — |
| Visit Status | Decision or outcome | Choice (Part 6, Visit Status) | Workflow | — |
| Rescheduled From | The earlier visit this one replaces | System ID, optional | History | Refers to another row in D8 |
| Decline Reason / Decided By | Why declined; Company Admin who decided | Text / System ID | Accountability | Decided By refers to D2 |
| Notes | Extra details | Text | Planning | — |

**Table 66.0: Data Dictionary for D9 Client**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Inquiry ID / Property ID | Firm, original lead, property bought | System IDs | Scoping, history | Refer to D1, D7 (unique), D5 |
| Consultant ID | Who handles the client | System ID | Drives the commission split | Refers to D2 |
| Full Name / Phone / Email | Buyer's details | Text | Contact | — |
| Civil Status / Payment Method / Employment Type | Buyer profile | Choice (Part 6) | Picks the checklist and commission template | Links to D11, D13 |
| Total Contract Price (TCP) | Agreed price | Money | Commission base, milestones | — |
| Sale Type | Developer Sale or Private Sale | Choice | Commission template | — |
| Reservation Paid At | Date of reservation | Date | Start of the deal; reports | — |
| Downpayment Amount | Required downpayment | Money, optional | Downpayment milestones | — |
| Client Status | Deal stage | Choice (Part 6, Client Status) | Workflow, reports | Has payments (D10), checklist (D11), one commission (D14), one closing record (D15), one rating (D16) |

**Table 67.0: Data Dictionary for D10 Payment**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Client ID | Firm and buyer | System IDs | Scoping | Refer to D1, D9 |
| Payment Kind | What the payment is for | Choice (Part 6, Payment Kind) | Milestones | — |
| Amount | Confirmed amount | Money | Milestones | — |
| Paid At | Payment date | Date | History | — |
| Proof Document ID | Receipt scan | System ID, unique | Evidence; duplicate receipt check | Refers to D12 |
| Confirmed By | Who confirmed the AI's amount | System ID; empty = not yet confirmed (does not count) | Accountability | Refers to D2 |

**Table 68.0: Data Dictionary for D11 Requirement Item**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Client ID | Firm and buyer | System IDs | Scoping | Refer to D1, D9 |
| Code / Label | Which document, e.g. VALID_ID_1, CENOMAR, PAYSLIP_3M | Text | Identifies the requirement | Unique per client + code + applies to |
| Applies To | Whose document | Choice: Buyer / Spouse / Representative | Checklist | — |
| Stage | When it is needed | Choice: Reservation / Financing | Document gate of commission tranches | Matches Required Stage in D13/D14 |
| Required | Whether it is mandatory | Yes/No | Checklist | — |
| Status | Item progress | Choice (Part 6, Requirement Status) | Document gate | — |
| Document ID | The uploaded scan | System ID, optional | Evidence | Refers to D12 |
| Verified By / Verified At | Broker who verified, and when | System ID + Date and time | Accountability | Refers to D2 |

**Table 69.0: Data Dictionary for D12 Document**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID | Firm | System ID | Scoping | Refers to D1 |
| Owner Type / Owner ID | What the document belongs to | Choice: Property / Project / Credential / Client / Payment / Transmittal / Seller Request + System ID | Links the scan | Points to D5, D4, D3, D9/D11, D10, D14 or D6 |
| Declared Type / Detected Type | What the uploader said; what the AI thinks | Choice (Part 6, Document Type) | Type check | — |
| Storage Key / File Type / Size | Where the file is stored, its type and size | Text / Text / Whole number (bytes) | Retrieval | — |
| SHA-256 | Fingerprint of the file | Hash | Detects duplicate files | — |
| Uploaded By | Who uploaded | System ID | Accountability | Refers to D2 |
| AI Status | Reading progress | Choice: Queued / Processing / Done / Failed | Workflow | — |
| OCR Text / OCR Confidence | Text read and how sure (0–100) | Long text / Number | Review | — |
| Extracted Fields | Values read, with confidence; broker corrections keep the AI's value | Field name → value, confidence | Review, pre-fill | Field names listed in Part 6 |
| Flags | Problems found | List (see Table 11.0) | Review | — |
| Review Status | AI suggestion, then Broker decision | Choice (Part 6, Review Status) | Verification | Copied to D3, D4, D11 |
| Reviewed By / Reviewed At / Review Note | Broker decision details | System ID + Date and time + Text | Accountability | Refers to D2 |

**Table 70.0: Data Dictionary for D13 Commission Setting**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Split: Handled By | Which role handles the client | Choice: Sales Manager / Sales Person | Picks the split row | One row per firm per value |
| Split: Broker % / Sales Manager % / Sales Person % | Each role's share | Percent; the three total 100. Sales Person % is 0 when a Sales Manager handles the deal | Divides commissions | — |
| Template: Developer / Payment Method | Which deals the template is for | System ID (empty = private sale) + Choice | Picks the template | Refers to D4; unique per firm + developer + method |
| Template: Gross Rate % | Commission as % of TCP | Percent | Gross commission | — |
| Template: Requires Transmittal | Whether a developer transmittal is needed | Yes/No (No for private sales) | Third gate | — |
| Template Tranche: Sequence / Label / Share % | Order, name and share of each tranche | Whole number / Text / Percent (shares total 100, except monthly) | Splits the commission | — |
| Template Tranche: Trigger / Trigger Value | Payment milestone that unlocks the tranche | Choice (Part 6, Tranche Trigger) + Percent | Milestone gate | Compared with D10 |
| Template Tranche: Required Stage | Documents that must be verified or waived | Choice: Reservation / Financing | Document gate | Compared with D11 |

**Table 71.0: Data Dictionary for D14 Commission**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Commission: Client ID / Template ID | The deal and the template used | System IDs | One commission per client | Refer to D9, D13 |
| Commission: Gross Amount | TCP × gross rate, saved at creation | Money | Total payout | — |
| Commission: Split Snapshot | Percentages and people at creation | Structured data | Later setting changes never change a live deal | Copied from D13 and D2 |
| Tranche: Sequence / Label / Amount | Each part of the commission | Whole number / Text / Money | Payout schedule | — |
| Tranche: Status | Gate progress | Choice (Part 6, Commission Status) | Shows what is releasable | — |
| Tranche: Milestone Reached At / Docs Complete At | When each gate passed | Date and time | Audit, display | From D10, D11 |
| Tranche: Transmittal Document / Amount | Developer's transmittal and confirmed amount | System ID + Money | Third gate | Refers to D12 |
| Tranche: Awaiting Since | When it started waiting for the transmittal | Date and time | Aging report | — |
| Tranche: Rules (Trigger, Trigger Value, Required Stage, Requires Transmittal) | Copied from the template | See D13 | Template edits never change a live deal | Copied from D13 |
| Tranche: Period Month | Month of a monthly tranche | Year-month, optional | Monthly tranches | — |
| Voucher: Voucher No. | Number unique within the firm | Text, e.g. ADV-2026-0001 | Reference | One voucher per tranche |
| Voucher: Lines / Total Net | Each payee's gross share, deductions, net; and their total | Structured data / Money | Payout | Payees refer to D2 |
| Voucher: Content Hash | Fingerprint of the voucher content | SHA-256 hash | Tamper check | Signatures must match it |
| Voucher: Broker Signature / Broker Signed At | Broker's signature details | Structured data + Date and time | Broker signs first | Refers to D2 |
| Voucher: Consultant Signatures | One signature per payee consultant | Structured data | Release after all sign | Refer to D2 |
| Voucher: Released At | When the tranche was marked released | Date and time | Record only; no money moves in the system | — |

**Table 72.0: Data Dictionary for D15 Closing Record**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID / Client ID | Firm and sale | System IDs | One closing record per client | Refer to D1, D9 |
| Selling Price | Final price | Money | Tax base | — |
| Computation | Tax base, override, registration fee, rates, each cost line (amount, rate, payer) and totals per payer | Structured data | Closing estimate | Rates copied from D1 |
| Checklist | Each closing step: code, label, done, done at, done by | List | Completion; the last tick completes the sale | Done By refers to D2 |

**Table 73.0: Data Dictionary for D16 Rating**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Rating Link: Firm ID / Client ID / Consultant ID | Who the link is for | System IDs | One link per client | Refer to D1, D9, D2 |
| Rating Link: Token Hash | Scrambled copy of the secret code | SHA-256 hash, unique | Checks the link without storing it | — |
| Rating Link: Expires At / Used At | Expiry (30 days) and when it was used | Date and time | One-time, time-limited use | — |
| Rating: Consultant ID / Client ID | Who was rated, by which client | System IDs | One rating per client | Refer to D2, D9 |
| Rating: Stars / Comment | The rating | Whole number 1–5 / Text (max 500) | Average rating on profiles | — |
| Rating: Date Created | When it was given | Date and time | Display | — |

**Table 74.0: Data Dictionary for D17 Audit Log**

| Data Item | Meaning | Format | Usage | Relationship to other Data |
|---|---|---|---|---|
| Firm ID | Firm of the event | System ID; empty = platform-level | Scoping (firm log vs. Super Admin log) | Refers to D1 |
| Actor ID | Who did it | System ID, optional (empty for public users) | Accountability | Refers to D2 |
| Action | What happened, e.g. LISTING_APPROVED, VOUCHER_SIGNED | Text (code) | Audit trail | — |
| Entity Type / Entity ID | Which record | Text + System ID | Traces the change | Points to a row in any store |
| Before / After | Values before and after | Structured data, optional | Shows exactly what changed; also holds reasons (decline, lost, waiver, send back) | — |
| IP Address | Where the request came from | Text, optional | Security | — |
| Date Created | When it happened | Date and time | Ordering | Entries are only added, never edited |

---

# Part 4. Data flows between processes and data stores

Each flow carries data items already defined in Part 3. Process numbers are from Level 0. A child
diagram uses the same label for the same flow.

| Data flow | Process ↔ Store | Data items carried (see Part 3) |
|---|---|---|
| Active Consultants | D2 → 8.0, 9.0 | Active Sales Managers and Sales Persons: name, role, bio, firm (8.0: listing's firm only; 9.0: all firms) |
| Activity Entries | D17 → 18.0 | This firm's audit rows (Table 74.0) |
| Activity Entry | 1.0, 2.0, 5.0, 6.0, 10.0–17.0 → D17 | One new audit row: actor, action, record, before/after, IP, time |
| Agent Rating | 17.0 → D16 | Stars, comment, consultant, client; marks the link used |
| AI Reading Results | D12 → 5.0 | Document file, declared and detected type, OCR text, extracted fields, flags, suggested status |
| Average Ratings | D16 → 8.0 | Average stars and count per consultant |
| Buyer Name | D9 → 4.0 | Client full name (compared with names on buyer documents and receipts) |
| Client Deal Details | D9 → 15.0 | Client ID, property's developer, payment method, sale type, TCP, downpayment amount, handling consultant |
| Client Details | 13.0 ↔ D9 | All D9 items (Table 66.0) |
| Client Sales | D9 → 18.0 | Client status, TCP, reservation date, consultant |
| Client Status | 17.0 → D9 | New client status: Closing (first save) or Completed (last tick) |
| Closing Computation and Checklist | 17.0 → D15 | Selling price, computation, checklist (Table 72.0) |
| Closing Details | D15 → 17.0 | Saved computation and checklist |
| Closing Tax Rates | D1 → 17.0 | Capital gains tax, documentary stamp tax, transfer tax rates |
| Commission and Tranches | 15.0 → D14 | New commission (gross amount, split snapshot) and its tranches with copied rules, status Waiting |
| Commission Details | D14 → 15.0 | Commission and tranche rows (Table 71.0) |
| Commission Split and Templates | 2.0 → D13, D13 → 15.0 | Split rows and templates with tranches (Table 70.0) |
| Company Admin Account *(Planned)* | 1.0 → D2 | New user: role Company Admin, firm, name, email, password hash |
| Completed Sales Count | D9 → 8.0 | Number of Completed clients per consultant |
| Confirmed Payments | D10 → 15.0 | Kind, amount and date of confirmed payments only |
| Consultant Account | 2.0 → D2 | New or changed consultant: role, names, email, phone, manager, broker, active, referral code, password hash |
| Consultant Details | D2 → 2.0 | Existing consultants (to check email and supervisor), team list |
| Consultant Name | D2 → 4.0 | First and last name (compared with the name on a PRC ID or DHSUD certificate) |
| Credential Details | 3.0 → D3 | Firm, consultant, credential type, number entered, document ID, status Pending AI |
| Credential Number | D3 → 4.0 | Number Entered (compared with the number on the scan) |
| Credential Status | D3 → 2.0, 5.0 → D3 | Status, expiry date, reviewer, reject reason |
| Credential and License Scans | 3.0 → D12 | New document rows: owner, declared type, file key, type, size, SHA-256, uploader |
| Developer and Project Details | 6.0 → D4 | Developer name and active flag; project developer, name, location, map point |
| Document Review Status | D12 → 10.0 | Review status of the four seller documents |
| Extracted Text and Fields | 4.0 → D12 | OCR text, OCR confidence, detected type, extracted fields |
| Firm Details | 1.0 ↔ D1 | Firm name, slug, address, status, created date |
| Firm Settings | 2.0 → D1 | Loan defaults, withholding %, closing tax rates |
| Flags and Suggested Status | 4.0 → D12 | Flags list, AI status Done/Failed, suggested Review Status |
| Inquiry Details | 8.0 → D7, D7 → 11.0, 13.0 | All D7 items (Table 64.0) |
| Lead Pipeline | D7 → 18.0 | Lead status, consultant, payment preference, date created |
| Lead Status | 11.0, 12.0, 13.0 → D7 | New lead status (13.0 sets Reserved; 12.0 sets Visit Scheduled) |
| License to Sell Status | 5.0 → D4, D4 → 6.0 | LTS status, number, expiry |
| Listing Firm and Agent | D5 → 8.0 | Listing's firm, source, assigned agent |
| Listing Status | 10.0 → D5 | Pending Review, Needs Attention, Live (with published date) |
| Live Listing Counts | D5 → 1.0 | Number of Live listings per firm |
| Live Listings | D5 → 7.0 | Live listings of active firms with photos, badges, quotations, firm |
| Loan Calculator Defaults | D1 → 7.0 | Interest rate, term, downpayment %, income share %, firm name |
| Loan Quotations | 6.0 → D5 | Quotation rows (Table 16.0) |
| Other Uploaded Documents | D12 → 4.0 | SHA-256 of other files (duplicate check); OR numbers of other receipts; fields of the other seller documents (title vs. tax declaration) |
| Owner Listing Details | 10.0 → D5 | New listing: source Individual Seller, firm, seller request, assigned agent, title, description, barangay, city, map point, type, price, areas, photos |
| Owner Name | D6 → 4.0 | Seller name (compared with the title, tax declaration and ID) |
| Payee Details | D2 → 16.0 | Names and roles of the broker, manager and salesperson in the split snapshot |
| Payment Details | 14.0 → D10, D10 → 13.0 | Kind, amount, date, proof document, confirmed by |
| Platform Activity Entries | D17 → 1.0 | Audit rows with no firm |
| Project Details | D4 → 3.0 | Project ID, name, current LTS status (only one LTS may wait for review) |
| Project and Developer Name | D4 → 4.0 | Project name and developer name (compared with the License to Sell) |
| Property Badges | 5.0 → D5 | Badge type, granted by, granted at, valid until |
| Property Details | D5 → 6.0, 13.0 | Listing items (Table 62.0); 13.0 uses the property's firm, source and developer |
| Rating Link | 17.0 → D16 | Firm, client, consultant, token hash, expires at |
| Rating Link Status | D16 → 17.0 | Whether the link exists, is unused and is not expired |
| Ready Tranche Details | D14 → 16.0 | Tranche amount, label, status Ready for Release, split snapshot |
| Receipt Numbers | D10 → 4.0 | OR numbers of the firm's other payment receipts (duplicate receipt check) |
| Receipt Reading | D12 → 13.0, 14.0 | AI-read amount, OR number, payment date, flags of the receipt |
| Receipt Scan | 14.0 → D12 | New document row for a payment receipt |
| Receipt and Buyer Document Scans | 13.0 → D12 | New document rows: reservation receipt and buyer requirement documents |
| Referral Code | D2 → 11.0 | The consultant's referral code |
| Request Status | 10.0 → D6 | New request status (Part 6, Seller Request Status) |
| Requirement Checklist | 13.0 → D11 | New checklist items: code, label, applies to, stage, required, status Missing |
| Requirement Status | 5.0 → D11; D11 → 13.0, 15.0 | Item status, document ID, verified by, verified at |
| Requirement Upload Status | 4.0 → D11 | Item status Uploaded or Needs Attention (AI suggestion) |
| Reservation Payment | 13.0 → D10 | Payment kind Reservation, amount, date, proof document, confirmed by |
| Review Decision | 5.0 → D12 | Review status Approved/Rejected, reviewed by, reviewed at, review note, corrected fields |
| Seller Document Scans | 10.0 → D12 | New document rows: land title, tax declaration, RPT receipt, seller ID |
| Seller Request Details | 9.0 → D6, D6 → 10.0 | All D6 items (Table 63.0) |
| Suggested Credential Status | 4.0 → D3 | Status Needs Attention or Ready for Review |
| Suggested License Status | 4.0 → D4 | LTS status Needs Attention or Ready for Review |
| Team Members | D2 → 18.0 | Active consultants: name, role, manager |
| Tranche Amount | D14 → 4.0 | Tranche amount (compared with the transmittal amount) |
| Tranche Release Status | 16.0 → D14 | Tranche status Released, voucher Released At |
| Tranche Status | 15.0 → D14 | Tranche status, milestone reached at, docs complete at, transmittal document and amount, awaiting since |
| Transmittal Reading | D12 → 15.0 | AI-read transmittal amount, date, buyer, unit, flags |
| Transmittal Scan | 15.0 → D12 | New document row for a developer transmittal |
| Unit Details | 6.0 → D5 | Developer unit: project, title, type, description, price, areas, rooms, barangay, map point, photos |
| Unit Listing Status | 6.0 → D5 | Live (with published date) or Draft |
| Uploaded Scan | D12 → 4.0 | The stored file, declared type, owner type and ID |
| User Counts | D2 → 1.0 | Number of users per firm |
| Verified Credentials | D3 → 8.0, 9.0 | Credential type and expiry of Approved, unexpired credentials |
| Visit Decision | 12.0 → D8 | Visit status, decline reason, decided by |
| Visit Details | D8 → 12.0 | Visit rows (Table 65.0) |
| Visit Schedule | 12.0 → D8 | New visit: firm, property, consultant, inquiry, scheduled at, notes, status Pending |
| Voucher and Signatures | 16.0 → D14 | Voucher number, lines, total net, content hash, broker signature, consultant signatures |
| Waived Item | 13.0 → D11 | Item status Waived |
| Withholding Rate | D1 → 16.0 | Withholding % |

---

# Part 5. Data flows between processes (Level 1 and Level 2)

These flows only appear inside the child diagrams. They are never saved on their own: each one
passes data from one step to the next.

| Data flow | From → To | Data items carried |
|---|---|---|
| Valid Consultant Account | 2.1 → 2.2 | Consultant Account Data (Table 6.0) after checking the email is unused and the supervisor has the right role |
| Temporary Password and Referral Code | 2.2 → 2.3 | 12-character temporary password (shown once), new referral code |
| Valid Firm Settings | 2.4 → 2.5 | Firm Settings (Table 7.0) after checking each split totals 100% |
| Valid Credential Scan | 3.1 → 3.2 | Credential type, number entered, consultant, file (type and size checked) |
| Valid License Scan | 3.1 → 3.3 | Project, file (type and size checked) |
| Credential Scan | 3.2 → 3.4 | File + credential ID (owner) |
| License Scan | 3.3 → 3.4 | File + project ID (owner) |
| Cleaned Image | 4.1 → 4.2 | Image turned upright, converted to grayscale, cleaned of specks, resized and contrast-adjusted for reading (PDF pages turned into images) |
| OCR Text | 4.2 → 4.3 | Text read, confidence per line and overall (0–100), number of pages |
| Text and Document Type | 4.3 → 4.4 | OCR text + detected document type |
| Extracted Fields | 4.4 → 4.5 | Field name → value + confidence (field names in Part 6) |
| Document Flags | 4.5 → 4.6 | Flags list: code, severity, message, evidence |
| Type Match Result | 4.5.1 → 4.5.5 | Declared vs. detected type; Type Mismatch or Low Confidence flag if any |
| Name Fields | 4.5.1 → 4.5.2 | Names read (full name, owner name, project, developer, buyer, received from) |
| Number and Amount Fields | 4.5.1 → 4.5.3 | Numbers read (registration, OR, title and TD numbers) and amounts |
| Date and Property Fields | 4.5.1 → 4.5.4 | Dates read (expiry, valid until, year covered) and property facts (area, encumbrances) |
| Name Match Results | 4.5.2 → 4.5.5 | Similarity of each name to the record (match at 92% or more, possible match from 80%) |
| Number and Amount Results | 4.5.3 → 4.5.5 | Number Mismatch, Amount Mismatch, Duplicate Receipt and Duplicate File results |
| Date and Property Results | 4.5.4 → 4.5.5 | Expired, Expiring Soon, Tax Delinquent, Area Mismatch and Encumbrance Found results |
| Approved or Rejected Document | 5.2 → 5.3 | Document ID, owner type and ID, decision, confirmed expiry |
| Approved Document Fields | 5.3 → 5.4 | Broker-approved fields used for badges (e.g. LTS expiry, tax year paid, no encumbrance) |
| Publish Request | 6.2 → 6.3 | Unit ID and request to publish or unpublish |
| Matching Listings | 7.1 → 7.2 | Live listings that match the search and filter criteria |
| Property Price | 7.2 → 7.3 | Price of the listing the buyer is viewing |
| Listing Firm | 8.1 → 8.2 | Firm of the listing (only its consultants are listed) |
| Route Decision | 8.1 → 8.4 | Who gets the inquiry and why: owner's agent, referral, or buyer's pick; source Organic or Referral |
| Valid Inquiry | 8.3 → 8.4 | Inquiry Data (Table 22.0) after checking consent, the hidden anti-bot field and the rate limit |
| Valid Listing Request | 9.2 → 9.3 | Property Listing Request (Table 25.0) after checking title, consent and chosen agent |
| Listing Description and Map Pin | 10.3 → 10.4 | Listing title, description, barangay, city, map point |
| Visit Request with Clash Warning | 12.1 → 12.2 | Site Visit Request (Table 35.0) + warning if the consultant has another visit within 1 hour |
| Conversion Details with Receipt Reading | 13.1 → 13.2 | Client Conversion Data (Table 39.0) + the AI's reading of the reservation receipt |
| Buyer Profile | 13.2 → 13.3 | Client ID, payment method, civil status, employment type |
| Reservation Items | 13.3.1 → 13.3.4 | Checklist items needed at reservation |
| Civil Status Items | 13.3.2 → 13.3.4 | Items for the civil status (e.g. marriage contract and spouse's ID, CENOMAR) |
| Financing Items | 13.3.3 → 13.3.4 | Items for the payment method and employment type (e.g. payslips, COE, ITR) |
| Receipt Reference | 14.1 → 14.2 | Document ID of the uploaded receipt, client, payment kind |
| Unconfirmed Payment | 14.2 → 14.3 | Payment pre-filled with the AI-read amount and date, not yet confirmed |
| Confirmed Transmittal | 15.2 → 15.3 | Tranche ID, transmittal document, confirmed amount |
| Milestone Result | 15.3.1 → 15.3.4 | Whether the payment milestone is reached, and when |
| Document Gate Result | 15.3.2 → 15.3.4 | Whether all items of the required stage are Verified or Waived, and when |
| Transmittal Result | 15.3.3 → 15.3.4 | Whether a transmittal is needed and confirmed |
| Voucher Breakdown | 16.1 → 16.2 | Per payee: gross share, withholding, extra deductions, net; total net |
| Broker-Signed Voucher | 16.3 → 16.4 | Voucher with the broker's signature (consultants may now sign) |
| Fully Signed Voucher | 16.4 → 16.5 | Voucher signed by the broker and every payee consultant |
| Completed Sale | 17.2 → 17.3 | Client ID and consultant of a sale whose last closing step was ticked |

---

# Part 6. Choice lists (used in the Format column)

| List | Values |
|---|---|
| **Role** | Super Admin, Company Admin, Broker, Sales Manager, Sales Person |
| **Firm Status** | Active, Suspended |
| **Review Status** (credentials, License to Sell, documents) | Pending AI, Needs Attention, Ready for Review, Approved, Rejected. The AI can only set Needs Attention or Ready for Review; only the Broker sets Approved or Rejected |
| **Credential Type** | PRC License, DHSUD Registration |
| **Property Type** | House and Lot, Lot, Condo, Townhouse, Commercial, Other |
| **Listing Source** | Developer, Individual Seller |
| **Listing Status** | Draft, Pending Review, Needs Attention, Live, Rejected, Suspended, Sold |
| **Badge Type** | PRC Verified, DHSUD Registered (consultants, derived from D3), Ownership Verified, LTS Verified, Tax Current, Title Clean (properties) |
| **Seller Request Status** | New, Accepted, Documents in Progress, Submitted for Review, Listed, Declined |
| **Inquiry Source** | Organic, Referral |
| **Lead Status** | New, Contacted, Qualified, Visit Scheduled, Reserved, Lost |
| **Nature of Work** (inquiry) | Employed, OFW, Business, Other |
| **Payment Method** | Cash, Deferred Cash, In-house, Bank, Pag-IBIG, Not Sure (inquiry only) |
| **Civil Status** | Single, Married, Separated |
| **Employment Type** (client) | Locally Employed, OFW, Self-Employed |
| **Sale Type** | Developer Sale, Private Sale |
| **Client Status** | Active, Closing, Completed, Cancelled |
| **Visit Status** | Pending, Approved, Declined, Completed, No-show, Rescheduled, Cancelled |
| **Payment Kind** | Reservation, Downpayment, Full Cash, Deferred Installment, In-house Installment, Loan Release, Other |
| **Requirement Status** | Missing, Uploaded, Needs Attention, Verified, Waived |
| **Requirement Stage** | Reservation, Financing |
| **Commission Status** (tranche) | Waiting, Blocked, Awaiting Transmittal, Ready for Release, Released |
| **Tranche Trigger** | On Reservation, Full Payment, TCP Percent Paid, Downpayment Percent Paid, Downpayment Fully Paid, Loan Released, Monthly |
| **AI Status** | Queued, Processing, Done, Failed |
| **Flag Severity** | Blocker, Warning, Info |
| **Flag Code** | Owner Mismatch, Area Mismatch, Encumbrance Found, Tax Delinquent, LTS Expired, LTS Expiring Soon, Project Mismatch, Name Mismatch, Number Mismatch, Credential Expired, ID Expired, Type Mismatch, Low Confidence, Duplicate Receipt, Duplicate File, Amount Mismatch, OCR Failed |
| **Document Type** | Land Title, Tax Declaration, RPT Receipt, Seller ID, License to Sell, PRC ID, DHSUD Certificate, Valid ID, Birth Certificate, Marriage Contract, CENOMAR, Annulment Decree, COE, Payslip, Proof of Billing, TIN Proof, ITR, AFS, Bank Statement, DTI or Business Clearance, Mayor's Permit, SPA, Passport, Seaman's Book, 2×2 Photo, 1×1 Photo, ESAV, Pag-IBIG Virtual Account, Business Photo, Payment Receipt, Transmittal, Unknown |
| **Closing Steps** | Deed of sale signed; Capital gains tax and documentary stamp tax paid; Tax clearance (eCAR) obtained; Local transfer tax paid; Title transferred to the buyer; New tax declaration issued; Keys turned over |

**Fields the AI extracts, by document type** (Extracted Fields in D12):

| Document type | Fields read (required fields in bold) |
|---|---|
| Land Title | **Title number**, **registered owner**, lot number, **lot area (sqm)**, uncancelled encumbrances |
| Tax Declaration | **Tax declaration no.**, **owner**, **lot area (sqm)**, **assessed value**, improvements |
| RPT Receipt | **Official receipt no.**, payment date, **amount paid**, **year covered**, paid through quarter |
| Seller ID / Valid ID / Passport | **Name**, **ID number**, date of birth, expiry date |
| License to Sell | **License to sell no.**, **project name**, **developer**, date issued, **expiry date** |
| PRC ID / DHSUD Certificate | **Name**, **registration no.**, **valid until**, profession (PRC) |
| Payment Receipt | **Official receipt no.**, payment date, **amount**, received from |
| Transmittal | **Amount**, transmittal date, buyer, unit |

Other document types (e.g. CENOMAR, payslip) are only classified and checked for type. They are not
read field by field. A missing or unclear required field raises a Low Confidence flag.
