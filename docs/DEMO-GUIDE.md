# TrustListo demo guide

For the initial defense: how to set up a clean demo, walk one deal through the whole system,
and explain each module. Setup is in the [README](../README.md).

- **Password for every account:** `Password123!`
- **Website:** <http://localhost:5173> (the office sign-in is **Firm sign-in**, top right)
- **Files to upload:** the `demo-kit/` folder (`pnpm --filter api demo:kit`). File names start
  with the step number they belong to.

---

## 1. Start clean

```bash
pnpm db:reset:starter
pnpm --filter api demo:kit
pnpm dev
```

This leaves only what the app can't create by itself:

| Account                      | Who                                           | Firm               |
| ---------------------------- | --------------------------------------------- | ------------------ |
| `superadmin@trustlisto.test` | Platform admin (sees firms, never their data) | —                  |
| `admin@advench.test`         | Andrea Villanueva, company admin              | Advench Realty     |
| `broker1@advench.test`       | Bernardo Reyes, licensed broker               | Advench Realty     |
| `admin@bicolprime.test`      | Teresa Lim, company admin                     | Bicol Prime Realty |
| `broker@bicolprime.test`     | Gilbert Fernandez, licensed broker            | Bicol Prime Realty |

Each firm also starts with placeholder commission settings (split 20/20/60, 5% gross, 5%
withholding). Everything else you create during the demo.

> Why not completely empty? Creating a firm from the SuperAdmin screen isn't built yet
> (SPEC §13 `POST /admin/firms`). Say so if asked: firms are onboarded by the platform team.

**Rehearse once, then reset before the real run** so the panel sees a clean system.

---

## 2. The demo, in order

The system has three modules, and one deal passes through all of them. Each presenter drives
their own part; the deal carries over from one part to the next. Sign out between roles
(avatar, bottom left), or use a second browser / private window for a second account.

Tip: every office page has an **Overview** with a **Do next** list. If you lose your place,
open Overview — it shows the next step for whoever is signed in.

### Part A — Setting up the firm (Module 2: people and listings)

| #   | Sign in as             | Do this                                                                                                                                                                                                                                                              | Kit file  |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| A1  | `admin@advench.test`   | **Team → Add consultant.** Add **Marco Dela Cruz**, Sales manager, email `sm1@advench.test`. Copy the temporary password shown.                                                                                                                                      | —         |
| A2  | same                   | Open Marco → **Upload their credential** → DHSUD registration, **Number on the document** `DHSUD-R5-1001`.                                                                                                                                                           | `01b`     |
| A3  | same                   | Add **Joy Ocampo**, Salesperson, under Marco, email `sp1@advench.test`; upload her credential, number `DHSUD-R5-2001`.                                                                                                                                               | `01a`     |
| A4  | same                   | _(Optional, shows a flag)_ Add **Kris Navarro**, Salesperson; upload `01d`, number `DHSUD-R5-2005`.                                                                                                                                                                  | `01d`     |
| A5  | `broker1@advench.test` | **Review queue** → open each credential → **Approve** (enter the expiry date). Kris's is flagged: the certificate says _Kristine_ → **Reject** with a reason.                                                                                                        | —         |
| A6  | `admin@advench.test`   | **Listings → Developers and projects → Add developer** `Vista Land (Camella)` (it gets default commission milestones automatically). Then **Add project** `Camella Naga`, location `Del Rosario, Naga City`.                                                         | —         |
| A7  | same                   | On the project, **Upload license to sell**. _(Optional, shows a flag: upload the expired `02b` first. It's flagged and can't be approved; the broker **Rejects** it in A8, and only then can you upload `02a` — one license waits for a decision at a time.)_        | `02a`     |
| A8  | `broker1@advench.test` | Review queue → the License to Sell → **Approve**.                                                                                                                                                                                                                    | —         |
| A9  | `admin@advench.test`   | **Listings → Add unit**: project Camella Naga, name `Ella Model`, House and lot, price **2,150,000**, lot 88 sq m, floor 45, 2 bed, 1 bath, barangay Del Rosario. **Save and continue**, add a photo and a Pag-IBIG payment option, then **Publish to marketplace**. | any photo |

