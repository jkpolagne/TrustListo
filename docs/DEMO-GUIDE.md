# TrustListo defense: the complete demo guide

Everything you need to demo TrustListo from a clean start, step by step. Every button name and
field label below is the exact text on the screen. The whole script was clicked through in a
browser from a fresh start before it was written down.

- **Setup on a new computer:** see the [README](../README.md).
- **Website:** <http://localhost:5173>. Staff sign in with **Firm sign-in** (top right).
- **Password for every account:** `Password123!`
- **Files to upload:** the `demo-kit` folder. Each file name starts with its module and step,
  for example `M1-1-joy-ocampo-license.png` is Module 1, step 1.

---

## Part 1. Understand the story first

### The cast

TrustListo is used by **real-estate firms**. In the demo there are two fictional firms, and the
people below work in them. **All names are made up.** Some accounts already exist when you start;
the rest you create during preparation, exactly like a real firm adding its staff.

**Advench Realty** (the main firm)

| Person            | Role in the firm                                                          | Login                  | Exists at start? |
| ----------------- | ------------------------------------------------------------------------- | ---------------------- | ---------------- |
| Andrea Villanueva | **Company admin.** Runs the office: adds staff, listings, approves visits | `admin@advench.test`   | Yes              |
| Bernardo Reyes    | **Broker.** The licensed professional: approves documents, signs vouchers | `broker1@advench.test` | Yes              |
| Marco Dela Cruz   | **Sales manager.** Leads a team of salespeople                            | `sm1@advench.test`     | No: you add him  |
| Joy Ocampo        | **Salesperson** under Marco. Handles the buyer                            | `sp1@advench.test`     | No: you add her  |
| Kris Navarro      | **Salesperson** under Marco. His license will be wrong on purpose         | `sp2@advench.test`     | No: you add him  |

**Bicol Prime Realty** (a second firm, to show the shared marketplace and data separation)

| Person            | Role                    | Login                    | Exists at start? |
| ----------------- | ----------------------- | ------------------------ | ---------------- |
| Teresa Lim        | Company admin           | `admin@bicolprime.test`  | Yes              |
| Gilbert Fernandez | Broker                  | `broker@bicolprime.test` | Yes              |
| Diana Castillo    | Sales manager           | `sm@bicolprime.test`     | No: you add her  |
| Rico Salazar      | Salesperson under Diana | `sp1@bicolprime.test`    | No: you add him  |

**The public** (no account, never signs in)

| Person         | Who                                                    | What they do                                              |
| -------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Rosa Mendiola  | A **buyer**, OFW, married, paying with a Pag-IBIG loan | Inquires about a house, reserves it, rates Joy at the end |
| Teodoro Lagman | A **private seller** with a lot in Triangulo           | Lists his lot through Rico                                |

**The platform:** `superadmin@trustlisto.test` runs TrustListo itself. It sees the firms, never
their clients or documents.

### The story in one paragraph

Advench Realty sells **Camella Naga – Ella Model**, a ₱2,150,000 house. Before anything can be
sold, the AI reads the staff's licenses and the project's **License to Sell**, and the broker
approves them (**Module 1**). Then the house goes on the public marketplace, and Rosa finds it
through Joy's referral link. Meanwhile a private seller lists his lot through another firm
(**Module 2**). Joy turns Rosa into a client, Rosa pays, her documents are checked, and the
commission for Joy, Marco and the broker is released after everyone signs (**Module 3**).

### Who presents what, and in what order

| Order   | Module                                        | Time    | Hands the next presenter                           |
| ------- | --------------------------------------------- | ------- | -------------------------------------------------- |
| **1st** | Module 1: AI document processing              | ~8 min  | Verified staff and a verified project              |
| **2nd** | Module 2: Marketplace and property management | ~10 min | A live listing, and Rosa's inquiry waiting for Joy |
| **3rd** | Module 3: Sales, clients and commissions      | ~12 min | A released commission and a closed sale            |

Module 1 goes first because nothing else can happen until documents are verified: an agent
without a verified license is hidden from buyers, and a house can't be published without a
verified License to Sell.

---

## Part 2. Before the defense

### The day before

Do one full rehearsal following this guide, then reset (next section) so the real demo starts clean.

### 45 minutes before: reset and start

Open a terminal in the project folder and run, one at a time:

