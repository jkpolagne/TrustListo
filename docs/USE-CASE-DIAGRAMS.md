# TrustListo — Use Case Diagrams (UML)

A drawing guide for the Chapter 3 use case diagrams, in the style of our professor's sample (actors
outside a system box, use cases as ovals inside, `<<include>>` and `<<extend>>` as dashed arrows).

There are **3 diagrams, one per module**. Together they hold **all 45 use cases** in
`docs/USE-CASES.md`, each drawn exactly once, with the same names and the same actors. The
UC numbers in parentheses below match that file.

Captions:

- *Figure #: Use Case Diagram of TrustListo — Module 1: AI Document Processing and Verification (Unified Modeling Language)*
- *Figure #: Use Case Diagram of TrustListo — Module 2: Marketplace and Property Management (Unified Modeling Language)*
- *Figure #: Use Case Diagram of TrustListo — Module 3: Sales, Client and Commission Management (Unified Modeling Language)*

---

## Part 1. Notation (what to draw)

| Element | How to draw it | Example |
|---|---|---|
| **System boundary** | Large rectangle, module name at the top inside | "TrustListo — Module 1: …" |
| **Actor** | Stick figure **outside** the boundary, name below | Broker |
| **Use case** | Oval **inside** the boundary, verb + noun | Review Document |
| **Association** | Solid line, no arrowhead, actor ↔ use case | Broker —— Review Document |
| **Include** | Dashed arrow labeled `<<include>>`, **from** the base use case **to** the use case it always uses | Upload Consultant Credential ┄┄> Read Uploaded Document |
| **Extend** | Dashed arrow labeled `<<extend>>`, **from** the optional use case **to** the base use case it adds to | Compute Loan Estimate ┄┄> Browse Properties |
| **Generalization** | Solid line with a **hollow triangle** pointing to the general (parent) actor | Sales Manager ——▷ Sales Consultant |

**Actors used** (same names as the DFDs and the use case scenarios):

| Actor | Who | Diagrams |
|---|---|---|
| Super Admin | Platform owner | 1 |
| Company Admin | Runs one firm | 1, 2, 3 |
| Broker | The only one who verifies and approves | 1, 2, 3 |
| Sales Consultant | General actor for **Sales Manager** and **Sales Person** (same duties) | 1, 2, 3 |
| Sales Manager | A Sales Consultant who also sees team reports | 3 |
| Sales Person | A Sales Consultant | 3 |
| Firm User | General actor for Company Admin, Broker and Sales Consultant (everyone with a firm account) | 1 |
| Property Seeker | Public buyer, no login | 2, 3 |
| Property Owner | Public seller, no login | 2 |

**What is not an actor:** the AI and the system itself. UC44 *Read Uploaded Document* and UC45
*Update Commission Status* are done automatically by the system, so they are drawn as use cases
that other use cases `<<include>>`, with no actor line. This is the correct UML way. The system is
never drawn as a stick figure.

**Where the shared use cases go** (we have only 3 diagrams, but some use cases belong to no module):

| Shared use cases | Placed in | Why |
|---|---|---|
| Log In, Change Password, Log Out, Super Admin's company and log use cases, Add / Manage Consultant | **Module 1** | Accounts and their PRC/DHSUD credentials go together: a consultant is added, then the AI and the Broker verify them |
| View To-Do List, Manage Firm Settings, View Reports, View Activity Log | **Module 3** | They are about sales, commissions and closing (firm settings are mostly the commission split and templates) |

**Duplicate actors.** In Module 3, three actors are drawn a **second time** at the bottom (marked
`*`, e.g. **Broker\***). A duplicate is the same actor, drawn again only so that lines don't
cross, just like the duplicate entities in our DFDs. Add a note under the figure:
*"Actors marked \* are drawn twice to avoid crossing lines."* (Proof that it's needed: Module 3
has two use cases shared by the same three actors, plus the include links between them, and that
pattern cannot be drawn on paper without a crossing unless an actor is repeated.)

---

## Part 2. Module 1: AI Document Processing and Verification

### Use cases (13)

| UC | Use case (oval label) | Actor(s) |
|---|---|---|
| 1 | Manage Company Account (Planned) | Super Admin |
| 2 | View Firm List | Super Admin |
| 3 | View Platform Activity Logs (Planned) | Super Admin |
| 4 | Log In | Super Admin, Firm User |
| 5 | Change Password | Firm User |
| 6 | Log Out | Super Admin, Firm User |
| 8 | Add Consultant | Company Admin |
| 9 | Manage Consultant Account | Company Admin |
| 10 | Upload Consultant Credential | Company Admin |
| 13 | Upload License to Sell | Company Admin |
| 21 | Review Consultant Credential | Broker |
| 22 | Review Document | Broker |
| 44 | Read Uploaded Document (AI) | — (included) |

