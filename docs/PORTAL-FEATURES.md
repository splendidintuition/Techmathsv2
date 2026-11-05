# Portal feature list — reference

Everything the TechMaths DC operations portal does **today**, screen by screen and rule by rule. This is a
reference sheet, not a plan: it describes what exists and is enforced, so anything built on top starts
from the truth. For what is missing see `docs/FEATURE-MATRIX.md`; for what to build next see
`docs/UPGRADE-PROGRAMME.md`.

Verified against `main` at `6343cee` (R9 shipped). Numbers below are measured, not estimated:
**42 tables · 144 functions · 70 RLS policies · 50 permission keys · 21 routes · 206 tests.**

---

## 1. What it is

One Next.js 15 application with two faces and one database.

- **The operational console** (`/portal`, internal accounts): coordinate tickets, dispatch engineers,
  manage clients, sites and racks, run quotes → invoices → payments, hold contracts and SLAs, count
  stock, and read the numbers.
- **The client workspace** (same URL, client accounts): a reduced portal showing only that
  organisation's own requests, quotes, invoices, sites and agreement.
- **The public marketing site** (14 static routes: home, services, coverage by country, industries,
  projects, insights, about, careers, contact, legal). Separate content, separate concerns — the
  portal never reads marketing copy and the site never reads operations data.

Security is **in the database, not in the UI**. Every table has row-level security; every write goes
through a `security definer` function that checks a permission key and appends an audit row. The UI
hides what a person cannot do, but hiding is cosmetic — a hand-rolled request still gets
`not_authorized`.

**Stack:** Next.js 15 App Router · React 19 · TypeScript strict · Tailwind · Supabase Postgres 15 with
RLS, Auth and Realtime · Vercel (auto-deploy on merge to `main`).

---

## 2. Accounts, roles and permissions

| Role | Who | Reaches |
| --- | --- | --- |
| **admin** | owner, directors | everything, including users, audit and finance |
| **staff** | coordinator / dispatcher | tickets, dispatch, clients, assets, schedule, money (per permission), reports |
| **freelancer** | field engineer | own offers, own tickets, timesheets, chat, live map |
| **client** | customer contact | own workspace only — requests, quotes, invoices, sites, agreement |

- **50 permission keys** in a database registry, grouped `tickets.*`, `assets.*`, `people.*`,
  `clients.*`, `finance.*`, `settings.*`. Role templates pre-tick the sensible set; an admin can
  grant, revoke or clear an override **per account**. Effective permissions are returned by the
  database, never computed in the browser.
- **Sensitive capabilities are separate keys, off by default outside admin:** `people.pay_rates`
  (what an engineer is paid), `finance.margins` (job profitability), `clients.access_codes` (site
  entry instructions), `assets.purchase_orders`, `finance.*` write keys.
- **Scopes** restrict a person to countries, clients, sites or teams. Enforced in the RLS helper
  functions, so a scoped coordinator cannot see out-of-scope rows even by ID.
- **Guards:** the last active admin cannot be demoted or suspended; nobody can suspend themselves;
  every role, permission, scope and activation change is audited with before/after.
- **Access with an end date:** not supported — scopes are permanent until removed.

---

## 3. Screen inventory

### 3.1 Internal console

| Screen | Who | What it does |
| --- | --- | --- |
| **Overview** | all internal | Stat cards (visible tickets, active, unassigned, last refresh), recent tickets, live field shortcuts, a "today" attention strip. |
| **Tickets** | all internal | Full table with status, priority, category, client, site, assignee, SLA timer, search and filters; inline status change with role-appropriate transitions; open a ticket drawer. |
| **Ticket drawer** | all internal | Chat (client and internal channels, realtime), **parts booked against the job** (R9), and the ticket record. |
| **Offers** | internal + freelancer | Outbound offers for a ticket with a response window and optional rate; freelancer inbox with countdown, accept, decline with reason, history; automatic expiry (R5). |
| **Live map** | all internal | Europe radar view of facilities and technician positions. |
| **Timesheets** | all internal | Stopwatch and manual hour entries by category (travel, on-site, remote, waiting), submit, coordinator sign-off, hours ledger. |
| **Control** | internal, tab-gated | 8 tabs: Control room, Bulk actions, Schedule, Assets, People, Clients, Templates, Audit. |
| **Money** | internal, permission-gated | 7 tabs: Overview, Quotes, Invoices, Rate cards, Expenses, Margins, Settings. |
| **Contracts** | internal, permission-gated | SLA tiers, retainers, prepaid bundles, frameworks; compliance and overage; drawdown (R7). |
| **Reports** | internal, permission-gated | Operations, SLA and Finance tabs over selectable date ranges, each with CSV export of the same numbers on screen (R8). |
| **Stock** | internal, permission-gated | Catalog, per-location counts, low-stock filter, purchase orders raised → sent → received line by line (R9). |
| **Services** | all internal | Read-only catalogue mirroring the public service pages. |
| **Coverage** | all internal | Read-only country coverage reference. |

