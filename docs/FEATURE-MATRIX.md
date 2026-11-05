# Feature matrix — the Expanded Feature Plan (v2) against the build

Source: `TechMaths DC Portal — Expanded Feature Plan (v2).pdf` (13 pages, §1–§14), supplied 2026-11-05.
Build audited: `main` at `f68f1a3` plus branch `arena/c49cacef-techmathsv2` (R4).
Verified against: the live database (`33+ tables`, `50` permission keys, `80` functions), 21 routes,
18 portal components and the test suite.

Legend: **✅ live** (screen + database enforcement) · **🟡 partial** (some of it exists, the rest does not) · **⛔ missing** (no surface).

Every status below was checked in code or in the database; nothing is inferred from the plan text.

---

## §3.1 Home and command center

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Customisable drag/resize dashboard widgets | 🟡 | Control overview has fixed stat cards (tickets, people, time, assets, plans). No drag, resize or saved layout. |
| Needs-attention panel | 🟡 | Unassigned, SLA-at-risk, SLA-breached, pending verification and pending timesheets are counted. No expiring-offer or expiring-certificate feed. |
| Global search / command palette (⌘K) | 🟡 | `portal_search` RPC searches tickets, clients, sites, assets. No UI, no keyboard palette. |
| Saved views shared across the team | ⛔ | `saved_views` table exists; nothing reads or writes it. |
| Daily summary email | ⛔ | No transactional email of any kind. |
| "Today" timeline board | ⛔ | Schedule shows upcoming work per day; no cross-Europe timeline. |

## §3.2 Dispatch and ticket control

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Kanban / list / calendar / map switching | 🟡 | Ticket list, schedule calendar and a live radar map exist as separate screens. No kanban, no single-view switcher. |
| Smart engineer ranking (skill, distance, rating, cost) | ⛔ | Availability and skills are stored; no scoring or reason display. |
| Bulk actions (assign, priority, tag, close, export) | ✅ | `bulk_update_tickets` covers priority, status, assign, tag and close. Export not built. |
| Multi-engineer crews with own rate and hours | 🟡 | `ticket_assignees` with crew role and hourly rate, `set_ticket_crew` RPC. No screen calls it. |
| Multi-day / multi-site parent projects | ⛔ | No parent/child ticket relationship. |
| Ticket templates prefilling checklist, hours, price | ✅ | `ticket_templates` + `create_ticket_from_template`, managed in Control → Templates. Price is not part of the template. |
| Merge, split, link tickets | ⛔ | No relationships, no merge path. |
| Escalation rules (widen pool, raise pay, SMS) | ⛔ | Offers now exist (**R5**) and carry a deadline, but nothing widens the pool or raises pay automatically when one lapses. |
| Major incident mode (room, chat, client status page) | ⛔ | No incident entity. |
| "View as" impersonation | ⛔ | Not implemented in either direction. |

## §3.3 Planned work and scheduling

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Recurring tickets with automatic creation | ✅ | `recurring_plans`, `run_recurring_plans`, Control → Schedule. |
| Engineer availability, holidays, time zones | 🟡 | `engineer_availability`, `time_off`, availability toggle (`offline/available/busy`). No holiday editor or per-country time-zone view. |
| Drag-and-drop resource planner | ⛔ | Schedule is a read-mostly list by day; nothing is draggable. |
| Capacity warnings ("2 certified engineers free in Germany") | 🟡 | `portal_capacity` counts free engineers per day. No certification filtering, no warning copy. |
| Client visit booking with admin confirmation | 🟡 | **R6**: a client books from the Sites tab; the request becomes a `new` ticket with a preferred date and every admin/staff account is notified. Confirmation is the coordinator scheduling or assigning it — there is no separate approve button. |
| Calendar sync (Google, Outlook, Apple) | ⛔ | No integration. |