### Relationships

| From | Relationship | To |
|---|---|---|
| Upload Consultant Credential | `<<include>>` | Read Uploaded Document (AI) |
| Upload License to Sell | `<<include>>` | Read Uploaded Document (AI) |
| Company Admin | generalization ▷ | Firm User |
| Broker | generalization ▷ | Firm User |
| Sales Consultant | generalization ▷ | Firm User |

**Firm User** is used so that Log In, Change Password and Log Out need 3 lines instead of 9.
Company Admin, Broker and Sales Consultant inherit those use cases through the triangle arrows.
Super Admin has no firm and no Change Password in the system, so it gets its own lines to
Log In and Log Out.

### Layout (no crossing)

```
                                       ╭──────────────────────────────╮  (CA→Firm User arrow goes
 ┌──────────── TrustListo — Module 1: AI Document Processing and Verification ───┐   over the top
 │                                                                         │   and down the right)
 │  (Add Consultant)                               (Review Consultant      │──── Broker
 │                                                    Credential)          │      │
 Company ── (Manage Consultant Account)            (Review Document)  ─────│──────┘
 Admin   │                                                                 │      │ ▷
 │       │  (Upload Consultant ┄┄include┄┄┐                                │      │
 │       │   Credential)                  ▼                                │      ▼
 │       │                    (Read Uploaded Document (AI))                │   Firm User ◄─── ╯
 │       │  (Upload License ┄┄┄include┄┄┄┄┘                                │   │ │ │
 │       │   to Sell)                                                      │   │ │ │   ▲ ▷
 │                                                                         │   │ │ │   │
 Super ──── (Manage Company Account (Planned))     (Log In) ───────────────│───┘ │ │   │
 Admin ──── (View Firm List)                       (Change Password) ──────│─────┘ │ Sales
   │  └──── (View Platform Activity Logs (Planned)) (Log Out) ─────────────│───────┘ Consultant
   │                                                                       │
 └─┴───────────────────────────────────────────────────────────────────────┘
   Super Admin also connects to (Log In) and (Log Out), through the gaps between its own ovals.
```

Grid inside the boundary (draw each oval in its cell):

| Row | Left column | Center column | Right column |
|---|---|---|---|
| 1 | Add Consultant | | Review Consultant Credential |
| 2 | Manage Consultant Account | | Review Document |
| 3 | Upload Consultant Credential | Read Uploaded Document (AI) *(between rows 3 and 4)* | |
| 4 | Upload License to Sell | | |
| 5 | Manage Company Account (Planned) | Log In | |
| 6 | View Firm List | Change Password | |
| 7 | View Platform Activity Logs (Planned) | Log Out | |

Actors outside:

| Actor | Position | Lines |
|---|---|---|
| Company Admin | Left, level with rows 1–4 | 4 lines to the left-column ovals of rows 1–4 |
| Super Admin | Left, level with rows 5–7 | 3 lines to its left-column ovals; 2 lines to Log In and Log Out, passing through the gaps between rows 5/6 and 6/7 |
| Broker | Right, level with rows 1–2 | 2 lines to the right-column ovals |
| Firm User | Right, level with rows 5–7 | 3 lines to Log In, Change Password, Log Out, through the empty right column |
| Sales Consultant | Right, below Firm User | Generalization arrow straight up to Firm User |

Generalization routes, all **outside** the boundary:

- **Broker ▷ Firm User:** straight down on the right side.
- **Sales Consultant ▷ Firm User:** straight up.
- **Company Admin ▷ Firm User:** up from Company Admin, across **above** the boundary, down the far
  right **outside** Broker, into Firm User's right side.

Crossing check: left-side lines stay on the left, right-side lines stay in the empty right column,
the two include arrows meet only at the AI oval, and the long Company Admin arrow runs outside
everything. There are no crossings.

---

## Part 3. Module 2: Marketplace and Property Management

### Use cases (11, plus 1 from Module 1)

