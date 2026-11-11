# Functional Requirements

Functional requirements of TrustListo, written in the manuscript's format. They describe what the
prototype does as of 2026-11-11 and were checked against the system itself.

Requirements marked **(Planned)** are in the specification but **not in the prototype yet**. Keep
them in the manuscript only if you present them as planned, because the panel may try them.

**Roles used below:** Super Admin (platform), Company Admin, Broker, Sales Manager,
Sales Person (Sales Manager and Sales Person together are **consultants**), and the public:
**Property Seeker** (buyer) and **Property Owner** (private seller), who never log in.

---

## Notes on the earlier draft

| Draft item                                                                    | Issue                                                                                                                           | Corrected in                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1.3 "browse and **transact** without logging in"                              | The public doesn't transact (no payments online). They browse, inquire, list a property and rate an agent.                      | 1.3                         |
| 1.4 only mentions inactive consultants                                        | Login is also refused for a firm that is suspended, and an account locks after repeated failed attempts.                        | 1.4–1.6                     |
| 1.6 "persist … until they log out"                                            | The session lasts **8 hours** or until logout, whichever comes first.                                                           | 1.8                         |
| 2.1–2.2 register a firm with name, code, city, address, email, contact number | The prototype **can't create firms** from the Super Admin screen, and a firm stores only name, unique code, address and status. | Section 2, marked (Planned) |

---

## Shared requirements

### 1. User Authentication and Access Control

1.1. The system shall provide a single shared login screen for the Super Admin, Company Admin,
Broker, Sales Manager, and Sales Person.

1.2. The system shall redirect each user to the correct dashboard based on their role after login.

1.3. The system shall allow the Property Seeker and the Property Owner to browse listings, send
inquiries, submit a property for listing, and rate an agent without logging in.

1.4. The system shall prevent a deactivated account from logging in.

1.5. The system shall prevent the users of a suspended firm from logging in.

1.6. The system shall lock an account for 15 minutes after five consecutive failed login attempts.

1.7. The system shall limit repeated failed login attempts from the same device.

1.8. The system shall keep a user logged in across page refreshes until they log out or their
session expires after 8 hours.

1.9. The system shall allow any logged-in user to log out.

1.10. The system shall allow any logged-in user to change their password.

1.11. The system shall show each role only the menu items and pages that role is allowed to use.

1.12. The system shall restrict every logged-in user to the data of their own firm.

1.13. The system shall restrict a Sales Manager to their own records and their team's, and a
Sales Person to their own records.

### 2. Super Admin – Firm (Company) Account Management

2.1. The system shall display to the Super Admin a list of all firms with each firm's status,
number of users, number of live listings, and date joined.

2.2. The system shall display platform totals of firms, users, and live listings.

2.3. The system shall not show the Super Admin any firm's clients, documents, or commissions.

2.4. **(Planned)** The system shall allow the Super Admin to register a new firm account with its
name, unique code, and address.

2.5. **(Planned)** The system shall allow the Super Admin to create the first Company Admin account
of a new firm.

2.6. **(Planned)** The system shall allow the Super Admin to suspend or reactivate a firm.

### 3. Team and Consultant Management

3.1. The system shall allow the Company Admin to add a Broker, Sales Manager, or Sales Person
account with first name, last name, email, and optional mobile number.

3.2. The system shall require every Sales Person to report to a Sales Manager, and every Sales
Manager to report to a Broker, of the same firm.

3.3. The system shall generate a temporary password for each new account and display it once to
the Company Admin.

3.4. The system shall generate a unique referral code for each new consultant.

3.5. The system shall allow the Company Admin to edit a consultant's name, mobile number, and
supervisor.

3.6. The system shall allow the Company Admin to deactivate and reactivate a consultant.

3.7. The system shall prevent the deactivation of a Sales Manager who still has active team members.

3.8. The system shall allow the Company Admin to generate a new referral code for a consultant,
which stops the old code from assigning inquiries.

3.9. The system shall display the team, with each member's role, supervisor, and credential status,
to the Company Admin and Broker, and a Sales Manager's own team to the Sales Manager.

### 4. Firm Settings

4.1. The system shall allow the Company Admin to set the firm's default loan calculator values:
interest rate, loan term, downpayment percentage, and income share for the loan.

4.2. The system shall allow the Company Admin to set the commission split percentages for deals
handled by a Sales Person and for deals handled by a Sales Manager.

4.3. The system shall require each commission split to total 100%.

4.4. The system shall allow the Company Admin to edit each developer's commission rate and
milestone percentages per payment method.

4.5. The system shall allow the Company Admin to set the withholding tax percentage deducted from
each commission share.

