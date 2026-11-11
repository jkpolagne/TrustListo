# Use Case Scenarios

Scenarios marked **(Planned)** are part of the design but are not yet in the prototype.

---

## Super Admin

### 1. Scenario: Manage Company Account (Planned)

**a. Actor(s):** Super Admin

**b. Precondition:** The Super Admin is logged into the Super Admin dashboard.

**c. Postcondition:** A company account is created, updated, or activated/suspended in the system.

**d. Steps:**\
i. The Super Admin opens the Firms page.\
ii. The Super Admin selects Add Company or selects an existing company record.\
iii. The Super Admin enters or updates the company name, code, and address.\
iv. The system checks the company information.\
v. The system saves the company record.\
vi. For a new company, the Super Admin enters the details of its first Company Admin.\
vii. The system creates the Company Admin account and shows a temporary password.\
viii. The system displays a confirmation message.

### 2. Scenario: View Firm List

**a. Actor(s):** Super Admin

**b. Precondition:** The Super Admin is logged into the Super Admin dashboard.

**c. Postcondition:** The Super Admin has seen the list of firms on the platform.

**d. Steps:**\
i. The Super Admin opens the Firms page.\
ii. The system shows the total number of firms, users, and live listings.\
iii. The system lists each firm with its status, number of users, number of live listings, and the date it joined.\
iv. The Super Admin reviews the list.

### 3. Scenario: View Platform Activity Logs (Planned)

**a. Actor(s):** Super Admin

**b. Precondition:** The Super Admin is logged into the Super Admin dashboard.

**c. Postcondition:** The Super Admin has reviewed the record of platform-level events.

**d. Steps:**\
i. The Super Admin opens the Platform Logs page.\
ii. The system gets the platform-level events, newest first. Events inside a firm, such as its clients or documents, are not included.\
iii. The system shows each event with its type, the user who did it, and the date and time.\
iv. The Super Admin moves through the pages of the log.\
v. The Super Admin reviews the log entries.

---

## All Firm Users

### 4. Scenario: Log In

**a. Actor(s):** Company Admin, Broker, Sales Manager, Sales Person, Super Admin

**b. Precondition:** The user has an account in the system.

**c. Postcondition:** The user is logged in and sees the dashboard for their role.

**d. Steps:**\
i. The user opens the website and clicks Firm sign-in.\
ii. The user enters their email and password and clicks Sign in.\
iii. The system checks if the account is locked because of too many failed attempts.\
iv. The system checks the email and password.\
v. If the details are wrong, the system shows an error message and the user tries again.\
vi. The system checks that the account is active and that the firm is not suspended.\
vii. The system starts the user's session and records the login.\
viii. The system opens the dashboard for the user's role.

### 5. Scenario: Change Password

**a. Actor(s):** Company Admin, Broker, Sales Manager, Sales Person

**b. Precondition:** The user is logged in.

**c. Postcondition:** The user's password is changed.

**d. Steps:**\
i. The user opens the Account page.\
ii. The user enters their current password and a new password.\
iii. The user clicks Change password.\
iv. The system checks the current password and the new password.\
v. The system saves the new password and records the change.\
vi. The system displays a confirmation message.

### 6. Scenario: Log Out

**a. Actor(s):** Company Admin, Broker, Sales Manager, Sales Person, Super Admin

**b. Precondition:** The user is logged in.

**c. Postcondition:** The user's session has ended.

**d. Steps:**\
i. The user clicks the sign-out button at the bottom of the menu.\
ii. The system ends the session.\
iii. The system returns the user to the sign-in page.

### 7. Scenario: View To-Do List

**a. Actor(s):** Company Admin, Sales Manager, Sales Person

**b. Precondition:** The user is logged in.

**c. Postcondition:** The user knows which tasks need their action.

**d. Steps:**\
i. The user opens the Overview page.\
ii. The system shows how many deals are at each stage: lead, visit, documents, commission, closing, and completed.\
iii. The system lists the user's pending tasks under Do next, with the most urgent first.\
iv. The system lists the items that are waiting on other people.\
v. The user clicks the button beside a task to go to the page where it is done.