### 3.2 Control console — the 8 tabs

| Tab | Capability | Permission |
| --- | --- | --- |
| **Control room** | Live metrics: tickets by status, next 7 days, traffic and stock summaries; one-click **demo seed / demo purge**. | always visible; demo buttons need `settings.users` |
| **Bulk actions** | Multi-select tickets and set priority, status, assignee, tag or close in one call. Export not built. | `tickets.edit` / `tickets.assign` / `tickets.status` |
| **Schedule** | Upcoming work by day, engineer availability, recurring plans and their run state. | `schedule.view` / `schedule.recurring` |
| **Assets** | Client → site → room → row → rack → U hierarchy; asset records with model, serial, owner, warranty, power draw; rack elevation rendered from U positions. | `assets.view` (write: `assets.edit`) |
| **People** | User list, role, activation, per-user permission checklists and scope limits; engineer directory with skills, countries, rate, verification, open tickets, 30-day hours. Pay rate masked without `people.pay_rates`; verification changes need `people.onboarding`. | `people.view` / `settings.users` |
| **Clients** | Client profiles (name, billing email, VAT, country, open-ticket count) and sites (address, country, coordinates, geofence, access procedure). | `clients.view` (write: `clients.edit`) |
| **Templates** | Ticket templates that prefill checklist, category, hours; create a ticket from a template in one action. | `settings.templates` |
| **Audit** | Every audited write, filter by entity, before/after payload, CSV export. | `audit.view` |

### 3.3 Money console — the 7 tabs

| Tab | Capability |
| --- | --- |
| **Overview** | Net invoiced, VAT, collected, outstanding, aging, this month's run rate. |
| **Quotes** | Quote lines from a price list or free lines, send to client, client accepts/declines online, convert a won quote to an invoice. |
| **Invoices** | Issue from quote or blank, line detail, VAT per line and per country, partial payments, derived balance, settlement state, CSV download. |
| **Rate cards** | Effective-dated cards with lines by client and country, driving invoice line pricing. |
| **Expenses** | Claim → submit → approve, with receipt URL, categorised, costed to a job. |
| **Margins** | Per-job and per-line margin: revenue, cost, **parts cost (R9)**, engineer cost, percentage. Gated by `finance.margins`. |
| **Settings** | Currency, VAT defaults, numbering and finance preferences. |

### 3.4 Client workspace (client accounts only)

| Tab | Capability |
| --- | --- |
| **Overview** | Open requests, next visit, quotes awaiting decision, outstanding balance, paid this year, agreement card (SLA targets, retainer/bundle remaining), attention list (R6). |
| **Quotes** | Every sent quote with its full breakdown; accept or decline in one click, with a note; the decision notifies the team. |
| **Invoices** | Issued invoices with line detail, balance, settlement bar, payments received, CSV download. Card payment is deliberately absent. |
| **Requests** | Raise a ticket with category, priority and a preferred date per site; it lands as a real `new` ticket and notifies every admin and staff account. Their own tickets with status and message thread. |
| **Sites** | Their sites with address, access window and asset counts; sign off completed work or send it back with a note. |
| **Agreement** | Read-only: SLA targets, coverage, hours left, on-time percentage — never the fee. |

---

## 4. Domain rules the portal enforces

**Ticket lifecycle** — 14 states: `new → triaged → offered → assigned → en_route → on_site → in_progress
→ waiting_client / waiting_parts → completed_pending_approval → approved → closed`, plus `cancelled`
and `rejected`. Admins can move anywhere; freelancers get only the legal next step for their own
assigned ticket.

**Dispatch** — an offer carries a window and an optional rate; the engineer accepts or declines with a
reason; a lapsed offer expires and is recorded as history rather than silently disappearing.

**Scheduling** — recurring plans generate future tickets on a cadence; availability (`offline /
available / busy`), time off and per-day capacity counts are stored; the SLA target on a ticket is
copied from the client's contract at creation, not typed by hand.

**Contracts** — four kinds (SLA tier, retainer, prepaid bundle, framework). Retainer hours reset
monthly from approved field time; bundles draw down per use; overage is visible; the client sees
targets but never the fee.

**Money** — quotes → invoices → payments with derived balances and partial payments; rate cards price
lines; every job line is attributed so margin is real; parts cost reduces margin. Amounts are
`numeric(…,2)` in the client's currency with a per-invoice VAT rate and discount percentage; no float
arithmetic anywhere.

**Parts (R9)** — catalog, per-location stock (warehouse, van, kit, office), reorder points, ledger of
movements, ticket consumption that returns stock on removal, per-fitted-part warranty date, purchase
orders with line-level receiving that can land partial.

**Notifications** — in-app inbox with unread badge and realtime push, raised by triggers on: offer
sent, ticket assigned, quote accepted/declined, expense submitted, client sign-off. Email, SMS, push
and WhatsApp are **not** wired.

