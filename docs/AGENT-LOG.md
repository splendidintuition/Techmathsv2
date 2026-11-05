# Agent log — who built what, and how it was verified

The build was run as a sequence of specialised roles, each with its own artefact and its own
acceptance check. Nothing below is claimed without the command that proved it.

---

## Agent 01 — Strategy & positioning

**Brief:** make Tech Maths read as a specialist data center partner, not a general IT shop.

**Output:** positioning line ("Hands-on data center engineering, anywhere you build"), the four
audiences from the spec mapped to five sector pages, and the rule that every page states an
exclusion list as well as a capability list — the trust device that runs through the whole site.

**Decisions taken where the spec left them open:** dynamic full stack (client instruction),
global coverage with Lisbon HQ, English only at launch, cyan accent, illustrative-but-marked
references. All recorded in `docs/HANDOVER.md` §4.

---

## Agent 02 — Art direction & design system

**Output:** `docs/DESIGN-SYSTEM.md` + `src/app/globals.css` token layer.

Near-black `#0A0D12` base, one accent (`#29E6FF` dark / `#056B7D` light for AA contrast),
three self-hosted variable faces, fluid `clamp()` type, `gap-px` card grids that read as
engineering drawings, and one easing curve site-wide.

**Acceptance:** dark and light themes are a variable swap on `[data-theme]`; both ship in the
same stylesheet; no component hardcodes a colour.

---

## Agent 03 — Motion & creative engineering

**Output:** `src/components/motion.tsx`, `hero-canvas.tsx`, `process-story.tsx`, `cursor.tsx`.

The signature piece is a hand-written canvas 2D data hall — pinhole projection, two rack rows
receding to a vanishing point, per-unit U-slots, breathing status LEDs on deterministic phases,
and light pulses travelling the overhead cable trays. ~250 lines, no library, no WebGL.

**Discipline:** DPR capped at 2, paused when off-screen or tab-hidden, `aria-hidden` decoration,
and a genuine reduced-motion path — the hero renders one static frame, the cursor and marquee
are disabled, and a persistent footer switch does the same on request.

**Acceptance:** no animation library in the dependency tree (`npm ls` shows none); First Load JS
stays 103–136 kB per route.

---

## Agent 04 — Information architecture & copy

**Output:** `docs/INFORMATION-ARCHITECTURE.md` + `src/lib/content/*`.

38 URLs from a 22-page spec: the specified pages plus individually addressable case studies and
articles. Nine services written to be technically credible — inclusion *and* exclusion lists,
5–6 step methods, real standards (TIA-606-D, TIA-568.2-D, ISO/IEC 11801, EN 50600, ASHRAE,
NIST SP 800-88, ANSI/ESD S20.20, CIS), and 4 FAQs each. Eight case studies with metrics, eight
Insights with full Markdown bodies, five sectors, 28 coverage countries.

**Acceptance:** every service record hydrates typed arrays from JSON columns
(`tests/queries.test.ts`), and every published Insight renders with at least one `<h2>`
(`tests/markdown.test.tsx`).

---

## Agent 05 — Frontend engineering

**Output:** ~20 components, 38 pages, App Router with RSC.

Client components exist only where interaction does: nav, search overlay, filters, the quote
form, the coverage map, motion observers. Accordions are native `<details>` — zero JS. The
Markdown renderer is dependency-free and never uses `dangerouslySetInnerHTML` (proved by a test
that injects `<script>` and `<img onerror>` and asserts they are escaped).

**Acceptance:** `tsc --noEmit` clean; `npm run build` produces 49 routes.

---

## Agent 06 — Backend & data engineering

**Output:** `src/lib/db.ts`, `queries.ts`, `seed.ts`, 8 route handlers, middleware, admin console.

SQLite schema with content tables (idempotent seeding — `INSERT OR IGNORE`, so database edits
survive a redeploy) and operational tables (`leads`, `subscribers`, `events`). Zod drives
validation and inferred types. The lead pipeline scores abuse (honeypot, sub-4-second
completion, disposable domains, link density) and returns a plausible success for bots while
storing nothing. Admin is cookie-gated at the edge middleware and re-checked in the handler.