---

## Company Admin

### 8. Scenario: Add Consultant

**a. Actor(s):** Company Admin

**b. Precondition:** The Company Admin is logged in.

**c. Postcondition:** A new broker, sales manager, or sales person account is created.

**d. Steps:**\
i. The Company Admin opens the Team page and clicks Add consultant.\
ii. The Company Admin chooses the role.\
iii. The Company Admin chooses who the person reports to: a broker for a sales manager, or a sales manager for a sales person.\
iv. The Company Admin enters the first name, last name, email, and mobile number.\
v. The system checks the details.\
vi. The system creates the account with a temporary password and a referral code.\
vii. The system shows the temporary password once.\
viii. The Company Admin gives the temporary password to the consultant.

### 9. Scenario: Manage Consultant Account

**a. Actor(s):** Company Admin

**b. Precondition:** The consultant already has an account in the firm.

**c. Postcondition:** The consultant's details, status, or referral code are updated.

**d. Steps:**\
i. The Company Admin opens the Team page and selects a consultant.\
ii. The Company Admin updates the name, mobile number, or supervisor, deactivates or reactivates the account, or creates a new referral code.\
iii. The system checks the change. A sales manager who still has active team members cannot be deactivated.\
iv. The system saves the change and records it in the activity log.\
v. The system displays the updated consultant record.

### 10. Scenario: Upload Consultant Credential

**a. Actor(s):** Company Admin

**b. Precondition:** The consultant's account exists.

**c. Postcondition:** The credential is uploaded, read by the system, and waiting for the Broker.

**d. Steps:**\
i. The Company Admin opens the consultant's record.\
ii. The Company Admin chooses the credential type: PRC license or DHSUD registration.\
iii. The Company Admin enters the number on the document and attaches a scan or photo.\
iv. The Company Admin clicks Upload credential.\
v. The system checks the file type and size.\
vi. The system reads the document and compares the name and number.\
vii. The system adds the credential to the Broker's review queue.\
viii. The system displays a confirmation message.

### 11. Scenario: Add Developer

**a. Actor(s):** Company Admin

**b. Precondition:** The Company Admin is logged in.

**c. Postcondition:** A developer is added.

**d. Steps:**\
i. The Company Admin opens Listings and clicks Developers and projects.\
ii. The Company Admin enters the developer's name and clicks Add developer.\
iii. The system checks that the firm doesn't already have a developer with that name.\
iv. The system saves the developer and creates its default commission milestones.\
v. The system shows the developer in the list.

### 12. Scenario: Manage Project Records

**a. Actor(s):** Company Admin

**b. Precondition:** The developer of the project already exists.

**c. Postcondition:** A project is added to the developer.

**d. Steps:**\
i. The Company Admin opens Developers and projects.\
ii. The Company Admin chooses the developer and enters the project name and location.\
iii. The Company Admin clicks the project's location on the map.\
iv. The Company Admin clicks Add project.\
v. The system checks the details and saves the project.\
vi. The system shows the project with the note that it has no approved License to Sell yet.

### 13. Scenario: Upload License to Sell

**a. Actor(s):** Company Admin

**b. Precondition:** The project exists, and no other License to Sell for it is waiting for review.

**c. Postcondition:** The License to Sell is read by the system and waiting for the Broker.

**d. Steps:**\
i. The Company Admin opens Developers and projects.\
ii. The Company Admin clicks Upload license to sell on the project, or Upload renewal.\
iii. The Company Admin chooses the file.\
iv. The system checks the file type and size.\
v. The system reads the license and checks the project, the developer, and the expiry date.\
vi. The system adds the license to the Broker's review queue.\
vii. The system shows that the license is waiting for the Broker.

### 14. Scenario: Manage Unit Listing

**a. Actor(s):** Company Admin

**b. Precondition:** The project exists.