## §3.4 Clients, sites and contracts

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Client profiles: contacts, billing, VAT, history | 🟡 | **R4**: create/edit name, billing email, VAT, country, with open-ticket count. Contacts, SLA and price list on the profile: not built. |
| Site pages: address, map, hours, parking, security, photos, rack plans | 🟡 | **R4**: address, country, coordinates, geofence, asset count, access procedure. Opening hours, parking, entrance photos and rack plans: not built. |
| Access instructions to assigned engineer only | 🟡 | Access text is a separate permission (`clients.access_codes`), never in list payloads, and `can_access_site_instructions` is scoped. Time-limited codes and auto-hide after completion: not built. |
| Quotes from a price list, client accepts online, converts to tickets | 🟡 | **R6**: the client workspace lists sent quotes with the full breakdown and accepts or declines in one click (`portal_client_respond_quote`, audit + notification). Conversion is still a coordinator action (`money_quote_to_invoice`), and quote lines are attributed per line rather than auto-creating tickets. |
| Contracts: retainers, prepaid bundles, SLA tiers | ✅ | **R7**: `client_contracts` covers SLA tiers, retainers, prepaid bundles and frameworks; sla targets are copied onto every ticket by a trigger, retainer hours reset monthly from approved field time, bundles draw down, and the console shows compliance and overage. |
| Client health score | ⛔ | Not computed. |
| Client-specific rules (cleared engineers, signature, hour approval) | 🟡 | **R6**: the client signs work off (`portal_client_sign_off`) or sends it back with a note, and both decisions notify the team. Cleared-engineer lists, signature capture and pre-approved hour caps: not built. |

## §3.5 People

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Engineer directory with skills matrix | 🟡 | **R4**: directory with skills, countries, rate, verification, open tickets, 30-day hours. Skills-vs-certification grid: not built. |
| Onboarding pipeline with checklist and reminders | ⛔ | Only a verification status (`pending/approved/rejected/suspended`). No pipeline stages. |
| Certificate vault with 90/30/7-day expiry alerts | ⛔ | No certificates table. |
| Performance scorecards (acceptance, on-time, rework, rating) | ⛔ | Only a `rating` column exists; nothing calculates it. |
| Tiers and badges | ⛔ | Not implemented. |
| Internal notes and warnings per engineer | ⛔ | Not implemented. |
| Blacklist / do-not-send per client | ⛔ | Not implemented. |
| Teams and regions | 🟡 | Per-user scopes (country, client, site, team) exist and are enforced. No team entity or regional manager. |
| Custom roles with fine-grained permissions | 🟡 | Four role templates plus per-user permission overrides (50 keys, admin-only). Named custom roles: not built. |

## §3.5.1 Vendors and subcontractors

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Vendor registry with contract and rates | ⛔ | Not implemented. |
| Vendor portal login | ⛔ | Not implemented. |

## §3.6 Money control

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Rate cards by client, country, VAT | ✅ | `rate_cards` + lines, managed in Money → Rate cards. |
| Rate cards by engineer, skill, time of day, ticket type | ⛔ | Not modelled. |
| Margin view per ticket | ✅ | **R3.2**: `money_job_margins`, Margins tab, per-line job attribution. |
| Approval chain for large amounts | ⛔ | Expenses have one approve step, no threshold chain. |
| Payout run screen with SEPA export | ⛔ | Deliberately out of scope (accountant sign-off first). |
| Credit notes, partial payments, reminders, late fees | 🟡 | Partial payments are recorded and balances derived. Credit notes, reminders and late fees: not built. |
| Multi-currency with stored FX per invoice | 🟡 | Currency on rate cards and expenses; no exchange rate stored per invoice. |
| Accountant read-only role | 🟡 | Achievable with per-user overrides (finance view + export, no operations). No preset. |
| Locked periods | ⛔ | Not implemented. |

## §3.7 Automation center

| Plan item | Status | Where it stands |
| --- | --- | --- |
| No-code "when this happens, do that" builder | ⛔ | Nothing started. |
| Any of the five example rules | ⛔ | No rule engine, no scheduler beyond recurring plans. |