**Acceptance:** 33 tests across `queries.test.ts` and `api.test.ts` call the real handlers with
`NextRequest`, including 401/422/400 paths and honeypot behaviour.

---

## Agent 07 — SEO engineering

**Output:** `src/lib/seo.tsx`, `sitemap.ts`, `robots.ts`, per-page metadata, eight JSON-LD types.

Canonicals, OG and Twitter cards from one builder; sitemap generated from the live content
tables so new projects and articles appear automatically; `/admin` and `/api/` disallowed and
`noindex`.

**Acceptance:** `scripts/audit.mjs` verifies per page — exactly one `<h1>`, title ≤70 chars,
meta description ≥60 chars, canonical, all OG/Twitter tags, `<html lang>`, every JSON-LD block
parses and carries `@context`, and no `x-powered-by` leak.

---

## Agent 08 — QA & accessibility

**Output:** `tests/` (55 tests), `scripts/audit.mjs`, `docs/QA-REPORT.md`.

Tests exercise real code paths, not stand-ins: Zod schemas, the seeded query layer against a
throwaway database, the Markdown component rendered through `react-dom/server`, and the route
handlers invoked directly. The audit crawls every sitemap URL, checks headers and links, and
runs axe-core (WCAG 2.2 A/AA + best practice) on each page.

### Findings found and fixed

| Finding | Severity | Fix |
| --- | --- | --- |
| `better-sqlite3` 13.0.3 segfaults in the `Database` constructor on Node 20 here — crashed the build worker with SIGSEGV | blocking | Isolated by cross-loading both installs from each other's cwd; pinned to 12.11.1, which verifies clean. Documented in README. |
| Interactive SVG countries nested inside `role="img"` | serious | `role="group"` with a descriptive label |
| Heading-order skips on 4 pages (`h1 → h3`) | moderate | Added real section `h2`s; `SectionHead` gained a `level` prop |
| `/services` had no `<h1>` at all | moderate | Hero now renders `level="h1"` |
| 3 document titles over 70 chars | minor | Shortened; added an `seo_title` column so display and SEO titles can differ |
| Honeypot returned 422 instead of a plausible success — which tells a bot it was detected | minor | Relaxed the field to pass schema, letting the spam gate respond with 200 and store nothing |

### Pass 2 — regional landing pages (SEO agent + frontend agent)

Added `/services/[slug]/[country]` (135 pages) and `/coverage/[country]` (15 hubs) for 15
priority markets. Pages are composed, not templated: each combines the service record, a
country standards/compliance/safety profile (`src/lib/content/regional.ts`) and the live
coverage row, so a German page cites DIN EN 50173 and DGUV V3 while a US page cites
ANSI/TIA-568.2-D, TIA-1152 and NFPA 70E.

| Finding | Severity | Resolution |
| --- | --- | --- |
| `buildRegionalPage` built its canonical path from the country **slug** while `generateStaticParams` and every link used the ISO **code** — 135 pages of cross-links pointing at routes that did not exist | blocking | Standardised on the readable slug; added `regionalSlug`/`regionalCode` helpers and a regression test that asserts the route param, the path and the back-lookup all agree |
| Page titles carried a manual `\| Tech Maths` suffix on top of `SITE_METADATA`'s `%s — Tech Maths` template, producing double branding and 79-char titles | serious | Dropped the manual suffix; the unit test now measures the **rendered** title including the template suffix, which is what the earlier assertion missed |

### Final state

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Build | `npm run build` | 199 prerendered pages, First Load JS 103–136 kB |
| Tests | `npx vitest run` | 69/69 |
| Audit | `node scripts/audit.mjs` | 188 pages · 0 findings · 0 dead links (187 checked) · 0 axe violations |
| Lead pipeline (live) | `curl -X POST /api/leads` | `TM-2026-RY0QG`; invalid payload → 422 with three field errors |
| Admin gate (live) | `curl /admin` | 307 → `/admin/login?next=%2Fadmin` |
| Headers (live) | `curl -I /` | CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy; no `x-powered-by` |

### Not covered

Colour contrast — jsdom has no layout engine, so axe's contrast rules are disabled in the
automated run. Lighthouse performance likewise needs a real browser. Both are on the
pre-launch checklist in `docs/HANDOVER.md`.

---

## Agent 07 — Database engineer (Release 2 schema)