**Search** — `portal_search` covers tickets, clients, sites and assets. There is no palette UI yet.

**Audit** — every write through an RPC records actor, entity, before/after and timestamp. The viewer
filters by entity and exports.

---

## 5. Data model at a glance (42 tables)

| Group | Tables |
| --- | --- |
| Identity & access (6) | `profiles` · `organizations` · `organization_memberships` · `permission_registry` · `user_permissions` · `user_scopes` |
| Work (10) | `tickets` · `ticket_assignees` · `ticket_templates` · `ticket_offers` · `ticket_events` · `ticket_updates` · `ticket_parts` · `messages` · `time_entries` · `saved_views` |
| Scheduling (3) | `recurring_plans` · `engineer_availability` · `time_off` |
| Clients & contracts (3) | `sites` · `site_access_instructions` · `client_contracts` |
| Estates (2) | `assets` · `asset_events` |
| Stock (6) | `parts` · `stock_locations` · `part_stock` · `stock_movements` · `purchase_orders` · `purchase_order_lines` |
| Money (8) | `rate_cards` · `rate_card_lines` · `quotes` · `quote_lines` · `invoices` · `invoice_lines` · `payments` · `expenses` |
| People (1) | `engineer_profiles` |
| Platform (3) | `portal_notifications` · `audit_logs` · `feature_flags` |

70 policies: reads are scoped by organisation, permission and scope; writes have **no** insert / update
/ delete policies at all — they exist only inside the RPCs.

## 6. Permission keys (50, the exact registry)

| Area | Keys |
| --- | --- |
| Tickets (10) | `tickets.view` · `tickets.create` · `tickets.edit` · `tickets.assign` · `tickets.reassign` · `tickets.priority` · `tickets.status` · `tickets.close` · `tickets.delete` · `tickets.internal_notes` |
| Dispatch (4) | `dispatch.offer` · `dispatch.broadcast` · `dispatch.override` · `dispatch.timeout` |
| Clients (4) | `clients.view` · `clients.edit` · `clients.access_codes` · `clients.contracts` |
| People (5) | `people.view` · `people.onboarding` · `people.edit_rates` · `people.pay_rates` · `people.certificates` |
| Time (4) | `time.view` · `time.approve` · `time.reject` · `time.adjust` |
| Finance (7) | `finance.invoices` · `finance.payments` · `finance.payouts` · `finance.margins` · `finance.export` · `finance.expenses` · `finance.expenses_approve` |
| Assets (4) | `assets.view` · `assets.edit` · `assets.stock` · `assets.purchase_orders` |
| Schedule (3) | `schedule.view` · `schedule.manage` · `schedule.recurring` |
| Map (2) | `map.view_all` · `map.view_limited` |
| Reports (3) | `reports.operations` · `reports.finance` · `reports.export` |
| Settings (3) | `settings.templates` · `settings.categories` · `settings.users` |
| Audit (1) | `audit.view` |

Twelve are flagged **sensitive** — admin-only by default and never granted to staff or freelancers by
a template: `tickets.delete`, `tickets.internal_notes`, `dispatch.override`, `clients.access_codes`,
`people.edit_rates`, `people.pay_rates`, `time.adjust`, `finance.payouts`, `finance.margins`,
`reports.finance`, `settings.users`, `audit.view`.

## 7. Explicitly not in the product

So nobody assumes it while planning: **no file storage** (photos, signatures, receipts, PDFs) · **no
outbound email, SMS or push** · **no PDF rendering or printing** · **no payment provider** · **no
offline or PWA layer** · **no view-as impersonation** · **no 2FA enforcement or session list** · **no
GDPR export/erasure** · **no automation rules engine** · **no vendor or subcontractor entity** · **no
client visit calendar grid** · **no signed completion sheets** · **no RAMS, permits or incident
reports** · **no cable register** · **no i18n** (English only in the UI; data carries currency and
country).

---

## 8. Access and environments

| | |
| --- | --- |
| Production | `techmaths-dc.com/portal` — Vercel project `prj_ZjJdAOFvZxtDdGKDvt3HoTrdjc4Y` |
| Local | `npm install && npm run dev` → `/portal` |
| Database | Supabase project with Auth, RLS and Realtime; migrations in `supabase/migrations` |
| Demo data | Tagged `is_demo`, seeded and purged from Control → Control room; `portal_purge_demo()` removes every demo-tagged row |
| Sample accounts | admin, staff (coordinator) and client accounts attached to the demo organisation |
| Tests | `npx vitest run` (206 cases, 17 files); `npx tsc --noEmit`; `npm run build` |
| Docs | `docs/V2-…`→`V9-…` per release, `FEATURE-MATRIX.md`, `PENDING-WORK.md`, `AGENT-LOG.md`, `UPGRADE-PROGRAMME.md`, `BATTLE-MODE.md` |