**c. Postcondition:** The unit is saved with its details, photos, and payment options.

**d. Steps:**\
i. The Company Admin opens Listings and clicks Add unit, or selects an existing unit.\
ii. The Company Admin chooses the project and type, and enters the model name, price, areas, bedrooms, bathrooms, barangay, and description.\
iii. The Company Admin clicks Save and continue.\
iv. The system checks the details and saves the unit as a draft.\
v. The Company Admin adds photos and chooses the cover photo.\
vi. The system removes the location data from the photos and saves them.\
vii. The Company Admin adds the developer's sample payment options.\
viii. The system computes the monthly downpayment, loan amount, and monthly payment, and saves the option.

### 15. Scenario: Publish or Unpublish Unit

**a. Actor(s):** Company Admin

**b. Precondition:** The unit is saved.

**c. Postcondition:** The unit is shown on or removed from the public marketplace.

**d. Steps:**\
i. The Company Admin opens the unit.\
ii. The Company Admin clicks Publish to marketplace, or Unpublish.\
iii. When publishing, the system checks that the project's License to Sell is approved and not expired.\
iv. If the license is not approved or has expired, the system shows a message and the unit stays a draft.\
v. The system updates the unit's status and records the change.\
vi. The system shows the new status and the link to the public page.

### 16. Scenario: Approve or Decline Site Visit

**a. Actor(s):** Company Admin

**b. Precondition:** A consultant has requested a visit.

**c. Postcondition:** The visit is approved or declined.

**d. Steps:**\
i. The Company Admin opens the Visits page or the task on the Overview.\
ii. The Company Admin reviews the visit request.\
iii. The Company Admin clicks Approve, or clicks Decline and enters the reason.\
iv. The system saves the decision and records it.\
v. If approved, the system moves the lead to Visit scheduled.\
vi. The system shows the updated visit.

### 17. Scenario: Upload Developer Transmittal

**a. Actor(s):** Company Admin

**b. Precondition:** A commission tranche is waiting for the developer's transmittal.

**c. Postcondition:** The transmittal amount is confirmed and the tranche is ready for a voucher.

**d. Steps:**\
i. The Company Admin opens the commission from the Overview task or the Commissions page.\
ii. The Company Admin clicks Upload transmittal and chooses the file.\
iii. The system reads the amount on the transmittal.\
iv. The system shows the amount read beside the tranche amount.\
v. The Company Admin checks the amount and clicks Confirm amount.\
vi. If the amount differs by more than ₱1, the system asks for the reason.\
vii. The system saves the amount and updates the tranche to Ready for voucher.

### 18. Scenario: Manage Firm Settings

**a. Actor(s):** Company Admin

**b. Precondition:** The Company Admin is logged in.

**c. Postcondition:** The firm's settings are updated.

**d. Steps:**\
i. The Company Admin opens the Settings page.\
ii. The Company Admin updates the loan calculator values, the commission split, the milestones per developer, the withholding tax, or the closing tax rates.\
iii. The Company Admin clicks the save button of that section.\
iv. The system checks the values. For example, each commission split must add up to 100%.\
v. The system saves the settings and records the change.\
vi. The system displays a confirmation message. The new values apply only to deals made after the change.

### 19. Scenario: View Reports

**a. Actor(s):** Company Admin, Broker, Sales Manager

**b. Precondition:** The user is logged in.

**c. Postcondition:** The user has reviewed the firm's or team's sales figures.

**d. Steps:**\
i. The user opens the Reports page.\
ii. The user chooses the month.\
iii. The system shows the reservations, new leads, completed sales, and released commissions for that month.\
iv. The user filters the pipeline by consultant or payment method.\
v. The system shows the number of leads and clients at each status.\
vi. The system shows each consultant's open leads, active clients, reservations, and completed sales. A Sales Manager sees only their own team.

### 20. Scenario: View Activity Log

**a. Actor(s):** Company Admin, Broker

**b. Precondition:** The user is logged in.

