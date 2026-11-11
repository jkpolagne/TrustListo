# TrustListo defense: run of show

Three presenters, one deal passing through all three modules. Setup on a new computer is in
the [README](../README.md).

- **Password for every account:** `Password123!`
- **Website:** <http://localhost:5173> — staff sign in through **Firm sign-in** (top right)
- **Files to upload:** the `demo-kit/` folder (`pnpm --filter api demo:kit`)

---

## The order, and why

| Order | Module                               | Presenter | Time   | What the panel sees                                                                                                 |
| ----- | ------------------------------------ | --------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| 1st   | **Module 1 — AI documents**          |           | 8 min  | Licenses and a License to Sell are read by the AI, flagged, and decided by the broker                               |
| 2nd   | **Module 2 — Marketplace**           |           | 10 min | The verified unit goes live, a buyer inquires through a referral, a private seller lists through another firm       |
| 3rd   | **Module 3 — Sales and commissions** |           | 12 min | The buyer becomes a client, documents and payments unlock the commission, it's signed and released, the sale closes |

**Module 1 goes first because everything else depends on it.** A consultant can't appear in the
agent picker, and a unit can't go live, until the broker has verified their documents. Each
presenter hands the next one something real: verified people and project → a live listing and
a lead → a released commission.

Fill in the Presenter column. Times are a guide; trim the optional steps if you're short.

---

## Before the defense (do this together)

### The day before: rehearse once, end to end, then reset.

### 30 minutes before: prepare the stage

**1. Reset and start**

```bash
pnpm db:reset:starter
pnpm --filter api demo:kit
pnpm dev
```

**2. Off-stage setup (about 5 minutes).** Things the panel doesn't need to watch:

| Sign in as               | Do this                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin@advench.test`     | **Team → Add consultant:** Marco Dela Cruz, _Sales manager_, `sm1@advench.test` (under broker Bernardo Reyes).                                                                                                      |
| same                     | Add **Joy Ocampo**, _Salesperson_, `sp1@advench.test`, under Marco. Add **Kris Navarro**, _Salesperson_, `sp2@advench.test`, under Marco.                                                                           |
| same                     | **Listings → Developers and projects → Add developer** `Vista Land (Camella)`. **Add project** `Camella Naga`, location `Del Rosario, Naga City`. Do **not** upload the license yet.                                |
| `admin@bicolprime.test`  | Add **Diana Castillo**, _Sales manager_, `sm@bicolprime.test`. Add **Rico Salazar**, _Salesperson_ under Diana, `sp1@bicolprime.test`. Open Rico → **Upload their credential**, number `DHSUD-R5-3002`, file `01c`. |
| `broker@bicolprime.test` | **Review queue** → Rico's credential → **Valid until** from the document → **Approve credential**.                                                                                                                  |

Each new consultant gets a **temporary password** when created. Sign in once as Joy, Marco
and Rico and change it to `Password123!` under **Account**, so everyone uses the same password.

**3. Open four browser windows** so nobody has to sign out on stage:

| Window                                    | Signed in as                                  |
| ----------------------------------------- | --------------------------------------------- |
| **A** — Chrome                            | `admin@advench.test` (company admin)          |
| **B** — Edge                              | `broker1@advench.test` (broker)               |
| **C** — Chrome, second profile or Firefox | `sp1@advench.test` (Joy)                      |
| **D** — Private/incognito window          | nobody: the public website (buyer and seller) |

**4. Print** `07b-WRONG-id-someone-else.png` and `01a-dhsud-JOY-OCAMPO-…png` on paper, and keep a
phone ready to photograph them (see "Make the AI convincing" at the end).

**Backup:** a second laptop with full demo data (`pnpm db:reset`), in case something breaks.

---

## Presenter 1 — Module 1: AI document processing and verification

**Opening (say):** "Real-estate fraud starts with documents: fake licenses, expired permits,
someone else's ID. Module 1 reads every uploaded document automatically and flags problems,
but the AI never decides. Only a licensed broker approves."

| #   | Window     | Do this                                                                                                                                                                                                                            | Say                                                                                                                                                  |
| --- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | A (admin)  | **Team → Joy Ocampo → Upload their credential**, type _DHSUD registration_, **Number on the document** `DHSUD-R5-2001`, upload `01a` (or the phone photo of the printed copy). Do the same for Marco: `DHSUD-R5-1001`, file `01b`. | "The admin uploads the consultant's license. The AI starts reading it right away."                                                                   |
| 1.2 | A          | Kris Navarro → upload `01d`, number `DHSUD-R5-2005`.                                                                                                                                                                               | "This one is wrong on purpose: the certificate belongs to a _Kristine_ Navarro."                                                                     |
| 1.3 | B (broker) | **Review queue → Joy's credential.** Point at what the AI read: name, number, expiry, its confidence, the document beside it. Enter **Valid until** → **Approve credential**. Approve Marco's the same way.                        | "The AI extracted the fields and checked them against what the admin typed. Only now, with the broker's approval, does Joy become a verified agent." |
| 1.4 | B          | Open Kris's credential: flagged **name doesn't match**. **Decision: Reject** with a reason.                                                                                                                                        | "The AI caught the mismatch. The broker decides; here, reject."                                                                                      |
| 1.5 | A          | **Listings → Developers and projects → Camella Naga → Upload license to sell** → `02b` (the expired one).                                                                                                                          | "Developers need a License to Sell from DHSUD. Watch what happens with an expired one."                                                              |
| 1.6 | B          | Review queue → the license: flagged **expired**. It can't be approved → **Reject**.                                                                                                                                                | "An expired license can't be approved at all, even by the broker."                                                                                   |
| 1.7 | A          | **Upload license to sell** → `02a` (valid).                                                                                                                                                                                        |                                                                                                                                                      |
| 1.8 | B          | Review queue → **Approve**. Back in A, the project shows **License to sell until …** in gold.                                                                                                                                      | "Gold always means one thing on TrustListo: a licensed broker checked this document."                                                                |

**Key points to say:**

- **The AI only flags; only a broker approves** (rule 1). There is no code path where the AI
  approves anything, and an automated test checks that.
- Every decision is in the **Activity log** with who and when (rule 11); show it in Window A if
  there's time.
- If the AI can't read a document, the broker still reviews it by hand: a failed read never
  blocks the work.
- It works offline; documents are private and opened through links that expire.
- Accuracy is measured on a labelled sample set (`docai:eval`, Chapter 4).

**Hand-off:** "Our consultants and the Camella project are now verified. [Presenter 2] will
put the units on the marketplace."

---

## Presenter 2 — Module 2: Marketplace and property management

**Opening:** "Module 2 is the shared marketplace: every firm's verified listings in one place,
for buyers who never need an account."

| #    | Window                                      | Do this                                                                                                                                                                                                                                                       | Say                                                                                                                   |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 2.1  | A (admin)                                   | **Listings → Add unit:** project Camella Naga, name `Ella Model`, House and lot, price **2150000**, lot 88, floor 45, 2 bed, 1 bath, barangay Del Rosario → **Save and continue**. Add a photo, a payment option (Pag-IBIG), then **Publish to marketplace**. | "A unit can only go live because Module 1 approved its License to Sell."                                              |
| 2.2  | D (public)                                  | **Browse homes:** filter by the license badge, show the **map**, open **Ella Model**. Show the badge and the **loan calculator**.                                                                                                                             | "Buyers see the badge, the price, and a loan estimate using the firm's own loan settings."                            |
| 2.3  | D                                           | Scroll to the consultants: **reload the page** and the order changes. Kris isn't there.                                                                                                                                                                       | "The order is random on every load, so no agent is favoured (rule 7). Kris was rejected in Module 1, so he's hidden." |
| 2.4  | C (Joy)                                     | Overview → **Your referral code** → copy it.                                                                                                                                                                                                                  | "Each consultant has a referral code."                                                                                |
| 2.5  | D                                           | Add `?ref=` + the code to the Ella Model address, press Enter. Inquire as **Rosa Mendiola**, `09171112233`, OFW, Pag-IBIG, married, tick consent → send.                                                                                                      | "A buyer who comes through Joy's link is assigned to Joy automatically."                                              |
| 2.6  | C                                           | Refresh Joy's Overview: **Do next → Call Rosa Mendiola**.                                                                                                                                                                                                     | "The lead reaches the right consultant immediately."                                                                  |
| 2.7  | D                                           | **List your property:** Teodoro Lagman, mobile, lot, Triangulo, Naga City, 240 sqm, price, has a title, consent → **Choose an agent: Rico Salazar (Bicol Prime Realty)** → send.                                                                              | "Private sellers list through an agent of any firm. The marketplace is shared, but each firm's data stays separate."  |
| 2.8  | B → sign in as `sp1@bicolprime.test` (Rico) | Overview → **Reply to Teodoro Lagman's listing request → Accept request.** Upload `09a` title, `09b` tax declaration, `09c` tax receipt, `09d` ID → **Send to broker**.                                                                                       | "The agent collects the seller's documents. Module 1 reads and cross-checks them: owner name, area, tax receipt."     |
| 2.9  | B → sign in as `broker@bicolprime.test`     | Review queue → **Listings waiting to go live** → approve each document → **Approve and publish**.                                                                                                                                                             |                                                                                                                       |
| 2.10 | D                                           | Browse homes: the Triangulo lot is live with its badges, next to Advench's Camella unit.                                                                                                                                                                      | "Two firms, one marketplace."                                                                                         |

Then sign Window B back in as `broker1@advench.test` for Presenter 3.

**Key points to say:**

- Buyers and sellers never log in (rule 6); every public form asks for consent (Data Privacy Act).
- **No co-broke:** an inquiry goes only to the listing firm's consultants (rule 8).
- A unit can't go live without an approved License to Sell; a seller's lot can't go live without
  a verified title.

**Hand-off:** "Rosa's inquiry is now with Joy. [Presenter 3] takes her from lead to closed sale."

---

## Presenter 3 — Module 3: Sales, clients and commissions

**Opening:** "Module 3 runs the sale after the inquiry: the visit, the client's documents and
payments, and the consultants' commission, which is released only when the money and the
documents are both in."

| #                | Window                                 | Do this                                                                                                                                                                 | Say                                                                                                                                 |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 3.1              | C (Joy)                                | **Do next → Call Rosa Mendiola** → **I've talked to them** → **Pick a time** → **Request visit**.                                                                       | "Consultants schedule visits; the admin approves them (rule 10)."                                                                   |
| 3.2              | A (admin)                              | Overview → **Approve or decline a visit** → **Approve**.                                                                                                                |                                                                                                                                     |
| 3.3              | C                                      | Rosa's lead → **The buyer reserved** → upload `06a`. The AI fills in **₱20,000**. Contract price **2150000**, downpayment **215000**, Pag-IBIG, married, OFW → convert. | "The receipt is read and the amount filled in; the consultant confirms it. Rosa is now a client."                                   |
| 3.4              | C                                      | Point at the **Requirements** checklist.                                                                                                                                | "The checklist is built from how she pays and her civil status: Pag-IBIG, married, OFW each add documents."                         |
| 3.5              | C                                      | **Payments → Downpayment** → upload `06b` → **Confirm** ₱45,000 → **Open the commission**. Tranche 1 is **Documents missing**.                                          | "She has paid enough for the first tranche, but it's blocked: her documents aren't verified yet. These are the two gates (rule 9)." |
| 3.6              | C                                      | Client page: Valid ID (1st) ← `07a`; Valid ID (2nd) ← `07b` (or the phone photo of the printed copy) → **flagged**.                                                     | "Module 1 again: this ID belongs to someone else."                                                                                  |
| 3.7              | B (broker)                             | Review queue → reject the flagged ID, approve the good one.                                                                                                             |                                                                                                                                     |
| 3.8              | C                                      | Valid ID (2nd) ← `07c`.                                                                                                                                                 |                                                                                                                                     |
| 3.9              | B                                      | Approve it. Back in C's commission: tranche 1 → **Waiting for transmittal**.                                                                                            | "Both gates are open. Now the developer has to send its transmittal."                                                               |
| 3.10             | A (admin)                              | Overview → **Upload the developer's transmittal** → `08` → the AI reads **₱32,250** → **Confirm amount**.                                                               | "The AI checks the developer's amount against what we expect."                                                                      |
| 3.11             | B                                      | **Commissions → Rosa Mendiola → Prepare voucher** → type **Bernardo Reyes** → **Sign voucher**.                                                                         | "Withholding is computed automatically. The broker signs first (rule 3)."                                                           |
| 3.12             | C as Marco (`sm1`), then Joy           | **Do next → Sign the voucher** → type the full name. After Joy: **Released**.                                                                                           | "No money moves in the system (rule 2); the signed voucher is the record. Changing it after signing clears every signature."        |
| 3.13 _(if time)_ | C (Joy)                                | Rosa's client page → **Start closing** → **Save estimate** → tick the 7 steps → **Complete the sale** → **Copy link** → open it in D → 5 stars.                         | "Closing estimates the transfer taxes; the buyer rates the agent through a one-time link."                                          |
| 3.14             | A                                      | **Reports**: the month's reservations, pipeline, team performance.                                                                                                      |                                                                                                                                     |
| 3.15             | A → sign in as `admin@bicolprime.test` | Clients and Commissions: **nothing from Advench**. Then `superadmin@trustlisto.test`: firms only.                                                                       | "Every query is scoped to the firm (rule 4); the platform admin never sees a firm's clients (rule 5)."                              |

**Key points to say:**

- **Two gates** (rule 9): a tranche moves only when the payment milestone is reached **and** the
  documents are verified.
- **Broker first** (rule 3): the broker signs before any payee; any change clears all signatures.
- **No money moves** (rule 2).
- Commission amounts are computed in centavos and covered by automated tests, including the four
  scenarios in SPEC §15.

---

## Make the AI convincing

- **Mock documents only.** Never upload a real ID, title or receipt (Data Privacy Act; SPEC §14, §17).
- **Photograph paper live, once or twice.** Print `01a` (Module 1) and `07b` (Module 3), take a
  phone photo during the demo, and upload the photo. It shows the real use case (consultants
  photograph documents in the field), and the AI reads photos too. Use the kit files for
  everything else so each step works first time.
- **Show the catches, not just clean reads.** Wrong name (`01d`, `07b`), expired license (`02b`),
  amount check (`08`). For a duplicate receipt, upload `06b` again as another payment.
- **Have the accuracy numbers ready:** `apps/api/src/modules/docai/eval/results.md`
  (`pnpm --filter api docai:eval`).

---

## If something goes wrong on stage

| Problem                             | Do this                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| A document stays "Being read"       | Wait 10 seconds; the page updates itself.                                    |
| You lose your place                 | Open **Overview**: **Do next** shows the next step for whoever is signed in. |
| Signing says the name doesn't match | Type the full name exactly as the error shows it.                            |
| Something is broken                 | Switch to the backup laptop with full demo data and keep going.              |

---

## Questions the panel may ask

| Question                                   | Short answer                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| What if the AI is wrong?                   | It never decides. It flags; the broker approves or rejects, and can correct a misread field.      |
| Can one firm see another firm's clients?   | No. Every query is scoped by firm; tests check every resource type returns 404.                   |
| Why can't the buyer pick the "best" agent? | Rule 7: the order is random on each load, so no agent is favoured.                                |
| Where does the money go?                   | Nowhere in the system. Payouts happen outside; the signed voucher is the record.                  |
| Are the commission rates real?             | Placeholders until Advench confirms them (OPEN-5, OPEN-8); the admin edits them in Settings.      |
| How does a new firm join?                  | The platform team sets up the firm and its first admin (a SuperAdmin screen for this is planned). |
| Does it work without internet?             | Yes: the OCR model is bundled with the system.                                                    |
| How do you know it works?                  | 134 automated tests, including one that runs this whole deal through the API.                     |

Code locations, for "show us the code": Module 1 `apps/api/src/modules/docai/` and `reviews/`;
Module 2 `marketplace/`, `properties/`, `sellers/`, `leads/` and `apps/web/src/routes/public/`;
Module 3 `clients/`, `commissions/` (`engine.ts` holds the math), `closing/`, `ratings/`, `reports/`.