```bash
pnpm db:reset:starter
pnpm --filter api demo:kit
pnpm dev
```

- `db:reset:starter` **erases** the database and leaves only the accounts marked "Yes" above.
  It ends with `Starter setup: 2 firms, 5 users…`.
- `demo:kit` creates the `demo-kit` folder.
- `pnpm dev` starts the system. Leave this terminal open; closing it stops TrustListo.
  It's ready when you see `API listening on http://localhost:4000` and `Local: http://localhost:5173/`.

### Preparation on stage-left (about 10 minutes, not shown to the panel)

Do these steps in a normal browser window. They set up the staff and the project.

**P1. Sign in as the Advench admin**

1. Go to <http://localhost:5173> → **Firm sign-in**.
2. **Email** `admin@advench.test`, **Password** `Password123!` → **Sign in**.

**P2. Add Marco (sales manager)**

1. Left menu → **Team** → **Add consultant**.
2. **Role:** click **Sales manager**.
3. **Reports to (broker):** choose **Bernardo Reyes**.
4. **First name** `Marco`, **Last name** `Dela Cruz`, **Email** `sm1@advench.test`.
5. Click **Add consultant**.
6. The next page shows a **Temporary password**. **Write it down** next to Marco's name; it isn't shown again.
7. Click **Add another**.

**P3. Add Joy and Kris (salespeople)**

Same form, with **Role: Salesperson** and **Reports to (sales manager): Marco Dela Cruz**:

| First name | Last name | Email              |
| ---------- | --------- | ------------------ |
| Joy        | Ocampo    | `sp1@advench.test` |
| Kris       | Navarro   | `sp2@advench.test` |

Write down each temporary password.

**P4. Add the developer and the project**

1. Left menu → **Listings** → **Developers and projects** (button, top right).
2. Card **Add a developer:** **Name** `Vista Land (Camella)` → **Add developer**.
3. Card **Add a project:**
   - **Developer:** choose **Vista Land (Camella)**
   - **Project name:** `Camella Naga`
   - **Location:** `Del Rosario, Naga City`
   - **Map pin:** click once on the map, anywhere around Naga City
4. Click **Add project**. The project appears with a grey **No approved license to sell** badge.
   **Don't upload the license yet**: that's Module 1's job.

**P5. Set up the second firm**

1. Sign out (the arrow icon next to your name, bottom left).
2. Sign in as `admin@bicolprime.test`.
3. **Team → Add consultant:** **Sales manager**, reports to **Gilbert Fernandez**, `Diana` `Castillo`, `sm@bicolprime.test` → **Add consultant** → write down the password → **Add another**.
4. **Salesperson**, reports to **Diana Castillo**, `Rico` `Salazar`, `sp1@bicolprime.test` → **Add consultant** → write down the password.
5. Click **Upload their credential**. On Rico's page, card **Upload a credential:**
   - **Type:** DHSUD registration
   - **Number on the document:** `DHSUD-R5-3002`
   - **Scan or photo:** choose `PREP-rico-salazar-license.png`
   - **Upload credential**
6. Sign out. Sign in as `broker@bicolprime.test`.
7. **Review queue** → under **Consultant credentials**, click **Rico Salazar**. Wait a few seconds until the AI has read it.
8. **Valid until** is already filled in from the document. Click **Approve credential**.

**P6. Give the new staff the demo password**

For each of **Marco** (`sm1@advench.test`), **Joy** (`sp1@advench.test`) and **Rico** (`sp1@bicolprime.test`):

1. Sign out, then sign in with their email and the **temporary password** you wrote down.
2. Left menu → **Account**.
3. **Current password:** the temporary one. **New password:** `Password123!` → **Change password**.

Now everyone uses `Password123!`.

### Open four windows for the demo

Using separate browsers keeps everyone signed in, so nobody signs out in front of the panel:

| Window | Browser                            | Sign in as                                | Used by         |
| ------ | ---------------------------------- | ----------------------------------------- | --------------- |
| **A**  | Chrome                             | `admin@advench.test` (Andrea, admin)      | Modules 1, 2, 3 |
| **B**  | Edge                               | `broker1@advench.test` (Bernardo, broker) | Modules 1, 3    |
| **C**  | Chrome _Guest_ profile, or Firefox | `sp1@advench.test` (Joy)                  | Modules 2, 3    |
| **D**  | A private/incognito window         | **nobody**: the public site               | Modules 2, 3    |

