# Feature audit — what is built, what is enforced, what is missing

Date: 2026-11-04 · Branch: `main` at `f68f1a3` (R3.2 merged) · Project: `vwdqrbtrykrdwpbxbypj`

## Method, and one honest caveat

The source specification PDF ("TechMaths DC Operations Portal — Product & Development Specification",
referenced as §6 / §10 / §18 in `WAVE2-3-OPERATIONS.md`) **is not in this workspace or this session**.
A search of the repository, its git history and the filesystem found no PDF. So this audit is
measured against the specification surface the repository itself encodes:

- the live database: **33 tables, 50 permission keys, 72 functions, RLS on every table**;
- the three specification-driven wave documents (`WAVE2-3-OPERATIONS.md`, `V2-CONTROL-ROOM.md`,
  `V3-MONEY.md`) and the specification-section references they carry;
- the code: **21 routes**, 7 API routes, 15 portal components.

Re-attach the PDF and this becomes a line-by-line diff. Until then, treat the "missing" column as
"no surface exists in the build", not as a judgement about the original wording.

## Where the build stands

| Release | Scope | State |
| --- | --- | --- |
| Marketing site | 22 spec pages, 187 URLs, services × country pages, SEO/JSON-LD, lead pipeline, HubSpot | Live |
| R1 portal core | Sign-in, role-scoped tickets, ticket RPCs, client scope guard | Live |
| R2 Control | Bulk ticket actions, schedule + recurring plans, assets & racks, people & permissions, templates | Live |
| Wave 2/3 | Ticket chat (client + internal), live radar map, timesheets with approval | Live |
| R3 money | Rate cards → quotes → invoices → payments, three admin feature flags | Live |
| R3.1 | Expenses: claim → submit → approve | Live |
| R3.2 | Job costing: line-level attribution, margin per job | Live |

## Coverage by permission area

Every area below exists in `permission_registry`, and every key is enforced somewhere in the
database. The difference is which areas have a **screen** built for them.

| Area | Keys | Screen | State |
| --- | --- | --- | --- |
| Tickets | 10 | Portal ticket list, chat, control bulk actions | **Live** |
| Time | 4 | Timesheets (timer, manual entry, approve/reject) | **Live** |
| Finance | 7 | Quotes, invoices, payments, rate cards, expenses, margins | **Live** (payouts deliberately off) |
| Clients | 4 | Rate cards only | **Partial** — no client/site management, no access codes |
| Assets | 4 | Inventory + rack occupancy inside Control | **Partial** — no stock, no purchase orders |
| Schedule | 3 | Schedule panel + recurring plans | **Live** (availability windows: DB only) |
| People | 5 | Roles, permissions, scopes, activation | **Partial** — no onboarding, pay rates, certificates |
| Dispatch | 4 | — | **Missing** — offers/broadcast/override have no UI (and `accept_offer` is never called) |
| Live map | 2 | Radar map with facility drawer | **Live** (gating is by role, not by key) |
| Reports | 3 | — | **Missing** — no operations/finance reports, no export |
| Settings | 4 | Templates, users/permissions | **Partial** — no categories/SLA editor, no audit log viewer |

Counted mechanically: **16 of 50 keys** appear in a UI gate as well as in the database; **34 are
enforced only in SQL** (RLS or RPC). Some of those 34 are still functionally covered by screens
gated on role instead of key — tickets, time and the map — but the rest are genuine gaps.

## Missing features, by weight

### Blocking a real first month of use

1. **Client and site management.** `create_organization` and `create_site` exist and are unused.
   Today a client can only be created by hand in SQL. Nothing in the UI can add a site, set its
   address or geofence, or edit billing details — yet tickets, quotes, invoices and expenses all
   hang off those records.
2. **Client-facing quote acceptance.** `money_respond_quote` already authorises an organization
   member, but there is no client screen. Approval is currently recorded by staff on the client's
   behalf, which weakens the audit story the whole money spine is built on.
3. **Quote and invoice documents.** There is no PDF and no print view. A client cannot be sent a
   quote or invoice; `send` only flips a status. Everything else in R3 assumes a document exists.
4. **File uploads.** No Supabase Storage usage anywhere. Expense receipts are URLs that a human has
   to host elsewhere; chat attachments are accepted by the RPC but cannot be uploaded.
5. **Notifications.** No transactional email. A ticket can be assigned, a quote accepted, an
   expense submitted — nobody is told. Everything is pull-only.

### Operational depth the spec surface implies

6. **Dispatch offers.** `ticket_offers`, `accept_offer`, `dispatch.*` permissions, offer timeout —
   all present in the database, none reachable from the UI. Engineers cannot be offered work and
   accept it themselves.
7. **Engineer profiles, pay rates, certificates, onboarding.** `engineer_profiles` (skills,
   countries, hourly rate, verification) is readable by the margin report but has no editor. This
   also means job-cost labour is only priced if somebody sets the rate in SQL.
8. **Reports.** `reports.operations`, `reports.finance`, `reports.export` exist with no screen: no
   SLA compliance, no first-time-fix, no revenue by client or period, no CSV.
9. **Audit log viewer.** Every privileged action writes an audit row; `audit.view` grants access to
   nobody's screen. The evidence exists and cannot be read in the product.
10. **Settings: categories, priorities, SLA targets.** `settings.categories` exists; these live in
    code/seed data only.
11. **Stock and purchase orders.** `assets.stock` and `assets.purchase_orders` exist; neither table
    nor screen does.
12. **Timesheet adjustment.** `time.adjust` exists; approve/reject is built, correction is not.

### Deliberately out of scope (repeat of standing decisions)

Freelancer payouts and payout exports, Stripe/card processing, VAT return filing, cross-border tax
logic, a PWA/offline app, and PT-PT localisation. All remain excluded by your own plan; Portuguese
VAT and cross-border treatment still need accountant sign-off.

## What is left, as releases

| Proposed | Scope | Why now |
| --- | --- | --- |
| **R4 Client & site management** | Create/edit clients, sites, contacts, geofence, access codes, billing details; wire the two unused RPCs | Nothing real can start without it: every document and ticket depends on these records |
| **R5 Documents** | Printable quote/invoice/expense-sheet views (HTML → print CSS first, PDF later), client-facing quote acceptance screen, receipt uploads | Turns the money spine into something you can actually send and prove |
| **R6 Dispatch & people** | Offer flow (send offer, accept, timeout), engineer profiles, pay rates, availability windows, certificates with expiry | The largest untouched slice of the spec surface; also improves job-cost accuracy |
| **R7 Reporting & audit** | Operations and finance reports, CSV export, audit log viewer, categories/SLA settings | Reads data the system already collects; cheapest remaining release per unit of value |
| **R8 Notifications** | Transactional email on assignment, quote sent/accepted, invoice issued, expense submitted | Pull-only is fine for one user, not for a team or clients |

Quick wins inside any release: show the audit trail on each record, add CSV export of invoices and
expenses, and print-friendly money documents (both are small once the data layer exists).

## Verification of this audit

- Tables, functions and permission keys read from the live database (`information_schema`,
  `pg_proc`, `permission_registry`).
- UI references found by searching `src/` for each of the 50 permission keys, for the eight
  "missing" RPCs and for `supabase.storage` — zero hits is what marks a feature as unbuilt.
- Route and component inventory from `src/app` and `src/components`.

Re-run at any time; the counts above are reproducible from the repository and the database.