**c. Postcondition:** The user has reviewed the firm's recorded actions.

**d. Steps:**\
i. The user opens the Activity log page.\
ii. The system gets the firm's recorded actions, newest first.\
iii. The system shows each action with who did it, what changed, and when.\
iv. The user reviews the entries.

---

## Broker

### 21. Scenario: Review Consultant Credential

**a. Actor(s):** Broker

**b. Precondition:** A credential has been uploaded and read by the system.

**c. Postcondition:** The credential is approved or rejected.

**d. Steps:**\
i. The Broker opens the Review queue and selects the credential.\
ii. The system shows the document, the text it read, the fields it found, and any problems it flagged.\
iii. The Broker compares the document with the details.\
iv. To approve, the Broker checks the number and the valid-until date and clicks Approve credential. If there is a blocking problem, the Broker must explain why they still approve.\
v. To reject, the Broker clicks Reject, enters the reason, and clicks Reject credential.\
vi. The system checks the decision. An expired credential cannot be approved.\
vii. The system saves the decision and records it.\
viii. If approved, the consultant becomes visible to buyers. If rejected, the Company Admin sees the reason.

### 22. Scenario: Review Document

**a. Actor(s):** Broker

**b. Precondition:** A License to Sell or a buyer's document has been uploaded and read by the system.

**c. Postcondition:** The document is approved or rejected.

**d. Steps:**\
i. The Broker opens the Review queue and selects the document.\
ii. The system shows the document, the text it read, the fields it found, and any problems it flagged.\
iii. The Broker corrects any field the system read wrongly.\
iv. The Broker clicks Approve, or clicks Reject and enters the reason.\
v. The system checks the decision. An expired License to Sell cannot be approved.\
vi. The system saves the decision and records it.\
vii. For a License to Sell, the system gives the badge to the project's units.\
viii. For a buyer's document, the system marks the checklist item as verified or missing, and updates the commission status.

### 23. Scenario: Waive Requirement

**a. Actor(s):** Broker

**b. Precondition:** The client has a checklist item that is not yet verified.

**c. Postcondition:** The item is waived and no longer holds the commission.

**d. Steps:**\
i. The Broker opens the client's page.\
ii. The Broker clicks Waive on the checklist item.\
iii. The Broker enters the reason the buyer doesn't need it.\
iv. The system marks the item as waived and records the reason.\
v. The system updates the commission status.

### 24. Scenario: Review Seller Listing

**a. Actor(s):** Broker

**b. Precondition:** An agent has sent a private seller's listing with all four documents.

**c. Postcondition:** The listing is published or returned to the agent.

**d. Steps:**\
i. The Broker opens the Review queue and selects the listing under Listings waiting to go live.\
ii. The Broker opens each document and approves or rejects it.\
iii. When all four documents are approved, the Broker clicks Approve and publish.\
iv. The system checks that all four documents are approved.\
v. The system publishes the listing with the badges it earned and records it.\
vi. To return the listing, the Broker enters what the agent should fix and rejects it. The system sends it back to the agent.

### 25. Scenario: Prepare Commission Voucher

**a. Actor(s):** Broker

**b. Precondition:** A commission tranche is ready for a voucher.

**c. Postcondition:** The voucher is prepared and signed by the Broker.

**d. Steps:**\
i. The Broker opens the Commissions page and selects the deal.\
ii. The Broker adds other deductions if needed and clicks Prepare voucher.\
iii. The system computes each person's share, the withholding tax, and the net amount.\
iv. The Broker checks the voucher, types their full name, and clicks Sign voucher.\
v. The system checks that the name matches the Broker's name.\
vi. The system records the signature with the date, time, and device.\
vii. The system shows the voucher as waiting for the other signatures.

---

## Sales Manager and Sales Person

### 26. Scenario: Manage Lead

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** A buyer's inquiry has been assigned to the consultant.

**c. Postcondition:** The lead's status is updated.