4.6. The system shall allow the Company Admin to set the closing estimate tax rates: capital gains
tax, documentary stamp tax, and local transfer tax.

4.7. The system shall apply changed settings only to deals created afterward, keeping each
existing deal's saved values.

---

## Module 1 – AI Document Processing and Verification

### 5. Document Upload

5.1. The system shall accept documents in PDF, JPG, PNG, and WebP format up to 10 MB.

5.2. The system shall verify a file's type from its content, not its file name, and reject
unsupported files.

5.3. The system shall store uploaded documents privately and open them only through links that
expire after five minutes.

5.4. The system shall flag a file that was already uploaded before.

### 6. Automatic Document Reading

6.1. The system shall read the text of every uploaded document automatically using optical
character recognition (OCR), including photos of paper documents.

6.2. The system shall convert PDF pages to images and clean up the image before reading it.

6.3. The system shall identify the type of each document from its text.

6.4. The system shall extract the key fields of each document type, with a confidence level for each field.

6.5. The system shall cross-check the extracted fields and raise flags for problems, including:
names that don't match the person, numbers that don't match what was entered, expired documents,
amounts that don't match, mismatched owner or lot area between property documents, unpaid taxes,
encumbrances on a title, and receipts already used for another payment.

6.6. The system shall classify each flag as blocking, warning, or information.

6.7. The system shall mark a document "Ready for review" or "Needs attention" based on its flags,
and shall never mark a document approved by itself.

6.8. The system shall send a document that couldn't be read to manual review instead of blocking it.

6.9. The system shall read documents without an internet connection.

### 7. Broker Review and Verification

7.1. The system shall provide the Broker a review queue of consultant credentials, project
licenses, and property and buyer documents, oldest first, with each item's flag summary.

7.2. The system shall display, side by side, the uploaded document, the text the system read, and
the extracted fields with their flags.

7.3. The system shall allow only a Broker to approve or reject a credential, a License to Sell, a
property document, or a buyer document.

7.4. The system shall allow the Broker to correct a misread field before approving, and keep both
the original and the corrected value.

7.5. The system shall require the Broker to give a reason when approving a document that has a
blocking issue.

7.6. The system shall require a reason when rejecting a document, and show the reason to the uploader.

7.7. The system shall prevent the approval of an expired credential or an expired License to Sell.

### 8. Consultant Credential Verification

8.1. The system shall allow the Company Admin to upload a consultant's PRC license or DHSUD
registration, with the number printed on it.

8.2. The system shall compare the name on the credential with the consultant's name and the
number on it with the number entered.

8.3. The system shall require the Broker to confirm the credential's expiry date when approving it.

8.4. The system shall show a consultant to the public only while they have an approved, unexpired credential.

8.5. The system shall show the Company Admin the credentials that have expired.

### 9. License to Sell Verification

9.1. The system shall allow the Company Admin to upload a project's License to Sell, and a renewal
before it expires.

9.2. The system shall allow only one License to Sell per project to wait for review at a time.

9.3. The system shall compare the project and developer named on the license with the project's records.

9.4. The system shall grant the "License to Sell" badge to all units of a project once its license
is approved, until the license expires.

9.5. The system shall keep a project's approved license in place when a renewal is rejected.

9.6. The system shall warn when a project's license expires within 30 days.

---

## Module 2 – Marketplace and Property Management

### 10. Developer, Project, and Unit Management

10.1. The system shall allow the Company Admin to add developers, and to add projects with a
location and map pin.

10.2. The system shall create default commission milestones for each new developer.

10.3. The system shall allow the Company Admin to add and edit units with project, type, model
name, total contract price, lot and floor area, bedrooms, bathrooms, barangay, and description.

10.4. The system shall allow the Company Admin to upload unit photos, choose the cover photo, and
delete photos, removing location data from every photo.

10.5. The system shall allow the Company Admin to add and delete the developer's sample payment
options for a unit, computing the monthly downpayment, loan amount, and monthly amortization.

10.6. The system shall publish a unit only when its project's License to Sell is approved and valid.

10.7. The system shall allow the Company Admin to unpublish a unit.

10.8. The system shall allow the other firm roles to view the firm's listings.

10.9. The system shall allow a consultant to copy a listing's referral link containing their referral code.

### 11. Public Marketplace

11.1. The system shall display the live listings of all active firms on one public marketplace.

11.2. The system shall hide listings that are unpublished, whose License to Sell has expired, or
whose firm is suspended.

11.3. The system shall allow the Property Seeker to search by barangay, project, or developer, and
to filter by property type, price, payment method, and badge.

11.4. The system shall allow the Property Seeker to sort listings and to view them as a list or on a map.