| UC | Use case (oval label) | Actor(s) |
|---|---|---|
| 11 | Add Developer | Company Admin |
| 12 | Manage Project Records | Company Admin |
| 14 | Manage Unit Listing | Company Admin |
| 15 | Publish or Unpublish Unit | Company Admin (through `<<extend>>`) |
| 39 | Browse Properties | Property Seeker |
| 40 | Compute Loan Estimate | Property Seeker (through `<<extend>>`) |
| 41 | Send Inquiry | Property Seeker (through `<<extend>>`) |
| 43 | Submit Property for Listing | Property Owner |
| 32 | Respond to Seller Request | Sales Consultant |
| 33 | Prepare Seller Listing | Sales Consultant |
| 24 | Review Seller Listing | Broker |
| 44 | Read Uploaded Document (AI) | — shown again from Module 1; label it **"Read Uploaded Document (AI) — Module 1"** |

### Relationships

| From | Relationship | To | Why |
|---|---|---|---|
| Publish or Unpublish Unit | `<<extend>>` | Manage Unit Listing | Optional step done from the unit's page (only when the License to Sell is approved) |
| Compute Loan Estimate | `<<extend>>` | Browse Properties | Optional, from a property's page |
| Send Inquiry | `<<extend>>` | Browse Properties | Optional, from a property's page |
| Prepare Seller Listing | `<<include>>` | Read Uploaded Document (AI) | Every uploaded title, tax declaration, tax receipt and ID is read by the AI |

The actor starts the base use case; the extension adds to it. That is why the three `<<extend>>`
use cases have no actor line of their own. This is correct UML.

### Layout (no crossing)

```
 ┌───────────── TrustListo — Module 2: Marketplace and Property Management ─────────────┐
 │                                                                                         │
 │  (Add Developer)                                                                        │
 Company ── (Manage Project Records)                                                       │
 Admin  ──── (Manage Unit Listing) ◄┄extend┄┄ (Publish or Unpublish Unit)                  │
 │                                                                                         │
 Property ── (Browse Properties) ◄┄┄extend┄┄┄ (Compute Loan Estimate)                      │
 Seeker   │                      ◄┄┄extend┄┄┄ (Send Inquiry)                               │
 │                                                                                         │
 Property ── (Submit Property      (Respond to Seller Request) ─────────────────────── Sales
 Owner   │    for Listing)         (Prepare Seller Listing) ────────────────────────── Consultant
 │                                          ┆ include                                      │
 │                                          ▼                                              │
 │                       (Read Uploaded Document (AI) — Module 1)  (Review Seller Listing) ── Broker
 └─────────────────────────────────────────────────────────────────────────────────────────┘
```

| Row | Left column | Center column | Right column |
|---|---|---|---|
| 1 | Add Developer | | |
| 2 | Manage Project Records | | |
| 3 | Manage Unit Listing | Publish or Unpublish Unit | |
| 4 | Browse Properties | Compute Loan Estimate *(upper)* / Send Inquiry *(lower)* | |
| 5 | Submit Property for Listing | Respond to Seller Request | |
| 6 | | Prepare Seller Listing | |
| 7 | | Read Uploaded Document (AI) — Module 1 | Review Seller Listing |

| Actor | Position | Lines |
|---|---|---|
| Company Admin | Left, level with rows 1–3 | 3 lines to rows 1–3 (left) |
| Property Seeker | Left, level with row 4 | 1 line to Browse Properties |
| Property Owner | Left, level with row 5 | 1 line to Submit Property for Listing |
| Sales Consultant | Right, level with rows 5–6 | 2 lines to Respond to Seller Request and Prepare Seller Listing, through the empty right column |
| Broker | Right, level with row 7 | 1 line to Review Seller Listing |

The dashed arrows are short and horizontal (extend) or vertical (include). Lines from the left and
right actors never reach the same oval, so nothing crosses.

Add a note: *"Sales Consultant = Sales Manager or Sales Person."*

---

## Part 4. Module 3: Sales, Client and Commission Management

### Use cases (21, plus 1 from Module 1)

| UC | Use case (oval label) | Actor(s) |
|---|---|---|
| 26 | Manage Lead | Sales Consultant |
| 34 | Share Referral Link | Sales Consultant |
| 27 | Request Site Visit | Sales Consultant |
| 28 | Update Site Visit | Sales Consultant |
| 29 | Convert Lead to Client | Sales Consultant |
| 30 | Upload Buyer Requirement | Sales Consultant |
| 31 | Record Buyer Payment | Sales Consultant |
| 35 | Sign Commission Voucher | Sales Consultant |
| 37 | Close the Sale | Sales Consultant |
| 38 | Send Rating Link | Sales Consultant, Company Admin |
| 16 | Approve or Decline Site Visit | Company Admin |
| 18 | Manage Firm Settings | Company Admin |
| 17 | Upload Developer Transmittal | Company Admin |
| 23 | Waive Requirement | Broker |
| 25 | Prepare Commission Voucher | Broker |
| 45 | Update Commission Status | — (included; done by the system) |
| 44 | Read Uploaded Document (AI) | — shown again; label it **"Read Uploaded Document (AI) — Module 1"** |
| 7 | View To-Do List | Sales Consultant\*, Company Admin\* |
| 36 | View Commissions | Sales Consultant\*, Company Admin\*, Broker\* |
| 20 | View Activity Log | Company Admin\*, Broker\* |
| 19 | View Reports | Company Admin\*, Broker\*, Sales Manager |
| 42 | Rate Agent | Property Seeker |