**d. Steps:**\
i. The consultant opens the lead from the Overview or the Leads page.\
ii. The consultant calls the buyer.\
iii. The consultant clicks I've talked to them, or changes the status to Qualified or Lost.\
iv. For a lost lead, the consultant enters the reason.\
v. The system saves the status and records it.\
vi. The system shows the next step for the lead.

### 27. Scenario: Request Site Visit

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The consultant has an open lead.

**c. Postcondition:** The visit request is waiting for the Company Admin.

**d. Steps:**\
i. The consultant opens the lead.\
ii. The consultant enters the date and time of the visit and any notes.\
iii. The consultant clicks Request visit.\
iv. The system checks that the date is in the future and the lead is still open.\
v. The system warns if the consultant has another visit within one hour.\
vi. The system saves the request as pending and records it.

### 28. Scenario: Update Site Visit

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The consultant has a pending or approved visit.

**c. Postcondition:** The visit is completed, marked as no-show, moved, or cancelled.

**d. Steps:**\
i. The consultant opens the Visits page.\
ii. After the visit time, the consultant clicks Visit done or Buyer didn't come.\
iii. Before the visit, the consultant can move it to a new date and time, or cancel it.\
iv. The system checks the change.\
v. The system saves the visit and records it. A moved visit becomes a new request for the Company Admin to approve.

### 29. Scenario: Convert Lead to Client

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The buyer has paid the reservation fee.

**c. Postcondition:** The buyer is a client with a requirements checklist and a commission record.

**d. Steps:**\
i. The consultant opens the lead and uploads the reservation receipt under The buyer reserved.\
ii. The system reads the amount and date from the receipt and fills them in.\
iii. The consultant checks the amount and enters the contract price, payment method, and civil status.\
iv. For a bank or Pag-IBIG loan, the consultant also enters the employment type and the required downpayment.\
v. The consultant clicks Make client.\
vi. The system checks the details and the receipt.\
vii. The system creates the client, records the reservation payment, and marks the lead as reserved.\
viii. The system creates the requirements checklist and the commission with its tranches.\
ix. The system opens the client's page.

### 30. Scenario: Upload Buyer Requirement

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The client has a checklist item that is missing a document.

**c. Postcondition:** The document is uploaded, read by the system, and waiting for the Broker.

**d. Steps:**\
i. The consultant opens the client's page.\
ii. The consultant clicks Upload beside the checklist item and chooses the file.\
iii. The system checks the file type and size.\
iv. The system reads the document and checks the name against the client.\
v. The system marks the item as waiting for the Broker, or as flagged if it found a problem.\
vi. The system adds the document to the Broker's review queue.

### 31. Scenario: Record Buyer Payment

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The client has made a payment.

**c. Postcondition:** The payment is confirmed and counted.

**d. Steps:**\
i. The consultant opens the client's page.\
ii. The consultant chooses the kind of payment and clicks Upload receipt.\
iii. The system reads the receipt number, date, and amount and fills them in.\
iv. The system checks that the receipt number was not used before in the firm.\
v. The consultant checks the amount and date and clicks Confirm.\
vi. The system records the payment and updates the commission status.

### 32. Scenario: Respond to Seller Request

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** A property owner chose the consultant as their agent.

**c. Postcondition:** The request is accepted or declined.

**d. Steps:**\
i. The consultant opens the request from the Overview or the Seller requests page.\
ii. The consultant reviews the property details and photos.\
iii. The consultant clicks Accept request, or clicks Decline and enters the reason.\
iv. The system saves the decision and records it.

### 33. Scenario: Prepare Seller Listing

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The consultant has accepted the seller's request.

**c. Postcondition:** The listing is sent to the Broker for review.

**d. Steps:**\
i. The consultant opens the request.\
ii. The consultant uploads the land title, tax declaration, real property tax receipt, and the seller's ID.\
iii. The system reads each document and checks the owner's name, the lot area, and the taxes.\
iv. The consultant enters the listing title and description and clicks the location on the map.\
v. The consultant clicks Send to broker.\
vi. The system checks that all four documents are uploaded and read.\
vii. The system sends the listing to the Broker's review queue.

