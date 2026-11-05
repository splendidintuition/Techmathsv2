# Pending work — TechMaths operations portal

**As of 5 November 2026** · `main` @ `7181ef2` · deployed and live on techmaths-dc.com
Source of truth for feature status is still `docs/FEATURE-MATRIX.md`; this document is the *plan of
what to do next*, not another audit.

---

## 1. Where things stand

| Release | Scope | State |
| --- | --- | --- |
| R1–R3 | Auth, tickets, dispatch, timesheets, money spine (quotes → invoices → payments), expenses, job costing | ✅ live |
| R4 | Clients, sites, engineer directory, audit log viewer | ✅ live |
| R5 | Dispatch offers, notifications inbox | ✅ live |
| R6 | Client workspace: home, quotes, invoices, requests with sign-off, sites, visit requests | ✅ live |
| R7 | Contracts: SLA tiers, retainers, prepaid bundles, frameworks; SLA applied by trigger | ✅ live |
| R8 | Reports: operations, SLA, finance + CSV exports | ✅ live |
| — | Sidebar scroll/sign-out fix | ✅ live |

Coverage of the 135 product requirements in §3–§10:

| | §3.1 | §3.2 | §3.3 | §3.4 | §3.5 | §3.5.1 | §3.6 | §3.7 | §3.8 | §4 | §5 | §6 | §7 | §8 | §9 | §10 | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ✅ | 0 | 2 | 1 | 1 | 0 | 0 | 2 | 0 | 1 | 0 | 1 | 2 | 3 | 0 | 0 | 1 | **14** |
| 🟡 | 3 | 2 | 3 | 5 | 3 | 0 | 3 | 0 | 3 | 3 | 5 | 5 | 4 | 2 | 4 | 0 | **45** |
| ⛔ | 3 | 6 | 2 | 1 | 6 | 2 | 4 | 2 | 3 | 3 | 11 | 6 | 12 | 6 | 3 | 6 | **76** |
| rows | 6 | 10 | 6 | 7 | 9 | 2 | 9 | 2 | 7 | 6 | 17 | 13 | 19 | 8 | 7 | 7 | 135 |

Read it as: the command loop, money, clients/sites, dispatch and reporting are real. What is thin is
the **field app (§5)**, **data-centre depth (§7)**, **people & compliance (§3.5, §10)** and
**automation/comms (§3.7, §8)**.

---

## 2. Waiting on your decision

These are not engineering tasks — they need an answer from you before the next release starts.

| # | Question | Why it blocks |
| --- | --- | --- |
| 1 | **Demo data & money flags** — flip `money.*` flags off and run `portal_purge_demo()`? | Standing agreement: only when you say you have finished looking. Until then the demo org, 2 tickets, 2 quotes, 1 invoice and 2 contracts stay in production. |
| 2 | **Email provider** (Resend / Postmark / SMTP)? | Nothing can leave the system today: offers, quote decisions, invoice reminders, daily summaries and scheduled reports are all in-app only. Every comms item in §8 depends on this. |
| 3 | **File storage** — enable Supabase Storage buckets? | Blocks every photo/signature/receipt feature in §5, §6 and §7 (job packs, service reports, signed checklists, expense receipts). |
| 4 | **Document rendering** — server-side PDF? | Quotes, invoices, contracts and the accountant pack are CSV/HTML only. Needed for a VAT-ready invoice and anything a client can file. |
| 5 | **Card payments** — still excluded? | The plan asks for "pay online". I have not built it and will not without an explicit go-ahead (Stripe + SCA + reconciliation is a project in itself). |
| 6 | **Out of scope for good?** auto-translation, phone integration, referral programme, marketing-style announcements | Marked "later phase" in the plan. I would drop them unless you want them. |

---

## 3. Technical debt to clear before the next big feature

| # | Item | Detail | Size |
| --- | --- | --- | --- |
| 1 | **No mobile navigation in the internal console** | The rail is `hidden lg:flex`; on a phone there is only a sign-out button in the header, so staff cannot switch pages on a 375 px screen. The client workspace is fine (tab bar). This contradicts the "375 px" deliverable rule. | S |
| 2 | **Migration history drift** | R4–R8 were applied statement-by-statement through the SQL editor; `supabase/migrations/` has the files but the project's migration history stops at `20261104150000`. A fresh environment built from those files should match, but `supabase db push` would try to re-run them. Repair the history (mark R4–R8 applied) before the next schema release. | S |
| 3 | **No visual QA pass on R6–R8 screens** | Verified by types, tests, build and live RPC calls; there is no browser in this sandbox, so the new Workspace, Contracts and Reports layouts have not been seen at 375 px / 1440 px by a human. Worth 30 minutes of clicking. | S |
| 4 | **Tests are helper-level only** | 188 tests over pure functions (copy, maths, CSV, ranges). Nothing exercises RLS or the RPCs against a database; those are verified by hand each release. A pgTAP or scripted-SQL suite would pay for itself once more roles exist. | M |
| 5 | **JSON numbers as strings** | Postgres `numeric` arrives as `"20.00"` through `portal_client_contracts()` and `contract_metrics()`. The UI coerces it, but it is a trap for the next consumer. | S |
| 6 | **Permission keys are flat** | 50 keys with no grouping in the editor; the matrix §14 asks for editable per-role defaults with explanation text. | M |

---

## 4. Proposed releases

Ordered by dependency and by what unblocks the most other rows. Sizes are relative (S ≈ a day,
M ≈ 2–4 days, L ≈ a week or more).

### R9 — Parts, stock and consumables (§7.2) — **recommended next**

