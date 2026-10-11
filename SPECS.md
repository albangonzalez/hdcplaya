# Hacienda del Carmen — Condo Web App

## 1. Purpose

A web app for the condominium Hacienda del Carmen (Playa del Carmen, Mexico) that gives owners a transparent view of the condo's finances, their own fees and the condo's documents, and gives the administrator one place to keep that information up to date.

## 2. Glossary

| Term | Meaning |
|---|---|
| Unit | A private property in the condo (apartment, house, commercial space). |
| Ownership share (indiviso) | The unit's share of the common property, as a number of shares out of 10,000. All ownership shares add up to 10,000 (100%). |
| Fee (cuota de mantenimiento) | The recurring amount a unit owes the condo. |
| Special assessment (cuota extraordinaria) | A one-off amount approved by the Asamblea, split between units. |
| Charge | What one unit owes: its share of a month's fee or of a special assessment. |
| Transaction | One movement of the condo's money: income, an expense, or a transfer between two of its accounts. |
| Ledger | The list of all transactions. |
| Comité de Vigilancia | Owners elected at an Asamblea General to oversee the administrator. |

## 3. Roles

There are three roles. Every user has exactly one account; the role decides what they see.

- **Owner** — owns one or more units. A unit can have several owners (co-owners), each with their own account.
- **Committee member** — an owner who currently sits on the Comité de Vigilancia. Has everything an owner has, plus oversight permissions. The admin marks and unmarks committee members after each Asamblea.
- **Administrator** — manages the condo's data. Is not necessarily an owner.

Tenants do not have accounts. They exist only as records attached to a unit (see 6.2).

### Permissions — minimal version

| Feature | Owner | Committee | Admin |
|---|---|---|---|
| Dashboard, including the list of units in debt | View | View | View |
| Own unit: fees, charges, payments, balance | View | View | View and edit |
| Other units' balances and overdue amounts | View | View | View and edit |
| Condo ledger, monthly result, account balances | View | View | View and edit |
| Supporting files on transactions | View | View | Upload |
| Supporting files marked restricted (e.g. payslips) | No | View | Upload |
| Tenants and licence plates of own unit | Edit | Edit | Edit (any unit) |
| Units, owners, ownership shares, parking spaces | No | View | Edit |
| Manage accounts and categories | No | No | Yes |
| Change history (audit trail) | No | View | View |
| Invite users, assign roles | No | No | Yes |

### Permissions — later versions

| Feature | Owner | Committee | Admin |
|---|---|---|---|
| Condo document library | View | View | Upload |
| Employee list and individual salaries | No | View | Edit |
| File a complaint | Yes | Yes | No |
| Handle complaints about owners or tenants | No | View | Yes |
| Handle complaints about the administration | No | Yes | Read only |

## 4. Accounts and access

- **Invite only.** There is no public sign-up. The admin creates an account by entering the person's e-mail and linking it to a unit; Supabase sends the invitation e-mail.
- **Sign-in methods.** E-mail and password, Google, or Facebook. If the invited e-mail matches a Google or Facebook account, that identity is linked to the same user automatically, so all three methods open the same account.
- **Uninvited sign-in is rejected.** Someone who signs in with Google or Facebook using an e-mail that was never invited gets no access and no account.
- **Password reset** by e-mail.
- **Deactivation.** The admin can deactivate an account (for example after a sale). A deactivated user cannot sign in; their history is kept.
- Every signed-out request is redirected to the login page.

## 5. Language and currency

- The interface is bilingual: Spanish and English. Each user picks a language; Spanish is the default.
- Content entered by the admin (transaction descriptions, file names) is stored as written and is not translated.
- All amounts are in Mexican pesos (MXN). Dates use the Cancún time zone.

## 6. Minimal version

The first version covers the six features below, plus the accounts and roles of sections 3 and 4. Everything in section 7 comes later.

### 6.1 Units, owners and parking (admin)

- Create and edit units: identifier, ownership share, and its parking spaces (each with a label).
- The app warns when ownership shares do not add up to 100%.
- Attach one or more owners to a unit; an owner can be attached to several units.
- Record a change of ownership with a date. The unit's balance stays with the unit.

### 6.2 Tenants and licence plates (owner)

- An owner can register the tenants of their unit: first name, first last name, optional second last name, contact, start and end date.
- An owner can register the licence plates allowed on each of the unit's parking spaces. A space can have several plates.
- The admin can see and edit these for every unit.

### 6.3 Fees and charges

- Regular fees are monthly. The admin defines the condo's monthly fee budget and the day of the month on which fees are due. Each unit's fee is **budget × the unit's ownership share**.
- The admin creates special assessments with a description, total amount and due date; each unit's share is also split by ownership share.
- When a split does not divide evenly, the leftover centavos go to the units with the largest remainders, so the shares always add up to the total.
- A month's fees cannot be generated twice for the same unit.
- Late-payment interest (moratorios) is not handled.