## §3.8 Settings and configuration

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Categories, priorities, statuses, checklists editable | 🟡 | Checklist lives in ticket templates. Categories, priorities and SLA targets are fixed in code. |
| Custom fields on tickets, sites, assets, engineers | 🟡 | Only `assets.attributes` (JSON). No field editor. |
| Notification templates in several languages | ⛔ | No notifications, therefore no templates. |
| Branding / white-label per client | ⛔ | Not implemented. |
| Integrations page (Slack, Teams, Stripe, WhatsApp, API keys) | ⛔ | Only the marketing site's HubSpot token exists. |
| Audit log viewer with filters and export | ✅ | **R4**: Control → Audit, filter by entity, CSV export, before/after per row. |
| Import from Excel, export everything | 🟡 | **R4** exports the audit log to CSV. No Excel import, no full export. |

## §4 Staff features

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Personal work queue (mine, follow-ups, approvals) | 🟡 | Portal lists tickets visible to the user; no "my queue" or approvals inbox. |
| Dispatcher mode without pay or margins | 🟡 | Permission overrides can produce this; no preset or dedicated screen. |
| Shift planner and on-call rota | ⛔ | Not implemented. |
| Internal task list attached to tickets | ⛔ | Not implemented. |
| Quick actions (call, message, share location, status ping) | 🟡 | Ticket chat lives; the rest not built. |
| Shared inbox turning email into tickets | ⛔ | Not implemented. |

## §5 Freelancer and engineer app

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Mobile-first, poor-signal tolerance | 🟡 | Portal is responsive at 375 px. No offline/PWA layer. |
| Availability toggle, weekly schedule, holiday blocks, travel radius | 🟡 | Toggle and `engineer_availability` rows exist; no weekly editor or radius. |
| Offers with map, travel, pay breakdown, accept/decline | 🟡 | **R5**: send offer with window and optional rate, engineer inbox with countdown, accept, decline with reason, automatic expiry and history. No map preview, no travel time or cost breakdown. |
| Job pack after acceptance | ⛔ | Not implemented. |
| Step-by-step workflow, required photos, serial scan | ⛔ | Templates carry a checklist; nothing is enforced or captured. |
| Voice notes, offline sync | ⛔ | Not implemented. |
| Parts used from a catalog | ⛔ | No parts catalog. |
| Travel log with mileage and receipts | ⛔ | Time categories include travel; no mileage or receipt capture. |
| Expense claims with receipt capture | 🟡 | **R3.1** claim → submit → approve with a receipt *URL*; no upload. |
| Earnings dashboard and statements | ⛔ | Not implemented. |
| Self-billing invoice | ⛔ | Not implemented (accountant decision still open). |
| Skills and certificate profile with upload | 🟡 | **R4** lets an admin edit skills, countries and rate. Engineer self-service upload: not built. |
| Training area, induction quizzes | ⛔ | Not implemented. |
| Rating history and client feedback | ⛔ | Not implemented. |
| Chat with admin, client and engineers | ✅ | `messages` with client/internal channels and live subscription. |
| Safety button, lone-working check-in | ⛔ | Not implemented. |
| Referral programme | ⛔ | Not implemented. |