**Brief:** give the operational modules real storage without breaking Release 1.

**Output:** `supabase/migrations/20261104120000_portal_v2_control.sql` — additive only: four
enums, eleven tables, 48 seeded permission keys, 27 functions, 22 policies, grants and a
tagged demo dataset.

**What the audit found before any code was written**

| Finding | Severity | Resolution |
| --- | --- | --- |
| The live database had four migrations, but the repo's `20261104061500_wave2_wave3_operations.sql` was never among them — so `send_ticket_message`, `log_time_entry` and `approve_time_entry` did not exist and Wave 2/3 screens failed at runtime | blocking | Re-asserted all three RPCs (idempotent `create or replace`) inside the new migration; confirmed present in `pg_proc` afterwards |
| The live project also carried an `admin_management_rpcs` migration with no file in the repo, so the repo was *not* a faithful record of the database | serious | Dumped the real column list, enums and helper bodies first, then wrote the migration against the remote rather than against the repo's assumptions |
| Four SQL defects in the draft (reserved-word alias `as row`, `UNION ALL` branches with bare `LIMIT`, operator precedence in `generate_days`, non-idempotent triggers) | blocking | Fixed before applying; the migration was applied in six atomic chunks and each returned without error |

**Verification:** `schema_migrations` now lists `20261104120000`; `public` holds 24 tables,
51 policies and 39 functions; `permission_registry` holds 48 keys.

## Agent 08 — Frontend engineer (control console)

**Brief:** an admin console that looks like it belongs to the existing portal, works at 375 px,
and never decides permissions on its own.

**Output:** six components under `src/components/portal/v2/` plus a typed client in
`src/lib/portal-v2.ts`. The console is reached from a new "Control" sidebar item that only
internal roles see, and each tab is gated by the permission keys the database returns
(`availableTabs`), not by a hardcoded role name. Empty, loading and error states exist on every
panel; errors carry operator-language copy mapped from SQLSTATE rather than raw Postgres text.

**Design decisions:** the U-occupancy grid treats `u_position` as the top of a device (a 2U unit
at U32 also consumes U31) — that convention is asserted in a test so the rack view and the
future capacity maths cannot drift apart. Finance cells disappear entirely when
`finance.margins` is absent, rather than rendering zeros.

## Agent 09 — QA / release engineer