11.5. The system shall display a listing's details, photos, badges, sample payment options,
location, and listing firm.

11.6. The system shall provide a loan calculator that estimates the monthly payment using the
firm's default loan values, which the Property Seeker can change.

11.7. The system shall explain what each badge means and does not mean.

### 12. Inquiries and Consultant Selection

12.1. The system shall allow the Property Seeker to send an inquiry with name, mobile number,
optional email, type of work, intended payment method, civil status, and an optional message.

12.2. The system shall require consent to the privacy notice before an inquiry is sent.

12.3. The system shall route an inquiry on a private seller's listing to the agent the owner chose.

12.4. The system shall assign an inquiry made through a valid referral link to the consultant who
shared it, if that consultant is active and belongs to the listing's firm.

12.5. The system shall otherwise let the Property Seeker choose from the listing firm's verified
consultants, shown in a new random order each time.

12.6. The system shall never send an inquiry to a consultant of a firm other than the listing's firm.

12.7. The system shall display each consultant's verified credentials, average rating (or "New"),
and number of completed sales.

12.8. The system shall limit repeated inquiries from the same device and block automated submissions.

12.9. The system shall create a lead for the chosen consultant and show it on their dashboard immediately.

### 13. Private Seller Listing

13.1. The system shall allow the Property Owner to submit a property for listing without logging in.

13.2. The system shall accept a property for listing only if the owner has its land title.

13.3. The system shall capture the property type, barangay, city, lot and floor area, asking price,
and up to eight photos, plus the owner's name, mobile number, optional email, and consent.

13.4. The system shall let the Property Owner choose an agent from the verified consultants of all
firms, shown in a random order.

13.5. The system shall allow only the chosen agent to accept or decline the request, with a reason
when declining.

13.6. The system shall require the agent to upload the land title, tax declaration, real property
tax receipt, and the owner's ID, and to set the listing title and map pin before sending it to the Broker.

13.7. The system shall publish a private seller's listing only after the Broker approves all four documents.

13.8. The system shall grant the badges "Title clean", "Taxes current", and "Ownership verified"
according to the documents the Broker approved.

13.9. The system shall return a rejected listing to the agent with the Broker's reason so it can be corrected and resent.

---

## Module 3 – Sales, Client, and Commission Management

### 14. Lead Management

14.1. The system shall display leads to each consultant (own), Sales Manager (own and team),
Company Admin and Broker (whole firm).

14.2. The system shall allow the consultant handling a lead to update its status: New, Contacted,
Qualified, Visit scheduled, or Lost with a reason.

14.3. The system shall allow only the handling consultant to update a lead.

14.4. The system shall allow leads to be filtered by status.

### 15. Site Visit Scheduling

15.1. The system shall allow a consultant to request a site visit for their open lead with a future
date and time and optional notes.

15.2. The system shall warn when the same consultant has another visit within one hour, without
blocking the request.

15.3. The system shall allow only the Company Admin to approve or decline a visit request, with a
reason when declining.

15.4. The system shall move a lead to "Visit scheduled" when its visit is approved.

15.5. The system shall allow the consultant to record a visit as completed or a no-show after the visit time.

15.6. The system shall allow the consultant to reschedule a visit, creating a new request for approval.

15.7. The system shall allow the consultant or the Company Admin to cancel a pending or approved visit.

15.8. The system shall display visits in a month calendar and a list.

### 16. Client Conversion and Requirements Checklist

16.1. The system shall allow the handling consultant to convert a lead into a client by uploading
the reservation receipt.

16.2. The system shall read the amount and date from the reservation receipt and pre-fill them for
the consultant to confirm.

16.3. The system shall require the total contract price, payment method, and civil status, plus
the employment type and required downpayment for bank and Pag-IBIG loans.

16.4. The system shall generate the client's requirements checklist from the payment method, civil
status, and employment type.

16.5. The system shall update the checklist when the payment method, civil status, or employment
type changes, keeping documents already uploaded.

16.6. The system shall allow the handling consultant to upload a document for each checklist item.

16.7. The system shall allow only the Broker to verify or waive a checklist item, with a reason when waiving.

16.8. The system shall return a rejected document's checklist item to "Missing".

16.9. The system shall display each client's checklist progress and payments.

### 17. Buyer Payments

17.1. The system shall allow the handling consultant to record a payment by kind (downpayment,
full cash payment, installment, loan release, or other) by uploading its receipt.

17.2. The system shall read the amount, date, and official receipt number from the receipt and
pre-fill them for the consultant to confirm.

17.3. The system shall count a payment toward the commission milestones only after the consultant confirms it.

17.4. The system shall prevent the confirmation of a receipt whose number was already used for
another payment in the firm.