### Relationships

| From | Relationship | To | Why |
|---|---|---|---|
| Convert Lead to Client | `<<include>>` | Read Uploaded Document (AI) | The reservation receipt is read by the AI |
| Upload Buyer Requirement | `<<include>>` | Read Uploaded Document (AI) | Every buyer document is read by the AI |
| Record Buyer Payment | `<<include>>` | Read Uploaded Document (AI) | The receipt amount and number are read by the AI |
| Upload Developer Transmittal | `<<include>>` | Read Uploaded Document (AI) | The transmittal amount is read by the AI |
| Record Buyer Payment | `<<include>>` | Update Commission Status | A confirmed payment may reach a milestone |
| Upload Developer Transmittal | `<<include>>` | Update Commission Status | A confirmed transmittal is the last gate |
| Waive Requirement | `<<include>>` | Update Commission Status | A waived document may complete the document gate |
| Sales Manager | generalization ▷ | Sales Consultant\* | A Sales Manager does everything a Sales Consultant does |
| Sales Person | generalization ▷ | Sales Consultant\* | A Sales Person does everything a Sales Consultant does |

Add a note: *"Update Commission Status also runs when the Broker decides a buyer's document
(Review Document, Module 1)."* That link crosses modules, so it is written as a note instead of
drawn.

### Layout (no crossing)

The diagram has two parts inside one boundary:

- an **upper part** for the daily work, with Sales Consultant on the left, Company Admin on top and
  Broker on the right;
- a **lower band** for the four "view" use cases and Rate Agent, with the duplicate actors
  (\*), Sales Manager, Sales Person and Property Seeker below the boundary.

```
                          Company Admin
                    ╱        │        ╲         ╲
 ┌──────────── TrustListo — Module 3: Sales, Client and Commission Management ──────────┐
 │ (Send Rating Link)                                                                     │
 │ (Manage Lead)            (Approve or Decline         (Manage Firm Settings)            │
 │ (Share Referral Link)      Site Visit)                                                 │
 │ (Request Site Visit)                                                                   │
 Sales  (Update Site Visit)                                                               │
 Consultant (Convert Lead to Client) ┄┄┐                                                  │
 │ (Upload Buyer Requirement) ┄┄┄┄┄┄┄┄┄┼┄► (Read Uploaded Document ◄┄┄┐                    │
 │ (Record Buyer Payment) ┄┄┄┄┄┄┄┄┄┄┄┄┄┘     (AI) — Module 1)       ┆                    │
 │            ┆                                                  (Upload Developer       │
 │            └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄► (Update Commission ◄┄┄  Transmittal)          │
 │ (Sign Commission Voucher)                    Status)        ◄┄┄ (Waive Requirement) ─── Broker
 │ (Close the Sale)                                                (Prepare Commission ─── │
 │                                                                   Voucher)              │
 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (lower band) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
 │                            (View Commissions)                                          │
 │                                              (View Activity Log)                       │
 │      (View To-Do List)                       (View Reports)                (Rate Agent) │
 └────────────────────────────────────────────────────────────────────────────────────────┘
   Sales       Sales            Company           Sales          Broker*        Property
   Person ──▷ Consultant* ◁──── Admin* ─ ─ ─ ─ ─ Manager                         Seeker
                   ▲________________________________│  (Sales Manager's ▷ arrow passes
                                                        BELOW Company Admin*)
```

**Upper part grid:**

| Row | Left column | Center column | Right column |
|---|---|---|---|
| 1 | Send Rating Link | | |
| 2 | Manage Lead | Approve or Decline Site Visit | Manage Firm Settings |
| 3 | Share Referral Link | | |
| 4 | Request Site Visit | | |
| 5 | Update Site Visit | | |
| 6 | Convert Lead to Client | | |
| 7 | Upload Buyer Requirement | Read Uploaded Document (AI) — Module 1 | |
| 8 | Record Buyer Payment | | Upload Developer Transmittal |
| 9 | | Update Commission Status | |
| 10 | Sign Commission Voucher | | Waive Requirement |
| 11 | Close the Sale | | Prepare Commission Voucher |