| Item | Why first |
| --- | --- |
| Parts catalog with stock per warehouse / kit | Blocks "parts used from a ticket", engineer margin accuracy, and the low-stock warnings |
| Parts requested from a ticket, reservations, low-stock alerts | The single most requested field-app feature |
| Purchase orders and goods-received | Completes the loop; needs storage only for photos |
| Tool and equipment register with calibration dates | Pairs with certificates in §3.5 |
| Returns / RMA / warranty tracking (🟡 today) | Finish the partially built piece |

Why first: it is pure product (no external dependency), it improves every job's margin figure, and
it unblocks half of §5's field-app rows.

### R10 — Field app depth (§5)

| Item | Dependency |
| --- | --- |
| Job pack after acceptance (site, access, assets, history) | — |
| Step-by-step workflow with required photos and serial scan | **storage** |
| Voice notes and offline queue | storage |
| Travel log with mileage and receipts | storage |
| Earnings dashboard and self-billing invoice | PDF (for statements) |
| Safety button / lone-working check-in | — |
| Rating history and client feedback | — |
| Skills and certificate profile with upload (🟡 today) | storage |

### R11 — Client portal depth (§6)

| Item | Dependency |
| --- | --- |
| Live status tracker with ETA and arrival notice | push/realtime (realtime exists) |
| Service reports and photo galleries | **storage** |
| Asset and rack view for the client's equipment | §7.1 rack work |
| Booking calendar with slot picking (🟡 request form exists) | — |
| Team management: who approves, who sees invoices | — |
| Satisfaction survey and quarterly review | **email** |
| Help centre and support chat | — |
| Approved-visitor list | — |
| VAT-ready invoice PDF | **PDF** |

### R12 — Automation and communication (§3.7, §8)

| Item | Dependency |
| --- | --- |
| Rules engine ("when X, do Y") with the five example rules | — |
| Message templates and quick replies | — |
| Announcements to engineers or clients | — |
| Notification channels with quiet hours (🟡 in-app only) | **email / SMS** |
| Shared inbox turning email into tickets | **email** |
| Knowledge base by role | — |
| Integrations page (Slack, Teams, API keys) | — |

### R13 — Reporting depth (§9)

| Item | Dependency |
| --- | --- |
| Quality: satisfaction, rework, photo compliance | R10/R11 data |
| Demand: busiest sites, days, fastest-growing categories | — |
| XLSX export and accountant pack | PDF/XLSX library |
| Scheduled emailed reports | **email** + cron |
| Reopened-ticket tracking in the ops report | small schema addition |
| Engineer-level margin in the finance report | — |

### R14 — Trust, people and admin (§10, §3.5, §3.8, §14)

| Item | Notes |
| --- | --- |
| "View as this user" test tool | High value for permission debugging |
| Login history, device list, revoke sessions | Needs Supabase auth hooks |
| 2FA, invitation email, password reset (🟡 today) | Needs **email** |
| Access with an end date (contractor expiry) | Small |
| IP allow-list for admin and finance | Small |
| Client approval of each engineer before entry | Pairs with cleared-engineer rules |
| GDPR toolkit: consent, export, deletion, retention | Legal requirement for EU clients |
| Backup status and restore drills | Operational, mostly documentation |
| Certificate vault with 90/30/7-day alerts | Pairs with R9 tool register |
| Onboarding pipeline, performance scorecards, tiers/badges, blacklists | HR layer |
| Categories/priorities/statuses/checklists editable, custom fields, branding (🟡 today) | Settings depth |

### Later / probably not worth it

Kanban-list-calendar-map switching beyond what exists, smart engineer ranking, multi-day parent
projects, merge/split tickets, escalation rules, major incident mode, drag-and-drop resource planner,
calendar sync, rate cards by time of day, approval chains for large amounts, payout run + SEPA, locked
periods, multi-currency FX, vendor registry and vendor portal, client health score, phone integration,
referral programme, auto-translation.

Each is real work with little current demand; revisit when a paying client asks.

---

## 5. Quick wins (half a day each)

1. **Mobile navigation for the console** — a slide-over drawer so the rail's items are reachable below `lg`.
2. **Needs-attention panel completion** — add expiring-offer and expiring-certificate feeds.
3. **Reopened tickets** — set a flag on the `in_progress` transition out of `resolved`/`closed` and surface it in the ops report.
4. **Quote → ticket conversion** — one button that turns accepted quote lines into scheduled tickets.
5. **Retainer auto-invoicing** — generate the monthly fee and overage invoice from `contract_usage`.
6. **Engineer margin column** on the finance report (respecting `people.pay_rates`).
7. **CSV → XLSX** for the three R8 exports (one library, same payloads).
8. **Migration history repair** so the repo and the project agree again.

---

## 6. Definition of done for every future release

Carried over from your standing instructions — a release is not finished until all of these hold:

- [ ] Role permissions defined, including custom roles and client-side gating
- [ ] Migration with RLS, idempotent, revoke public/anon EXECUTE on every new function
- [ ] Screens verified at 375 px and desktop, with empty, loading and error states
- [ ] Seed data for the demo organisation, removable by `portal_purge_demo()`
- [ ] Tests for the new helpers; live RPC verification recorded
- [ ] Handoff note: files changed, how to test, what is not covered
- [ ] `tsc --noEmit`, `vitest run`, `npm run build` all clean
- [ ] Feature matrix and agent log updated

---

## 7. Suggested next step

Start **R9 (parts and stock)**. It has no external dependency, it makes margin honest on every job,
and it removes the biggest blocker for the field app in R10. The only prerequisites are a decision on
Supabase Storage (for photos) and the migration-history repair, both small.

If you would rather close the compliance gap first, **R14's trust block** (view-as, session revoke,
GDPR export/deletion, access end dates) is the other natural next release — it is mostly database and
policy work, with no dependency on email or storage.
