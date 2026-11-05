# The 100× programme — from working portal to best-in-class

**Baseline:** `main` @ `6343cee`, live on techmaths-dc.com · 5 November 2026
**Companion:** `docs/BATTLE-MODE.md` holds the paste-ready prompts for each release.

---

## 1. What "100× better" has to mean

The portal already does the hard part: 42 tables, 144 functions, 70 row-level policies, real money,
real SLA enforcement, real inventory. What it does not yet have is **reach, speed of use, and the
things that make an operator trust software with their day**.

100× is not a bigger feature list. It is six multipliers, each of which makes every existing feature
cheaper to use:

| # | Multiplier | Today | Target |
| --- | --- | --- | --- |
| 1 | **Reach** | 21 routes, dark desktop console, no email/SMS, no PDF, no storage | every document leaves the system, every notification reaches a phone, every screen works at 375 px |
| 2 | **Speed of use** | a coordinator needs 4–6 clicks to change a ticket; no command palette; no saved views | ⌘K for anything, optimistic writes, one-key status changes, saved views shared across the team |
| 3 | **Field reality** | engineer has offers and a chat; no job pack, no offline, no photos, no earnings | a job can be run end-to-end on a phone with one bar of signal |
| 4 | **Trust** | no 2FA, no session revoke, no view-as, no GDPR toolkit, no backup evidence | a client's auditor and your insurer both say yes |
| 5 | **Money completeness** | quotes → invoices → payments; no credit notes, approvals, payouts, rate cards, locked periods | the accountant can close a month without a spreadsheet |
| 6 | **Leverage** | reports on demand; every dispatch decision is manual | rules, digests, alerts and ranking do the routine thinking |

The programme finishes when **~75 % of the 135 plan rows are live** (today: 12 %), the console is
usable on a phone, and a PDF invoice, a signed completion sheet and an emailed daily summary are
ordinary rather than special.

### The scorecard we will be judged on

| Dimension | Metric | Today | After programme |
| --- | --- | --- | --- |
| Coverage | plan rows ✅ / 🟡 / ⛔ | 16 / 47 / 72 | **~100 / ~28 / ~7** |
| Speed | `/portal` first-load JS | 300 kB | **≤ 280 kB** (split the console) |
| Speed | interactive feedback on any write | full round-trip | **< 100 ms** (optimistic) + confirmed |
| Speed | time to change a ticket status | 4+ clicks | **1 key** from the list, ⌘K from anywhere |
| Reach | features unusable at 375 px | console navigation, tables without mobile cards | **zero** |
| Reliability | writes that can half-succeed | stock/money paths guarded, others not | **all money and stock writes idempotent** |
| Trust | security rows live (§10) | 1 of 7 | **6 of 7** |
| Documents | PDFs emitted | 0 | quotes, invoices, statements, completion sheets, accountant pack |
| Tests | vitest cases / DB checks | 206 / manual | **450+ / a scripted SQL suite** |

---

## 2. Baseline, measured

| Fact | Value | Why it matters |
| --- | --- | --- |
| Database | 42 tables, 144 functions, 70 policies, 50 permission keys | the spine is real; new features are cheap |
| App | 21 routes, `/portal` 160 kB route / 300 kB first load | console is one large client bundle |
| Tests | 17 files, 206 cases | helpers only, no DB or RLS coverage |
| Portals | marketing site + ops console + client workspace | three audiences, one codebase |
| Deploy | Vercel `dpl_GYhMqDBRz…`, build 66 s | fast enough to ship several releases a day |
| Migration history | files through `20261105180000`, project history through `20261104150000` | **must be repaired before R10** |

---

## 3. Operating model — how the work runs

Four waves. Each release is one branch, one PR, one handoff note, and it does not start until the
previous one is live and you have clicked through it — the rule you set at the beginning of this
project, kept.