Open the `demo-kit` folder in File Explorer so files are easy to find.

> Two Chrome windows normally share one sign-in. For window C, use a different browser
> (Firefox), or in Chrome click your profile icon → **Guest**.

**Optional, makes the AI more convincing:** print `M1-1-joy-ocampo-license.png` and
`M3-4-WRONG-buyer-id.png`. During the demo, photograph the paper with a phone, send the photo to
the laptop, and upload the photo instead of the file.

---

## Part 3. The demo

The **Say** column holds suggested sentences. Put them in your own words.

### Presenter 1: Module 1, AI document processing and verification (~8 min)

**Open with:** "Fraud in real estate starts with documents: fake licenses, expired permits,
someone else's ID. Module 1 reads every uploaded document automatically and flags problems. But
the AI never approves anything. Only a licensed broker does."

| #    | Window | Do exactly this                                                                                                                                                                                                                       | You should see                                                                                                                       | Say                                                                                                               |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1.1  | A      | **Team** → click **Joy Ocampo**. Card **Upload a credential:** **Type** DHSUD registration, **Number on the document** `DHSUD-R5-2001`, **Scan or photo** `M1-1-joy-ocampo-license.png` (or the phone photo) → **Upload credential**. | "Uploaded. It will appear in the broker's queue shortly."                                                                            | "The admin uploads Joy's real-estate license. The AI starts reading it immediately."                              |
| 1.2  | A      | **Team** → **Marco Dela Cruz** → same, number `DHSUD-R5-1001`, file `M1-2-marco-dela-cruz-license.png` → **Upload credential**.                                                                                                       | Same message.                                                                                                                        |                                                                                                                   |
| 1.3  | A      | **Team** → **Kris Navarro** → number `DHSUD-R5-2005`, file `M1-3-WRONG-kris-navarro-license.png` → **Upload credential**.                                                                                                             | Same message.                                                                                                                        | "This one is wrong on purpose. Watch what the AI does with it."                                                   |
| 1.4  | B      | **Review queue** → **Consultant credentials** → click **Joy Ocampo**.                                                                                                                                                                 | The license on the left, **Text the AI read**, and on the right **What the AI read**: name, number, valid until, each with "% sure". | "The AI read the name, the registration number and the expiry date, and compared them with what the admin typed." |
| 1.5  | B      | **Valid until** is filled in. Click **Approve credential**.                                                                                                                                                                           | Back on the Review queue; Joy is gone from it.                                                                                       | "Only now, with a licensed broker's approval, is Joy verified."                                                   |
| 1.6  | B      | Click **Marco Dela Cruz** → **Approve credential**.                                                                                                                                                                                   |                                                                                                                                      |                                                                                                                   |
| 1.7  | B      | Click **Kris Navarro**.                                                                                                                                                                                                               | A red box: **"Blocking issue: Name on the document 'KRISTINE NAVARRO' doesn't match 'Kris Navarro'"**.                               | "The AI caught it: the certificate belongs to a different person."                                                |
| 1.8  | B      | Click the **Reject** tab. **Reason:** `The certificate is for Kristine Navarro, not Kris Navarro.` → **Reject credential**.                                                                                                           | Back on the queue.                                                                                                                   | "The broker decides. Kris stays unverified, so buyers will never see him."                                        |
| 1.9  | A      | **Listings** → **Developers and projects** → on **Camella Naga**, click **Upload license to sell** → choose `M1-4-EXPIRED-license-to-sell.png`.                                                                                       | The project says the license is waiting for the broker.                                                                              | "A developer's project needs a License to Sell from DHSUD. This one has expired."                                 |
| 1.10 | B      | **Review queue** → under **Listing and project documents**, click **License to sell**. _(Optional, to prove it: type any reason in **Why approve despite the blocking issue?** and press **Approve license to sell**; it's refused.)_ | A blocking issue: the license **has expired**. Even with a reason, approval is refused.                                              | "An expired license can't be approved at all. Not even the broker can override that."                             |
| 1.11 | B      | **Reject** tab → **Reason** `This license has expired.` → **Reject license to sell**.                                                                                                                                                 |                                                                                                                                      |                                                                                                                   |
| 1.12 | A      | Refresh the page. **Upload license to sell** → `M1-5-license-to-sell.png`.                                                                                                                                                            |                                                                                                                                      |                                                                                                                   |
| 1.13 | B      | **Review queue** → **License to sell** → wait for the AI → **Approve license to sell**.                                                                                                                                               |                                                                                                                                      |                                                                                                                   |
| 1.14 | A      | Refresh.                                                                                                                                                                                                                              | Camella Naga now shows a gold **License to sell until …** badge.                                                                     | "Gold on TrustListo always means one thing: a licensed broker checked this document."                             |

**If you have time:** in window A, open **Activity log** to show that every upload, approval and
rejection is recorded with who and when.

**Points to make:**

- The AI only flags. Only a broker approves. **There is no code path where the AI approves
  anything**, and an automated test checks that.
- Every decision is recorded (who, when, why).
- If the AI can't read a document, the broker reviews it by hand. A failed read never blocks the work.
- It works without internet. Documents are private and open through links that expire.
- Accuracy is measured on a labelled set of sample documents (the numbers are in
  `apps/api/src/modules/docai/eval/results.md`).

**Hand-off:** "Our consultants and the Camella project are verified. [Presenter 2] will now put
the house on the marketplace."

---

### Presenter 2: Module 2, marketplace and property management (~10 min)

**Open with:** "Module 2 is the shared marketplace: verified listings from every firm in one
place, for buyers who never need an account."

| #    | Window | Do exactly this                                                                                                                                                                                                                                                                                                     | You should see                                                                                                                               | Say                                                                                         |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2.1  | A      | **Listings** → **Add unit**. Fill in: **Project** Camella Naga, **Type** House and lot, **Unit or model name** `Ella Model`, **Total contract price (₱)** `2150000`, **Lot area (sq m)** `88`, **Floor area (sq m)** `45`, **Bedrooms** `2`, **Bathrooms** `1`, **Barangay** `Del Rosario` → **Save and continue**. | The unit page with **Photos**, **Payment options** and **Marketplace** cards.                                                                | "The admin adds a unit to the verified project."                                            |
| 2.2  | A      | **Photos** → **Add photos** → `M2-1-ella-model-photo.webp`.                                                                                                                                                                                                                                                         | The photo, marked **Cover**.                                                                                                                 |                                                                                             |
| 2.3  | A      | **Payment options:** **Label** `Pag-IBIG 30 years`, **Payment method** Pag-IBIG housing loan (other numbers can stay) → **Add payment option**.                                                                                                                                                                     | The option appears with a monthly amount.                                                                                                    | "These are the developer's sample computations."                                            |
| 2.4  | A      | **Marketplace** card → **Publish to marketplace**.                                                                                                                                                                                                                                                                  | Status **Live**, and a **View public page** button.                                                                                          | "It can be published only because Module 1 verified the License to Sell."                   |
| 2.5  | D      | Go to <http://localhost:5173> → **Browse homes**. Set **Any badge** → _License to sell_ → **Search**. Click **Map**, then **List**. Click **Ella Model**.                                                                                                                                                           | The house, the gold **License to sell** badge, **Payment options from the developer**, a map.                                                | "Buyers see the verification, the price, and a loan estimate. No account needed."           |
| 2.6  | D      | Click **Send an inquiry**.                                                                                                                                                                                                                                                                                          | **Choose who to talk to**: Advench's verified consultants. **Kris is not there.**                                                            | "These are only consultants with a broker-verified license. Kris was rejected in Module 1." |
| 2.7  | D      | Reload the page (F5), then **Send an inquiry** again.                                                                                                                                                                                                                                                               | The order of consultants changes.                                                                                                            | "The order is random on every load. Nobody pays to be first, and no agent is favoured."     |
| 2.8  | C      | Joy's **Overview** → card **Your referral code** shows **JOCAMPO** → **Copy**.                                                                                                                                                                                                                                      |                                                                                                                                              | "Each consultant has a referral code they can share."                                       |
| 2.9  | D      | In the address bar, add `?ref=JOCAMPO` to the Ella Model address, so it ends in `…/properties/<listing>?ref=JOCAMPO`. Press Enter → **Send an inquiry**.                                                                                                                                                            | "Your inquiry goes to **Joy Ocampo**, who shared this link with you."                                                                        | "A buyer who comes through Joy's link is assigned to Joy automatically."                    |
| 2.10 | D      | **Your full name** `Rosa Mendiola`, **Mobile number** `09171112233`, **Work** Working abroad (OFW), **How you'd pay** Pag-IBIG housing loan, **Civil status** Married, tick the consent box → **Send inquiry**.                                                                                                     | "**Sent to Joy Ocampo**".                                                                                                                    | "The buyer gives consent under the Data Privacy Act, and the lead goes to Joy."             |
| 2.11 | C      | Refresh Joy's **Overview**.                                                                                                                                                                                                                                                                                         | **Do next: Call Rosa Mendiola** (red: new lead).                                                                                             | "The lead appears on Joy's to-do list immediately."                                         |
| 2.12 | D      | Top menu → **List your property** → **Yes, I have the title**. **What kind of property?** Lot only, **Barangay** `Triangulo`, **City or town** `Naga City`, **Lot area, sqm** `240`, **Asking price, ₱** `2900000`, add photo `M2-2-seller-lot-photo.webp` → **Next: choose an agent**.                             | Verified agents from **all firms**.                                                                                                          | "Private sellers can list too, and they pick an agent from any firm."                       |
| 2.13 | D      | Click **Rico Salazar** (Bicol Prime Realty) → **Continue with Rico** → **Your full name** `Teodoro Lagman`, **Mobile number** `09281112233`, tick consent → **Send to Rico**.                                                                                                                                       | Confirmation that it was sent.                                                                                                               |                                                                                             |
| 2.14 | B      | Sign out. Sign in as `sp1@bicolprime.test` (Rico). **Overview** → **Do next: Reply to Teodoro Lagman's listing request** → **Open request** → **Accept request**.                                                                                                                                                   | Four document slots: Land title, Tax declaration, Real property tax receipt, Seller's ID.                                                    | "Rico, at another firm, takes the request."                                                 |
| 2.15 | B      | Upload into each slot: **Land title** `M2-3-seller-land-title.png`, **Tax declaration** `M2-4-…`, **Real property tax receipt** `M2-5-…`, **Seller's ID** `M2-6-…`. Wait until all four are read.                                                                                                                   | Each shows its status after the AI reads it.                                                                                                 | "Module 1 reads and cross-checks them: owner name, lot area, taxes paid."                   |
| 2.16 | B      | Card **Send to your broker:** **Listing title** `Residential lot in Triangulo`, click once on the **Map pin** map → **Send to broker**.                                                                                                                                                                             | "With the broker".                                                                                                                           |                                                                                             |
| 2.17 | B      | Sign out. Sign in as `broker@bicolprime.test` (Gilbert). **Review queue** → **Listings waiting to go live** → **Residential lot in Triangulo**.                                                                                                                                                                     | 4 documents to approve.                                                                                                                      |                                                                                             |
| 2.18 | B      | Click each document → **Approve land title** (etc.) → go back. Repeat for all four. Then **Approve and publish**.                                                                                                                                                                                                   | The listing is approved and goes live.                                                                                                       | "A seller's lot can't go live until a broker verifies the title."                           |
| 2.19 | D      | **Browse homes**.                                                                                                                                                                                                                                                                                                   | **Two listings:** the Triangulo lot (Bicol Prime, badges _Title clean_, _Taxes current_, _Ownership verified_) and the Ella Model (Advench). | "Two firms, one marketplace."                                                               |
| 2.20 | B      | Sign out. Sign in again as `broker1@advench.test` for Presenter 3.                                                                                                                                                                                                                                                  |                                                                                                                                              |                                                                                             |

**Points to make:**

- Buyers and sellers never create an account; every public form asks for consent.
- The consultant order is random, so no agent is favoured.
- **No co-broke:** a buyer's inquiry only goes to the listing firm's consultants.
- A house can't go live without a verified License to Sell; a private lot can't go live without a verified title.

**Hand-off:** "Rosa's inquiry is on Joy's list. [Presenter 3] takes her from lead to closed sale."

---

### Presenter 3: Module 3, sales, clients and commissions (~12 min)

**Open with:** "Module 3 runs the sale after the inquiry: the visit, the buyer's documents and
payments, and the consultants' commission. It's released only when the money **and** the
documents are both in."

| #                | Window | Do exactly this                                                                                                                                                                                    | You should see                                                                                        | Say                                                                                                                                         |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1              | C      | Joy's **Overview** → **Call Rosa Mendiola** → **Open lead**.                                                                                                                                       | A black **Next step: Call Rosa** card.                                                                | "The system tells Joy what to do next."                                                                                                     |
| 3.2              | C      | Click **I've talked to them**.                                                                                                                                                                     | Next step becomes **Schedule a visit with Rosa**.                                                     |                                                                                                                                             |
| 3.3              | C      | Card **Schedule a visit:** **Date and time** two days from now, 10:00 AM → **Request visit**.                                                                                                      | Next step: **Waiting for the visit to be approved**.                                                  | "Consultants schedule visits; the company admin approves them."                                                                             |
| 3.4              | A      | **Overview** → **Do next: Approve or decline a visit for Rosa Mendiola** → **Open visits** → **Approve**.                                                                                          | The visit shows Approved.                                                                             |                                                                                                                                             |
| 3.5              | C      | Refresh Rosa's lead. Card **The buyer reserved** → **Upload reservation receipt** → `M3-1-reservation-receipt.png`.                                                                                | After a few seconds: **Amount paid (₱)** filled with **20000.00**, "Read from the receipt (…% sure)". | "Rosa paid her reservation. The AI read the amount from the receipt; Joy only confirms it."                                                 |
| 3.6              | C      | **Total contract price (₱)** `2150000`. **How the buyer will pay** Pag-IBIG housing loan. **Required downpayment (₱)** `215000`. **Civil status** Married. **Employment** OFW → **Make client**.   | Rosa's **client page** with a **Requirements** checklist.                                             | "She's now a client. The checklist is built from how she pays and her status: Pag-IBIG, married and OFW each add documents."                |
| 3.7              | C      | Card **Payments:** choose **Downpayment** → **Upload receipt** → `M3-2-downpayment-receipt.png`. When the amount appears (45000.00) → **Confirm**.                                                 | Downpayment ₱45,000 listed.                                                                           | "Her downpayment is in."                                                                                                                    |
| 3.8              | C      | Black card → **Open the commission**.                                                                                                                                                              | **Tranche 1, ₱32,250**: red **Documents missing**. "The buyer has paid, but documents are missing."   | "This is the key rule: **two gates**. She has paid enough for the first commission, but it stays blocked until her documents are verified." |
| 3.9              | C      | Back to the client page (**Open the buyer's checklist**). **Valid ID (1st)** → **Upload** → `M3-3-buyer-id.png`. **Valid ID (2nd)** → **Upload** → `M3-4-WRONG-buyer-id.png` (or the phone photo). | The 2nd ID turns red: **Flagged**, the name doesn't match.                                            | "Module 1 again: this ID belongs to someone else."                                                                                          |
| 3.10             | B      | **Review queue** → open the flagged **Valid ID** → **Reject** tab → **Reason** `This ID belongs to someone else.` → **Reject valid id**. Then open the other **Valid ID** → **Approve valid id**.  |                                                                                                       |                                                                                                                                             |
| 3.11             | C      | Refresh. **Valid ID (2nd)** → **Upload** → `M3-5-buyer-drivers-license.png`.                                                                                                                       |                                                                                                       |                                                                                                                                             |
| 3.12             | B      | **Review queue** → **Valid ID** → **Approve valid id**.                                                                                                                                            |                                                                                                       |                                                                                                                                             |
| 3.13             | C      | **Open the commission**.                                                                                                                                                                           | Tranche 1: **Waiting for transmittal**.                                                               | "Both gates are open. Now the developer must send its commission transmittal."                                                              |
| 3.14             | A      | **Overview** → **Do next: Upload the developer's transmittal for Rosa Mendiola** → **Upload** → **Upload transmittal** → `M3-6-developer-transmittal.png`.                                         | "The transmittal reads ₱32,250.00 … The tranche is ₱32,250.00."                                       | "The AI checks the developer's amount against what we expect."                                                                              |
| 3.15             | A      | **Confirm amount**.                                                                                                                                                                                | Tranche 1: **Ready for voucher**.                                                                     |                                                                                                                                             |
| 3.16             | B      | Left menu → **Commissions** → **Rosa Mendiola** → **Prepare voucher**.                                                                                                                             | The voucher: each person's share, **Withholding tax (5%)**, the net, and three signature lines.       | "The broker prepares the payout voucher; withholding is automatic."                                                                         |
| 3.17             | B      | **Type your full name to sign:** `Bernardo Reyes` → **Sign voucher**.                                                                                                                              | Bernardo **Signed** (gold).                                                                           | "The broker signs first. That's a rule."                                                                                                    |
| 3.18             | C      | Sign out, sign in as `sm1@advench.test` (Marco). **Overview** → **Sign the voucher for Rosa Mendiola** → **Sign** → type `Marco Dela Cruz` → **Sign voucher**.                                     |                                                                                                       |                                                                                                                                             |
| 3.19             | C      | Sign out, sign in as `sp1@advench.test` (Joy). Same: **Sign** → type `Joy Ocampo` → **Sign voucher**.                                                                                              | The tranche is **Released**.                                                                          | "Everyone has signed. Note that no money moves in the system. The signed voucher is the record of a payout made outside."                   |
| 3.20 _(if time)_ | C      | **Clients** → **Rosa Mendiola** → **Start closing** → **Save estimate**. Tick the 7 transfer steps; the last one asks **Complete the sale** → click it. **Copy link**.                             | **Sale completed**, and a rating link.                                                                | "Closing estimates the transfer taxes. When the transfer is done, the buyer gets a one-time link to rate the agent."                        |
| 3.21 _(if time)_ | D      | Paste the link → choose 5 stars → tick consent → **Send rating**.                                                                                                                                  | "Thank you."                                                                                          |                                                                                                                                             |
| 3.22             | A      | Left menu → **Reports**.                                                                                                                                                                           | The month's reservations, the pipeline, team performance.                                             | "Management sees the whole pipeline."                                                                                                       |
| 3.23             | A      | Sign out. Sign in as `admin@bicolprime.test` → **Clients** and **Commissions**.                                                                                                                    | **Empty.** No Rosa, nothing from Advench.                                                             | "Each firm sees only its own data."                                                                                                         |
| 3.24             | A      | Sign out. Sign in as `superadmin@trustlisto.test`.                                                                                                                                                 | Firms and their counts only.                                                                          | "The platform admin never sees a firm's clients or documents."                                                                              |

**Points to make:**

- **Two gates:** a commission is released only when the payment milestone is reached **and** the documents are verified.
- **The broker signs first**, and changing a voucher after signing clears every signature.
- **No money moves** in the system.
- Each firm's data is completely separate.
- The commission math is in centavos and covered by automated tests.

---

## Part 4. If something goes wrong on stage

| Problem                             | What to do                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| A document says "Being read"        | Wait 5–10 seconds; the page updates by itself.                                                 |
| You lose your place                 | Open **Overview**: **Do next** shows the next step for whoever is signed in.                   |
| Signing says the name doesn't match | Type the full name exactly as the message shows it.                                            |
| "Too many sign-in attempts"         | Only wrong passwords count toward this. Wait, or use another window that is already signed in. |
| An account's password doesn't work  | That account's temporary password wasn't changed in P6; use the one you wrote down.            |
| Something is truly broken           | Switch to a backup laptop with full demo data (`pnpm db:reset`) and continue there.            |

## Part 5. Questions the panel may ask

| Question                                   | Short answer                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| What if the AI is wrong?                   | It never decides. It flags; the broker approves or rejects, and can correct a misread field. |
| Can one firm see another firm's clients?   | No. Every query is limited to the user's firm; automated tests check every type of record.   |
| Why can't the buyer pick the "best" agent? | The order is random on each load, so no agent is favoured.                                   |
| Where does the money go?                   | Nowhere in the system. Payouts happen outside; the signed voucher is the record.             |
| Are the commission rates real?             | Placeholders until Advench confirms them; the admin edits them in **Settings**.              |
| How does a new firm join?                  | The platform team sets up the firm and its first admin.                                      |
| Does it work without internet?             | Yes, the document-reading model is part of the system.                                       |
| How do you know it works?                  | 134 automated tests, plus this exact demo run end to end in a browser.                       |

**Where the code is**, if asked: Module 1 in `apps/api/src/modules/docai/` and `reviews/`;
Module 2 in `marketplace/`, `properties/`, `sellers/`, `leads/` and `apps/web/src/routes/public/`;
Module 3 in `clients/`, `commissions/` (the math is in `engine.ts`), `closing/`, `ratings/`, `reports/`.

**Documents:** only ever use the mock files in `demo-kit`, never a real ID, title or receipt
(Data Privacy Act).