### 34. Scenario: Share Referral Link

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The consultant has a referral code and the listing is live.

**c. Postcondition:** The consultant has a link that assigns new inquiries to them.

**d. Steps:**\
i. The consultant opens the Listings page.\
ii. The consultant clicks the copy link button on a live listing.\
iii. The system copies the listing link with the consultant's referral code.\
iv. The consultant shares the link with a buyer.

### 35. Scenario: Sign Commission Voucher

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The Broker has prepared and signed the voucher, and the consultant is one of the payees.

**c. Postcondition:** The consultant's signature is recorded. When all payees have signed, the tranche is released.

**d. Steps:**\
i. The consultant opens the voucher from the Overview or the My commissions page.\
ii. The consultant checks their share, the deductions, and the net amount.\
iii. The consultant types their full name and clicks Sign voucher.\
iv. The system checks that the Broker signed first, the name matches, and the voucher has not changed.\
v. The system records the signature with the date, time, and device.\
vi. When every payee has signed, the system marks the tranche as released.

### 36. Scenario: View Commissions

**a. Actor(s):** Sales Manager, Sales Person, Company Admin, Broker

**b. Precondition:** The user is logged in.

**c. Postcondition:** The user has seen the status of the commissions.

**d. Steps:**\
i. The user opens the Commissions or My commissions page.\
ii. The system shows the totals by status. A consultant sees only their own share.\
iii. The user filters the tranches by status.\
iv. The user selects a deal.\
v. The system shows each tranche's progress, the split, and the voucher.

### 37. Scenario: Close the Sale

**a. Actor(s):** Sales Manager, Sales Person

**b. Precondition:** The property is ready to be transferred to the buyer.

**c. Postcondition:** The sale is completed and a rating link is created.

**d. Steps:**\
i. The consultant opens the client's page and clicks Start closing.\
ii. The consultant enters the selling price, the tax base if it is higher, and the registration fee, then clicks Save estimate.\
iii. The system computes the capital gains tax, documentary stamp tax, and transfer tax, and shows who usually pays each.\
iv. The system marks the client as in closing.\
v. The consultant ticks each transfer step as it is done.\
vi. The system records who ticked each step and when.\
vii. On the last step, the consultant confirms that the sale is complete.\
viii. The system marks the client as completed and creates a one-time rating link.

### 38. Scenario: Send Rating Link

**a. Actor(s):** Sales Manager, Sales Person, Company Admin

**b. Precondition:** The sale is completed and the buyer has not rated it yet.

**c. Postcondition:** The buyer has a link to rate the agent.

**d. Steps:**\
i. The user opens the client's page.\
ii. The user copies the rating link, or clicks Create a new link if the old one was lost or expired.\
iii. The system creates a new link and stops the old one from working.\
iv. The user sends the link to the buyer by email or message.

---

## Property Seeker

### 39. Scenario: Browse Properties

**a. Actor(s):** Property Seeker

**b. Precondition:** None. The Property Seeker does not need an account.

**c. Postcondition:** The Property Seeker has seen the listings that match their search.

**d. Steps:**\
i. The Property Seeker opens Browse homes.\
ii. The system shows the live listings of all firms.\
iii. The Property Seeker searches by barangay, project, or developer, or filters by type, price, payment method, or badge.\
iv. The system shows the matching listings as a list or on a map.\
v. The Property Seeker opens a listing.\
vi. The system shows the details, photos, badges, payment options, and location.

### 40. Scenario: Compute Loan Estimate

**a. Actor(s):** Property Seeker

**b. Precondition:** The Property Seeker is viewing a listing.

**c. Postcondition:** The Property Seeker has an estimate of the monthly payment.