### 6.4 Payments and outstanding fees (admin records, owner views)

- Owners pay outside the app, by wire transfer or cash deposit. The admin records each payment: unit, amount, date, method, and optionally the proof of payment.
- The admin also chooses the account that received the payment.
- A recorded payment is applied to the unit's oldest unpaid charge first. Partial payments are allowed and leave a remaining balance.
- If a payment is larger than what the unit owes, the excess is kept as credit on the unit and applied automatically to its next charge.
- Each recorded payment creates the matching income transaction.
- An owner sees, for each of their units: fees and charges issued, payments recorded, what is currently due, and what is overdue.
- Outstanding amounts are always shown split in two: regular fees and special assessments.
- **Transparency rule.** Every owner can also see the current balance and overdue amount of every other unit.

### 6.5 Income and expenses (ledger)

- The admin adds income and expense transactions: date, amount, category, description and account.
- The admin maintains the list of the condo's accounts (currently two bank accounts; cash accounts are possible). An account's balance is its opening balance plus its transactions; there is no connection to the bank.
- **Transfers.** Moving money between two of the condo's accounts is recorded as a transfer. It lowers one account and raises the other by the same amount, and is not counted in income, expenses or the monthly result.
- The admin maintains the list of income and expense categories, each with a Spanish and an English name.
- Owners see, for every month: total income, total expenses, the result, and the balance of each account, with the list of transactions behind those totals.
- Salaries are entered by hand as expense transactions, like any other expense.
- **Month closing.** The admin can add, edit or cancel a month's transactions and payments until 7 days after the end of that month. After that the month is locked; a later correction is made as a new adjusting transaction in the current month.

### 6.6 Supporting files

- The admin can attach one or more files to a transaction or a recorded payment: invoice, ticket, receipt, proof of transfer (PDF or image).
- Anyone who can see the transaction can open its files.
- The admin can mark a file as restricted. A restricted file, such as a payslip, can be opened only by the Comité de Vigilancia and the admin; owners still see the transaction and its amount.

### 6.7 Dashboard

The same dashboard is shown to owners, committee members and the admin:

- The current month's income, expenses and result, and the balance of each account.
- **Units in debt:** every unit with an overdue amount, with its owners and the amount overdue, split into regular fees and special assessments.
- For an owner, the status of their own units comes first: what is due and what is overdue.

## 7. Later versions

Not built in the minimal version. The rules below are already agreed and are kept here so they are not lost.

### 7.1 Employees and salaries (admin)

- The admin manages employees: name, role, salary amount, pay frequency (fortnightly or monthly), pay day, start and end date.
- On each pay day the app automatically adds the salary as an expense transaction. It is added once per employee and pay period, and not after the employee's end date.
- The admin can correct an automatically created transaction and attach the payslip to it.
- Owners see salary expenses as amounts in the ledger. Payslips, the employee list and individual salaries are visible only to the Comité de Vigilancia and the admin.
- Aguinaldo, bonuses and deductions are not calculated; the admin enters them manually as transactions.

### 7.2 Document library

- The admin uploads the condo's documents and assigns each a category: Reglamento, Régimen de condominio, Minutas de Asamblea General, other.
- Owners can browse by category, search by name, and download.

### 7.3 Complaints

- An owner can file a complaint about the administration, another owner, or a tenant, with a description and evidence files (the one case where an owner uploads files).
- Complaints are never anonymous: the name of the person who filed it is shown to whoever handles it and to the person complained about.
- The person complained about is told: the complaint appears in their account. For a complaint about a tenant, the owners of that tenant's unit are told.
- Complaints about the administration are handled by the Comité de Vigilancia. The admin can read them but cannot edit, delete, respond to or change the status of them.
- Other complaints go to the admin; the committee can read them.
- A complaint has a status — open, in review, resolved, rejected — and a written response. The person who filed it sees the status and the response.

## 8. Cross-cutting rules

- **Audit trail.** Every creation, edit and deletion of a transaction, payment, fee, unit or owner, and every change of committee membership, records who did it and when. The committee can read this history.
- **No silent deletion.** Transactions and payments are cancelled with a reason, not deleted.
- **Files.** PDF and common image formats, with a size limit. A file is only reachable by a signed-in user whose role is allowed to see it.
- **Mobile.** Owner screens must work on a phone; admin screens may assume a desktop.

## 9. Technical decisions

- **Authentication:** Supabase Auth (invitations, e-mail/password, Google, Facebook). Public sign-up is disabled in the Supabase project.
- **Application data:** MongoDB. Each user record carries the Supabase user id.
- **Files:** a private Amazon S3 bucket. Files are served through the app with short-lived links after the permission check, never by public URL.
- **Frontend:** the existing Next.js app.

