# TrustListo — Activity Diagrams (UML, with swimlanes)

A drawing guide for the Chapter 3 activity diagrams, in the style of our professor's sample:
vertical swimlanes (one per actor and one for the system), a start dot, rounded action boxes,
diamond decisions with `[guards]`, bars for fork/join, and an end bull's-eye.

There are **3 diagrams, one per module**. Each shows the module's main end-to-end flow. Every step
and rule was checked against the real system (the server code and `docs/USE-CASES.md`), including
what the system refuses to do (e.g. it won't approve an expired document).

Captions:

- *Figure #: Activity Diagram of TrustListo — Module 1: AI Document Processing and Verification (Unified Modeling Language)*
- *Figure #: Activity Diagram of TrustListo — Module 2: Marketplace and Property Management (Unified Modeling Language)*
- *Figure #: Activity Diagram of TrustListo — Module 3: Sales, Client and Commission Management (Unified Modeling Language)*

---

## Part 1. Notation

| Symbol | Draw it as | Rule |
|---|---|---|
| **Start** | Solid black dot | One per diagram |
| **Action** | Rounded rectangle, verb first | "Upload the scan" |
| **Decision** | Diamond, with **one flow in** and a `[guard]` on **each flow out** | `[Valid file]` / `[Invalid file]` |
| **Merge** | Diamond with **several flows in** and **one out** (no guards) | Used where a loop comes back |
| **Fork** | Thick bar: one flow in, several out | The flows after it run at the same time |
| **Join** | Thick bar: several flows in, one out | Waits until **all** incoming flows arrive |
| **End** | Bull's-eye (dot in a ring) | A diagram may have more than one |
| **Swimlane** | Tall column with the actor's name in the header | The action is drawn in the lane of whoever does it |

Two rules people often miss:

1. **A loop must come back into a merge diamond, never straight into an action box.** In UML, an
   action with two arrows coming in waits for both, like a join. The tables below include every
   merge you need.
2. **Every decision exit has a guard in square brackets**, as in the sample: `[Valid PIN]`, `[Invalid PIN]`.

**How to use the tables.** Each diagram has a node table. Draw the nodes **top to bottom in row
order**, each in the lane given. Some lanes are split into a **left part** and a **right part**
(written "System-L", "System-R", etc.) so that two branches can run side by side. The *Goes to*
column lists every arrow leaving that node. The routing notes after each table say where the loops
run so no two lines cross.

---

## Part 2. Module 1: AI Document Processing and Verification

**Scenario:** a user uploads a document, the AI reads and checks it, and the Broker decides.
This is the same flow for every document in the system: consultant credentials, the License to
Sell, the property owner's documents, and the buyer's documents. Payment receipts and transmittals
are read the same way, but the uploader confirms their amount instead of the Broker (Module 3).

**Swimlanes (left to right):** `Uploader (Company Admin or Sales Consultant)` · `System (AI)` · `Broker`

| Row | Lane | Node | Label | Goes to |
|---|---|---|---|---|
| 1 | Uploader | Start | — | 2 |
| 2 | Uploader | Merge M1 | — | 3 |
| 3 | Uploader | Merge M2 | — | 4 |
| 4 | Uploader | Action | Upload the scan and choose its document type | 5 |
| 5 | System | Action | Check the file type and size | 6 |
| 6 | System | Decision | — | `[Valid: PDF, JPG, PNG or WebP, up to 10 MB]` → 8 · `[Invalid file]` → 7 |
| 7 | Uploader | Action | Choose a valid file | M2 (row 3) |
| 8 | System | Action | Store the document privately (Pending AI) | 9 |
| 9 | System | Action | Prepare the image for reading | 10 |
| 10 | System | Action | Read the text (OCR) | 11 |
| 11 | System | Decision | — | `[Text readable]` → 12 · `[Text not readable]` → 12R |
| 12R | System-R | Action | Flag the document: text could not be read | Merge 16 |
| 12 | System-L | Action | Identify the document type | 13 |
| 13 | System-L | Action | Extract the fields and how sure the AI is of each | 14 |
| 14 | System-L | Action | Compare the fields with the records (names, numbers, dates, amounts) | 15 |
| 15 | System-L | Action | Raise a flag for each problem found | 16 |
| 16 | System | Merge | — | 17 |
| 17 | System | Decision | — | `[Blocker or Warning flag]` → 18L · `[No flag, or Info only]` → 18R |
| 18L | System-L | Action | Suggest: Needs Attention | 19 |
| 18R | System-R | Action | Suggest: Ready for Review | 19 |
| 19 | System | Merge | — | 20 |
| 20 | System | Decision | — | `[Payment receipt or transmittal]` → 21 · `[Credential, License to Sell, owner's or buyer's document]` → 23 |
| 21 | Uploader | Action | Confirm the amount the AI read (continues in Module 3) | 22 |
| 22 | Uploader | End | — | — |
| 23 | System | Action | Add it to the Broker's review queue (oldest first) | 24 |
| 24 | Broker | Action | Open the document; compare the scan with the AI's text, fields and flags; correct any misread field | 25 |
| 25 | Broker | Decision | — | `[Wrong, unreadable or expired]` → 26L · `[Correct and not expired]` → 26R |
| 26L | Broker-L | Action | Enter the reason for rejecting | 27 |
| 27 | System | Action | Mark it Rejected; save the reason and the audit log entry | 28 |
| 28 | Uploader | Action | Read the reason; upload a corrected document | M1 (row 2) |
| 26R | Broker-R | Decision | — | `[Has a blocking flag]` → 29 · `[No blocking flag]` → 30 |
| 29 | Broker-R | Action | Write an override note explaining the approval | 30 |
| 30 | Broker-R | Merge | — | 31 |
| 31 | Broker-R | Action | Approve the document | 32 |
| 32 | System | Action | Mark it Approved; update the record (credential, License to Sell or requirement item); grant the badges the facts support; save the audit log entry | 33 |
| 33 | Uploader | Action | See the approved status | 34 |
| 34 | Uploader | End | — | — |

**Routing (no crossing):**

- **Loop 7 → M2:** up the **inner** left edge of the Uploader lane, into M2's left side.
- **Loop 28 → M1:** up the **outer** left edge of the Uploader lane (further left than the 7 → M2
  loop), into M1's left side. M1 sits above M2, so the outer loop's line stays above the inner
  one and they never meet.
- **12R → 16:** straight down the right part of the System lane, into the merge's right side.
- **Rows 26L–28 and 26R–32:** the Broker lane has two parts. The reject path runs on the left, the
  approve path on the right. The approve path reaches the System lane (row 32) only **after** the
  reject path has left it (row 27), so their horizontal lines are on different rows.
- **The decision rules come from the system:** a rejection needs a reason (5–500 characters);
  approving a document with a **blocking** flag needs an override note; an expired License to Sell
  or credential cannot be approved; the AI can only *suggest* a status.

---

## Part 3. Module 2: Marketplace and Property Management

**Scenario:** a property owner lists a property through an agent. The listing goes live after the
Broker verifies the documents, then a buyer finds it and sends an inquiry. This is the main flow of
the module. Developer units are simpler: the Company Admin adds them, and the system publishes a
unit only when its project's License to Sell is Broker-approved and not expired. That rule is noted
under the figure instead of drawn.

**Swimlanes (left to right):** `Property Owner` · `Sales Consultant` · `System` · `Broker` · `Property Seeker`

| Row | Lane | Node | Label | Goes to |
|---|---|---|---|---|
| 1 | Property Owner | Start | — | 2 |
| 2 | Property Owner | Action | Open the "List your property" page | 3 |
| 3 | System | Action | Show the verified agents of all firms in random order | 4 |
| 4 | Property Owner | Merge M1 | — | 5 |
| 5 | Property Owner | Action | Choose an agent; enter the property details, asking price and photos; give consent | 6 |
| 6 | System | Decision | — | `[Has a land title, consent given, details valid]` → 8 · `[Missing or invalid]` → 7 |
| 7 | Property Owner | Action | Correct the form | M1 (row 4) |
| 8 | System | Action | Save the request (New) and send it to the chosen agent | 9 |
| 9 | Sales Consultant | Action | Open the seller request | 10 |
| 10 | Sales Consultant | Decision | — | `[Accept]` → 11 · `[Decline]` → 10L |
| 10L | Sales Consultant-L | Action | Decline with a reason | 10E |
| 10E | Sales Consultant-L | End | — | — |
| 11 | System | Action | Mark the request Accepted | 12 |
| 12 | Sales Consultant-R | Merge M2 | — | 13 |
| 13 | Sales Consultant-R | Merge M3 | — | 14 |
| 14 | Sales Consultant-R | Action | Upload the land title, tax declaration, tax receipt and owner's ID | 15 |
| 15 | System | Action | Read each document with the AI (Module 1) | 16 |
| 16 | Sales Consultant-R | Action | Enter the listing title, description and map pin; submit for review | 17 |
| 17 | System | Decision | — | `[All four uploaded and read]` → 18 · `[Missing or still being read]` → M3 (row 13) |
| 18 | System | Action | Create the listing (Pending Review, or Needs Attention if any flag); mark the request Submitted for Review | 19 |
| 19 | Broker | Action | Verify each of the four documents (Module 1) | 20 |
| 20 | Broker | Action | Review the listing | 21 |
| 21 | Broker | Decision | — | `[Not all four documents approved]` → 22L · `[All four documents approved]` → 22R |
| 22L | Broker-L | Action | Send the listing back with a reason | 23 |
| 23 | System | Action | Mark the listing Rejected; return the request to Documents in Progress | M2 (row 12) |
| 22R | Broker-R | Action | Approve the listing | 24 |
| 24 | System | Action | Set the listing Live; grant the badges; mark the request Listed | 25 |
| 25 | Property Seeker | Action | Search and filter the listings | 26 |
| 26 | Property Seeker | Action | Open a property; see its photos, badges and loan quotations | 27 |
| 27 | Property Seeker | Decision | — | `[Estimate a loan]` → 28 · `[Skip]` → 30 |
| 28 | Property Seeker | Action | Enter the loan details | 29 |
| 29 | System | Action | Compute the monthly payment or affordable price (estimate only) | 30 |
| 30 | Property Seeker | Merge | — | 31 |
| 31 | Property Seeker | Decision | — | `[Interested]` → 32 · `[Not interested]` → 31E |
| 31E | Property Seeker | End | — | — |
| 32 | Property Seeker | Action | Send an inquiry with consent | 33 |
| 33 | System | Action | Send the inquiry to the owner's chosen agent | 34 |
| 34 | Sales Consultant | Action | Receive the new lead (continues in Module 3) | 35 |
| 35 | Sales Consultant | End | — | — |

**Routing (no crossing):**

- **Loop 7 → M1:** up the left edge of the Property Owner lane.
- **The Sales Consultant lane has two parts.** The decline path (10L, 10E) is in the left part,
  rows 10–11, and ends there. The main path is in the right part.
- **Loop 17 → M3:** from the decision, left into the **left part** of the Sales Consultant lane,
  then up (inner line) into M3's left side.
- **Loop 23 → M2:** left into the left part of the Sales Consultant lane, then up (**outer**
  line, further left than the 17 → M3 loop) into M2's left side. M2 is above M3, so the two loop
  lines never meet. Both loops start below row 11, so they pass under the decline path's end.
- **Rows 21–24:** the Broker lane has two parts. The send-back path (left) reaches the System at
  row 23, and the approve path (right) reaches it at row 24, one row lower, so the lines don't
  cross.
- **27 `[Skip]` → 30:** straight down the right edge of the Property Seeker lane.

Notes under the figure:

1. *"Read each document with the AI and Verify each document follow the Module 1 activity diagram."*
2. *"Developer units: the Company Admin adds them; the system publishes a unit only when its
   project's License to Sell is approved and not expired."*

---

## Part 4. Module 3: Sales, Client and Commission Management

**Scenario:** from a new lead to a completed sale, through the site visit, conversion to a client,
documents and payments, the staged commission and voucher, closing, and the buyer's rating.

After the client is created, two things happen **at the same time** (fork):

- **Branch A, commission:** the commission tranches move through their gates and are released one
  by one.
- **Branch B, closing:** the sale is closed and rated.

A real deal does both in parallel; for example, the last tranche may be released after the title
transfer. The join waits for both.

**Swimlanes (left to right):** `Property Seeker` · `Sales Consultant` · `System` · `Company Admin` · `Broker`

(The Property Seeker lane is first on the left on purpose: its empty upper part is the path for
Branch B, so that line crosses nothing.)

| Row | Lane | Node | Label | Goes to |
|---|---|---|---|---|
| 1 | Sales Consultant | Start | — | 2 |
| 2 | Sales Consultant | Action | Open the assigned lead; contact the buyer | 3 |
| 3 | Sales Consultant | Action | Update the lead status (Contacted, Qualified) | 4 |
| 4 | Sales Consultant | Decision | — | `[Site visit wanted]` → 5 · `[No visit needed]` → M2 (row 12) |
| 5 | Sales Consultant-R | Merge M1 | — | 6 |
| 6 | Sales Consultant-R | Action | Request a site visit (date, time, notes) | 7 |
| 7 | System | Action | Check for another visit within 1 hour (warning only); save it as Pending | 8 |
| 8 | Company Admin | Decision | — | `[Approve]` → 10 · `[Decline]` → 9 |
| 9 | Company Admin | Action | Decline with a reason | M1 (row 5) |
| 10 | System | Action | Mark the visit Approved; set the lead to Visit Scheduled | 11 |
| 11 | Sales Consultant-R | Action | Do the site visit; mark it Completed | 12 |
| 12 | Sales Consultant | Merge M2 | — | 13 |
| 13 | Sales Consultant | Decision | — | `[Buyer reserves]` → 14 · `[Buyer does not buy]` → 13L |
| 13L | Sales Consultant-L | Action | Mark the lead Lost with a reason | 13E |
| 13E | Sales Consultant-L | End | — | — |
| 14 | Sales Consultant-R | Action | Upload the reservation receipt | 15 |
| 15 | System | Action | Read the receipt with the AI (Module 1) | 16 |
| 16 | Sales Consultant-R | Action | Confirm the amount; enter the total contract price, payment method, civil status and employment type | 17 |
| 17 | System | Action | Create the client, reservation payment, requirement checklist, commission and tranches; set the lead to Reserved | 18 |
| 18 | System | **Fork** | — | Branch A → 19 · Branch B → 47 |
| | | | **Branch A: commission** | |
| 19 | Sales Consultant-R | Merge M3 | — | 20 |
| 20 | Sales Consultant-R | Merge M4 | — | 21 |
| 21 | Sales Consultant-R | Action | Upload the buyer's documents and record payments (the AI reads each one; confirm the amounts) | 22 |
| 22 | Broker | Action | Verify the documents (Module 1) or waive a requirement | 23 |
| 23 | System | Action | Evaluate the tranche gates | 24 |
| 24 | System | Decision | — | `[Payment milestone not reached]` → 25 · `[Milestone reached]` → 26 |
| 25 | System-L | Action | Keep the tranche Waiting | 28 |
| 26 | System | Decision | — | `[Documents missing]` → 27 · `[Documents verified or waived]` → 29 |
| 27 | System-L | Action | Set the tranche Blocked | 28 |
| 28 | System-L | Merge | — | M4 (row 20) |
| 29 | System | Decision | — | `[Developer transmittal needed]` → 30 · `[Not needed]` → 34 |
| 30 | System | Action | Set the tranche Awaiting Transmittal | 31 |
| 31 | Company Admin | Action | Upload the developer's transmittal | 32 |
| 32 | System | Action | Read the transmittal with the AI (Module 1) | 33 |
| 33 | Company Admin | Action | Confirm the amount (add a note if it differs by more than ₱1) | 34 |
| 34 | System | Merge | — | 35 |
| 35 | System | Action | Set the tranche Ready for Release | 36 |
| 36 | Broker | Action | Prepare the voucher (each share, withholding, deductions) | 37 |
| 37 | Broker | Action | Sign the voucher first (typed full name) | 38 |
| 38 | Sales Consultant-R | Merge M5 | — | 39 |
| 39 | Sales Consultant-R | Action | Sign the voucher (typed full name) | 40 |
| 40 | System | Decision | — | `[Not all consultants have signed]` → M5 (row 38) · `[All have signed]` → 41 |
| 41 | System | Action | Mark the tranche Released (the money is paid outside the system) | 42 |
| 42 | System | Decision | — | `[More tranches]` → M3 (row 19) · `[No more tranches]` → Join (row 58) |
| | | | **Branch B: closing** | |
| 47 | Sales Consultant | Action | Enter the selling price (and tax base, registration fee); compute the closing costs | 48 |
| 48 | System | Action | Compute the taxes at the firm's rates; set the client to Closing | 49 |
| 49 | Sales Consultant | Merge M6 | — | 50 |
| 50 | Sales Consultant | Action | Tick each closing step as it is done | 51 |
| 51 | System | Decision | — | `[Steps left]` → M6 (row 49) · `[All 7 steps done]` → 52 |
| 52 | Sales Consultant | Action | Confirm that the sale is complete | 53 |
| 53 | System | Action | Mark the client Completed; create a one-time rating link (30 days) | 54 |
| 54 | Sales Consultant | Action | Send the rating link to the buyer | 55 |
| 55 | Property Seeker | Action | Open the link; rate the consultant (1–5 stars, comment) | 56 |
| 56 | System | Action | Save the rating; close the link | 58 |
| 58 | System | **Join** | — | 59 |
| 59 | System | End | — | — |

(Rows 43–46 and 57 are left empty as spacing.)

**Routing (no crossing):**

- **4 `[No visit needed]` → M2:** straight down the **left part** of the Sales Consultant lane
  (rows 4–12).
- **Loop 9 → M1:** up the right edge of the Company Admin lane to just above row 5, then left
  across the System lane (empty at that height) into M1's right side.
- **Lost path (13L, 13E):** in the left part of the Sales Consultant lane, rows 13–14. Nothing else
  uses that spot.
- **Fork, Branch B:** from the fork bar (row 18), one line goes **left** across the Sales Consultant
  lane, then **down the Property Seeker lane**, which is empty from row 18 to row 46, then right into
  row 47.
- **Loop 28 → M4 (inner) and loop 42 `[More tranches]` → M3 (outer):** both go left out of the
  System lane into the left part of the Sales Consultant lane, then up. The outer line (from row
  42) is further left and enters M3, which is above M4. The two never meet.
- **Loop 40 → M5:** left from the decision, then up just left of the "Sign the voucher" box
  (inside the loops above), into M5's left side. The line into that box comes from the Broker on the
  right, so they don't touch.
- **Loop 51 → M6:** same pattern, left then up into M6's left side.
- **42 `[No more tranches]` → Join:** right across the Company Admin lane, **down the Broker lane**
  (empty from row 42 to row 58), then left into the join bar. Branch B never enters the Company
  Admin or Broker lanes, so this line crosses nothing.
- **The rules shown come from the system:** a visit clash is only a warning; a tranche becomes
  requestable only when the **payment milestone is reached AND the documents are verified or
  waived** (plus the transmittal when the developer requires one); the **Broker signs first**, then
  every consultant; "Released" only records a payout made outside the system; the rating link works
  once and expires after 30 days.

Notes under the figure:

1. *"The lead comes from Send Inquiry (Module 2). Read with the AI and Verify the documents follow
   the Module 1 activity diagram."*
2. *"Branch A repeats for each commission tranche."*

---

## Part 5. Checklist before submitting

- [ ] One start dot per diagram; every path ends at an end bull's-eye.
- [ ] Every decision has exactly one flow in and a `[guard]` on every flow out.
- [ ] Every loop returns into a **merge** diamond, never straight into an action box.
- [ ] Each action is in the lane of whoever does it; the system's work is in the **System** lane.
- [ ] Module 3 has a fork bar after "Create the client…" and a join bar before the end.
- [ ] Lanes are in the order given (it is part of what keeps lines from crossing).
- [ ] No two lines cross.