## §6 Client portal

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Dashboard (open requests, visits, SLA, hours, invoices) | ✅ | **R6**: client workspace opens with open requests, next visit, quotes to approve, outstanding balance, paid this year, the agreement card (SLA targets, retainer/bundle left) and an attention list. |
| Guided request form with templates and photos | 🟡 | Clients can raise a ticket with category and priority. No templates, no photo upload. |
| Live status tracker with ETA and arrival notice | ⛔ | Not implemented. |
| Approve quotes, hours and completed work with signature | 🟡 | **R6**: quotes accept/decline and completed work is approved or sent back from the ticket sheet. No signature capture and no hourly approval workflow. |
| Service reports and photo galleries | ⛔ | Not implemented. |
| Asset and rack view for their equipment | 🟡 | Assets are readable by client members under RLS. No dedicated view. |
| Booking calendar for visits | 🟡 | **R6**: request form with a preferred date per site. No calendar grid or slot picking. |
| Contracts and SLA page | ✅ | **R7**: the client workspace shows each active agreement with response/resolution targets, coverage, hours left and on-time percentage — never the fee. |
| Invoices, payment history, pay online, VAT-ready PDFs | 🟡 | **R6**: issued invoices with line detail, balance, settlement bar, payments received and a CSV download. No card payment (excluded by the owner) and no PDF rendering. |
| Team management (who approves, who sees invoices) | ⛔ | Admin manages memberships; no client-side team screen. |
| Satisfaction survey and quarterly review | ⛔ | Not implemented. |
| Help center and support chat | ⛔ | Not implemented. |
| Approved-visitor list | ⛔ | Not implemented. |

## §7 Data-centre modules

### §7.1 Assets and inventory

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Hierarchy client → site → room → row → rack → U → device | ✅ | `assets` with parent chain and `u_position`/`u_height`, Control → Assets. |
| Asset record (model, serial, owner, warranty, power) | ✅ | Full record with warranty and power draw. |
| Rack elevation from U positions | ✅ | `rackLayout` / `rackOccupancy` render occupancy. |
| Cable register (port to port, type, length, test) | ⛔ | Not implemented. |
| Change history per asset | 🟡 | `asset_events` table and insert policy exist; no timeline is rendered. |
| Bulk import from Excel | ⛔ | Not implemented. |

### §7.2 Parts and logistics

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Parts catalog and stock per warehouse or kit | ⛔ | No tables, no screen. |
| Request parts from a ticket, low-stock alerts, purchase orders | ⛔ | `assets.stock`, `assets.purchase_orders` permissions exist with nothing behind them. |
| Shipment tracking and goods-received photos | ⛔ | Not implemented. |
| Returns, RMA, warranty tracking | 🟡 | Warranty dates are stored per asset; returns and RMA are not. |
| Tool and equipment register with calibration | ⛔ | Not implemented. |

### §7.3 Change and risk control

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Change requests with approval, window and rollback | ⛔ | Not implemented. |
| RAMS templates attached to tickets | ⛔ | Not implemented. |
| Permit-to-work and induction records | ⛔ | Not implemented. |
| Pre-work and post-work checklists signed by both parties | 🟡 | Template checklists exist; nothing is signed or verified. |
| Incident and near-miss reporting | ⛔ | Not implemented. |

### §7.4 Remote services

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Remote support tickets with session time | 🟡 | `remote_work` time category and a remote ticket category exist. |
| Command logs and configuration backups | ⛔ | Not implemented. |
| Monitoring alerts creating tickets | ⛔ | No intake endpoint. |

## §8 Communication and support

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Ticket chat, internal notes, incident rooms | 🟡 | Chat and internal notes are live. Direct messages and incident rooms are not. |
| Message templates and quick replies | ⛔ | Not implemented. |
| Auto-translation (EN/PT/ES/FR/DE) | ⛔ | Not implemented. |
| Announcements to all engineers or clients | ⛔ | Not implemented. |
| Notification channels with quiet hours | 🟡 | **R5**: in-app inbox with unread badge, realtime push to the browser, plus triggers for offers, assignment, quote decisions and expense submissions. Email, push, SMS, WhatsApp and quiet hours: not built. |
| Knowledge base by role | ⛔ | Marketing insights exist; no portal KB. |
| Ticket by email | ⛔ | Not implemented. |
| Phone integration | ⛔ | Later phase, not started. |