| Wave | Theme | Releases | Why this order |
| --- | --- | --- | --- |
| **1** | Foundation | R10 Platform, R11 Trust | storage, email, PDF and the design system are multipliers on everything after |
| **2** | Money & documents | R12 Documents, R13 Money depth | what a client actually receives, and what closes a month |
| **3** | Product face | R14 Field, R15 Client, R16 Vendors & crews | the two audiences that touch the work daily |
| **4** | Leverage | R17 Comms, R18 Automation, R19 Data-centre, R20 Insight, R21 Polish | automate the routine, then deepen the niche, then sharpen |

Total: **12 releases, ~34 agent sessions**. Each release is independently shippable.

---

## 4. Wave 1 — Foundation (R10, R11)

### R10 — Platform multipliers

> *Outcome: the portal can send an email, store a photo, emit a PDF, and be driven from a keyboard.*

| Area | Scope |
| --- | --- |
| Storage | Supabase Storage buckets `ticket-photos`, `documents`, `receipts`, `signatures`; signed URLs; per-org RLS on paths; upload component with camera capture, compression and retry |
| Email | provider (Resend or Postmark) behind an outbox table + worker; templates in the DB; every R5–R9 notification also sends email when the recipient allows it |
| Documents | server-side PDF: quote, invoice, statement, completion sheet, contract summary; consistent letterhead, VAT block, page numbers, print CSS |
| Design system v2 | tokens (spacing, type scale, elevation, motion), `Sheet`/`Toast`/`Skeleton`/`Empty`/`DataTable` primitives, density toggle, focus-visible everywhere, reduced-motion respected |
| Navigation | mobile drawer for the console, bottom tabs on phones, **⌘K command palette** (pages, tickets, clients, parts, actions), saved views shared with the team |
| Hygiene | migration-history repair, `pnpm`/`npm` lockfile check, error boundary + retry, RPC timing instrumentation |

**Gate:** an invoice downloads as a PDF from the client workspace; a photo uploads from a phone; ⌘K
finds any ticket by number; console is fully usable at 375 px; `/portal` first-load ≤ 300 kB.

### R11 — Trust and identity

> *Outcome: you can prove who did what, revoke it, and hand an auditor a pack.*

| Item | Detail |
| --- | --- |
| "View as this user" | read-only impersonation with an unmissable banner, 30-minute expiry, audit row on start and stop |
| Sessions | login history, device list, revoke one/all, force logout; last-seen on team page |
| Auth depth | invite by email, password reset, **TOTP 2FA**, recovery codes, mandatory for admin |
| Access expiry | `profiles.access_ends_on`; expired accounts lose access automatically, with a 14-day warning |
| Network | optional IP allow-list for admin and finance roles |
| GDPR toolkit | data export per person and per client org, deletion workflow with retention rules, consent log, retention dashboard |
| Evidence | backup status panel, a written restore drill, and an on-call "what to do at 3 am" page |

**Gate:** every §10 row except phone/security-hardware is ✅ or honestly 🟡; 2FA enforced for admins;
a client export produces a zip; view-as never allows a write.

---

## 5. Wave 2 — Money and documents (R12, R13)

### R12 — Documents and signature

> *Outcome: nothing leaves the business as a CSV.*

- PDF quote with acceptance link, PDF invoice with VAT breakdown and payment terms, statement of
  account, credit note, completion sheet with photos.
- **E-sign**: draw/type signature on quotes and completion sheets, stored with timestamp, IP and hash;
  the signed PDF is archived to the client's document list.
- Print stylesheet for every document, plus a "light" surface for print.
- Accountant pack: one XLSX per month — invoices, payments, expenses, VAT by country, aging.
- Numbering is continuous and locked once issued; a cancelled invoice keeps its number.

**Gate:** quote → signed PDF → invoice → statement chain produced end-to-end on the demo client.

### R13 — Money depth

> *Outcome: the month closes without a spreadsheet.*

- **Rate cards**: by engineer, skill, time of day (day/night/weekend), ticket type, country; effective
  dated; the invoice suggestion picks the right one.