**Brief:** prove it, then get it deployable.

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 100/100 |
| Build | `npm run build` | compiled successfully |
| Environment | `vercel env` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` added for preview + development (it already existed for production) |

**Blocking defect found during QA:** `next build` failed at page-data collection with
`NETLIFY_DB_URL environment variable is not set` — `db/index.ts` constructed the Drizzle client
at import time, so *any* environment without that variable could not build, including preview
deployments. Replaced with a lazily-constructed proxy: importing the module no longer needs a
database, and the first query still fails loudly with the original message.

**Not covered:** automated browser runs (Playwright) against the new console, and the
375 px screenshots. Both need a seeded session against the live project and are the first item
on the Release 3 checklist.

## Agent 10 — Database engineer (Release 3 money spine)

**Brief:** rate cards → quotes → client approval → invoice → payment, flag-gated, no payouts.

One additive migration (`20261104130000_portal_v3_money.sql`, 1444 lines) adding eight tables
(`feature_flags`, `rate_cards`, `rate_card_lines`, `quotes`, `quote_lines`, `invoices`,
`invoice_lines`, `payments`), four enums, two number sequences and 24 `money_*` functions. Writes go
through `security definer` RPCs only — the tables are select-only for the API and every RPC checks
`auth.uid()`, the permission key, then raises a named SQLSTATE and writes an audit row.

**Design decisions:** totals are recalculated in the database on every line change so a client can
never be invoiced for maths the browser invented; `line_total` is a generated column. The invoice
status is never set by hand — `part_paid`, `paid` and `overdue` are derived from payments and the
due date. Voiding is blocked once money has been recorded, because the correct answer there is a
credit note, not a retraction.

**Money guard:** `money_require_flag(key)` raises `0A000 feature_disabled:<key>` when the
corresponding `feature_flags` row is off. Sending quotes, issuing invoices and recording payments
each sit behind their own switch, so the whole spine can be demonstrated internally while nothing
reaches a client until the owner is ready.

## Agent 11 — Frontend engineer (money console)

**Brief:** a console dense enough for a bookkeeper, quiet enough for the owner.

New "Money" sidebar item (internal roles), five tabs: overview with receivables aging, quotes,
invoices, rate cards and settings. Every mutation is a database call — the UI never computes a
status, it re-reads the document after each action. Flag state is shown three ways: a banner that
names exactly which actions are switched off, a per-tab note, and disabled buttons whose tooltip
names the flag. Draft documents are editable; issued invoices are not, because a client already has
a copy.

**Design decisions:** the money guard is explained in operator language ("switching this off keeps
every quote a private draft") rather than as a toggle label. Aging buckets follow the invoice due
date, and the 90+ band is the only one that borrows the danger colour. Rate-card costs disappear
entirely without `finance.margins` instead of rendering zeros.

## Agent 12 — QA / release engineer (Release 3)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 119/119 (19 new money assertions) |
| Build | `npm run build` | compiled successfully, `/portal` 117 kB / 256 kB |
| Live database | SQL as the admin account | full spine exercised, then purged |

The live run proved all three flag refusals (`0A000 feature_disabled:<key>`), the complete
draft → send → accept → convert → issue → part-paid → paid path, the overpayment and void guards,
and that metrics and audit rows matched the documents. Demo data was removed afterwards and all
three flags returned to off.

**Not covered:** Playwright runs against the money console, and a client-facing acceptance screen.
`money_respond_quote` already authorises a client organization member to accept or decline, but the
only UI for it today sits in the internal console, so staff record the decision on the client's
behalf and the acceptance names who gave it.

## Agent 13 — Database engineer (R3.1 expenses)

**Brief:** costs booked against a job, reviewed before they count, still no payouts.

One additive migration (`20261104140000_portal_v3_expenses.sql`): the `expenses` table with two
enums, generated VAT and gross columns, four indexes, two permission keys and six
`money_*_expense*` functions. Submitting and approving are split across the two permissions so the
person who spent the money cannot sign it off alone; `expense_self_approval` blocks it explicitly
for everyone except the admin. A reimbursable claim without a receipt link is refused at the
database (`expense_receipt_required`), not just in the form.

**Design decisions:** expenses are internal — the select policy requires `finance.expenses` and the
internal role, so a client organization member can never read the cost side of their own work.
Editing a rejected claim resets it to draft rather than silently keeping the rejection, and every
transition writes an audit row. `portal_purge_demo()` now clears expenses before payments so a
single purge still removes the whole demo dataset.

## Agent 14 — Frontend engineer (expenses tab)

**Brief:** fast enough to log a receipt from a phone, clear enough that an admin can audit it.

A fifth money tab, visible to holders of `finance.expenses`. Stats strip (awaiting, approved this
month, approved overall, owed to people), a status filter, and a table that shows net, VAT and gross
separately because those are three different questions. Receipt links open in a new tab; the review
modal records the note that lands on the expense and in the audit log. Approve and reject are
hidden entirely without `finance.expenses_approve`, and the year-to-date VAT line is labelled as a
bookkeeping aid rather than a return.

## Agent 15 — QA / release engineer (R3.1)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 124/124 (5 new expense assertions) |
| Build | `npm run build` | compiled successfully, `/portal` 121 kB / 260 kB |
| Live database | SQL as the admin account | create → submit → reject → resubmit → approve, then purge |

**Not covered:** receipt file uploads (claims carry a URL for now) and any payout flow — approving a
reimbursable claim records a debt, it does not pay it.

## Agent 16 — Database engineer (R3.2 job costing)

**Brief:** say what each job actually earned, without inventing revenue allocation.

Two nullable `ticket_id` columns (`quote_lines`, `invoice_lines`) and two functions:
`money_set_line_job` to attribute a single line (validated against the client that owns the ticket,
refused on void invoices, audited) and `money_job_margins` to report per-ticket revenue, labour,
approved expenses and margin for a date range. `money_quote_to_invoice` was replaced so attribution
survives conversion, and the document reads now return the job on each line.

**Design decisions:** revenue is attributed per line and discounted per invoice, so it reconciles
with the invoice total instead of double-counting. Unattributed money is reported as unallocated
rather than spread across jobs. Labour comes from `time_entries` priced at
`engineer_profiles.hourly_rate`, and hours without a rate are counted separately — a margin is never
silently overstated. The whole report sits behind `finance.margins`.

## Agent 17 — Frontend engineer (margins tab)

**Brief:** answer "did this job make money?" in one screen.

A Margins tab with period presets (month, 30 days, quarter, year, or explicit dates) and a client
filter. Four headline numbers, a per-job table with revenue, labour hours and cost, expenses, margin
and a colour-graded margin percentage, plus a footer that totals the rows. A separate panel shows the
unallocated revenue, expenses and labour so a bookkeeper can see what is not yet attributed. Quote
and invoice detail views gained a per-line job selector, which writes through to the database and
re-reads the document.

## Agent 18 — QA / release engineer (R3.2)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 129/129 (5 new margin assertions) |
| Build | `npm run build` | compiled successfully |
| Live database | SQL as the admin account | attribution, labour cost and roll-up verified, then cleaned up |

Live proof: a demo invoice line (€544) attributed to a ticket with two approved hours at €35/h
produced revenue €544, labour €70, margin €474 and 87.1%; the two unattributed lines and the
unattributed €84.50 travel claim appeared under "what is not attributed". The QA ticket, time entry
and rate were removed afterwards.

**Not covered:** overhead allocation, multi-currency conversion (everything is reported in the
document currency), and any payout calculation.

## Agent 19 — Database engineer (R4)

**Brief:** make the three permission keys that do nothing (`clients.edit`, `people.edit_rates`,
`audit.view`) actually do something, without touching an existing contract.

`20261104160000_portal_v4_clients_sites.sql` adds eight security-definer functions — five for clients
and sites, two for the engineer directory, one for the audit log — plus grants and a migration audit
row. Two design decisions matter:

- **Sensitive values are split out, not filtered later.** The access procedure has its own read RPC
  behind `clients.access_codes`; the client list only ever returns `has_access_notes`. Pay rates come
  back as `null` unless the caller holds `people.pay_rates`, and `rates_visible` tells the UI which
  world it is in. The audit row for an access-procedure edit stores character counts, never the text.
- **Two independent write permissions in one function.** `portal_save_engineer_profile` checks
  `people.edit_rates` for the rate and `people.onboarding` for verification separately, so Staff can
  approve an engineer without ever being able to change what that engineer costs.

Verified as real users by setting the JWT claim in-session: admin sees rates and access text, staff
sees neither, and a client user cannot reach another organization's records.

## Agent 20 — Frontend engineer (R4 console tabs)

**Brief:** three new screens, no new design language.

**Clients** (new tab) — summary stats, search across clients and sites, per-client cards with inline
site rows and "no access notes" warnings, three modals (client, site, access procedure). The access
modal carries an explicit warning that the text is permission-gated and excluded from the audit body.

**Engineer directory** (below the People table) — verification pill, masked rate, open tickets,
30-day approved hours, and an editor that disables the rate field when the permission is absent rather
than hiding the number.

**Audit** (new tab) — entity filter with suggestions, row-count selector, before → after summaries
per row, and CSV export built on a shared `csvFromRows` helper with proper RFC 4180 quoting.

Six pure helpers moved into `portal-v2.ts` so they are testable without a browser: `displayRate`,
`siteSubtitle`, `coverageSummary`, `csvFromRows`, `auditHeadline`, `verificationTone`. Tab gating
extended: `clients.view|clients.edit` → Clients, `audit.view` → Audit.

## Agent 21 — QA / release engineer (R4)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 140/140 (11 new) |
| Build | `npm run build` | compiled successfully |
| Live database | RPCs as admin, staff and client accounts | see the table in `V4-CLIENTS-SITES.md` |
| Cleanup | QA site, access row, engineer profile, audit rows | removed; sites 0, tickets 0, engineer profiles 1 |

**Not covered:** contacts, client-side team management, credential rotation, time-limited access
codes, Excel import, and any aggregation of the audit log beyond the last 500 rows.

## Agent 22 — Database engineer (R5)

**Brief:** make the dispatch loop real, and give every person an inbox, without an email provider.

`20261105090000_portal_v5_dispatch.sql` adds `portal_notifications` (RLS: own rows only, column-level
`update (read_at)` grant, inserts only through a security-definer helper) and eight RPCs:
send/respond/list offers, my-offers, expiry housekeeping, notification list and mark-read.

Two rules live in Postgres rather than the client: **one live offer per engineer per ticket** (the
unique key already enforced it; the RPC now refuses a duplicate instead of erroring obscurely), and
**expiry is authoritative** — `portal_expire_offers()` runs inside the read RPCs, so a list can never
present a dead offer as actionable. Accepting assigns the engineer, marks every sibling offer `taken`,
writes an event and an audit row. Declining records the reason, returns the ticket to `new` when
nothing else is live, and notifies dispatch.

Three triggers fan out the events that used to die silently: ticket assignment, quote decision and
expense submission.

**Defect found in live QA:** notification titles rendered as `New job offer \u00b7 …` because a
JSON-escaped separator was pasted into a SQL string literal, where `\u` is not an escape (Postgres
needs `E''`). All five functions were recreated with the real character and the migration file now
matches production exactly.

## Agent 23 — Frontend engineer (R5 offers)

**Brief:** an engineer should be able to answer a job from a phone in ten seconds.

New **Offers** page: actionable cards sorted by the closest deadline with a countdown that ticks
without a reload, client/site/estimate/rate in one glance, accept in one tap, decline with a reason
in a modal, and a history list that explains what happened (declined, taken by another engineer,
expired). The **Control → Bulk actions** board gained a per-ticket **Offer** action with an engineer
picker, window and optional rate.

Seven pure helpers landed in `portal-dispatch.ts` so the timing logic is testable: `minutesLeft`,
`offerCountdown`, `actionableOffers`, `offerHistory`, `offerTone`, `relativeTime`,
`notificationTone`.

## Agent 24 — QA / release engineer (R5)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 148/148 (8 new) |
| Build | `npm run build` | compiled, `/portal` 134 kB / 273 kB |
| Live flow | offer → accept as the freelancer | ticket `assigned`, 2 audit rows, admin notified |
| Cleanup | QA ticket, offer, events, notifications, site | tickets 0, sites 0, offers 0, notifications 0 |

**Not covered:** outbound email/push/SMS, quiet hours, shortlist broadcast, escalation on lapse,
smart ranking, certificate-gated offers.

## Agent 25 — Frontend engineer (R6 client portal)

**Brief:** a client should never have to email to approve a quote or check an invoice.

The client account landed on the operations overview and could do nothing with it. R6 adds a
**Workspace** page and makes it the client's landing page: an account banner (organisation, VAT,
standing), four stat cards (open requests, quotes to approve, outstanding, paid this year), the
agreement card, an attention list that links to the tab that resolves it, and tabs for quotes,
invoices, requests and sites.

Vocabulary matters as much as layout: `completed_pending_approval` reads *Waiting for your approval*,
`offered` reads *Matching an engineer*, and internal states never reach the client. Accepting a quote
is two taps with the total restated; declining asks what to change and passes the reason to the team.
Opening a completed request offers **Approve the work** or **Send back** with a note.

Eighteen assertions in `tests/portal-v6.test.ts` cover the copy, tones, billing arithmetic, validity
countdowns, settlement percentage, error copy and the invoice CSV.

## Agent 26 — Data engineer (R7 contracts)

**Brief:** make the SLA a database fact, not a note in a spreadsheet.

`client_contracts` carries four shapes in one table. The load-bearing pieces are a `before insert`
trigger that stamps `contract_id` and `sla_due_at` from the client's active tier, and `contract_usage`
which recomputes hours from approved time entries (monthly for a retainer, over the whole life for a
bundle) so nobody can type usage in by hand.

Two rules are enforced in the database, not the UI: one active SLA tier per client (partial unique
index plus a friendly error), and a bundle draw-down that cannot exceed the purchased hours.

The client reads the same contract through `portal_client_contracts`, which strips the fee and the
margin — the client sees the promise, not the price list.

## Agent 27 — QA / release engineer (R6–R8)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 188/188 (40 new across R6–R8) |
| Build | `npm run build` | compiled, `/portal` 151 kB / 291 kB |
| Client home (live) | `portal_client_home()` as the demo client | 2 open requests, 1 quote awaiting, 853.13 EUR outstanding, next visit in 2 days |
| Quote decision (live) | temporary sent quote, declined by the client | status `declined`, audit row, admin + staff notified |
| Visit request (live) | `portal_client_request_visit` | ticket in `visit_request`, 2 notifications |
| Sign-off (live) | `portal_client_sign_off(false)` | ticket back to `in_progress`, client note on the timeline |
| Contract read (live) | `contract_get` as the demo client | `not_authorized` — fees are internal; the client sees `portal_client_contracts` only |
| SLA trigger (live) | ticket created with no due date | `contract_id` = Gold SLA, 240-minute window |
| Contracts (live) | `contract_metrics()` | 2 active, 1 400 EUR MRR, 20 included hours |
| Reports (live) | `reports_ops`, `reports_finance` | 31 daily points, 1 156 net invoiced, 853.13 outstanding, 92.7 % margin |
| Permissions | helper ACLs | client helpers and `portal_notify` revoked from `anon` + `authenticated` |

QA rows (temporary quote, visit-request ticket, notifications, the temporary ticket,
its events) were deleted afterwards; the demo dataset was left intact and the money flags stayed on.

**Not covered:** email/SMS delivery, online card payment, PDF rendering, XLSX export, scheduled
reports, signature capture, cleared-engineer rules, contract renewal workflow.

## Agent 28 — Data engineer (R9 parts and stock)

**Brief:** a part that goes into a rack has to exist somewhere, or margin is fiction.

Seven tables and one law: `part_stock_move` is the only thing that changes stock. It takes an
absolute count for `adjust` and a delta for everything else, writes the ledger row with the balance
after it, and refuses to leave a shelf negative. `ticket_part_add` issues first and records the line
second, so a job can never carry a part the warehouse does not have; `ticket_part_remove` returns it.

Purchase orders receive line by line into a named location, at the price the order was raised at, and
only close when every line is complete. The one existing function with a stake in this,
`money_job_margins`, was rewritten to subtract `quantity × unit_cost` per ticket and in the totals.

The order-save signature takes `uuid[]`/`numeric[]` rather than a jsonb blob: PostgREST maps arrays
without ambiguity, so a malformed call fails at validation instead of half way through an insert.

## Agent 29 — Frontend engineer (R9 stock room)

**Brief:** a coordinator should be able to answer "how many do we have, and where" without leaving
the console.

New **Stock** page with three tabs. Stock: search, category, a low-only toggle, on-hand per part with
the reorder point underneath, status pill, value at cost, and a row that opens the part sheet
(balances per location, last 25 movements with signed deltas, edit, move). Catalog: cost, sale, margin
and reorder rules, with the editor. Orders: supplier cards with status, expected date, per-line
progress bars, send/cancel, and a receive dialog that names the shelf.

On a ticket, a collapsible **Parts used** drawer: count, charge and margin in the collapsed row, the
booked lines with cost and warranty date, a book-out form that only offers locations that actually
hold the part, and a remove action that returns it. It hides itself for accounts without
`assets.view` instead of showing a permission error.

## Agent 30 — QA / release engineer (R9)

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Tests | `npx vitest run` | 206/206 (18 new) |
| Build | `npm run build` | compiled |
| Seed (live) | `parts_seed_demo()` | 2 locations, 5 SKUs, €2 206.40 at cost, 1 order |
| Oversell (live) | issue 999 from the van | `insufficient_stock`, nothing written |
| Ticket parts (live) | add PSU then remove | stock 5 → 4 → 5, ledger `issue:1` then `return:1` |
| Purchase order (live) | receive 30 of 100 | order `partial`, warehouse 180 → 210, movement recorded |
| Order save (live) | array signature, 2 lines | created, total correct, then deleted |
| Margin (live) | `money_job_margins` | `parts_cost` 67.60 in the totals |
| Permissions (live) | client `parts_metrics()` | `not_authorized`; staff flags `can_order: false` |
| ACLs | `pg_proc.proacl` | API functions = authenticated + service_role only |

**Not covered:** carrier tracking, goods-received photos, RMA workflow, barcode scanning, engineer-app
parts screen, stock transfers as a paired movement.