### 18. Commission Computation and Tranches

18.1. The system shall create the commission when a client is converted, computing the gross
commission as the total contract price times the developer's commission rate.

18.2. The system shall divide the commission into tranches according to the developer's milestones
for the client's payment method.

18.3. The system shall split each tranche among the Broker, Sales Manager, and Sales Person
according to who handles the client, and save the split at conversion.

18.4. The system shall compute all amounts to the centavo, placing any rounding difference on the last tranche.

18.5. The system shall release a tranche for payout only when its payment milestone is reached and
the required documents are verified or waived.

18.6. The system shall mark a tranche "Waiting for payment", "Documents missing", "Waiting for
transmittal", "Ready for voucher", or "Released".

18.7. The system shall re-evaluate a client's tranches whenever a payment is confirmed, a
requirement is decided, or a transmittal is confirmed.

18.8. The system shall show each consultant only the commissions they are paid from, at their own share.

### 19. Developer Transmittal

19.1. The system shall allow the Company Admin to upload the developer's transmittal for a tranche
that is waiting for it.

19.2. The system shall read the transmittal amount and compare it with the tranche amount.

19.3. The system shall require an explanation when the confirmed amount differs from the tranche by more than ₱1.

19.4. The system shall show the Broker and Company Admin how long each tranche has waited for its
transmittal, grouped into 0–30, 31–60, 61–90, and over 90 days.

### 20. Commission Voucher and E-Signature

20.1. The system shall allow the Broker to prepare a voucher for a tranche that is ready, with
optional extra deductions per person.

20.2. The system shall compute each person's share, the withholding tax, and the net amount on the voucher.

20.3. The system shall require the Broker to sign the voucher before any payee.

20.4. The system shall accept a signature only when the signer types their full name as registered.

20.5. The system shall record each signature's name, date and time, device, and a fingerprint of the voucher's contents.

20.6. The system shall clear all signatures when the voucher's deductions are changed.

20.7. The system shall mark the tranche "Released" when the Broker and every payee have signed.

20.8. The system shall not transfer or hold money; a released voucher records a payout made outside the system.

### 21. Closing and Transfer

21.1. The system shall allow the handling consultant to compute an estimate of the transfer costs:
capital gains tax, documentary stamp tax, local transfer tax, and registration fee, and who usually pays each.

21.2. The system shall compute the taxes on the selling price, or on a higher tax base entered by the consultant.

21.3. The system shall save the tax rates used in each estimate.

21.4. The system shall provide a closing checklist of seven steps: deed of sale signed, capital
gains and documentary stamp tax paid, tax clearance (eCAR) obtained, transfer tax paid, title
transferred, new tax declaration issued, and keys turned over.

21.5. The system shall record who completed each closing step and when.

21.6. The system shall mark the client "Completed" when all seven steps are done, and prevent
further changes to the closing record and the client's terms.

> **Pending decision:** the prototype allows closing to start at any time. A rule that closing
> starts only after full payment (or loan release for bank and Pag-IBIG buyers) has been proposed.
> If adopted, add: "The system shall allow closing to start only when the client has fully paid
> or the loan has been released."

### 22. Buyer Rating

22.1. The system shall create a one-time rating link when a sale is completed.

22.2. The system shall make the rating link expire after 30 days and work only once.

22.3. The system shall allow the handling consultant or the Company Admin to create a new link,
which cancels the previous one.

22.4. The system shall allow the Property Seeker to rate the agent from 1 to 5 stars with an
optional comment, after giving consent.

22.5. The system shall accept one rating per completed sale.

22.6. The system shall display each consultant's average rating to one decimal and the number of ratings.

### 23. Dashboards and Reports

23.1. The system shall display to each role a "Do next" list of their pending tasks, most urgent first.

23.2. The system shall display how many deals are at each stage of a sale: lead, visit, documents,
commission, closing, and completed.

23.3. The system shall display to the Broker the items waiting for review and the commissions
ready for a voucher or signature.

23.4. The system shall provide the Company Admin, Broker, and Sales Manager a monthly report of
reservations and total contract price, new leads, completed sales, and released commissions.

23.5. The system shall provide a pipeline report of leads and clients by status, filterable by
consultant and payment method.

23.6. The system shall provide a team performance report per consultant: open leads, active
clients, reservations this month, and completed sales.

23.7. The system shall limit a Sales Manager's reports to their own team.

### 24. Audit Trail

24.1. The system shall record every approval, rejection, signature, status change, upload, and
settings change with who did it and when.

24.2. The system shall allow the Company Admin and Broker to view their firm's activity log.

24.3. The system shall not store passwords, document contents, or buyer personal details in the activity log.