| Actor | Position | Lines |
|---|---|---|
| Sales Consultant | Left, middle (rows 4–7) | 10 lines to the 10 left-column ovals (rows 1–8, 10, 11) |
| Company Admin | Top, above the gap between the center and right columns | 4 lines: Send Rating Link (far left, passing **above** Approve or Decline Site Visit), Approve or Decline Site Visit, Manage Firm Settings, and Upload Developer Transmittal (straight down through the empty right column, rows 3–7) |
| Broker | Right, level with rows 10–11 | 2 lines to Waive Requirement and Prepare Commission Voucher |

Dashed arrows in the upper part:

- Convert Lead to Client, Upload Buyer Requirement, Record Buyer Payment `┄┄►` Read Uploaded Document
  (all from the left).
- Upload Developer Transmittal `┄┄►` Read Uploaded Document (from the right, up-left).
- Record Buyer Payment `┄┄►` Update Commission Status (from the left, down-right).
- Upload Developer Transmittal `┄┄►` Update Commission Status (from the right, down-left).
- Waive Requirement `┄┄►` Update Commission Status (from the right, up-left).

**Lower band** (ovals in three heights; actors below the boundary, left to right):

```
                       (View Commissions)                        ← highest
                                     (View Activity Log)         ← middle
       (View To-Do List)             (View Reports)   (Rate Agent) ← lowest

  Sales Person   Sales Consultant*   Company Admin*   Sales Manager   Broker*   Property Seeker
```

| Use case | Height | Lines from |
|---|---|---|
| View To-Do List | Lowest, between Sales Consultant\* and Company Admin\* | Sales Consultant\*, Company Admin\* |
| View Commissions | Highest, centered over Company Admin\* | Sales Consultant\* (passes **above** View To-Do List), Company Admin\* (straight up), Broker\* (passes **above** View Activity Log) |
| View Activity Log | Middle, between Company Admin\* and Broker\* | Company Admin\*, Broker\* |
| View Reports | Lowest, right above Sales Manager | Company Admin\*, Sales Manager (straight up), Broker\* |
| Rate Agent | Lowest, far right | Property Seeker |

Generalizations, **below** the boundary:

- **Sales Person ▷ Sales Consultant\*:** short arrow to the right.
- **Sales Manager ▷ Sales Consultant\*:** goes left, passing **below** Company Admin\*'s feet. This is
  safe because Company Admin\*'s lines all go up.

Crossing check:

- **Upper part:** the left actor reaches only the left column; Company Admin's lines come down
  through empty cells; the Broker reaches only the right column; the dashed arrows all end on the
  two center ovals.
- **Lower band:** each actor's lines fan upward in left-to-right order. The highest oval (View
  Commissions) is reached over the lower ones. Sales Manager stands between Company Admin\* and
  Broker\*, right under View Reports.

There are no crossings.

Notes under the figure:

1. *"Actors marked \* are drawn twice to avoid crossing lines."*
2. *"Update Commission Status also runs when the Broker decides a buyer's document (Review Document,
   Module 1)."*
3. *"Read Uploaded Document (AI) is described in Module 1."*

---

## Part 5. Completeness check

| Diagram | Use cases drawn | UC numbers |
|---|---|---|
| Module 1 | 13 | 1, 2, 3, 4, 5, 6, 8, 9, 10, 13, 21, 22, 44 |
| Module 2 | 11 (+ UC44 shown again) | 11, 12, 14, 15, 24, 32, 33, 39, 40, 41, 43 |
| Module 3 | 21 (+ UC44 shown again) | 7, 16, 17, 18, 19, 20, 23, 25, 26, 27, 28, 29, 30, 31, 34, 35, 36, 37, 38, 42, 45 |
| **Total** | **45** | All of UC1–UC45, each once |

Before submitting:

- [ ] Every oval is inside a boundary; every stick figure is outside.
- [ ] Every association is a plain line (no arrowhead).
- [ ] `<<include>>` arrows point **to** the included use case; `<<extend>>` arrows point **to** the
      base use case. Both are dashed.
- [ ] Generalization arrows have a **hollow triangle** at the parent (Firm User, Sales Consultant).
- [ ] "(Planned)" is written on UC1 and UC3.
- [ ] No actor called "System" or "AI".
- [ ] The notes are under each figure (duplicates \*, cross-module links).
- [ ] No two lines cross.