> New consultants sign in with the **temporary password** shown when you create them (copy it
> then; it isn't shown again). They can change it later under **Account**. Write each one down
> during the rehearsal.

### Part B — The buyer and the sale (Modules 2 and 3)

| #   | Sign in as               | Do this                                                                                                                                                                                                                                                     | Kit file     |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| B1  | _(not signed in)_        | **Browse homes**: the Ella Model appears with the **gold License-to-Sell badge**. Filter by badge, open it, try the **loan calculator**.                                                                                                                    | —            |
| B2  | _(not signed in)_        | Open the Ella Model listing and add `?ref=` plus Joy's referral code to the address (the code is on Joy's Overview, e.g. `?ref=JOCAMPO`). Inquire as **Rosa Mendiola**, `09171112233`, OFW, Pag-IBIG, married, tick consent. The lead goes straight to Joy. | —            |
| B3  | `sp1@advench.test` (Joy) | Overview → **Do next: Call Rosa Mendiola** → **I've talked to them** → **Pick a time** → request a visit.                                                                                                                                                   | —            |
| B4  | `admin@advench.test`     | Overview → **Approve or decline a visit** → Visits → **Approve**.                                                                                                                                                                                           | —            |
| B5  | Joy                      | Rosa's lead → **The buyer reserved** → upload the receipt; the AI fills in ₱20,000 → confirm. Contract price **2,150,000**, downpayment **215,000**, Pag-IBIG, married, OFW → convert. The checklist appears.                                               | `06a`        |
| B6  | Joy                      | Client page → Payments: **Downpayment**, upload; confirm ₱45,000 → **Open the commission**: Tranche 1 shows **Documents missing** (paid, but documents not verified yet).                                                                                   | `06b`        |
| B7  | Joy                      | Checklist: Valid ID (1st) ← `07a`; Valid ID (2nd) ← `07b` → **flagged: name doesn't match**.                                                                                                                                                                | `07a`, `07b` |
| B8  | `broker1`                | Review queue → the flagged ID → **Reject** ("not the buyer's ID"); the clean ID → **Approve**.                                                                                                                                                              | —            |
| B9  | Joy                      | Valid ID (2nd) ← `07c` (her driver's license).                                                                                                                                                                                                              | `07c`        |
| B10 | `broker1`                | Approve it. Tranche 1 → **Waiting for transmittal**.                                                                                                                                                                                                        | —            |
| B11 | `admin@advench.test`     | Overview → **Upload the developer's transmittal** → file → the AI reads ₱32,250 → **Confirm amount**. Tranche 1 → **Ready for voucher**.                                                                                                                    | `08`         |
| B12 | `broker1`                | Commissions → Rosa → **Prepare voucher** (5% withholding is automatic) → sign as **Bernardo Reyes**.                                                                                                                                                        | —            |
| B13 | Marco (`sm1`), then Joy  | Overview → **Sign the voucher** → type full name. After the last signature: **Released**.                                                                                                                                                                   | —            |
| B14 | Joy                      | Rosa's client page → **Start closing** → save the estimate → tick the 7 transfer steps → **Complete the sale** → copy the **rating link**.                                                                                                                  | —            |
| B15 | _(not signed in)_        | Open the rating link → 5 stars → **Send rating**. Joy's profile shows the rating.                                                                                                                                                                           | —            |

### Part C — A private seller, a second firm, and isolation (Modules 1 and 2)

| #   | Sign in as                   | Do this                                                                                                                                                                                       | Kit file    |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| C1  | `admin@bicolprime.test`      | Add a sales manager first (every salesperson reports to one), e.g. **Diana Castillo**. Then add **Rico Salazar**, Salesperson under Diana, and upload his credential, number `DHSUD-R5-3002`. | `01c`       |
| C2  | `broker@bicolprime.test`     | Approve Rico's credential (now he appears in the public agent picker).                                                                                                                        | —           |
| C3  | _(not signed in)_            | **List your property** as **Teodoro Lagman**, lot in Triangulo, 240 sq m, has a title, consent → pick **Rico Salazar (Bicol Prime)**.                                                         | any photo   |
| C4  | Rico                         | Overview → **Reply to Teodoro Lagman's listing request** → **Accept request** → upload title, tax declaration, tax receipt, seller ID → **Send to broker**.                                   | `09a`–`09d` |
| C5  | `broker@bicolprime.test`     | Review queue → **Listings waiting to go live** → approve each document → approve the listing. It goes live with its badges.                                                                   | —           |
| C6  | `admin@bicolprime.test`      | Show Clients and Commissions: **nothing from Advench** (rule 4).                                                                                                                              | —           |
| C7  | `superadmin@trustlisto.test` | Sees both firms and their counts, never their clients or documents (rule 5).                                                                                                                  | —           |

---

## 3. What each module is, and what to say

Each presenter: open with what problem the module solves, show it in the demo above, then
name the rules it enforces. The rule numbers are SPEC §2.

### Module 1 — AI document processing and verification (SPEC §8)

**What it does.** Every uploaded document — licenses, Licenses to Sell, seller documents,
buyer IDs, receipts, transmittals — is read automatically: OCR (Tesseract), then the type is
classified, fields are extracted, and cross-checks run (name matches the person, dates not
expired, amounts match). The result is a set of **flags** for a person to decide on.

**Show:** A5 (Kristine vs Kris → `NAME_MISMATCH`), A7 (expired License to Sell →
`LTS_EXPIRED`), B5/B6 (receipt amount read and pre-filled), B7 (someone else's ID →
`NAME_MISMATCH`), B11 (transmittal amount checked against the tranche), C4–C5 (title,
tax declaration and receipt cross-checked against each other and the seller).

**Say:**

- **The AI only flags; only a licensed broker approves** (rule 1). There is no code path where
  the AI approves anything — a test checks this.
- Every broker decision is in the activity log, with who and when (rule 11).
- A failed read never blocks the work: the broker can still review manually.
- It runs offline on the server; documents are private and opened through short-lived links.
- Accuracy is measured on a labelled sample set: `pnpm --filter api docai:eval` (Chapter 4).

**Code:** `apps/api/src/modules/docai/` (pipeline, OCR, classify, extractors, checks) and
`apps/api/src/modules/reviews/` (the broker's review queue).

### Module 2 — Marketplace and property management (SPEC §7)

**What it does.** One public marketplace for all firms: search, map, filters, badges, loan
calculator. Firms manage developers, projects, units and photos; private sellers list through
an agent. Buyers inquire without an account and are routed to a consultant.

**Show:** A6–A9 (catalog and License to Sell → badge), B1 (marketplace, map, calculator), B2
(referral link auto-assigns Joy), C3–C5 (seller listing goes live with badges).

**Say:**

- Buyers and sellers never log in (rule 6); every public form asks for consent (Data Privacy Act).
- The consultant picker is **randomized on the server** — no featured agents (rule 7), and only
  consultants with a broker-approved license appear.
- **No co-broke:** an inquiry goes only to the listing firm's consultants (rule 8).
- A gold badge always means a licensed broker checked a document; nothing else is gold.
- A unit can't go live without an approved License to Sell; a seller's lot can't go live
  without a verified title.

**Code:** `apps/api/src/modules/marketplace/`, `properties/`, `sellers/`, `leads/`;
public pages in `apps/web/src/routes/public/`.

### Module 3 — Sales, clients and commissions (SPEC §10–§12)

**What it does.** Leads become clients when they reserve. Each client gets a requirements
checklist built from how they pay and their civil status. Commissions are split by who
handled the client and paid in tranches through two gates; vouchers are signed electronically.
Closing estimates transfer taxes; the buyer rates the agent through a one-time link.

**Show:** B3–B4 (lead → visit; the admin approves visits, rule 10), B5 (checklist generated for
Pag-IBIG / married / OFW), B6 (**BLOCKED**: paid, documents missing), B10 (**AWAITING
TRANSMITTAL** once verified), B11–B13 (transmittal → voucher → signatures → **RELEASED**),
B14–B15 (closing and rating), Reports page.

**Say:**

- **The two gates** (rule 9): a tranche moves only when the payment milestone is reached
  **and** the documents are verified. Paid but no documents → BLOCKED.
- **The voucher goes through the broker first** (rule 3): the broker signs before any payee.
  Any change after signing clears every signature (the content is fingerprinted).
- **No money moves in the system** (rule 2): "Released" records a payout made outside.
- Every firm's data is separate; every query is scoped to the firm (rule 4).
- Commission amounts are in centavos with tested rounding; the four scenarios in SPEC §15
  are automated tests.

**Code:** `apps/api/src/modules/clients/`, `commissions/` (`engine.ts` is the pure math),
`closing/`, `ratings/`, `reports/`.

---

## 4. Documents for the AI demo

Use **mock documents only** — never a real ID, title or receipt (SPEC §14, §17; Data Privacy
Act). The best way to show the AI:

1. **Print a few kit files and photograph them with a phone during the demo.** Uploading a phone
   photo of paper shows the real use case (consultants photograph documents in the field), and
   the AI reads photos too. Good choices: `07b` (wrong ID → flag), `08` (transmittal amount),
   `09a` (land title).
2. **Use the kit files directly** for everything else — they're generated so names and amounts
   match the demo, so each step works the first time.
3. **Show one problem per document type** — the panel remembers flags more than clean reads:
   expired license (`02b`), wrong name (`01d`, `07b`), duplicate receipt (upload `06b` a second
   time as another payment → `DUPLICATE_RECEIPT`).
4. **Have the accuracy numbers ready** (`docai:eval` results in
   `apps/api/src/modules/docai/eval/results.md`) for "how accurate is it?".

Want different names or amounts? Edit `apps/api/prisma/seed-docs/demo-kit.ts` and run
`pnpm --filter api demo:kit` again.

---

## 5. Questions the panel may ask

| Question                                   | Short answer                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| What if the AI is wrong?                   | It never decides. It flags; the broker approves or rejects, and can correct a misread field. |
| Can a firm see another firm's clients?     | No. Every query is scoped by firm; tests check every resource type returns 404.              |
| Why can't the buyer pick the "best" agent? | Rule 7: the order is random on each load, so no agent is favoured.                           |
| Where does the money go?                   | Nowhere in the system. Payouts happen outside; the signed voucher is the record.             |
| Are the commission rates real?             | Placeholders until Advench confirms them (OPEN-5, OPEN-8); the admin edits them in Settings. |
| Does it work without internet?             | Yes for document reading: the OCR model is bundled.                                          |
| How do you know it works?                  | 134 automated tests, including one that runs the whole demo deal through the API.            |
