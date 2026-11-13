# TrustListo — Sequence Diagrams (UML)

A drawing guide for the Chapter 3 sequence diagrams, in the style of our professor's sample:
lifelines named `object:Class` across the top, solid arrows for calls (`withdrawCash(accountNumber,
amount)`), dashed arrows for returns, and `opt`, `alt`, `loop` and `ref` frames.

There is **one sequence diagram per use case**, grouped by module the same way as the use case
diagrams (`docs/USE-CASE-DIAGRAMS.md`): **45 diagrams** (Module 1: 13, Module 2: 11, Module 3: 21).
Every message matches the real system: the actual API endpoint, the checks it makes, and what it
saves.

Caption for each: *Figure #: Sequence Diagram of TrustListo — <Use case name> (Unified Modeling Language)*

---

## Part 1. How to read and draw these

### Lifelines (the boxes across the top)

| Lifeline | What it is |
|---|---|
| `superAdmin:SuperAdmin`, `admin:CompanyAdmin`, `broker:Broker`, `consultant:SalesConsultant`, `user:FirmUser`, `seeker:PropertySeeker`, `owner:PropertyOwner` | The actor (draw as a box like the sample, or a stick figure on top) |
| `ui:WebApp` | The TrustListo web pages in the browser |
| `api:APIServer` | The TrustListo server (`/api/v1/...`) |
| `ai:DocumentAI` | The AI document reader (OCR, classify, extract, check). It runs in the background |
| `files:FileStorage` | Private storage for uploaded files |
| `db:Database` | The PostgreSQL database |

Draw the lifelines **left to right in the order listed in each diagram**. Only draw the ones that
diagram uses.

### Arrows

| In the tables | Draw it as | Meaning |
|---|---|---|
| `→` | Solid line, **filled** arrowhead | A call (synchronous): the sender waits for the answer |
| `⇢` | **Dashed** line, open arrowhead | The return / answer |
| `↝` | Solid line, **open** arrowhead | An asynchronous message: the sender does not wait (used when a file is handed to the AI) |
| `↻` (same lifeline) | A small arrow that leaves and comes back to the same lifeline | The object does a step itself, e.g. `checkFileType(file)` |

Draw an **activation bar** (thin rectangle) on a lifeline while it is busy, as in the sample.

### Frames (fragments)

| Frame | Meaning | Example |
|---|---|---|
| `alt [A]` … `else [B]` | One of two paths | `[valid password]` / `[wrong password]` |
| `opt [A]` | Only happens if A is true | `opt [balance ≥ amount]` in the sample |
| `loop [A]` | Repeats while A is true | `loop [for each tranche]` |
| `ref` | "See another diagram", as in the sample's `ref Balance Lookup` | `ref Read Uploaded Document` |

The two **system use cases** are drawn once and reused with `ref`:

- **SD13 Read Uploaded Document**: used by every upload.
- **SD44 Update Commission Status**: used after payments, waivers, document decisions and transmittals.

### Common steps written once

- `writeAudit(action)`: every approval, rejection, signature and status change is saved to the
  audit log (system rule 11). It is a call from `api` to `db`.
- Every screen of a logged-in user first checks the session cookie. This is not repeated in each
  diagram; *SD4 Log In* shows where the cookie comes from.
- Every query is filtered by the user's firm (`firmId`). It is not repeated in every message.

---

# Module 1: AI Document Processing and Verification (13)

## SD1. Manage Company Account *(Planned)*