## 10. Data model

Eleven MongoDB collections cover the minimal version. Collection and field names are in English. All amounts are integers in centavos.

| Collection | Holds |
|---|---|
| `users` | Admins and owners; a committee member is an owner with a flag |
| `units` | Each property, with its owners, tenants and parking spaces embedded |
| `feeSettings` | Monthly budget and due day, versioned by start month |
| `specialAssessments` | One-off charges approved by the Asamblea |
| `charges` | What one unit owes: one per unit per month, or per special assessment |
| `payments` | Payments recorded by the admin, allocated to charges |
| `accounts` | The condo's bank and cash accounts |
| `categories` | Income and expense categories, named in both languages |
| `transactions` | Income, expenses and transfers between accounts |
| `files` | Metadata for files in S3, attached to a transaction or payment |
| `auditLogs` | Append-only history of every change |

```ts
// users
{
  _id,
  supabaseUserId,                 // unique, required, UUID string
  email,                          // unique, lowercase
  firstName,
  firstLastName,                  // required
  secondLastName,                 // optional
  role: "owner" | "admin",
  isCommittee: boolean,
  language: "es" | "en",
  status: "invited" | "active" | "deactivated",
  createdAt, updatedAt
}

// units
{
  _id, identifier,                // unique, e.g. "A-12"
  ownershipShare: number,         // integer, shares out of 10,000
  owners:  [{ userId, from: Date, to: Date | null }],
  tenants: [{
    _id, firstName, firstLastName, secondLastName,
    contact, from: Date, to: Date | null
  }],
  parkingSpaces: [{
    _id, label,
    plates: [{ _id, plate, note }]
  }],
  createdAt, updatedAt
}

// feeSettings
{ _id, effectiveFrom: "YYYY-MM", monthlyBudget, dueDay: 1..28 }

// specialAssessments
{ _id, description, total, dueDate, createdBy, createdAt }

// charges
{
  _id, unitId,
  kind: "regular" | "special",
  period: "YYYY-MM" | null,               // regular only
  specialAssessmentId: ObjectId | null,   // special only
  amount, paidAmount,
  dueDate,
  status: "open" | "partial" | "paid" | "cancelled"
}

// payments
{
  _id, unitId, date, amount,
  method: "wire" | "cash",
  accountId,
  allocations: [{ chargeId, amount }],    // oldest charge first
  unallocatedAmount,                      // credit, applied to the next charge
  transactionId,                          // the income transaction it created
  status: "active" | "cancelled", cancelReason,
  recordedBy, createdAt
}

// accounts
{ _id, name, type: "bank" | "cash", openingBalance, openingDate, active }

// categories
{ _id, kind: "income" | "expense", name: { es, en }, active,
  system: "fees" | null }               // "fees": used by recorded payments

// transactions
{
  _id,
  type: "income" | "expense" | "transfer",
  date, amount, description,
  accountId,                        // for a transfer: the source account
  toAccountId: ObjectId | null,     // transfer only: the destination account
  categoryId: ObjectId | null,      // null for a transfer
  paymentId: ObjectId | null,       // set when created by a payment
  status: "active" | "cancelled", cancelReason,
  createdBy, createdAt, updatedAt
}

// files
{
  _id, s3Key, originalName, mimeType, sizeBytes,
  restricted: boolean,                    // committee + admin only
  attachedTo: { type: "transaction" | "payment", id },
  uploadedBy, uploadedAt
}

// auditLogs
{ _id, actorId, action: "create" | "update" | "cancel",
  collection, documentId, before, after, at }
```

### Model rules

- **Users.** A user document is created when the admin sends the invitation, with the Supabase id already set. A Supabase user with no matching document has no access.
- **Ownership history.** An owner can appear in several units and a unit can list several owners; `from` and `to` keep the history.
- **Unique fees.** A unique index on `charges` (unit, kind, period) prevents a month's fees from being generated twice.
- **Recording a payment** writes the payment, updates the charges it pays and creates the income transaction together, in one database transaction.
- **Derived, not stored.** Account balances, monthly results and each unit's debt are computed from transactions and charges. The one stored exception is `charges.paidAmount`.
- **Month lock** is checked in code against the date of the transaction or payment; there is no stored "closed" flag.

## 11. Out of scope

- Tenant accounts.
- Paying fees inside the app.
- Any connection to the bank.
- Late-payment interest.
- Issuing tax invoices (CFDI).
- Notifications beyond the invitation and password e-mails.

## 12. Build order for the minimal version

1. Invitations and the three roles.
2. Units, owners, tenants and parking.
3. Income and expenses, accounts, supporting files.
4. Fees, special assessments, recorded payments and outstanding amounts.
5. Dashboard.
