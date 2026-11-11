# TrustListo process flow models (BPMN 2.0)

A guide for drawing every process flow in the manuscript. Each process is written as a table
you can copy shape by shape into draw.io (or any BPMN tool). Every step was checked against the
actual system (as of 2026-11-11), not just the specification.

**How to read the tables:** each row is one BPMN shape.

- **#** — the shape's number (`S` start, `E` end, `G` gateway, numbers for tasks).
- **Lane** — which swimlane the shape goes in.
- **Element** — which BPMN shape to use (see Part 1).
- **Label** — the text to write inside the shape.
- **Next** — where the arrow goes. For gateways, each arrow has a condition label, e.g. `Yes → 7`.

---

## Contents

**Part 1.** [BPMN 2.0 cheat sheet](#part-1-bpmn-20-cheat-sheet) ·
**Part 2.** [Corrections to the old diagram](#part-2-corrections-to-the-old-company-account-creation-diagram)

**Part 3. Shared processes**

- [C1 Sign in](#c1-sign-in)
- [C2 Company account creation](#c2-company-account-creation) (designed, not yet built)
- [C3 Add a consultant](#c3-add-a-consultant)

**Part 4. Module 1 — AI document processing and verification**

- [M1.1 Read a document automatically](#m11-read-a-document-automatically) (used by every upload)
- [M1.2 Verify a consultant's credential](#m12-verify-a-consultants-credential)
- [M1.3 Verify a project's License to Sell](#m13-verify-a-projects-license-to-sell)
- [M1.4 Verify a buyer's requirement document](#m14-verify-a-buyers-requirement-document)
- [M1.5 Record a payment from a receipt](#m15-record-a-payment-from-a-receipt)
- [M1.6 Check the developer's transmittal](#m16-check-the-developers-transmittal)

**Part 5. Module 2 — Marketplace and property management**

- [M2.1 Add and publish a developer unit](#m21-add-and-publish-a-developer-unit)
- [M2.2 Browse and view listings](#m22-browse-and-view-listings)
- [M2.3 Send an inquiry](#m23-send-an-inquiry)
- [M2.4 List a private seller's property](#m24-list-a-private-sellers-property)

**Part 6. Module 3 — Sales, client and commission management**

- [M3.1 Follow up a lead](#m31-follow-up-a-lead)
- [M3.2 Schedule a site visit](#m32-schedule-a-site-visit)
- [M3.3 Convert a lead to a client](#m33-convert-a-lead-to-a-client)
- [M3.4 Evaluate commission tranches](#m34-evaluate-commission-tranches) (system process)
- [M3.5 Prepare and sign the commission voucher](#m35-prepare-and-sign-the-commission-voucher)
- [M3.6 Close the sale](#m36-close-the-sale)
- [M3.7 Rate the agent](#m37-rate-the-agent)

---

## Part 1. BPMN 2.0 cheat sheet

### The shapes you need

| Shape                        | Looks like                                       | Use it for                                          | Example                              |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------ |
| **Pool**                     | Big rectangle with the process name              | One whole process                                   | "Company Account Creation"           |
| **Lane**                     | Horizontal or vertical strip inside the pool     | One actor (role), or **System**                     | Super Admin, System                  |
| **Start event**              | Circle, **thin** border                          | Where the process begins                            | "Credential uploaded"                |
| **End event**                | Circle, **thick** border                         | Where a path ends (one per outcome)                 | "Credential approved"                |
| **Timer intermediate event** | Double circle with a clock                       | Waiting for a date or time                          | "Visit date arrives"                 |
| **User task**                | Rounded rectangle, **person** icon               | A person does it on a TrustListo screen             | "Enter company information"          |
| **Service task**             | Rounded rectangle, **gear** icon                 | The system does it automatically                    | "Validate company information"       |
| **Manual task**              | Rounded rectangle, **hand** icon                 | A person does it **outside** the system             | "Call the buyer"                     |
| **Call activity**            | Rounded rectangle, **thick** border, small **+** | Runs another process from this guide                | "Read document (M1.1)"               |
| **Exclusive gateway**        | Diamond with **X**                               | A decision: only **one** path is taken              | "Is login valid?"                    |
| **Parallel gateway**         | Diamond with **+**                               | **All** paths happen at the same time               | Confirm to buyer + notify consultant |
| **Sequence flow**            | Solid arrow                                      | Order of steps inside a pool                        |                                      |
| **Message flow**             | Dashed arrow with a circle                       | Only **between two pools** (not used in this guide) |                                      |

In draw.io: **More Shapes** (bottom left) → tick **BPMN General**. Task icons are set in the
shape's style (Edit Style), or use the ready-made task shapes from the BPMN palette.

### Rules that keep a diagram correct

1. **One pool per process.** Put each actor in its own lane, and everything automatic in a **System** lane.
2. **Exactly one start event; at least one end event.** Every path must reach an end event. No dead ends.
3. **Name tasks with a verb + object:** "Validate login credentials", "Display error message".
   **Name events with an object + past participle:** "Credential approved", "Sale completed".
4. **Never give two different steps the same name.** (The old diagram did this; see Part 2.)
5. **Every gateway gets a question, and every arrow out of it gets an answer** ("Yes"/"No", "Approve"/"Reject").
6. **A gateway only decides; it does no work.** The checking is a service task _before_ the gateway.
7. **Sequence flows may cross lanes** inside one pool. Message flows are only for separate pools.
8. **Loops are fine:** an error path may go back to an earlier user task (for example, "re-enter the information").
9. **Reuse with call activities.** Every upload uses **M1.1 Read a document automatically**; draw it once
   and show it as a call activity in the other diagrams instead of redrawing it.
10. **Start after sign-in.** Only C1 shows sign-in. Other processes start with the user already
    signed in. Optionally, begin them with a call activity "Sign in (C1)".

---

## Part 2. Corrections to the old "Company Account Creation" diagram

Your old diagram (Super Admin and System lanes) is close, with these fixes:

| #   | Problem in the old diagram                                                                                                    | Fix                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The "No" path of **Is login valid?** goes to a task called **Validate Login Credentials**, the same name as the earlier step. | The No path should go to a service task **Display error message**, then back to **Login to Super Admin Account**.              |
| 2   | Sign-in is drawn inside this process. If every diagram does that, sign-in is repeated many times.                             | Draw sign-in once (**C1**). Start this process with the Super Admin already signed in, or with a call activity "Sign in (C1)". |
| 3   | After saving the company, nobody can use it: the firm has no **company admin** account yet.                                   | Add the steps to create the company's first admin (see C2, steps 9–14).                                                        |
| 4   | "Display Super Admin Dashboard" then "Add Company" skips how the admin gets to the form.                                      | Fine to keep. Optionally label the user task "Click **Add company**".                                                          |

**Important:** in the current prototype, the SuperAdmin screen can **view** firms but **cannot
create** one yet. Creating a firm is in the specification (SPEC §13: `POST /admin/firms` and
`POST /admin/firms/:id/company-admin`), but it wasn't built. You can keep **C2** in the
manuscript as the designed process. If the panel asks, firms are currently set up by the
platform team.

---

## Part 3. Shared processes

### C1 Sign in

**Pool:** Sign In · **Lanes:** User (any staff role), System

| #   | Lane   | Element           | Label                                                          | Next             |
| --- | ------ | ----------------- | -------------------------------------------------------------- | ---------------- |
| S   | User   | Start event       | Sign-in needed                                                 | 1                |
| 1   | User   | User task         | Enter email and password                                       | 2                |
| 2   | System | Service task      | Check if the account is locked                                 | G1               |
| G1  | System | Exclusive gateway | Is the account locked?                                         | Yes → 3 · No → 4 |
| 3   | System | Service task      | Display "account locked for 15 minutes"                        | E1               |
| E1  | System | End event         | Sign-in refused                                                | —                |
| 4   | System | Service task      | Validate email and password                                    | G2               |
| G2  | System | Exclusive gateway | Are the credentials valid?                                     | No → 5 · Yes → 7 |
| 5   | System | Service task      | Record failed attempt                                          | 6                |
| 6   | System | Service task      | Display error message                                          | 1                |
| 7   | System | Service task      | Check that the account is active and the firm is not suspended | G3               |
| G3  | System | Exclusive gateway | Is access allowed?                                             | No → 8 · Yes → 9 |
| 8   | System | Service task      | Display "account deactivated" or "firm suspended" message      | E1               |
| 9   | System | Service task      | Start session and record sign-in in the audit log              | 10               |
| 10  | System | Service task      | Display the dashboard for the user's role                      | E2               |
| E2  | User   | End event         | User signed in                                                 | —                |

**Notes:** after 5 failed attempts the account locks for 15 minutes (that's why step 2 comes first).
Separately, many failed attempts from one computer are slowed down; successful sign-ins don't count.

---

### C2 Company account creation

> **Designed (SPEC §13), not built in the prototype yet.** Corrected version of your old diagram.

**Pool:** Company Account Creation · **Lanes:** Super Admin, System

| #   | Lane        | Element           | Label                                                  | Next               |
| --- | ----------- | ----------------- | ------------------------------------------------------ | ------------------ |
| S   | Super Admin | Start event       | Super Admin signed in (C1)                             | 1                  |
| 1   | Super Admin | User task         | Click Add company                                      | 2                  |
| 2   | System      | Service task      | Display company information form                       | 3                  |
| 3   | Super Admin | User task         | Enter company information                              | 4                  |
| 4   | System      | Service task      | Validate company information                           | G1                 |
| G1  | System      | Exclusive gateway | Is company information valid?                          | No → 5 · Yes → 6   |
| 5   | System      | Service task      | Display error message                                  | 3                  |
| 6   | System      | Service task      | Save company account                                   | 7                  |
| 7   | System      | Service task      | Create default commission settings                     | 8                  |
| 8   | System      | Service task      | Display company admin form                             | 9                  |
| 9   | Super Admin | User task         | Enter company admin details                            | 10                 |
| 10  | System      | Service task      | Validate company admin details                         | G2                 |
| G2  | System      | Exclusive gateway | Are the details valid?                                 | No → 11 · Yes → 12 |
| 11  | System      | Service task      | Display error message                                  | 9                  |
| 12  | System      | Service task      | Create company admin account with a temporary password | 13                 |
| 13  | System      | Service task      | Record in the audit log                                | 14                 |
| 14  | System      | Service task      | Display confirmation and temporary password            | E                  |
| E   | Super Admin | End event         | Company account created                                | —                  |

"Company information" = company name and address. "Company admin details" = first name, last name, email.

---

### C3 Add a consultant

**Pool:** Consultant Account Creation · **Lanes:** Company Admin, System

| #   | Lane          | Element           | Label                                                    | Next             |
| --- | ------------- | ----------------- | -------------------------------------------------------- | ---------------- |
| S   | Company Admin | Start event       | Company admin signed in (C1)                             | 1                |
| 1   | Company Admin | User task         | Click Add consultant                                     | 2                |
| 2   | System        | Service task      | Display consultant form                                  | 3                |
| 3   | Company Admin | User task         | Choose role and supervisor; enter name and email         | 4                |
| 4   | System        | Service task      | Validate consultant details                              | G1               |
| G1  | System        | Exclusive gateway | Are the details valid?                                   | No → 5 · Yes → 6 |
| 5   | System        | Service task      | Display error message                                    | 3                |
| 6   | System        | Service task      | Create account with temporary password and referral code | 7                |
| 7   | System        | Service task      | Record in the audit log                                  | 8                |
| 8   | System        | Service task      | Display temporary password                               | 9                |
| 9   | Company Admin | Manual task       | Give the temporary password to the consultant            | E                |
| E   | Company Admin | End event         | Consultant account created                               | —                |

**Validation (step 4):** email not already used; a **salesperson** must report to a **sales manager**;
a **sales manager** must report to a **broker**; the supervisor must be in the same firm.

**Note:** a new consultant is **not shown to buyers** until a broker verifies their license (M1.2).

---

## Part 4. Module 1 — AI document processing and verification

The rule behind every Module 1 process: **the AI only reads and flags; only a person decides.**
For licenses and buyer documents that person is the **broker**. For receipts it's the consultant
who uploaded them; for transmittals it's the company admin.

### M1.1 Read a document automatically

A reusable sub-process. Other diagrams call it as **"Read document (M1.1)"**.

**Pool:** Automatic Document Reading · **Lanes:** System

| #   | Lane   | Element           | Label                                                    | Next               |
| --- | ------ | ----------------- | -------------------------------------------------------- | ------------------ |
| S   | System | Start event       | Document uploaded                                        | 1                  |
| 1   | System | Service task      | Store the document privately                             | 2                  |
| 2   | System | Service task      | Queue the document for reading                           | 3                  |
| 3   | System | Service task      | Prepare the image (convert PDF pages, clean up the scan) | 4                  |
| 4   | System | Service task      | Read the text (OCR)                                      | G1                 |
| G1  | System | Exclusive gateway | Was the text readable?                                   | No → 5 · Yes → 6   |
| 5   | System | Service task      | Mark reading failed                                      | 8                  |
| 6   | System | Service task      | Identify the document type                               | 7                  |
| 7   | System | Service task      | Extract the fields                                       | 8                  |
| 8   | System | Service task      | Run cross-checks                                         | 9                  |
| 9   | System | Service task      | Save flags and suggest a review status                   | G2                 |
| G2  | System | Exclusive gateway | Any blocking issue?                                      | Yes → 10 · No → 11 |
| 10  | System | Service task      | Set status to Needs attention                            | E                  |
| 11  | System | Service task      | Set status to Ready for review                           | E                  |
| E   | System | End event         | Document ready for a person's decision                   | —                  |

**What the cross-checks (step 8) compare:**

| Document                                            | Checks                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Consultant license (PRC / DHSUD)                    | Name matches the consultant, number matches what the admin typed, not expired                   |
| License to Sell                                     | Project and developer match, not expired                                                        |
| Land title, tax declaration, tax receipt, seller ID | Owner matches the seller, lot area matches between documents, taxes are current, no encumbrance |
| Buyer ID and other buyer documents                  | Name matches the client                                                                         |
| Payment receipt                                     | Reads OR number, date, amount, payor; flags an OR number already used in the firm               |
| Developer transmittal                               | Amount matches the tranche (within ₱1)                                                          |

**Notes:**

- The AI **never** sets a document to Approved. Every path ends with a person deciding.
- A failed read (G1 "No") still goes to review, so a person can check the document by hand.
  A failed read never blocks the work.

---

### M1.2 Verify a consultant's credential

**Pool:** Credential Verification · **Lanes:** Company Admin, System, Broker

| #   | Lane          | Element           | Label                                                                         | Next                      |
| --- | ------------- | ----------------- | ----------------------------------------------------------------------------- | ------------------------- |
| S   | Company Admin | Start event       | Consultant needs a verified license                                           | 1                         |
| 1   | Company Admin | User task         | Upload credential (type, number, file)                                        | 2                         |
| 2   | System        | Service task      | Validate the file (type and size)                                             | G1                        |
| G1  | System        | Exclusive gateway | Is the file accepted?                                                         | No → 3 · Yes → 4          |
| 3   | System        | Service task      | Display error message                                                         | 1                         |
| 4   | System        | Call activity     | Read document (M1.1)                                                          | 5                         |
| 5   | System        | Service task      | Add the credential to the broker's review queue                               | 6                         |
| 6   | Broker        | User task         | Compare the document with what the AI read                                    | G2                        |
| G2  | Broker        | Exclusive gateway | Approve or reject?                                                            | Approve → 7 · Reject → 12 |
| 7   | Broker        | User task         | Confirm the valid-until date (and give a reason if there is a blocking issue) | 8                         |
| 8   | System        | Service task      | Validate the approval                                                         | G3                        |
| G3  | System        | Exclusive gateway | Can it be approved?                                                           | No → 9 · Yes → 10         |
| 9   | System        | Service task      | Display error message                                                         | 6                         |
| 10  | System        | Service task      | Mark the credential approved and record in the audit log                      | 11                        |
| 11  | System        | Service task      | Show the consultant as verified to buyers                                     | E1                        |
| E1  | Broker        | End event         | Credential approved                                                           | —                         |
| 12  | Broker        | User task         | Enter the rejection reason                                                    | 13                        |
| 13  | System        | Service task      | Mark the credential rejected and record in the audit log                      | 14                        |
| 14  | System        | Service task      | Show the reason to the company admin                                          | E2                        |
| E2  | Broker        | End event         | Credential rejected                                                           | —                         |

**Step 8 refuses when:** the credential has already expired (the broker must reject it), or a
blocking issue exists and no reason was given. After a rejection, the admin uploads a corrected
credential, which starts the process again.

---

### M1.3 Verify a project's License to Sell

**Pool:** License to Sell Verification · **Lanes:** Company Admin, System, Broker

| #   | Lane          | Element           | Label                                                                              | Next                      |
| --- | ------------- | ----------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| S   | Company Admin | Start event       | Project needs a License to Sell                                                    | 1                         |
| 1   | Company Admin | User task         | Upload License to Sell for the project                                             | 2                         |
| 2   | System        | Service task      | Validate the file (type and size)                                                  | G1                        |
| G1  | System        | Exclusive gateway | Is the file accepted?                                                              | No → 3 · Yes → 4          |
| 3   | System        | Service task      | Display error message                                                              | 1                         |
| 4   | System        | Service task      | Check whether another license is waiting for review                                | G2                        |
| G2  | System        | Exclusive gateway | Is another license under review?                                                   | Yes → 5 · No → 6          |
| 5   | System        | Service task      | Display "wait for the broker's decision"                                           | E1                        |
| E1  | Company Admin | End event         | Upload refused                                                                     | —                         |
| 6   | System        | Call activity     | Read document (M1.1)                                                               | 7                         |
| 7   | Broker        | User task         | Compare the license with what the AI read                                          | G3                        |
| G3  | Broker        | Exclusive gateway | Approve or reject?                                                                 | Approve → 8 · Reject → 13 |
| 8   | Broker        | User task         | Confirm license number and expiry (and give a reason if there is a blocking issue) | 9                         |
| 9   | System        | Service task      | Validate the approval                                                              | G4                        |
| G4  | System        | Exclusive gateway | Can it be approved?                                                                | No → 10 · Yes → 11        |
| 10  | System        | Service task      | Display error message                                                              | 7                         |
| 11  | System        | Service task      | Mark the license approved and save its number and expiry                           | 12                        |
| 12  | System        | Service task      | Grant the License to Sell badge to the project's units                             | E2                        |
| E2  | Broker        | End event         | License to Sell verified                                                           | —                         |
| 13  | Broker        | User task         | Enter the rejection reason                                                         | 14                        |
| 14  | System        | Service task      | Mark the license rejected and record in the audit log                              | E3                        |
| E3  | Broker        | End event         | License to Sell rejected                                                           | —                         |

**Step 9 refuses when** the license has expired or the expiry date is missing.
Rejecting a **renewal** keeps the project's earlier approved license.

---

### M1.4 Verify a buyer's requirement document

**Pool:** Buyer Document Verification · **Lanes:** Consultant, System, Broker

| #   | Lane       | Element           | Label                                                    | Next                                  |
| --- | ---------- | ----------------- | -------------------------------------------------------- | ------------------------------------- |
| S   | Consultant | Start event       | Checklist item needs a document                          | 1                                     |
| 1   | Consultant | User task         | Upload the document for the checklist item               | 2                                     |
| 2   | System     | Service task      | Validate the file (type and size)                        | G1                                    |
| G1  | System     | Exclusive gateway | Is the file accepted?                                    | No → 3 · Yes → 4                      |
| 3   | System     | Service task      | Display error message                                    | 1                                     |
| 4   | System     | Call activity     | Read document (M1.1)                                     | 5                                     |
| 5   | System     | Service task      | Mark the item "Waiting for broker" or "Flagged"          | 6                                     |
| 6   | Broker     | User task         | Review the document                                      | G2                                    |
| G2  | Broker     | Exclusive gateway | Approve, reject or waive?                                | Approve → 7 · Reject → 9 · Waive → 11 |
| 7   | System     | Service task      | Mark the item Verified and record in the audit log       | 13                                    |
| 9   | Broker     | User task         | Enter the rejection reason                               | 10                                    |
| 10  | System     | Service task      | Set the item back to Missing and record in the audit log | 13                                    |
| 11  | Broker     | User task         | Enter the reason for waiving                             | 12                                    |
| 12  | System     | Service task      | Mark the item Waived and record in the audit log         | 13                                    |
| 13  | System     | Call activity     | Evaluate commission tranches (M3.4)                      | G3                                    |
| G3  | System     | Exclusive gateway | Was the document rejected?                               | Yes → 1 · No → E                      |
| E   | Broker     | End event         | Requirement settled                                      | —                                     |

**Notes:**

- The checklist itself is generated at conversion (M3.3) from the payment method, civil status and employment.
- **Only a broker** verifies or waives buyer documents.
- Step 13 matters because a commission can only move when the documents are verified (M3.4).

---

### M1.5 Record a payment from a receipt

**Pool:** Payment Recording · **Lanes:** Consultant, System

| #   | Lane       | Element           | Label                                                | Next             |
| --- | ---------- | ----------------- | ---------------------------------------------------- | ---------------- |
| S   | Consultant | Start event       | Buyer made a payment                                 | 1                |
| 1   | Consultant | User task         | Choose the payment kind and upload the receipt       | 2                |
| 2   | System     | Service task      | Validate the file (type and size)                    | G1               |
| G1  | System     | Exclusive gateway | Is the file accepted?                                | No → 3 · Yes → 4 |
| 3   | System     | Service task      | Display error message                                | 1                |
| 4   | System     | Call activity     | Read document (M1.1)                                 | 5                |
| 5   | System     | Service task      | Pre-fill the amount and date from the receipt        | G2               |
| G2  | System     | Exclusive gateway | Was the receipt flagged as already used?             | Yes → 6 · No → 7 |
| 6   | System     | Service task      | Display "receipt already used for another payment"   | E1               |
| E1  | Consultant | End event         | Payment not recorded                                 | —                |
| 7   | Consultant | User task         | Check and confirm the amount and date                | 8                |
| 8   | System     | Service task      | Record the confirmed payment and the audit log entry | 9                |
| 9   | System     | Call activity     | Evaluate commission tranches (M3.4)                  | E2               |
| E2  | Consultant | End event         | Payment recorded                                     | —                |

**Note:** a payment counts toward a commission milestone **only after** the consultant confirms it (step 7).

---

### M1.6 Check the developer's transmittal

**Pool:** Transmittal Check · **Lanes:** Company Admin, System

| #   | Lane          | Element           | Label                                                  | Next             |
| --- | ------------- | ----------------- | ------------------------------------------------------ | ---------------- |
| S   | Company Admin | Start event       | Tranche is waiting for the developer's transmittal     | 1                |
| 1   | Company Admin | User task         | Upload the developer's transmittal                     | 2                |
| 2   | System        | Service task      | Validate the file (type and size)                      | G1               |
| G1  | System        | Exclusive gateway | Is the file accepted?                                  | No → 3 · Yes → 4 |
| 3   | System        | Service task      | Display error message                                  | 1                |
| 4   | System        | Call activity     | Read document (M1.1)                                   | 5                |
| 5   | System        | Service task      | Display the amount read next to the tranche amount     | 6                |
| 6   | Company Admin | User task         | Confirm the transmittal amount                         | 7                |
| 7   | System        | Service task      | Compare the amount with the tranche                    | G2               |
| G2  | System        | Exclusive gateway | Does it differ by more than ₱1 without an explanation? | Yes → 8 · No → 9 |
| 8   | System        | Service task      | Display "explain the difference"                       | 6                |
| 9   | System        | Service task      | Record the transmittal amount and the audit log entry  | 10               |
| 10  | System        | Call activity     | Evaluate commission tranches (M3.4)                    | E                |
| E   | Company Admin | End event         | Transmittal confirmed                                  | —                |

---

## Part 5. Module 2 — Marketplace and property management

### M2.1 Add and publish a developer unit

**Pool:** Developer Unit Publishing · **Lanes:** Company Admin, System

| #   | Lane          | Element           | Label                                                           | Next               |
| --- | ------------- | ----------------- | --------------------------------------------------------------- | ------------------ |
| S   | Company Admin | Start event       | Firm has a unit to sell                                         | G1                 |
| G1  | Company Admin | Exclusive gateway | Are the developer and project already set up?                   | No → 1 · Yes → 6   |
| 1   | Company Admin | User task         | Add the developer                                               | 2                  |
| 2   | System        | Service task      | Save the developer and create its default commission milestones | 3                  |
| 3   | Company Admin | User task         | Add the project (name, location, map pin)                       | 4                  |
| 4   | System        | Service task      | Save the project                                                | 5                  |
| 5   | Company Admin | Call activity     | Verify the License to Sell (M1.3)                               | 6                  |
| 6   | Company Admin | User task         | Enter the unit details                                          | 7                  |
| 7   | System        | Service task      | Validate the unit details                                       | G2                 |
| G2  | System        | Exclusive gateway | Are the details valid?                                          | No → 8 · Yes → 9   |
| 8   | System        | Service task      | Display error message                                           | 6                  |
| 9   | System        | Service task      | Save the unit as a draft                                        | 10                 |
| 10  | Company Admin | User task         | Add photos and payment options                                  | 11                 |
| 11  | System        | Service task      | Save photos (location data removed) and payment options         | 12                 |
| 12  | Company Admin | User task         | Click Publish to marketplace                                    | 13                 |
| 13  | System        | Service task      | Check the project's License to Sell                             | G3                 |
| G3  | System        | Exclusive gateway | Is the License to Sell approved and valid?                      | No → 14 · Yes → 15 |
| 14  | System        | Service task      | Display "license not approved or expired"                       | E1                 |
| E1  | Company Admin | End event         | Unit stays a draft                                              | —                  |
| 15  | System        | Service task      | Set the unit Live and record in the audit log                   | E2                 |
| E2  | Company Admin | End event         | Unit live on the marketplace                                    | —                  |

**Note:** units also disappear from the marketplace automatically when their License to Sell expires
or the firm is suspended.

---

### M2.2 Browse and view listings

**Pool:** Marketplace Browsing · **Lanes:** Buyer (public, no account), System

| #   | Lane   | Element           | Label                                                            | Next             |
| --- | ------ | ----------------- | ---------------------------------------------------------------- | ---------------- |
| S   | Buyer  | Start event       | Buyer looks for a home                                           | 1                |
| 1   | Buyer  | User task         | Open Browse homes                                                | 2                |
| 2   | System | Service task      | Display live listings from all firms                             | 3                |
| 3   | Buyer  | User task         | Search and filter (type, price, payment, badge) or switch to map | 4                |
| 4   | System | Service task      | Display matching listings or map markers                         | 5                |
| 5   | Buyer  | User task         | Open a listing                                                   | 6                |
| 6   | System | Service task      | Display details, badges, payment options and location            | G1               |
| G1  | Buyer  | Exclusive gateway | Use the loan calculator?                                         | Yes → 7 · No → E |
| 7   | Buyer  | User task         | Enter loan values                                                | 8                |
| 8   | System | Service task      | Compute the monthly payment (firm's loan defaults)               | E                |
| E   | Buyer  | End event         | Buyer has viewed the listing                                     | —                |

**Note:** "Live listings" means the firm is active, the unit is published, and (for developer units)
the License to Sell is still valid. To send an inquiry, continue with M2.3.

---

### M2.3 Send an inquiry

**Pool:** Buyer Inquiry · **Lanes:** Buyer (public), System, Consultant

| #   | Lane       | Element           | Label                                                                       | Next                                                                   |
| --- | ---------- | ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| S   | Buyer      | Start event       | Buyer is interested in a listing                                            | 1                                                                      |
| 1   | Buyer      | User task         | Click Send an inquiry                                                       | 2                                                                      |
| 2   | System     | Service task      | Determine who receives the inquiry                                          | G1                                                                     |
| G1  | System     | Exclusive gateway | How is this inquiry routed?                                                 | Private seller's listing → 3 · Valid referral code → 4 · Otherwise → 5 |
| 3   | System     | Service task      | Show the agent the seller chose                                             | 7                                                                      |
| 4   | System     | Service task      | Show the consultant who shared the link                                     | 7                                                                      |
| 5   | System     | Service task      | Display the listing firm's verified consultants in random order             | 6                                                                      |
| 6   | Buyer      | User task         | Choose a consultant                                                         | 7                                                                      |
| 7   | Buyer      | User task         | Enter contact details and give consent                                      | 8                                                                      |
| 8   | System     | Service task      | Validate the inquiry                                                        | G2                                                                     |
| G2  | System     | Exclusive gateway | Is the inquiry valid?                                                       | No → 9 · Yes → 10                                                      |
| 9   | System     | Service task      | Display error message                                                       | 7                                                                      |
| 10  | System     | Service task      | Create the lead (status New) for the consultant and record in the audit log | G3                                                                     |
| G3  | System     | Parallel gateway  | (split)                                                                     | → 11 and → 12                                                          |
| 11  | System     | Service task      | Display "Sent to (consultant)"                                              | E1                                                                     |
| E1  | Buyer      | End event         | Inquiry sent                                                                | —                                                                      |
| 12  | Consultant | User task         | Open the new lead from Do next                                              | E2                                                                     |
| E2  | Consultant | End event         | Lead received (continue with M3.1)                                          | —                                                                      |

**Routing rules (G1), in this order:**

1. A private seller's listing always goes to the agent the seller chose.
2. A referral code counts only if it belongs to an **active consultant of the listing's own firm**.
3. Otherwise the buyer chooses from **verified** consultants of the listing firm, in a **new random order every time** (no featured agents, no other firms).

**Validation (step 8):** consent given, required fields filled, listing still live, spam protection.

---

### M2.4 List a private seller's property

**Pool:** Private Seller Listing · **Lanes:** Seller (public), System, Agent (consultant), Broker

| #   | Lane   | Element           | Label                                                                  | Next                       |
| --- | ------ | ----------------- | ---------------------------------------------------------------------- | -------------------------- |
| S   | Seller | Start event       | Seller wants to sell a property                                        | 1                          |
| 1   | Seller | User task         | Open List your property                                                | G1                         |
| G1  | Seller | Exclusive gateway | Does the seller have the land title?                                   | No → 2 · Yes → 3           |
| 2   | System | Service task      | Explain that only titled properties can be listed                      | E1                         |
| E1  | Seller | End event         | Property not listed                                                    | —                          |
| 3   | Seller | User task         | Enter property details and photos                                      | 4                          |
| 4   | System | Service task      | Display verified agents from all firms in random order                 | 5                          |
| 5   | Seller | User task         | Choose an agent                                                        | 6                          |
| 6   | Seller | User task         | Enter contact details and give consent                                 | 7                          |
| 7   | System | Service task      | Validate the request                                                   | G2                         |
| G2  | System | Exclusive gateway | Is the request valid?                                                  | No → 8 · Yes → 9           |
| 8   | System | Service task      | Display error message                                                  | 6                          |
| 9   | System | Service task      | Create the listing request (New) for the chosen agent                  | 10                         |
| 10  | Agent  | User task         | Review the request                                                     | G3                         |
| G3  | Agent  | Exclusive gateway | Accept the request?                                                    | No → 11 · Yes → 13         |
| 11  | Agent  | User task         | Enter the decline reason                                               | 12                         |
| 12  | System | Service task      | Mark the request declined and record in the audit log                  | E2                         |
| E2  | Agent  | End event         | Request declined                                                       | —                          |
| 13  | System | Service task      | Mark the request accepted                                              | 14                         |
| 14  | Agent  | User task         | Upload the land title, tax declaration, tax receipt and seller ID      | 15                         |
| 15  | System | Call activity     | Read document (M1.1), for each of the four                             | 16                         |
| 16  | Agent  | User task         | Write the listing title, set the map pin, and send to the broker       | 17                         |
| 17  | System | Service task      | Check that all four documents are uploaded and read                    | G4                         |
| G4  | System | Exclusive gateway | Are all four documents ready?                                          | No → 18 · Yes → 19         |
| 18  | System | Service task      | Display "upload all four documents first"                              | 14                         |
| 19  | System | Service task      | Create the listing and add it to the broker's queue                    | 20                         |
| 20  | Broker | User task         | Review and decide each document                                        | G5                         |
| G5  | Broker | Exclusive gateway | Approve or reject the listing?                                         | Approve → 21 · Reject → 24 |
| 21  | System | Service task      | Check that all four documents are approved                             | G6                         |
| G6  | System | Exclusive gateway | Are all four approved?                                                 | No → 22 · Yes → 23         |
| 22  | System | Service task      | Display "approve all four documents first"                             | 20                         |
| 23  | System | Service task      | Publish the listing with its earned badges and record in the audit log | E3                         |
| E3  | Broker | End event         | Listing live on the marketplace                                        | —                          |
| 24  | Broker | User task         | Enter what the agent should fix                                        | 25                         |
| 25  | System | Service task      | Return the request to the agent                                        | 14                         |

**Notes:**

- Badges a seller listing can earn: **Title clean**, **Taxes current**, **Ownership verified**. Each needs the broker's approval of the related documents.
- Inquiries on this listing always go to the chosen agent (M2.3, rule 1).

---

## Part 6. Module 3 — Sales, client and commission management

### M3.1 Follow up a lead

**Pool:** Lead Follow-up · **Lanes:** Consultant, System

| #   | Lane       | Element           | Label                                              | Next              |
| --- | ---------- | ----------------- | -------------------------------------------------- | ----------------- |
| S   | Consultant | Start event       | New lead received (from M2.3)                      | 1                 |
| 1   | Consultant | Manual task       | Call the buyer                                     | 2                 |
| 2   | Consultant | User task         | Mark the lead Contacted                            | 3                 |
| 3   | System     | Service task      | Update the lead status and record in the audit log | G1                |
| G1  | Consultant | Exclusive gateway | Is the buyer still interested?                     | No → 4 · Yes → G2 |
| 4   | Consultant | User task         | Mark the lead Lost with a reason                   | 5                 |
| 5   | System     | Service task      | Save the status and reason                         | E1                |
| E1  | Consultant | End event         | Lead lost                                          | —                 |
| G2  | Consultant | Exclusive gateway | Does the buyer want a site visit?                  | Yes → 6 · No → G3 |
| 6   | Consultant | Call activity     | Schedule a site visit (M3.2)                       | G3                |
| G3  | Consultant | Exclusive gateway | Did the buyer reserve?                             | Yes → 7 · No → 4  |
| 7   | Consultant | Call activity     | Convert the lead to a client (M3.3)                | E2                |
| E2  | Consultant | End event         | Lead became a client                               | —                 |

**Lead statuses:** New → Contacted → Qualified → Visit scheduled → Reserved, or Lost (with a reason).
The consultant may set Qualified at any point after contacting. **Reserved** is set only by conversion (M3.3).

---

### M3.2 Schedule a site visit

**Pool:** Site Visit · **Lanes:** Consultant, System, Company Admin

| #   | Lane          | Element                  | Label                                                                  | Next               |
| --- | ------------- | ------------------------ | ---------------------------------------------------------------------- | ------------------ |
| S   | Consultant    | Start event              | Buyer wants to see the property                                        | 1                  |
| 1   | Consultant    | User task                | Request a visit (date, time, notes)                                    | 2                  |
| 2   | System        | Service task             | Validate the request                                                   | G1                 |
| G1  | System        | Exclusive gateway        | Is the request valid?                                                  | No → 3 · Yes → 4   |
| 3   | System        | Service task             | Display error message                                                  | 1                  |
| 4   | System        | Service task             | Save the visit as Pending, warn about clashes, record in the audit log | 5                  |
| 5   | Company Admin | User task                | Review the visit request                                               | G2                 |
| G2  | Company Admin | Exclusive gateway        | Approve the visit?                                                     | No → 6 · Yes → 8   |
| 6   | Company Admin | User task                | Enter the decline reason                                               | 7                  |
| 7   | System        | Service task             | Mark the visit declined                                                | 1                  |
| 8   | System        | Service task             | Mark the visit approved and move the lead to Visit scheduled           | T                  |
| T   | Consultant    | Timer intermediate event | Visit date and time arrives                                            | 9                  |
| 9   | Consultant    | Manual task              | Meet the buyer at the property                                         | G3                 |
| G3  | Consultant    | Exclusive gateway        | Did the buyer come?                                                    | Yes → 10 · No → 11 |
| 10  | System        | Service task             | Mark the visit Completed                                               | E1                 |
| E1  | Consultant    | End event                | Visit completed                                                        | —                  |
| 11  | System        | Service task             | Mark the visit No-show                                                 | E2                 |
| E2  | Consultant    | End event                | Buyer did not come                                                     | —                  |

**Rules:**

- **Validation (step 2):** the date must be in the future, and the lead must still be open (not Lost or Reserved).
- A clash warning (same consultant within 1 hour) never blocks the request.
- **Only the company admin** approves or declines; a decline needs a reason.
- **Only the consultant** records the outcome, and only after the visit time.
- _Optional branches you may add:_ **Reschedule** (consultant, before the visit: the old visit becomes Rescheduled and a new Pending request goes back to step 5) and **Cancel** (consultant or admin).

---

### M3.3 Convert a lead to a client

**Pool:** Client Conversion · **Lanes:** Consultant, System

| #   | Lane       | Element           | Label                                                                     | Next              |
| --- | ---------- | ----------------- | ------------------------------------------------------------------------- | ----------------- |
| S   | Consultant | Start event       | Buyer paid the reservation                                                | 1                 |
| 1   | Consultant | User task         | Upload the reservation receipt                                            | 2                 |
| 2   | System     | Service task      | Validate the file (type and size)                                         | G1                |
| G1  | System     | Exclusive gateway | Is the file accepted?                                                     | No → 3 · Yes → 4  |
| 3   | System     | Service task      | Display error message                                                     | 1                 |
| 4   | System     | Call activity     | Read document (M1.1)                                                      | 5                 |
| 5   | System     | Service task      | Pre-fill the amount and date from the receipt                             | 6                 |
| 6   | Consultant | User task         | Confirm the amount; enter contract price, payment method and civil status | G2                |
| G2  | Consultant | Exclusive gateway | Bank or Pag-IBIG loan?                                                    | Yes → 7 · No → 8  |
| 7   | Consultant | User task         | Enter employment type and required downpayment                            | 8                 |
| 8   | System     | Service task      | Validate the conversion                                                   | G3                |
| G3  | System     | Exclusive gateway | Is everything valid?                                                      | No → 9 · Yes → 10 |
| 9   | System     | Service task      | Display error message                                                     | 6                 |
| 10  | System     | Service task      | Create the client, record the reservation payment, mark the lead Reserved | 11                |
| 11  | System     | Service task      | Generate the requirements checklist                                       | 12                |
| 12  | System     | Service task      | Create the commission and its tranches                                    | 13                |
| 13  | System     | Service task      | Record in the audit log                                                   | 14                |
| 14  | System     | Service task      | Display the client page                                                   | E                 |
| E   | Consultant | End event         | Client created                                                            | —                 |

**Validation (step 8):** the receipt has been read and isn't flagged as already used; the payment
method is chosen ("not sure yet" isn't allowed); bank and Pag-IBIG buyers have an employment type
and a required downpayment.

**Step 11, checklist:** built from payment method, civil status and employment:

- **Everyone:** two valid IDs (at reservation).
- **Civil status (all methods except cash):** CENOMAR if single, marriage contract (plus the
  spouse's IDs) if married, annulment decree if separated.
- **Bank or Pag-IBIG loans:** birth certificate, proof of billing, TIN, photos, and income
  documents by employment: certificate of employment, payslips and ITR if employed locally;
  ITR, financial statements, bank statements and business permits if self-employed; proof of
  overseas employment, payslips, SPA and passport if OFW.

**Step 12, commission:** gross = contract price × the developer template's rate, divided into
tranches (e.g. Camella Pag-IBIG: 30% / 30% / 30% / 10%). The split is saved as it is today:
broker / sales manager / salesperson.

---

### M3.4 Evaluate commission tranches

A **system-only** process: no person acts. It runs whenever something that can move a commission happens.

**Pool:** Commission Tranche Evaluation · **Lanes:** System

| #   | Lane   | Element           | Label                                                         | Next              |
| --- | ------ | ----------------- | ------------------------------------------------------------- | ----------------- |
| S   | System | Start event       | Payment confirmed, document decided, or transmittal confirmed | 1                 |
| 1   | System | Service task      | Load the client's payments, checklist and tranches            | G1                |
| G1  | System | Exclusive gateway | Does the tranche already have a voucher?                      | Yes → E1 · No → 2 |
| E1  | System | End event         | Tranche unchanged                                             | —                 |
| 2   | System | Service task      | Check the payment milestone                                   | G2                |
| G2  | System | Exclusive gateway | Is the payment milestone reached?                             | No → 3 · Yes → 4  |
| 3   | System | Service task      | Set Waiting for payment                                       | 9                 |
| 4   | System | Service task      | Check the required documents                                  | G3                |
| G3  | System | Exclusive gateway | Are the required documents verified or waived?                | No → 5 · Yes → G4 |
| 5   | System | Service task      | Set Blocked (documents missing)                               | 9                 |
| G4  | System | Exclusive gateway | Is a developer transmittal still needed?                      | Yes → 6 · No → 7  |
| 6   | System | Service task      | Set Awaiting transmittal and start aging                      | 9                 |
| 7   | System | Service task      | Set Ready for voucher                                         | 9                 |
| 9   | System | Service task      | Record any status change in the audit log                     | E2                |
| E2  | System | End event         | Tranche evaluated                                             | —                 |

**The two gates:** a tranche moves forward only when **gate 1** (the payment milestone, G2) **and**
**gate 2** (the documents, G3) are both passed. "Paid, but documents missing" = **Blocked**.

**Payment milestones (G2):**

| Milestone              | Reached when                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Full payment           | Confirmed payments reach the contract price                                         |
| % of price paid        | Confirmed payments reach that % of the contract price (e.g. in-house: 50%)          |
| % of downpayment paid  | Reservation + downpayments reach that % of the required downpayment (e.g. 30%, 60%) |
| Downpayment fully paid | Reservation + downpayments reach the required downpayment                           |
| Loan released          | A loan-release payment is confirmed                                                 |
| Monthly (Futura)       | One tranche per month with confirmed payments                                       |

**Statuses only move forward**, with one exception: if a verified document is later rejected, a
tranche without a voucher goes back to **Blocked**. Tranches with a voucher never move back (G1).

---

### M3.5 Prepare and sign the commission voucher

**Pool:** Commission Voucher and E-Signature · **Lanes:** Broker, System, Payee (Sales Manager / Salesperson)

| #   | Lane   | Element           | Label                                                                     | Next               |
| --- | ------ | ----------------- | ------------------------------------------------------------------------- | ------------------ |
| S   | Broker | Start event       | Tranche is ready for a voucher                                            | 1                  |
| 1   | Broker | User task         | Add extra deductions if any, and prepare the voucher                      | 2                  |
| 2   | System | Service task      | Compute each share, withholding tax and net; fingerprint the voucher      | G1                 |
| G1  | Broker | Exclusive gateway | Is the voucher correct?                                                   | No → 3 · Yes → 5   |
| 3   | Broker | User task         | Change the deductions                                                     | 4                  |
| 4   | System | Service task      | Recompute the voucher and clear all signatures                            | G1                 |
| 5   | Broker | User task         | Type full name and sign                                                   | 6                  |
| 6   | System | Service task      | Validate and record the signature (time, IP address, device, fingerprint) | G2                 |
| G2  | System | Exclusive gateway | Is the signature valid?                                                   | No → 7 · Yes → 8   |
| 7   | System | Service task      | Display error message                                                     | 5                  |
| 8   | Payee  | User task         | Type full name and sign                                                   | 9                  |
| 9   | System | Service task      | Validate and record the signature                                         | G3                 |
| G3  | System | Exclusive gateway | Is the signature valid?                                                   | No → 10 · Yes → G4 |
| 10  | System | Service task      | Display error message                                                     | 8                  |
| G4  | System | Exclusive gateway | Have all payees signed?                                                   | No → 8 · Yes → 11  |
| 11  | System | Service task      | Mark the tranche Released and record in the audit log                     | E                  |
| E   | Payee  | End event         | Commission released (paid out outside TrustListo)                         | —                  |

**Rules:**

- **The broker signs first.** A payee can't sign before the broker (checked in step 9).
- A signature is valid only if the typed name matches the signed-in person's full name, and the
  voucher hasn't changed since it was prepared.
- **Any change after signing clears every signature** (step 4), so everyone signs the final version.
- **No money moves in TrustListo.** "Released" records that the payout happens outside the system.
- Withholding tax is the firm's rate (placeholder 5%), applied to each share automatically.

---

### M3.6 Close the sale

**Pool:** Closing and Transfer · **Lanes:** Consultant, System

| #   | Lane       | Element           | Label                                                                 | Next             |
| --- | ---------- | ----------------- | --------------------------------------------------------------------- | ---------------- |
| S   | Consultant | Start event       | Property is ready to transfer                                         | 1                |
| 1   | Consultant | User task         | Start closing; enter selling price, tax base and registration fee     | 2                |
| 2   | System     | Service task      | Compute the estimated transfer taxes with the firm's rates            | 3                |
| 3   | System     | Service task      | Save the estimate, set the client In closing, record in the audit log | 4                |
| 4   | Consultant | Manual task       | Complete the next transfer step                                       | 5                |
| 5   | Consultant | User task         | Tick the step on the closing checklist                                | 6                |
| 6   | System     | Service task      | Record who ticked it and when                                         | G1               |
| G1  | System     | Exclusive gateway | Are all seven steps done?                                             | No → 4 · Yes → 7 |
| 7   | Consultant | User task         | Confirm completing the sale                                           | 8                |
| 8   | System     | Service task      | Mark the client Completed and record in the audit log                 | 9                |
| 9   | System     | Service task      | Create a one-time rating link                                         | 10               |
| 10  | Consultant | User task         | Copy the link and send it to the buyer                                | E                |
| E   | Consultant | End event         | Sale completed (continue with M3.7)                                   | —                |

**Step 2 taxes:** capital gains tax 6% (usually the seller), documentary stamp tax 1.5% and local
transfer tax 0.5% (usually the buyer), plus the registration fee typed in. The base is the selling
price unless a higher tax base (zonal or assessed value) is entered. It's an **estimate** to check
with the BIR and the city.

**The seven transfer steps:** deed of sale signed · CGT and DST paid · tax clearance (eCAR) obtained ·
local transfer tax paid · title transferred · new tax declaration issued · keys turned over.

**Rating link (step 9):** stored only as a fingerprint (hash), works once, expires in 30 days.
If the buyer loses it, the consultant or company admin can create a new one; the old link stops working.

---

### M3.7 Rate the agent

**Pool:** Agent Rating · **Lanes:** Buyer (public), System

| #   | Lane   | Element           | Label                                                        | Next             |
| --- | ------ | ----------------- | ------------------------------------------------------------ | ---------------- |
| S   | Buyer  | Start event       | Buyer opens the rating link                                  | 1                |
| 1   | System | Service task      | Check the rating link                                        | G1               |
| G1  | System | Exclusive gateway | Is the link valid?                                           | No → 2 · Yes → 3 |
| 2   | System | Service task      | Display "link invalid, already used, or expired"             | E1               |
| E1  | Buyer  | End event         | No rating given                                              | —                |
| 3   | System | Service task      | Display the rating form (agent and property)                 | 4                |
| 4   | Buyer  | User task         | Choose 1–5 stars, add an optional comment, give consent      | 5                |
| 5   | System | Service task      | Validate the rating                                          | G2               |
| G2  | System | Exclusive gateway | Is the rating valid?                                         | No → 6 · Yes → 7 |
| 6   | System | Service task      | Display error message                                        | 4                |
| 7   | System | Service task      | Save the rating, mark the link used, record in the audit log | 8                |
| 8   | System | Service task      | Display thank-you message                                    | E2               |
| E2  | Buyer  | End event         | Rating saved                                                 | —                |

**Notes:** one rating per completed sale. The agent's profile and the consultant picker show the
average (1 decimal) and the number of ratings; with no ratings, "New".

---

## Checklist before you submit each diagram

- [ ] One pool, named after the process; one lane per actor plus **System**.
- [ ] One start event (thin circle); every path ends at an end event (thick circle).
- [ ] Person icon for user tasks, gear for service tasks, hand for manual tasks.
- [ ] Every gateway has a question; every arrow out of it has an answer.
- [ ] No two different steps share the same name.
- [ ] Error paths go to "Display error message", then back to the step the user must redo.
- [ ] Reused processes appear as call activities (thick border), e.g. "Read document (M1.1)".
- [ ] Labels match the actual system (copy them from this guide).