Lifelines: `superAdmin:SuperAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | superAdmin → ui | `createCompany(name, address, adminName, adminEmail)` |
| 2 | ui → api | `POST /admin/firms(name, address, adminName, adminEmail)` *(planned endpoint)* |
| 3 | api → db | `createFirm(name, slug, address): Firm` |
| 4 | db ⇢ api | `firm` |
| 5 | api → db | `createUser(role = COMPANY_ADMIN, firmId, adminName, adminEmail): User` |
| 6 | api → db | `writeAudit(FIRM_CREATED)` |
| 7 | api ⇢ ui | `firm, temporaryPassword` |
| — | **opt** [Super Admin suspends or reactivates a firm] | |
| 8 | superAdmin → ui | `changeStatus(firmId, ACTIVE / SUSPENDED)` |
| 9 | ui → api | `PATCH /admin/firms/:id(status)` *(planned endpoint)* |
| 10 | api → db | `updateFirmStatus(firmId, status)` + `writeAudit(FIRM_STATUS_CHANGED)` |
| 11 | api ⇢ ui | `updated firm` |
| — | **end opt** | |
| 12 | ui ⇢ superAdmin | `show company list` |

Note under the figure: *"Planned: designed, not yet built."*

## SD2. View Firm List

Lifelines: `superAdmin:SuperAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | superAdmin → ui | `openFirms()` |
| 2 | ui → api | `GET /admin/firms()` |
| 3 | api → db | `findFirms(): Firm[]` (name, slug, status, created date, number of users) |
| 4 | db ⇢ api | `firms` |
| 5 | api → db | `countLiveListingsPerFirm(): counts` |
| 6 | db ⇢ api | `liveListingCounts` |
| 7 | api ⇢ ui | `firms with userCount and liveListingCount` |
| 8 | ui ⇢ superAdmin | `show firm list` (never a firm's clients, documents or commissions) |

## SD3. View Platform Activity Logs *(Planned)*

Lifelines: `superAdmin:SuperAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | superAdmin → ui | `openPlatformLogs(page)` *(screen planned)* |
| 2 | ui → api | `GET /admin/logs(page)` |
| 3 | api → db | `findAuditLogs(firmId = none, page): AuditLog[]` |
| 4 | db ⇢ api | `logs, total` |
| 5 | api ⇢ ui | `logs, page, total` |
| 6 | ui ⇢ superAdmin | `show platform-level entries, newest first` |

Note: *"The endpoint exists; the screen is planned."*

## SD4. Log In

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer` · `db:Database`
(The Super Admin logs in the same way.)

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `enterCredentials(email, password)` |
| 2 | ui → api | `POST /auth/login(email, password)` |
| 3 | api ↻ | `checkLockout(email)` |
| — | **alt** [5 failed tries in the last 15 minutes] | |
| 4 | api ⇢ ui | `429 "Account locked for 15 minutes"` |
| — | **else** [not locked] | |
| 5 | api → db | `findUserByEmail(email): User` |
| 6 | db ⇢ api | `user` |
| 7 | api ↻ | `verifyPassword(password, passwordHash)` |
| — | **alt** [wrong email or password] | |
| 8 | api → db | `writeAudit(LOGIN_FAILED)` |
| 9 | api ⇢ ui | `401 "Email or password is incorrect"` |
| — | **else** [account deactivated or firm suspended] | |
| 10 | api ⇢ ui | `403 "Contact your company admin" / "Firm suspended"` |
| — | **else** [valid] | |
| 11 | api ↻ | `startSession(userId)` (signed session cookie) |
| 12 | api → db | `writeAudit(LOGIN)` |
| 13 | api ⇢ ui | `session cookie, role` |
| 14 | ui ⇢ user | `open the dashboard for the role` |
| — | **end alt** · **end alt** | |

## SD5. Change Password

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `changePassword(currentPassword, newPassword)` |
| 2 | ui → api | `POST /auth/change-password(currentPassword, newPassword)` |
| 3 | api ↻ | `validate(newPassword)` (10+ characters, a letter and a number) |
| 4 | api → db | `findUser(userId): User` |
| 5 | db ⇢ api | `user` |
| — | **alt** [current password is wrong] | |
| 6 | api ⇢ ui | `400 "Current password is incorrect"` |
| — | **else** [correct] | |
| 7 | api → db | `updatePasswordHash(userId, hash(newPassword))` |
| 8 | api → db | `writeAudit(PASSWORD_CHANGED)` |
| 9 | api ⇢ ui | `204 done` |
| 10 | ui ⇢ user | `"Password changed"` |
| — | **end alt** | |

## SD6. Log Out

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer`

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `signOut()` |
| 2 | ui → api | `POST /auth/logout()` |
| 3 | api ↻ | `endSession()` (clears the session cookie) |
| 4 | api ⇢ ui | `204 done` |
| 5 | ui ⇢ user | `show the sign-in page` |

## SD7. Add Consultant

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `addConsultant(role, firstName, lastName, email, phone, managerId / brokerId)` |
| 2 | ui → api | `POST /users(role, firstName, lastName, email, phone, managerId, brokerId)` |
| 3 | api → db | `findUserByEmail(email)` |
| 4 | db ⇢ api | `none` |
| 5 | api → db | `findSupervisor(managerId / brokerId): User` |
| 6 | db ⇢ api | `supervisor` |
| — | **alt** [email already used, or supervisor has the wrong role] | |
| 7 | api ⇢ ui | `409 / 400 error message` |
| — | **else** [valid] | |
| 8 | api ↻ | `makeReferralCode(firstName, lastName)` · `makeTemporaryPassword()` |
| 9 | api → db | `createUser(..., referralCode, passwordHash): User` |
| 10 | api → db | `writeAudit(USER_CREATED)` |
| 11 | api ⇢ ui | `user, temporaryPassword` |
| 12 | ui ⇢ admin | `show the one-time password to hand over` |
| — | **end alt** | |

## SD8. Manage Consultant Account

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `editConsultant(id, firstName, lastName, phone, isActive, managerId / brokerId)` |
| 2 | ui → api | `PATCH /users/:id(changes)` |
| 3 | api → db | `findUser(id): User` |
| 4 | db ⇢ api | `consultant` |
| — | **opt** [deactivating] | |
| 5 | api → db | `countActiveTeamMembers(id): number` |
| 6 | db ⇢ api | `count` |
| — | **opt** [count > 0] | |
| 7 | api ⇢ ui | `409 "Reassign their team first"` |
| — | **end opt** · **end opt** | |
| 8 | api → db | `updateUser(id, changes)` |
| 9 | api → db | `writeAudit(USER_UPDATED / USER_DEACTIVATED / USER_REACTIVATED)` |
| 10 | api ⇢ ui | `updated consultant` |
| — | **opt** [new referral code needed] | |
| 11 | admin → ui | `regenerateReferralCode(id)` |
| 12 | ui → api | `POST /users/:id/referral-code()` |
| 13 | api → db | `updateReferralCode(id, newCode)` + `writeAudit(REFERRAL_CODE_REGENERATED)` |
| 14 | api ⇢ ui | `newCode` |
| — | **end opt** | |
| 15 | ui ⇢ admin | `show the updated account` |

## SD9. Upload Consultant Credential

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `uploadCredential(consultantId, type, numberEntered, file)` |
| 2 | ui → api | `POST /users/:id/credentials(type, numberEntered, file)` |
| 3 | api ↻ | `checkFileType(file)` (PDF, JPG, PNG or WebP by content; up to 10 MB) |
| — | **alt** [invalid file] | |
| 4 | api ⇢ ui | `400 "Upload a PDF or image"` |
| — | **else** [valid] | |
| 5 | api → files | `putObject(storageKey, file)` |
| 6 | api → db | `createCredential(type, numberEntered, status = PENDING_AI)` + `createDocument(ownerType = CREDENTIAL, sha256)` |
| 7 | api → db | `writeAudit(CREDENTIAL_UPLOADED)` |
| 8 | api ↝ ai | `queueDocument(documentId)` |
| 9 | api ⇢ ui | `201 credential (Pending AI)` |
| — | **ref** | **SD13 Read Uploaded Document** |
| 10 | ui ⇢ admin | `show the AI's result and flags` |
| — | **end alt** | |

## SD10. Upload License to Sell

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `uploadLicenseToSell(projectId, file)` |
| 2 | ui → api | `POST /catalog/projects/:id/lts(file)` |
| 3 | api → db | `findProject(id): Project` |
| 4 | db ⇢ api | `project` |
| — | **alt** [invalid file, or a license is already waiting for review] | |
| 5 | api ⇢ ui | `400 / 409 error message` |
| — | **else** [valid] | |
| 6 | api → files | `putObject(storageKey, file)` |
| 7 | api → db | `createDocument(ownerType = PROJECT, declaredType = LICENSE_TO_SELL)` + `setLtsStatus(projectId, PENDING_AI)` |
| 8 | api → db | `writeAudit(LTS_UPLOADED)` |
| 9 | api ↝ ai | `queueDocument(documentId)` |
| 10 | api ⇢ ui | `201 document (Pending AI)` |
| — | **ref** | **SD13 Read Uploaded Document** |
| 11 | ui ⇢ admin | `show the AI's result and flags` |
| — | **end alt** | |

## SD11. Review Consultant Credential

Lifelines: `broker:Broker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | broker → ui | `openReviewQueue()` |
| 2 | ui → api | `GET /reviews/queue()` |
| 3 | api → db | `findItemsToReview(): Credential[], Document[], Listing[]` (oldest first) |
| 4 | api ⇢ ui | `queue` |
| 5 | broker → ui | `openCredential(id)` |
| 6 | ui → api | `GET /reviews/credentials/:id()` |
| 7 | api → db | `findCredentialWithDocument(id)` |
| 8 | api ⇢ ui | `scan, OCR text, extracted fields, flags, number entered` |
| — | **alt** [approve] | |
| 9 | broker → ui | `approve(expiresAt, numberEntered?, overrideNote?)` |
| 10 | ui → api | `POST /reviews/credentials/:id/approve(expiresAt, numberEntered, overrideNote)` |
| 11 | api ↻ | `check(expiresAt ≥ today; overrideNote given if a BLOCKER flag)` |
| — | **alt** [expired, or blocker without a note] | |
| 12 | api ⇢ ui | `400 "Reject it" / "Explain why"` |
| — | **else** [ok] | |
| 13 | api → db | `updateCredential(status = APPROVED, expiresAt, reviewedBy)` + `updateDocument(APPROVED)` |
| 14 | api → db | `writeAudit(CREDENTIAL_APPROVED)` |
| 15 | api ⇢ ui | `approved` (the consultant now shows the PRC / DHSUD badge) |
| — | **end alt** | |
| — | **else** [reject] | |
| 16 | broker → ui | `reject(reason)` |
| 17 | ui → api | `POST /reviews/credentials/:id/reject(reason)` |
| 18 | api → db | `updateCredential(status = REJECTED, rejectReason)` + `writeAudit(CREDENTIAL_REJECTED)` |
| 19 | api ⇢ ui | `rejected` |
| — | **end alt** | |
| 20 | ui ⇢ broker | `next item in the queue` |

## SD12. Review Document

Lifelines: `broker:Broker` · `ui:WebApp` · `api:APIServer` · `db:Database`
(For a License to Sell, an owner's document or a buyer's document.)

| # | From → To | Message |
|---|---|---|
| 1 | broker → ui | `openDocument(id)` (from the review queue) |
| 2 | ui → api | `GET /reviews/documents/:id()` |
| 3 | api → db | `findDocument(id)` + `findOwner(ownerType, ownerId)` |
| 4 | api ⇢ ui | `scan, OCR text, extracted fields, flags, owner` |
| — | **alt** [approve] | |
| 5 | broker → ui | `approve(correctedFields?, overrideNote?)` |
| 6 | ui → api | `POST /reviews/documents/:id/approve(fields, overrideNote)` |
| 7 | api ↻ | `recheckFlags(correctedFields)` · `check(no BLOCKER without a note; License to Sell not expired)` |
| — | **alt** [blocker without a note, or expired] | |
| 8 | api ⇢ ui | `400 error message` |
| — | **else** [ok] | |
| 9 | api → db | `updateDocument(APPROVED, fields, reviewedBy)` + `updateOwner()` (License to Sell status, requirement item Verified) |
| 10 | api → db | `writeAudit(DOCUMENT_APPROVED)` |
| — | **opt** [buyer's document] | |
| — | **ref** | **SD44 Update Commission Status** |
| — | **end opt** | |
| 11 | api ⇢ ui | `approved` |
| — | **end alt** | |
| — | **else** [reject] | |
| 12 | broker → ui | `reject(reason)` |
| 13 | ui → api | `POST /reviews/documents/:id/reject(reason)` |
| 14 | api → db | `updateDocument(REJECTED, reviewNote)` + `updateOwner()` + `writeAudit(DOCUMENT_REJECTED)` |
| 15 | api ⇢ ui | `rejected` |
| — | **end alt** | |
| 16 | ui ⇢ broker | `next item in the queue` |

## SD13. Read Uploaded Document *(system)*

Lifelines: `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`
This is the diagram the others point to with `ref`.

| # | From → To | Message |
|---|---|---|
| 1 | api ↝ ai | `queueDocument(documentId)` |
| 2 | ai → db | `setAiStatus(documentId, PROCESSING)` |
| 3 | ai → files | `getObject(storageKey): file` |
| 4 | files ⇢ ai | `file` |
| 5 | ai ↻ | `prepareImage(file)` (PDF pages to images; upright, grayscale, cleaned, resized) |
| 6 | ai ↻ | `readText(image): text, confidence` (OCR) |
| — | **alt** [no readable text] | |
| 7 | ai ↻ | `flag(OCR_FAILED)` |
| — | **else** [text read] | |
| 8 | ai ↻ | `classify(text): detectedType` |
| 9 | ai ↻ | `extractFields(text, type): fields` |
| 10 | ai → db | `saveReading(ocrText, detectedType, fields)` |
| 11 | ai → db | `findRecordsToCompare(owner): names, numbers, other documents` |
| 12 | db ⇢ ai | `records` |
| 13 | ai ↻ | `computeFlags(fields, records): flags` (name, number, date, amount, duplicate, type checks) |
| — | **end alt** | |
| 14 | ai ↻ | `suggestStatus(flags)` (Needs Attention or Ready for Review, **never Approved**) |
| 15 | ai → db | `saveFlags(flags, suggestedStatus)` + `updateOwnerStatus()` (credential / License to Sell / requirement item) |
| 16 | ai → db | `setAiStatus(documentId, DONE)` |

---

# Module 2: Marketplace and Property Management (11)

## SD14. Add Developer

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `addDeveloper(name)` |
| 2 | ui → api | `POST /catalog/developers(name)` |
| 3 | api → db | `findDeveloper(firmId, name)` |
| — | **alt** [name already exists in the firm] | |
| 4 | api ⇢ ui | `409 "Developer already exists"` |
| — | **else** | |
| 5 | api → db | `createDeveloper(firmId, name): Developer` + `writeAudit(DEVELOPER_CREATED)` |
| 6 | api ⇢ ui | `developer` |
| 7 | ui ⇢ admin | `show the developer list` |
| — | **end alt** | |

## SD15. Manage Project Records

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| — | **alt** [new project] | |
| 1 | admin → ui | `addProject(developerId, name, locationText, mapPin)` |
| 2 | ui → api | `POST /catalog/projects(developerId, name, locationText, location)` |
| 3 | api → db | `createProject(...): Project` + `writeAudit(PROJECT_CREATED)` |
| — | **else** [edit project] | |
| 4 | admin → ui | `editProject(id, changes)` |
| 5 | ui → api | `PATCH /catalog/projects/:id(changes)` |
| 6 | api → db | `updateProject(id, changes)` |
| — | **end alt** | |
| 7 | api ⇢ ui | `project (with License to Sell status)` |
| 8 | ui ⇢ admin | `show the project` |
| — | **ref** | **SD10 Upload License to Sell** (when the admin attaches the license) |

## SD16. Manage Unit Listing

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `saveUnit(projectId, title, type, price, areas, rooms, barangay, mapPin)` |
| 2 | ui → api | `POST /catalog/properties(...)` (new) or `PATCH /catalog/properties/:id(...)` (edit) |
| 3 | api → db | `createOrUpdateProperty(source = DEVELOPER, status = DRAFT)` + `writeAudit(PROPERTY_CREATED / PROPERTY_PRICE_CHANGED)` |
| 4 | api ⇢ ui | `unit` |
| — | **loop** [for each photo, up to 20] | |
| 5 | admin → ui | `addPhoto(file)` |
| 6 | ui → api | `POST /catalog/properties/:id/photos(file)` |
| 7 | api → files | `putObject(key, photo)` |
| 8 | api → db | `createPropertyPhoto(propertyId, key, sort)` |
| 9 | api ⇢ ui | `photo` |
| — | **end loop** | |
| — | **loop** [for each loan quotation] | |
| 10 | admin → ui | `addQuotation(label, paymentMethod, reservationFee, downpayment, loan, amortization)` |
| 11 | ui → api | `POST /catalog/properties/:id/quotations(...)` |
| 12 | api → db | `createLoanQuotation(...)` |
| 13 | api ⇢ ui | `quotation` |
| — | **end loop** | |
| 14 | ui ⇢ admin | `show the unit (Draft)` |

## SD17. Publish or Unpublish Unit

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| — | **alt** [publish] | |
| 1 | admin → ui | `publish(unitId)` |
| 2 | ui → api | `POST /catalog/properties/:id/publish()` |
| 3 | api → db | `findProject(unit.projectId): ltsStatus, ltsExpiresAt` |
| 4 | db ⇢ api | `project` |
| — | **alt** [License to Sell not approved or expired] | |
| 5 | api ⇢ ui | `409 "Units can't go live until the License to Sell is approved"` |
| — | **else** [approved and valid] | |
| 6 | api → db | `updateProperty(status = LIVE, publishedAt)` + `grantBadge(LTS_VERIFIED, validUntil = ltsExpiresAt)` |
| 7 | api → db | `writeAudit(LISTING_PUBLISHED)` |
| 8 | api ⇢ ui | `live` |
| — | **end alt** | |
| — | **else** [unpublish] | |
| 9 | admin → ui | `unpublish(unitId)` |
| 10 | ui → api | `POST /catalog/properties/:id/unpublish()` |
| 11 | api → db | `updateProperty(status = DRAFT)` + `writeAudit(LISTING_UNPUBLISHED)` |
| 12 | api ⇢ ui | `draft` |
| — | **end alt** | |
| 13 | ui ⇢ admin | `show the new status` |

## SD18. Browse Properties

Lifelines: `seeker:PropertySeeker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | seeker → ui | `search(keyword, type, priceRange, location, badge, paymentMethod, sort)` |
| 2 | ui → api | `GET /public/properties(filters, page)` |
| 3 | api → db | `findLiveListings(filters, page): Property[]` (only Live listings of active firms) |
| 4 | db ⇢ api | `listings, total` |
| 5 | api ⇢ ui | `listing cards` |
| 6 | ui → api | `GET /public/properties/markers(mapArea)` |
| 7 | api → db | `findLiveListingPins(mapArea)` |
| 8 | api ⇢ ui | `map pins` |
| 9 | ui ⇢ seeker | `show the list and the map` |
| — | **opt** [seeker opens a property] | |
| 10 | seeker → ui | `openProperty(slug)` |
| 11 | ui → api | `GET /public/properties/:slug()` |
| 12 | api → db | `findProperty(slug)` with photos, badges, loan quotations, firm |
| 13 | api ⇢ ui | `property details` |
| 14 | ui ⇢ seeker | `show the property page` |
| — | **end opt** | |

## SD19. Compute Loan Estimate

Lifelines: `seeker:PropertySeeker` · `ui:WebApp`
(The estimate is computed in the browser; the firm's default rates arrive with the property page in SD18.)

| # | From → To | Message |
|---|---|---|
| 1 | seeker → ui | `chooseMode(monthlyPayment / whatCanIAfford)` |
| — | **alt** [monthly payment] | |
| 2 | seeker → ui | `enter(price, downpaymentPct, interestRate, years)` |
| 3 | ui ↻ | `computePayment(): monthly, downpayment, loanAmount, totalInterest` |
| — | **else** [what can I afford] | |
| 4 | seeker → ui | `enter(monthlyIncome, incomeSharePct, interestRate, years, downpaymentPct)` |
| 5 | ui ↻ | `computeAffordability(): maxPrice, monthlyBudget, maxLoan, fitsThisListing` |
| — | **end alt** | |
| 6 | ui ⇢ seeker | `show the estimate + "Estimate only, not a loan approval"` |

## SD20. Send Inquiry

Lifelines: `seeker:PropertySeeker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| — | **opt** [listing has no owner's agent and no referral code] | |
| 1 | ui → api | `GET /public/properties/:id/consultants()` |
| 2 | api → db | `findVerifiedConsultants(listing's firm)` + `averageRatings()` + `completedSales()` |
| 3 | api ↻ | `shuffle(consultants)` (random order every time) |
| 4 | api ⇢ ui | `consultant cards` |
| 5 | seeker → ui | `pickConsultant(consultantId)` |
| — | **end opt** | |
| 6 | seeker → ui | `sendInquiry(name, phone, email, natureOfWork, paymentPref, civilStatus, message, consent)` |
| 7 | ui → api | `POST /public/inquiries(propertyId, consultantId?, ref?, buyer details, consent)` |
| 8 | api ↻ | `checkConsent()` · `checkHoneypot()` · `checkRateLimit()` |
| 9 | api → db | `findProperty(propertyId): firmId, source, assignedAgentId` |
| 10 | api ↻ | `route()` → owner's agent, else a valid referral code of the same firm, else the picked consultant |
| 11 | api → db | `createInquiry(firmId, consultantId, source, ..., status = NEW)` + `writeAudit(INQUIRY_CREATED)` |
| 12 | api ⇢ ui | `assigned consultant name and firm` |
| 13 | ui ⇢ seeker | `"Your consultant will contact you"` |

## SD21. Submit Property for Listing

Lifelines: `owner:PropertyOwner` · `ui:WebApp` · `api:APIServer` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | owner → ui | `openListYourProperty()` |
| 2 | ui → api | `GET /public/agents()` |
| 3 | api → db | `findVerifiedConsultants(all active firms)` |
| 4 | api ↻ | `shuffle(agents)` |
| 5 | api ⇢ ui | `agent cards` |
| 6 | owner → ui | `submit(agentId, name, mobile, email, barangay, city, type, areas, askingPrice, hasTitle, photos, consent)` |
| 7 | ui → api | `POST /public/seller-requests(form, photos)` |
| 8 | api ↻ | `validate()` (land title, consent, mobile format, price ≥ ₱10,000, honeypot, rate limit) |
| — | **alt** [invalid] | |
| 9 | api ⇢ ui | `400 field errors` |
| — | **else** [valid] | |
| 10 | api → files | `putObject(photos)` |
| 11 | api → db | `createSellerRequest(firm of agent, agentId, ..., status = NEW)` + `writeAudit(SELLER_REQUEST_CREATED)` |
| 12 | api ⇢ ui | `201 created` |
| 13 | ui ⇢ owner | `"Your request was sent to the agent"` |
| — | **end alt** | |

## SD22. Respond to Seller Request

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `openSellerRequests()` |
| 2 | ui → api | `GET /seller-requests()` |
| 3 | api → db | `findSellerRequests(agentId = me)` |
| 4 | api ⇢ ui | `requests` |
| — | **alt** [accept] | |
| 5 | consultant → ui | `accept(requestId)` |
| 6 | ui → api | `POST /seller-requests/:id/accept()` |
| 7 | api → db | `updateRequest(status = ACCEPTED)` + `writeAudit(SELLER_REQUEST_ACCEPTED)` |
| 8 | api ⇢ ui | `accepted` |
| — | **else** [decline] | |
| 9 | consultant → ui | `decline(requestId, reason)` |
| 10 | ui → api | `POST /seller-requests/:id/decline(reason)` |
| 11 | api → db | `updateRequest(status = DECLINED)` + `writeAudit(SELLER_REQUEST_DECLINED, reason)` |
| 12 | api ⇢ ui | `declined` |
| — | **end alt** | |
| 13 | ui ⇢ consultant | `show the request's new status` |

## SD23. Prepare Seller Listing

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| — | **loop** [for each of the 4 documents: land title, tax declaration, tax receipt, owner's ID] | |
| 1 | consultant → ui | `uploadDocument(requestId, declaredType, file)` |
| 2 | ui → api | `POST /seller-requests/:id/documents(declaredType, file)` |
| 3 | api → files | `putObject(storageKey, file)` |
| 4 | api → db | `createDocument(ownerType = SELLER_REQUEST)` + `updateRequest(status = DOCUMENTS_IN_PROGRESS)` + `writeAudit(LISTING_DOCUMENT_UPLOADED)` |
| 5 | api ↝ ai | `queueDocument(documentId)` |
| 6 | api ⇢ ui | `201 document` |
| — | **ref** | **SD13 Read Uploaded Document** |
| — | **end loop** | |
| 7 | consultant → ui | `submitForReview(title, description, barangay, city, mapPin)` |
| 8 | ui → api | `POST /seller-requests/:id/submit(...)` |
| 9 | api → db | `findListingDocuments(requestId)` |
| — | **alt** [a document is missing or still being read] | |
| 10 | api ⇢ ui | `409 "Upload all four documents first" / "Wait until every document has been read"` |
| — | **else** | |
| 11 | api → db | `createOrUpdateProperty(source = INDIVIDUAL_SELLER, assignedAgentId, status = PENDING_REVIEW or NEEDS_ATTENTION, photos)` |
| 12 | api → db | `updateRequest(status = SUBMITTED_FOR_REVIEW)` + `writeAudit(LISTING_SUBMITTED)` |
| 13 | api ⇢ ui | `submitted` |
| 14 | ui ⇢ consultant | `"Sent to the broker for review"` |
| — | **end alt** | |

## SD24. Review Seller Listing

Lifelines: `broker:Broker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | broker → ui | `openListingReview(id)` |
| 2 | ui → api | `GET /reviews/properties/:id()` |
| 3 | api → db | `findListing(id)` + `findListingDocuments(requestId)` |
| 4 | api ⇢ ui | `listing, the four documents and their review status` |
| — | **ref** | **SD12 Review Document** (for each document still waiting) |
| — | **alt** [approve] | |
| 5 | broker → ui | `approve(id)` |
| 6 | ui → api | `POST /reviews/properties/:id/approve()` |
| 7 | api ↻ | `check(all four documents are APPROVED)` |
| — | **alt** [not all approved] | |
| 8 | api ⇢ ui | `409 "Approve all four documents first"` |
| — | **else** | |
| 9 | api → db | `updateProperty(status = LIVE, publishedAt)` + `grantBadges(earned from the approved documents)` |
| 10 | api → db | `updateRequest(status = LISTED)` + `writeAudit(LISTING_APPROVED)` |
| 11 | api ⇢ ui | `live, badges` |
| — | **end alt** | |
| — | **else** [send back] | |
| 12 | broker → ui | `reject(id, reason)` |
| 13 | ui → api | `POST /reviews/properties/:id/reject(reason)` |
| 14 | api → db | `updateProperty(status = REJECTED)` + `updateRequest(status = DOCUMENTS_IN_PROGRESS)` + `writeAudit(LISTING_REJECTED, reason)` |
| 15 | api ⇢ ui | `sent back` |
| — | **end alt** | |
| 16 | ui ⇢ broker | `next item in the queue` |

---

# Module 3: Sales, Client and Commission Management (21)

## SD25. View To-Do List

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer` · `db:Database`
(Company Admin, Sales Manager or Sales Person.)

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `openOverview()` |
| 2 | ui → api | `GET /inquiries()` · `GET /visits()` · `GET /clients()` · `GET /commissions()` · `GET /seller-requests()` |
| 3 | api → db | `find…(within the user's scope)` for each list |
| 4 | db ⇢ api | `leads, visits, clients, tranches, seller requests` |
| 5 | api ⇢ ui | `lists` |
| 6 | ui ↻ | `countDealsPerStage()` · `buildDoNext(most urgent first)` · `buildWaitingOnOthers()` |
| 7 | ui ⇢ user | `show stage counts, "Do next" and "Waiting on others"` |
| — | **opt** [user clicks a task] | |
| 8 | user → ui | `openTask(task)` |
| 9 | ui ⇢ user | `go to the page where the task is done` |
| — | **end opt** | |

## SD26. Manage Lead

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `openLeads()` |
| 2 | ui → api | `GET /inquiries()` |
| 3 | api → db | `findInquiries(consultantId in my scope)` |
| 4 | api ⇢ ui | `leads` |
| 5 | consultant → ui | `openLead(id)` |
| 6 | ui → api | `GET /inquiries/:id()` |
| 7 | api ⇢ ui | `buyer details, property, status` |
| 8 | consultant → ui | `updateStatus(id, CONTACTED / QUALIFIED / VISIT_SCHEDULED / LOST, reason?)` |
| 9 | ui → api | `PATCH /inquiries/:id(status, reason)` |
| — | **alt** [not the handling consultant, or Lost without a reason] | |
| 10 | api ⇢ ui | `403 / 400 error message` |
| — | **else** | |
| 11 | api → db | `updateInquiry(status)` + `writeAudit(LEAD_STATUS_CHANGED, reason)` |
| 12 | api ⇢ ui | `updated lead` |
| 13 | ui ⇢ consultant | `show the new status` |
| — | **end alt** | |

## SD27. Request Site Visit

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `requestVisit(inquiryId, scheduledAt, notes)` |
| 2 | ui → api | `POST /visits(inquiryId, scheduledAt, notes)` |
| 3 | api → db | `findInquiry(inquiryId)` |
| 4 | api → db | `findVisitsNear(consultantId, scheduledAt ± 1 hour)` |
| 5 | db ⇢ api | `nearbyVisits` |
| 6 | api → db | `createVisit(propertyId, consultantId, inquiryId, scheduledAt, status = PENDING)` + `writeAudit(VISIT_REQUESTED)` |
| 7 | api ⇢ ui | `visit, clashWarning?` |
| — | **opt** [clashWarning] | |
| 8 | ui ⇢ consultant | `"You have another visit within 1 hour"` (warning only) |
| — | **end opt** | |
| 9 | ui ⇢ consultant | `"Sent to your company admin for approval"` |

## SD28. Update Site Visit

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `updateVisit(id, COMPLETED / NO_SHOW / CANCELLED / RESCHEDULED, newTime?)` |
| 2 | ui → api | `PATCH /visits/:id(status, scheduledAt?)` |
| 3 | api → db | `findVisit(id)` |
| — | **alt** [rescheduled] | |
| 4 | api → db | `updateVisit(status = RESCHEDULED)` + `createVisit(rescheduledFromId = id, scheduledAt = newTime, status = PENDING)` |
| — | **else** [completed, no-show or cancelled] | |
| 5 | api → db | `updateVisit(status)` |
| — | **end alt** | |
| 6 | api → db | `writeAudit(VISIT_<status>)` (e.g. VISIT_COMPLETED) |
| 7 | api ⇢ ui | `visit` |
| 8 | ui ⇢ consultant | `show the updated calendar` |

## SD29. Convert Lead to Client

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `uploadReservationReceipt(inquiryId, file)` |
| 2 | ui → api | `POST /inquiries/:id/receipt(file)` |
| 3 | api → files | `putObject(storageKey, file)` |
| 4 | api → db | `createDocument(ownerType = PAYMENT, declaredType = PAYMENT_RECEIPT)` |
| 5 | api ↝ ai | `queueDocument(documentId)` |
| 6 | api ⇢ ui | `documentId` |
| — | **ref** | **SD13 Read Uploaded Document** |
| 7 | ui ⇢ consultant | `pre-filled amount, receipt number and date` |
| 8 | consultant → ui | `convert(amount, paidAt, tcp, downpaymentAmount, paymentMethod, civilStatus, employmentType)` |
| 9 | ui → api | `POST /inquiries/:id/convert(receiptDocumentId, amount, paidAt, tcp, ...)` |
| 10 | api ↻ | `validate()` (method is not "Not sure"; employment and downpayment needed for Bank and Pag-IBIG) |
| 11 | api → db | `createClient(...)` + `createPayment(kind = RESERVATION, confirmed)` |
| 12 | api → db | `createRequirementChecklist(paymentMethod, civilStatus, employmentType)` |
| 13 | api → db | `findCommissionTemplate(developer, paymentMethod)` + `findCommissionSplit(handledBy)` |
| 14 | api → db | `createCommission(grossAmount = tcp × rate, splitSnapshot)` + `createTranches(rules copied from the template)` |
| 15 | api → db | `updateInquiry(status = RESERVED)` + `writeAudit(CLIENT_CREATED)` |
| — | **ref** | **SD44 Update Commission Status** |
| 16 | api ⇢ ui | `client` |
| 17 | ui ⇢ consultant | `open the client page with the checklist` |

## SD30. Upload Buyer Requirement

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `uploadRequirement(itemId, file)` |
| 2 | ui → api | `POST /requirements/:id/documents(file)` |
| 3 | api → db | `findRequirementItem(id)` |
| — | **alt** [item already Verified or Waived] | |
| 4 | api ⇢ ui | `409 "This item is already verified or waived"` |
| — | **else** | |
| 5 | api → files | `putObject(storageKey, file)` |
| 6 | api → db | `createDocument(ownerType = CLIENT)` + `linkItem(itemId, documentId)` + `writeAudit(REQUIREMENT_UPLOADED)` |
| 7 | api ↝ ai | `queueDocument(documentId)` |
| 8 | api ⇢ ui | `201 document` |
| — | **ref** | **SD13 Read Uploaded Document** (sets the item to Uploaded or Needs Attention) |
| 9 | ui ⇢ consultant | `show the item's status; the Broker verifies it (SD12)` |
| — | **end alt** | |

## SD31. Record Buyer Payment

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `recordPayment(clientId, kind, receiptFile)` |
| 2 | ui → api | `POST /clients/:id/payments(kind, file)` |
| 3 | api → db | `createPayment(kind, unconfirmed)` |
| 4 | api → files | `putObject(storageKey, file)` |
| 5 | api → db | `createDocument(ownerType = PAYMENT)` + `linkProof(paymentId, documentId)` |
| 6 | api ↝ ai | `queueDocument(documentId)` |
| 7 | api ⇢ ui | `payment (unconfirmed)` |
| — | **ref** | **SD13 Read Uploaded Document** |
| 8 | ui ⇢ consultant | `pre-filled amount and date` |
| 9 | consultant → ui | `confirm(amount, paidAt)` |
| 10 | ui → api | `POST /payments/:id/confirm(amount, paidAt)` |
| — | **alt** [still being read, already confirmed, or the receipt number was already used] | |
| 11 | api ⇢ ui | `409 error message` |
| — | **else** | |
| 12 | api → db | `updatePayment(amount, paidAt, confirmedBy)` + `writeAudit(PAYMENT_CONFIRMED)` |
| — | **ref** | **SD44 Update Commission Status** |
| 13 | api ⇢ ui | `confirmed payment` |
| 14 | ui ⇢ consultant | `show the payment history` |
| — | **end alt** | |

## SD32. Approve or Decline Site Visit

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `openVisitCalendar()` |
| 2 | ui → api | `GET /visits()` |
| 3 | api → db | `findVisits(firmId)` |
| 4 | api ⇢ ui | `visits (pending first)` |
| — | **alt** [approve] | |
| 5 | admin → ui | `approve(visitId)` |
| 6 | ui → api | `PATCH /visits/:id(status = APPROVED)` |
| 7 | api → db | `updateVisit(APPROVED, decidedBy)` + `updateInquiry(status = VISIT_SCHEDULED)` |
| — | **else** [decline] | |
| 8 | admin → ui | `decline(visitId, reason)` |
| 9 | ui → api | `PATCH /visits/:id(status = DECLINED, reason)` |
| 10 | api → db | `updateVisit(DECLINED, declineReason, decidedBy)` |
| — | **end alt** | |
| 11 | api → db | `writeAudit(VISIT_APPROVED / VISIT_DECLINED)` |
| 12 | api ⇢ ui | `visit` |
| 13 | ui ⇢ admin | `show the updated calendar` |

## SD33. Upload Developer Transmittal

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `ai:DocumentAI` · `files:FileStorage` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `uploadTransmittal(trancheId, file)` |
| 2 | ui → api | `POST /tranches/:id/transmittal(file)` |
| 3 | api → files | `putObject(storageKey, file)` |
| 4 | api → db | `createDocument(ownerType = TRANSMITTAL)` + `linkTransmittal(trancheId, documentId)` + `writeAudit(TRANSMITTAL_UPLOADED)` |
| 5 | api ↝ ai | `queueDocument(documentId)` |
| 6 | api ⇢ ui | `201` |
| — | **ref** | **SD13 Read Uploaded Document** (compares the amount with the tranche) |
| 7 | ui ⇢ admin | `pre-filled amount and any Amount Mismatch flag` |
| 8 | admin → ui | `confirm(amount, note?)` |
| 9 | ui → api | `POST /tranches/:id/transmittal/confirm(amount, note)` |
| — | **alt** [still being read, or differs by more than ₱1 without a note] | |
| 10 | api ⇢ ui | `409 / 400 error message` |
| — | **else** | |
| 11 | api → db | `updateTranche(transmittalAmount)` + `writeAudit(TRANSMITTAL_CONFIRMED)` |
| — | **ref** | **SD44 Update Commission Status** |
| 12 | api ⇢ ui | `tranche (now Ready for Release if all gates passed)` |
| — | **end alt** | |

## SD34. Manage Firm Settings

Lifelines: `admin:CompanyAdmin` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | admin → ui | `openSettings()` |
| 2 | ui → api | `GET /settings/firm()` · `GET /settings/commission-splits()` · `GET /settings/commission-templates()` |
| 3 | api → db | `findFirmSettings()` · `findSplits()` · `findTemplates()` |
| 4 | api ⇢ ui | `current settings` |
| — | **opt** [loan defaults, withholding or closing tax rates changed] | |
| 5 | admin → ui | `saveFirmSettings(loanRate, term, downpayment, incomeShare, withholding, cgt, dst, transferTax)` |
| 6 | ui → api | `PUT /settings/firm(...)` |
| 7 | api → db | `updateFirm(...)` + `writeAudit(FIRM_SETTINGS_UPDATED)` |
| — | **end opt** | |
| — | **opt** [commission split changed] | |
| 8 | admin → ui | `saveSplits(handledBy, brokerPct, managerPct, personPct)` |
| 9 | ui → api | `PUT /settings/commission-splits(rows)` |
| 10 | api ↻ | `check(each row totals 100%)` |
| 11 | api → db | `updateSplits(rows)` + `writeAudit(COMMISSION_SPLITS_UPDATED)` |
| — | **end opt** | |
| — | **opt** [a developer's template changed] | |
| 12 | admin → ui | `saveTemplate(templateId, grossRatePct, tranche shares and trigger values)` |
| 13 | ui → api | `PUT /settings/commission-templates/:id(...)` |
| 14 | api → db | `updateTemplate(...)` + `writeAudit(COMMISSION_TEMPLATE_UPDATED)` |
| — | **end opt** | |
| 15 | api ⇢ ui | `saved` |
| 16 | ui ⇢ admin | `"Settings saved" (live deals keep their saved split)` |

## SD35. View Reports

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer` · `db:Database`
(Company Admin, Broker or Sales Manager.)

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `openReports(month)` |
| 2 | ui → api | `GET /reports/summary(month)` |
| 3 | api → db | `countReservations(month)` · `countNewLeads(month)` · `countCompleted(month)` · `sumReleasedTranches(month)` |
| 4 | api ⇢ ui | `monthly summary` |
| 5 | ui → api | `GET /reports/pipeline(consultantId?, paymentMethod?)` |
| 6 | api → db | `groupLeadsByStatus()` · `groupClientsByStatus()` · `perConsultantCounts()` (a Sales Manager sees only their team) |
| 7 | api ⇢ ui | `pipeline and team table` |
| 8 | ui ⇢ user | `show the reports` |

## SD36. View Activity Log

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer` · `db:Database`
(Company Admin or Broker.)

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `openActivityLog(entityType?, page)` |
| 2 | ui → api | `GET /audit(entityType, entityId, page)` |
| 3 | api → db | `findAuditLogs(firmId, filters, page): AuditLog[]` |
| 4 | db ⇢ api | `entries, total` |
| 5 | api ⇢ ui | `entries (newest first)` |
| 6 | ui ⇢ user | `show who did what and when, with before and after` |

## SD37. Waive Requirement

Lifelines: `broker:Broker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | broker → ui | `waive(itemId, reason)` |
| 2 | ui → api | `POST /requirements/:id/waive(reason)` |
| 3 | api → db | `findRequirementItem(id)` |
| — | **alt** [already Verified or Waived, or reason too short] | |
| 4 | api ⇢ ui | `409 / 400 error message` |
| — | **else** | |
| 5 | api → db | `updateItem(status = WAIVED, verifiedBy)` + `writeAudit(REQUIREMENT_WAIVED, reason)` |
| — | **ref** | **SD44 Update Commission Status** (a waived item counts as complete) |
| 6 | api ⇢ ui | `waived item` |
| 7 | ui ⇢ broker | `show the checklist` |
| — | **end alt** | |

## SD38. Prepare Commission Voucher

Lifelines: `broker:Broker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | broker → ui | `prepareVoucher(trancheId, extraDeductions?)` |
| 2 | ui → api | `POST /tranches/:id/voucher(deductions)` |
| 3 | api → db | `findTranche(id)` + `findCommission(splitSnapshot)` + `findFirm(withholdingPct)` |
| — | **alt** [tranche not Ready for Release, or it already has a voucher] | |
| 4 | api ⇢ ui | `409 error message` |
| — | **else** | |
| 5 | api ↻ | `computeLines()` (each person's share − withholding − deductions = net) |
| 6 | api ↻ | `nextVoucherNo()` (e.g. ADV-2026-0001) · `contentHash(voucher)` |
| 7 | api → db | `createVoucher(voucherNo, lines, totalNet, contentHash)` + `writeAudit(VOUCHER_CREATED)` |
| 8 | api ⇢ ui | `voucher` |
| — | **end alt** | |
| — | **opt** [broker edits the deductions before signing is complete] | |
| 9 | broker → ui | `editVoucher(deductions)` |
| 10 | ui → api | `PATCH /vouchers/:id(deductions)` |
| 11 | api → db | `updateVoucher(lines, newHash)` + `clearSignatures()` + `writeAudit(VOUCHER_EDITED)` |
| 12 | api ⇢ ui | `voucher (signatures cleared)` |
| — | **end opt** | |
| 13 | broker → ui | `sign(typedFullName)` |
| — | **ref** | **SD39 Sign Commission Voucher** (the Broker signs first) |

## SD39. Sign Commission Voucher

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`
(The Broker signs through the same message first; consultants sign after.)

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `openVoucher(id)` |
| 2 | ui → api | `GET /vouchers/:id()` |
| 3 | api ⇢ ui | `voucher lines, own share and net, signature status` |
| 4 | consultant → ui | `sign(typedFullName)` |
| 5 | ui → api | `POST /vouchers/:id/sign(typedName)` |
| 6 | api ↻ | `check(contentHash unchanged; typedName = account name; broker already signed; not signed yet)` |
| — | **alt** [a check fails] | |
| 7 | api ⇢ ui | `400 / 409 error message` (e.g. "The broker signs first") |
| — | **else** | |
| 8 | api → db | `addSignature(userId, typedName, ip, userAgent, hash, signedAt)` + `writeAudit(VOUCHER_SIGNED)` |
| — | **opt** [every payee consultant has signed] | |
| 9 | api → db | `updateVoucher(releasedAt)` + `updateTranche(status = RELEASED)` + `writeAudit(TRANCHE_RELEASED)` |
| — | **end opt** | |
| 10 | api ⇢ ui | `signed (released?)` |
| 11 | ui ⇢ consultant | `show the signature status` |
| — | **end alt** | |

Note: *"Released only records that the payout was made outside the system."*

## SD40. View Commissions

Lifelines: `user:FirmUser` · `ui:WebApp` · `api:APIServer` · `db:Database`
(Sales Consultant, Company Admin or Broker.)

| # | From → To | Message |
|---|---|---|
| 1 | user → ui | `openCommissions(statusFilter?)` |
| 2 | ui → api | `GET /commissions(status)` |
| 3 | api → db | `findTranches(scope)` (a consultant sees only deals they are part of) |
| 4 | db ⇢ api | `tranches with client, amount, status, awaitingSince` |
| 5 | api ⇢ ui | `commission list + transmittal aging` |
| — | **opt** [user opens a deal] | |
| 6 | user → ui | `openCommission(id)` |
| 7 | ui → api | `GET /commissions/:id()` |
| 8 | api → db | `findCommissionWithTranches(id)` |
| 9 | api ⇢ ui | `gross amount, tranches, what each one is waiting for` |
| — | **end opt** | |
| 10 | ui ⇢ user | `show the commissions` |

## SD41. Close the Sale

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `openClosing(clientId)` |
| 2 | ui → api | `GET /clients/:id/closing()` |
| 3 | api → db | `findClosingRecord(clientId)` + `findFirm(cgt, dst, transferTax rates)` |
| 4 | api ⇢ ui | `closing record or an empty checklist` |
| — | **loop** [until all 7 steps are done] | |
| 5 | consultant → ui | `save(sellingPrice, taxBase?, registrationFee?, ticked steps)` |
| 6 | ui → api | `PUT /clients/:id/closing(sellingPrice, taxBase, registrationFee, items)` |
| 7 | api ↻ | `check(handling consultant; client not Completed or Cancelled)` |
| 8 | api ↻ | `computeClosing(rates): taxes, totals per payer` |
| 9 | api → db | `saveClosingRecord(computation, checklist)` + `setClientStatus(CLOSING)` (first save) + `writeAudit(CLOSING_ESTIMATE_SAVED)` |
| 10 | api ⇢ ui | `closing estimate and checklist` |
| — | **end loop** | |
| 11 | consultant → ui | `confirmSaleComplete()` |
| 12 | ui → api | `PUT /clients/:id/closing(last step done)` |
| 13 | api → db | `setClientStatus(COMPLETED)` + `writeAudit(CLIENT_STATUS_CHANGED)` |
| 14 | api → db | `createRatingToken(clientId, consultantId, tokenHash, expiresAt = +30 days)` + `writeAudit(RATING_LINK_ISSUED)` |
| 15 | api ⇢ ui | `completed, rating link` |
| 16 | ui ⇢ consultant | `"Sale complete" + the rating link` |

## SD42. Send Rating Link

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`
(The Company Admin can do the same.)

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `openClient(clientId)` |
| — | **alt** [the link is still valid] | |
| 2 | consultant → ui | `copyRatingLink()` |
| — | **else** [lost or expired] | |
| 3 | consultant → ui | `createNewLink()` |
| 4 | ui → api | `POST /clients/:id/rating-link()` |
| 5 | api ↻ | `check(client Completed; not rated yet)` |
| 6 | api → db | `replaceRatingToken(new tokenHash, expiresAt = +30 days)` (the old link stops working) + `writeAudit(RATING_LINK_ISSUED)` |
| 7 | api ⇢ ui | `new link` |
| — | **end alt** | |
| 8 | ui ⇢ consultant | `link copied` |
| 9 | consultant → seeker | `sendLink()` *(outside the system: email or message; draw as a note, not an arrow)* |

## SD43. Rate Agent

Lifelines: `seeker:PropertySeeker` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | seeker → ui | `openRatingLink(token)` |
| 2 | ui → api | `GET /public/ratings/:token()` |
| 3 | api → db | `findRatingToken(hash(token))` |
| — | **alt** [link unknown, used or expired] | |
| 4 | api ⇢ ui | `404 "This link isn't valid"` / `410 "Already rated" or "Link expired"` |
| — | **else** [valid] | |
| 5 | api ⇢ ui | `consultant name, firm, property` |
| 6 | seeker → ui | `rate(stars 1–5, comment, consent)` |
| 7 | ui → api | `POST /public/ratings/:token(stars, comment, consent)` |
| 8 | api → db | `createRating(consultantId, clientId, stars, comment)` + `markTokenUsed()` + `writeAudit(RATING_SUBMITTED)` |
| 9 | api ⇢ ui | `201` |
| 10 | ui ⇢ seeker | `"Thank you for your rating"` |
| — | **end alt** | |

## SD44. Update Commission Status *(system)*

Lifelines: `api:APIServer` · `db:Database`
This is the diagram the others point to with `ref`.

| # | From → To | Message |
|---|---|---|
| 1 | api → db | `findClient(clientId)` with confirmed payments, requirement items and tranches |
| 2 | db ⇢ api | `client, payments, items, tranches` |
| — | **loop** [for each tranche without a voucher] | |
| 3 | api ↻ | `milestoneReached(tranche, payments)` |
| — | **alt** [milestone not reached] | |
| 4 | api ↻ | `next = WAITING` |
| — | **else** [documents of the required stage not all Verified or Waived] | |
| 5 | api ↻ | `next = BLOCKED` |
| — | **else** [developer transmittal required and not confirmed] | |
| 6 | api ↻ | `next = AWAITING_TRANSMITTAL` |
| — | **else** [all gates passed] | |
| 7 | api ↻ | `next = READY_FOR_RELEASE` |
| — | **end alt** | |
| — | **opt** [next ≠ current status] | |
| 8 | api → db | `updateTranche(status = next, milestoneReachedAt, docsCompleteAt, awaitingSince)` + `writeAudit(TRANCHE_STATUS_CHANGED)` |
| — | **end opt** | |
| — | **end loop** | |

## SD45. Share Referral Link

Lifelines: `consultant:SalesConsultant` · `ui:WebApp` · `api:APIServer` · `db:Database`

| # | From → To | Message |
|---|---|---|
| 1 | consultant → ui | `openProfile()` |
| 2 | ui → api | `GET /auth/me()` |
| 3 | api → db | `findUser(userId): referralCode` |
| 4 | api ⇢ ui | `user with referralCode` |
| 5 | ui ↻ | `buildReferralLink(referralCode)` |
| 6 | consultant → ui | `copyLink()` |
| 7 | ui ⇢ consultant | `link copied` |
| 8 | consultant → seeker | `shareLink()` *(outside the system: draw as a note)* |
| — | **ref** | **SD20 Send Inquiry** (an inquiry through this link goes to this consultant) |

---

## Part 2. Count check (every use case has one sequence diagram)

| Module | Use case → Sequence diagram |
|---|---|
| Module 1 (13) | UC1→SD1 · UC2→SD2 · UC3→SD3 · UC4→SD4 · UC5→SD5 · UC6→SD6 · UC8→SD7 · UC9→SD8 · UC10→SD9 · UC13→SD10 · UC21→SD11 · UC22→SD12 · UC44→SD13 |
| Module 2 (11) | UC11→SD14 · UC12→SD15 · UC14→SD16 · UC15→SD17 · UC39→SD18 · UC40→SD19 · UC41→SD20 · UC43→SD21 · UC32→SD22 · UC33→SD23 · UC24→SD24 |
| Module 3 (21) | UC7→SD25 · UC26→SD26 · UC27→SD27 · UC28→SD28 · UC29→SD29 · UC30→SD30 · UC31→SD31 · UC16→SD32 · UC17→SD33 · UC18→SD34 · UC19→SD35 · UC20→SD36 · UC23→SD37 · UC25→SD38 · UC35→SD39 · UC36→SD40 · UC37→SD41 · UC38→SD42 · UC42→SD43 · UC45→SD44 · UC34→SD45 |

The SD numbers follow the module order, not the UC numbers. Each diagram's caption uses the use
case **name**, which is what links it to the use case diagram.

---

## Part 3. Checklist before submitting

- [ ] 45 diagrams, each captioned with its use case name.
- [ ] Lifelines named `object:Class`, in the order listed for each diagram.
- [ ] Calls are solid with filled heads; returns are dashed; the AI hand-off (`queueDocument`) has an
      open head (asynchronous).
- [ ] Every `alt` has its `[guard]` and `else [guard]`; every frame is closed.
- [ ] `ref` frames point to *Read Uploaded Document* and *Update Commission Status* (and the other
      diagrams named).
- [ ] Planned items (SD1, SD3) are marked "(Planned)".