- **Approval chain** for amounts over a threshold (staff → admin), with a queue and an audit trail.
- **Payout run**: pick a period, see approved hours and expenses per engineer, adjust, approve, export
  **SEPA XML**, mark paid; self-billing statements per engineer.
- **Credit notes, partial payments, dunning**: reminders at 7/14/30 days, late-fee rules, write-off.
- **Locked periods**: a closed month cannot be edited; a controlled unlock needs admin + reason.
- **Multi-currency**: stored FX rate per invoice, reporting in EUR.
- **Accountant role**: read-only across money, exports only, no client or engineer data.

**Gate:** demo invoice raised via a rate card, overage billed from a retainer, credit note issued,
payout exported as valid SEPA, period locked and unlocked with an audit trail.

---

## 6. Wave 3 — Product face (R14, R15, R16)

### R14 — Field app

> *Outcome: an engineer can run a job from a phone with one bar of signal.*

- **Job pack** on acceptance: site, access instructions, contacts, assets, history, RAMS, required
  photos, parts reserved.
- **Step workflow**: per-category checklist templates, required photos per step, serial/barcode scan,
  timestamps; cannot complete a step that is missing evidence.
- **Offline**: local queue with conflict-aware replay, "will sync when back" state, no data loss on
  refresh.
- **Travel log**: start/stop, distance, tolls/parking receipts by camera.
- **Earnings**: hours approved vs pending, expenses, expected payout, downloadable statement.
- **Safety**: lone-working check-in timer with escalation, panic button, incident report from the app.
- **Profile**: certificates with photo upload and expiry, induction quizzes, rating history.

**Gate:** a full job (accept → travel → steps with photos → parts → complete) is run on a throttled
connection with airplane mode in the middle and nothing is lost.

### R15 — Client portal depth

> *Outcome: the client would rather open the portal than send an email.*

- **Live status** with ETA and arrival notice; "your engineer is 20 minutes away" as an email/SMS.
- **Service reports**: auto-generated per visit, with photos and parts, downloadable as PDF.
- **Assets and racks**: their equipment list plus a rack elevation view of what is where.
- **Booking calendar**: real slots from engineer availability, not just a preferred date.
- **Team management**: they invite colleagues with roles (approver, invoice viewer, requester).
- **Survey and quarterly review**: CSAT after each job, NPS quarterly, a review page with the numbers.
- **Help centre and support chat** inside the portal; approved-visitor list feeding site access.
- **Guided request**: templates per service with photo prompts.

**Gate:** from a client account, a visitor can request a job, watch it arrive, approve, download the
report, rate it, and invite a colleague — without a single email.

### R16 — Vendors, crews and client rules

> *Outcome: subcontracting stops being a spreadsheet.*

- **Vendor registry**: company, contacts, contract, rates, currency, payment terms, docs; a vendor
  login that sees only its own offers and payouts.
- **Crews**: multiple engineers per ticket, each with own rate and hours, one lead; crew offers.
- **Multi-day projects**: parent ticket with child visits across sites and days.
- **Client rules**: cleared-engineer lists, blacklist/do-not-send, approval-before-entry, hour caps
  that block dispatch, signature required on completion.
- **Merge/split/link** tickets with history preserved.

**Gate:** a job is split across two engineers and a vendor, priced per person, and the client's
cleared-engineer rule blocks an unapproved offer.

---

## 7. Wave 4 — Leverage (R17–R21)

### R17 — Communication engine

Templates per event and language, channel routing (in-app, email, SMS, push), quiet hours, digests,
announcements to a group, ticket-by-email (inbound parse to a draft ticket), quick replies in chat,
optional WhatsApp. **Gate:** an engineer on a job gets an SMS; a client email becomes a ticket; quiet
hours are respected.

### R18 — Automation and scheduling