## §9 Reports and analytics

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Operations: status, aging, first response, SLA, reopened | 🟡 | **R8**: volume per day, status/priority/category/country mix, first-response averages, SLA met/breached, client and engineer load. Reopened tickets are not tracked. |
| People: utilisation, acceptance, on-time, hours by country | 🟡 | **R8**: per-engineer assigned, closed and logged hours for the window. No acceptance rate or hours-by-country split. |
| Money: revenue, cost, margin by ticket/client/engineer/country | 🟡 | **R8**: net invoiced, VAT, collected, outstanding, aging buckets, margin by client, VAT by country, monthly billing and top debtors. Engineer-level margin still comes from the R3.2 job view. |
| Quality: satisfaction, rework, photo compliance | ⛔ | Not implemented. |
| Demand: busiest sites, days, fastest-growing categories | ⛔ | Not implemented. |
| Scheduled emailed reports | ⛔ | Not implemented. |
| Exports to CSV/XLSX/PDF and accountant pack | 🟡 | **R8**: CSV for operations, SLA, finance and audit, each generated from the same numbers on screen. No XLSX, PDF or accountant pack. |

## §10 Security and trust

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Per-role permission matrix editable by admin | ✅ | 50-key registry, per-user overrides, scopes, last-admin protection, audit on every change. |
| "View as this user" test tool | ⛔ | Not implemented. |
| Login history, device list, revoke sessions | ⛔ | Not implemented. |
| IP allow-list for admin and finance | ⛔ | Not implemented. |
| Client approval of each engineer before entry | ⛔ | Not implemented. |
| GDPR toolkit (consent, export, deletion, retention) | ⛔ | Marketing consent banner only. |
| Backup status and restore drills | ⛔ | Relies on Supabase platform backups; nothing surfaced in the product. |

## §11 Roadmap — what the plan expected by now

| Release | Plan scope | Status |
| --- | --- | --- |
| R1 core loop | login, roles, tickets, dispatch, offers, chat, photos, time, notifications | 🟡 tickets, roles, chat, time, **offers and in-app notifications** are live; **photos and outbound email/SMS are not** |
| R2 control | dashboard, templates, bulk actions, custom roles, certificate vault, custom fields, calendar | 🟡 dashboard, templates, bulk actions, per-user roles and schedule are live; **certificate vault and custom fields are not** |
| R3 field and money | live map, offline PWA, expenses, payouts, invoices, quotes, rate cards, client approvals | 🟡 map, expenses, quotes, invoices, rate cards and margins are live; **payouts, PWA and client approvals are not** |
| R4 data-centre depth | assets/racks, parts, RAMS and permits, recurring maintenance, contracts and SLA tiers | 🟡 assets, racks and recurring work are live; **parts, RAMS/permits and contracts are not** |
| R5 scale | automation, vendors, ratings and tiers, analytics, API/webhooks, accounting, translations | ⛔ not started |

## §13 Locked decisions

| Decision | Status |
| --- | --- |
| Full team on admin with per-account permissions | ✅ |
| Many countries from day one | 🟡 country fields and scopes exist; no per-country VAT/currency/payout rules |
| Freelancer pay: manual SEPA **and** Stripe Connect | ⛔ both deliberately deferred pending accountant sign-off |
| Client online payment (card or transfer) | ⛔ not built |
| All commercial models (retainer, prepaid bundle, per-job) | 🟡 per-job only; retainers and bundles have no model |
| Parts: warehouse, engineer kits, client-supplied | ⛔ not built |
| White-label per client | ⛔ not built |

## §14 Users, roles and permissions