**d. Steps:**\
i. The Property Seeker goes to the loan calculator on the listing.\
ii. The system fills in the firm's default rate, term, and downpayment.\
iii. The Property Seeker changes the values if needed.\
iv. The system computes the downpayment, the loan amount, and the monthly payment.

### 41. Scenario: Send Inquiry

**a. Actor(s):** Property Seeker

**b. Precondition:** The Property Seeker is viewing a live listing.

**c. Postcondition:** The inquiry is sent to a consultant of the listing's firm.

**d. Steps:**\
i. The Property Seeker clicks Send an inquiry.\
ii. The system decides who gets the inquiry. A private seller's listing goes to the seller's chosen agent, and a referral link goes to the consultant who shared it.\
iii. Otherwise, the system shows the firm's verified consultants in random order, and the Property Seeker chooses one.\
iv. The Property Seeker enters their name, mobile number, work, payment plan, and civil status, and agrees to the privacy notice.\
v. The Property Seeker clicks Send inquiry.\
vi. The system checks the inquiry.\
vii. The system creates a lead for the consultant.\
viii. The system shows who the inquiry was sent to.

### 42. Scenario: Rate Agent

**a. Actor(s):** Property Seeker

**b. Precondition:** The Property Seeker received a rating link after their sale was completed.

**c. Postcondition:** The rating is saved and added to the agent's average.

**d. Steps:**\
i. The Property Seeker opens the rating link.\
ii. The system checks that the link is valid, unused, and not expired.\
iii. The system shows the agent's name and the property.\
iv. The Property Seeker chooses 1 to 5 stars, writes an optional comment, and agrees to the privacy notice.\
v. The Property Seeker clicks Send rating.\
vi. The system saves the rating and closes the link.\
vii. The system displays a thank-you message.

---

## Property Owner

### 43. Scenario: Submit Property for Listing

**a. Actor(s):** Property Owner

**b. Precondition:** The Property Owner has the land title of the property. No account is needed.

**c. Postcondition:** The request is sent to the agent the owner chose.

**d. Steps:**\
i. The Property Owner opens List your property.\
ii. The Property Owner answers that they have the land title. Without a title, the system explains that the property cannot be listed yet.\
iii. The Property Owner enters the property type, barangay, city, areas, and asking price, and adds photos.\
iv. The system shows the verified agents of all firms in random order.\
v. The Property Owner chooses an agent.\
vi. The Property Owner enters their name and mobile number and agrees to the privacy notice.\
vii. The Property Owner clicks Send to the agent.\
viii. The system checks the request and sends it to the chosen agent.\
ix. The system displays a confirmation message.

---

## System

### 44. Scenario: Read Uploaded Document

**a. Actor(s):** System

**b. Precondition:** A user has uploaded a document.

**c. Postcondition:** The document is read and waiting for a person's decision.

**d. Steps:**\
i. The system stores the document privately.\
ii. The system prepares the image and reads the text.\
iii. If the text cannot be read, the system marks it for manual review.\
iv. The system identifies the type of document.\
v. The system gets the important fields and how sure it is of each.\
vi. The system compares the fields with the records, such as names, numbers, dates, and amounts.\
vii. The system flags any problem it finds.\
viii. The system marks the document as ready for review, or as needing attention. It never approves the document.

### 45. Scenario: Update Commission Status

**a. Actor(s):** System

**b. Precondition:** A payment is confirmed, a buyer's document is decided, or a transmittal is confirmed.

**c. Postcondition:** Each tranche of the deal shows its correct status.

**d. Steps:**\
i. The system gets the client's confirmed payments, checklist, and tranches.\
ii. The system skips any tranche that already has a voucher.\
iii. The system checks if the payment milestone of each tranche is reached.\
iv. If not, the tranche stays waiting for payment.\
v. If the milestone is reached, the system checks if the required documents are verified or waived.\
vi. If not, the tranche is blocked because documents are missing.\
vii. If a developer transmittal is still needed, the tranche waits for the transmittal.\
viii. Otherwise, the tranche is ready for a voucher.\
ix. The system records any change in status.