No-code "when X then Y" builder with five shipped rules (offer lapse → widen pool; SLA at risk →
notify lead; invoice overdue 14 days → reminder; no travel log → reminder; cert expiring 30 days →
task), scheduled reports by email, daily 07:00 summary, monitoring alerts → tickets, recurring plan
automation. **Gate:** five rules active on demo data, each with an audit trail of what fired.

### R19 — Data-centre depth

Cable register (port to port, type, length, test result, photos), rack elevation editor, change
requests with window and rollback, RAMS templates, permit-to-work and induction records, incident and
near-miss reporting, remote session logs and config backups, bulk asset import, tool/calibration
register, RMA and warranty claims. **Gate:** a rack can be rebuilt in the portal and printed; a change
request moves through approve → window → done with rollback notes.

### R20 — Insight and intelligence

Quality and demand reports (rework, photo compliance, busiest sites/days), **client health score**,
engineer scorecards with tiers/badges, smart dispatch ranking (skill, distance, past rating, cost),
SLA-breach prediction, capacity warnings, drag-and-drop resource planner, calendar sync (ICS + Google).
**Gate:** each of the top three client accounts has a health score with the drivers named, and a
shortlist ranks candidates with reasons.

### R21 — Scale and polish

PWA install + offline shell, i18n EN/PT/ES/FR/DE with the client-facing surfaces first, WCAG AA audit
with keyboard paths for every flow, enforced performance budgets in CI, observability (RPC timings,
error tracking, slow-query report), light theme for print and daylight, onboarding tour, illustrated
empty states, keyboard shortcuts everywhere.

---

## 8. Cross-cutting quality bar

Every release must meet all of this or it is not finished:

1. **Performance** — no interaction without feedback in 100 ms (optimistic or skeleton); `/portal`
   first load stays under 300 kB; new pages code-split.
2. **Mobile** — verified at 375 px: tables become cards, modals become sheets, the nav is reachable.
3. **Accessibility** — focus trap in modals, Escape closes, labels on every input, AA contrast,
   `aria-live` on async results, reduced-motion honoured.
4. **Error copy** — every database code has a sentence a non-engineer can act on, plus a retry.
5. **States** — empty, loading, error, and a "you lack permission" state that explains who to ask.
6. **Security** — RLS on every new table, definer RPCs only, `revoke … from public, anon`, audit row on
   every write, no secrets in the client bundle.
7. **Tests** — helpers covered; every money or stock RPC verified live with the SQL harness.
8. **Docs** — `docs/VNN-*.md` with model, permissions, test script, files changed, not covered;
   matrix and agent log updated in the same commit.
9. **Idempotence** — money and stock writes safe to retry; no double-charge, no double-issue.

---

## 9. What we are deliberately not building

Card payments and SCA (your call, unchanged), phone/telephony integration, referral programme,
auto-translation of user content, a marketing CRM, a full BI tool, white-label per client, native
mobile apps — the PWA covers the field-app need.

---

## 10. Risks and guardrails

| Risk | Guardrail |
| --- | --- |
| Scope sprawl across 12 releases | one release per PR; next starts only after you click through |
| Storage/email cost surprises | free tiers first, budgets reviewed at R10; no email without an outbox row |
| Migration drift | repair history in R10 before any new migration |
| Data loss in offline queue | append-only event log, replay with server-side dedupe |
| Security regressions | every release re-checks `pg_proc.proacl` and runs the ACL probe |
| Demo data in production | `is_demo` on every seed table, `portal_purge_demo()` extended each time |
| You lose visibility | each handoff note ends with a 60-second demo script |

---

## 11. Start here

Open `docs/BATTLE-MODE.md`, paste the **master kickoff prompt** with `R10`, and let it run. When it
opens the PR, paste the **merge gate prompt**; if it passes, tell me to merge and I will deploy and
verify production.

If you would rather front-load revenue than foundation, swap R10 with **R12 (documents)** — it needs
only the PDF library, not storage or email — and run the platform release second.