| Plan item | Status | Where it stands |
| --- | --- | --- |
| Admin-only user management | ✅ | `settings.users` gate, last-admin protection, self-suspension guard. |
| Permission checklists pre-ticked from a template | ✅ | Registry defaults per role; per-user grant/revoke/clear-override. |
| Scope limits by country, client, site, team | ✅ | `user_scopes`, enforced in RLS helpers. |
| Invitation email, password, 2FA | 🟡 | Supabase Auth handles password and 2FA; no in-product invite email or inactive-until-accepted state. |
| Suspend, reactivate, reset 2FA, force logout, delete | 🟡 | Role, activation and permission changes are live. Reset 2FA, force logout and delete are not. |
| Every change written to the audit log | ✅ | All permission, role, client, site, money and profile writes audit before/after. |
| Pay rates, margins, bank details, access codes as separate permissions | ✅ | `people.pay_rates`, `finance.margins`, `clients.access_codes` are separate and off by default outside admin. |
| Access with an end date | ⛔ | Scopes are permanent until removed. |
| Permission changes take effect immediately | ✅ | Checked per request in the database. |

---

## Scoreboard

Counting the 135 product requirements in §3–§10 (the roadmap, decisions and permission sections are
scored separately above):

| Status | Items | Share |
| --- | --- | --- |
| ✅ live | 14 | 10 % |
| 🟡 partial | 45 | 33 % |
| ⛔ missing | 76 | 56 % |
| **Total** | **135** | |

Across every tracked row in the document — the plan tables above, the roadmap mapping (§11), the seven
locked decisions (§13) and the nine permission rules (§14) — 145 rows split 21 ✅ / 47 🟡 / 77 ⛔.

Read it this way: the core loop, the money spine and the data-centre inventory are real and enforced in
the database. What separates this from the plan is breadth — dispatch offers, contracts, parts, safety
paperwork, reporting, automation and the client-facing half of the portal.

## What R6–R8 changed on this branch

- **§6 client portal (R6)** — `portal_client_home`, `portal_client_quotes`, `portal_client_quote`,
  `portal_client_respond_quote`, `portal_client_invoices`, `portal_client_invoice`,
  `portal_client_tickets`, `portal_client_ticket`, `portal_client_sites`,
  `portal_client_request_visit`, `portal_client_sign_off`; new **Workspace** page for client accounts
  with quotes, invoices, requests, sites and an agreement card.
- **§3.3 booking (R6)** — a client visit request becomes a real `new` ticket with a preferred date and
  notifies every admin and staff account.
- **§3.4 contracts (R7)** — `client_contracts` with four kinds, `contract_list/get/save/set_status/
  consume_bundle/metrics`, `contract_usage`, a trigger that copies the SLA target onto each ticket,
  a **Contracts** console page and a client-safe agreement read.
- **§7 / §9 reporting (R8)** — `reports_ops`, `reports_finance`, `reports_sla`, a **Reports** page with
  operations / SLA / finance tabs and CSV export of each from the same numbers on screen.
- **Security hardening** — every organisation-scoped helper introduced by these releases is revoked
  from `anon` and `authenticated` explicitly, because this project's default privileges grant EXECUTE
  on new functions to both roles.

## What R5 changed on this branch

- **§3.2 dispatch offers** — `portal_send_offer`, `portal_respond_offer`, `portal_list_ticket_offers`,
  `portal_my_offers`, `portal_expire_offers`; per-ticket **Offer** action in Control; **Offers** page.
- **§5 engineer offers** — accept/decline with countdown, decline reason, automatic expiry and history.
- **§8 notifications** — `portal_notifications` inbox with triggers on offer, assignment, quote and
  expense events; header bell with realtime updates. Email delivery still absent.

## What R4 changed on this branch

- **§3.4 clients and sites** — `portal_list_clients`, `portal_save_client`, `portal_save_site`,
  `portal_get_site_access`, `portal_save_site_access`; new **Clients** tab.
- **§3.5 engineer directory** — `portal_list_engineers`, `portal_save_engineer_profile`; pay rates
  masked unless `people.pay_rates`; verification moves need `people.onboarding`.
- **§3.8 audit log viewer** — `portal_list_audit`; new **Audit** tab with entity filter and CSV export.

These three were the blockers named in the previous audit: until a client and a site can be created in
the product, nothing else in the plan can be exercised with real data.
