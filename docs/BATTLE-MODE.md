# Battle mode — prompts that produce shippable releases

This file is the operating manual for running the 100× programme (`docs/UPGRADE-PROGRAMME.md`) with an
agent. Each block is written to be pasted **as-is**: it carries the scope, the non-negotiables, the
acceptance gates, and the review protocol. Nothing here is aspirational — every prompt assumes the
conventions this repo already uses.

---

## 1. How a battle session runs

| Step | Who | What happens |
| --- | --- | --- |
| 1 | you | paste the **master kickoff** with one release code (`R10`, `R11`, …) |
| 2 | agent | explores the repo, proposes the concrete file list and migration plan, then builds |
| 3 | agent | applies the migration live in chunks, verifies each RPC as admin / staff / client, seeds demo data, cleans up QA rows |
| 4 | agent | runs `tsc --noEmit`, `vitest run`, `npm run build`; writes `docs/VNN-*.md`; updates matrix + agent log |
| 5 | agent | commits on the session branch, pushes, opens a **draft** PR, and stops |
| 6 | you | paste the **merge gate prompt** in the same session |
| 7 | agent | re-verifies every gate and reports pass/fail per line |
| 8 | you | "merge it" → agent merges, watches the Vercel deploy, confirms production |

**Rules that never change:** one release per PR · never merge without your word · never re-run an
already-applied migration wholesale · `revoke … from public, anon` on every new function · audit row
on every write · demo data `is_demo` and purge-safe · money flags stay on until you say otherwise.

---

## 2. Master kickoff prompt — paste this to start any release

> You are the release engineer for the TechMaths operations portal at `/home/user/Techmathsv2`
> (Next.js 15 + Supabase, TypeScript strict, deployed on Vercel). Work only on the current session
> branch, never on another branch.
>
> **Mission: build {{RELEASE}} from `docs/UPGRADE-PROGRAMME.md` §{{SECTION}}.** Read that section, then
> read `docs/FEATURE-MATRIX.md` for the rows it closes and the last three `docs/V*.md` handoff notes
> for the house style.
>
> Non-negotiables:
> 1. One migration `supabase/migrations/{{TIMESTAMP}}_portal_v{{NN}}_{{slug}}.sql`, applied live through
>    the Supabase connector in small chunks; verify each chunk before the next.
> 2. Every new function: `security definer`, `set search_path = ''`, fully qualified names,
>    `revoke all … from public, anon`, `grant execute … to authenticated`, and the boolean predicates
>    that policies call keep their grants. Every write appends to `audit_logs`.
> 3. Every new table: RLS enabled, select policy on a permission predicate, **no insert/update/delete
>    policies** — writes go through RPCs only.
> 4. Reuse the existing permission registry keys where they fit; add new keys only when the plan needs
>    a genuinely new capability, and add them to `permission_registry` with defaults and sort order.
> 5. UI: 375 px and desktop, empty / loading / error / no-permission states, optimistic where safe,
>    preferences-respecting motion, keyboard reachable. Match the existing dark console language.
> 6. Live QA on the demo account: exercise every RPC as the right role, prove the negative cases
>    (wrong role → `not_authorized`, bad input → the documented code), then delete QA rows and confirm
>    the demo dataset still looks right.
> 7. Tests: `tests/portal-v{{NN}}.test.ts` for the pure helpers; `npx tsc --noEmit`,
>    `npx vitest run`, `npm run build` all clean.
> 8. Docs: `docs/V{{NN}}-{{TOPIC}}.md` (model, permissions, how to test, files changed, not covered);
>    update `docs/FEATURE-MATRIX.md` status rows and counts, `docs/AGENT-LOG.md`, and
>    `docs/PENDING-WORK.md`.
> 9. Commit on the session branch with a message that explains the rule the release enforces, push,
>    and open a **draft** PR. Do not merge.
>
> Report back with: what exists now that did not, the exact verification numbers, and the one-line
> demo script a human can follow in 60 seconds.

---

## 3. Release prompts

Paste each one with the master kickoff, or on its own if the session already has context.

### R10 — Platform multipliers

> Build R10: storage, email, PDF, design system v2, mobile navigation and ⌘K.
>
> - Enable Supabase Storage buckets `ticket-photos`, `documents`, `receipts`, `signatures` with
>   per-organisation path policies and signed URLs; ship an upload component that compresses on the
>   client, retries, and shows progress.
> - Email: `email_outbox` table + a server route that flushes it through a provider chosen from env
>   (`RESEND_API_KEY` or `POSTMARK_TOKEN`), templates stored in the database, and every R5–R9
>   notification also enqueued as email unless the recipient opted out.
> - PDF: a server renderer producing quote, invoice, statement, completion sheet and contract summary,
>   with letterhead, VAT block, page numbers and a print stylesheet. Wire "Download PDF" into the
>   existing money and client screens.
> - Design system v2: tokens, and `Sheet`, `Toast`, `Skeleton`, `Empty`, `DataTable` primitives; replace
>   the ad-hoc patterns in the console; density toggle.
> - Navigation: console drawer + phone bottom tabs, ⌘K palette (pages, tickets by number, clients,
>   parts, quick actions), saved views persisted per user and shareable to the team.
> - Repair migration history so the project agrees with `supabase/migrations`, and add an error
>   boundary with retry around each room.
>
> Gate: an invoice PDF downloads from the client workspace; a phone photo uploads; ⌘K finds ticket #3;
> the console works at 375 px; `/portal` first load ≤ 300 kB.

### R11 — Trust and identity

> Build R11: view-as, sessions, 2FA, access expiry, IP allow-list, GDPR toolkit, backup evidence.
>
> - `portal_admin_view_as(user)` / `view_as_stop()`: read-only impersonation, banner in every screen,
>   30-minute expiry, audit on start/stop, writes hard-blocked at the RPC layer while active.
> - Session inventory from `auth.sessions`, revoke one/all, force logout; login history.
> - Invite by email, password reset, TOTP 2FA with recovery codes, mandatory for admins.
> - `profiles.access_ends_on` with a nightly expiry job and a 14-day warning banner.
> - Optional IP allow-list for admin and finance.
> - GDPR: export per person and per client organisation (zip), deletion workflow with retention,
>   consent log, retention dashboard.
> - Backup status panel and a written restore drill in `docs/BACKUP-RESTORE.md`.
>
> Gate: view-as cannot write; a revoked session dies within a minute; the admin cannot log in without
> 2FA once enabled; an export produces a zip with every row for that subject.

### R12 — Documents and signature

> Build R12: PDFs, e-sign, accountant pack, print.
>
> - Quote PDF with an acceptance link, invoice PDF with VAT breakdown and payment terms, statement of
>   account, credit note, completion sheet with photos.
> - E-sign on quotes and completion sheets: draw or type, store image + timestamp + IP + content hash,
>   archive the signed PDF to the client's documents.
> - XLSX accountant pack per month: invoices, payments, expenses, VAT by country, aging.
> - Continuous numbering locked once issued; a cancelled document keeps its number and says why.
>
> Gate: quote → signed PDF → invoice → statement, end to end, on the demo client, each downloadable
> and print-correct.

### R13 — Money depth

> Build R13: rate cards, approval chain, payout run + SEPA, credit notes and dunning, locked periods,
> FX, accountant role.
>
> - Rate cards effective-dated by engineer, skill, time band, ticket type and country; invoice
>   suggestions pick the right card and show their reasoning.
> - Approval chains above a threshold with a queue; nothing posts until approved.
> - Payout run: period → approved hours and expenses per engineer → adjust → approve → **SEPA XML** →
>   mark paid → self-billing statement PDF.
> - Credit notes, partial payments, reminders at 7/14/30 days, late fees, write-off.
> - Locked periods with controlled unlock (admin + reason + audit), FX snapshot per invoice,
>   read-only accountant role.
>
> Gate: an invoice is priced by a rate card, a retainer overage is billed, a credit note issued, the
> payout exports valid SEPA, and a locked month refuses edits.

### R14 — Field app

> Build R14: job pack, step workflow with evidence, offline queue, travel log, earnings, safety.
>
> - Job pack revealed on acceptance: site, access, contacts, assets, history, RAMS, required photos,
>   reserved parts.
> - Category templates drive steps; a step cannot complete without its required photos or scan; serial
>   capture; timestamps.
> - Offline-first queue with replay and server-side dedupe; explicit "waiting to sync" state.
> - Travel log with start/stop, distance and receipt capture.
> - Earnings: approved vs pending hours, expenses, expected payout, statement PDF.
> - Lone-working check-in with escalation, panic button, incident report.
> - Certificate upload with expiry, induction quizzes, rating history.
>
> Gate: a full job runs on a throttled connection with airplane mode in the middle and loses nothing.

### R15 — Client portal depth

> Build R15: live ETA, service reports, asset/rack view, booking slots, client team management,
> surveys, help centre, approved visitors, guided requests.
>
> Gate: a visitor requests a job, watches it arrive, approves it, downloads the report, rates it and
> invites a colleague — no email involved.

### R16 — Vendors, crews and client rules

> Build R16: vendor registry + vendor login, crews with per-person rates, multi-day parent projects,
> cleared-engineer rules, blacklist, merge/split/link.
>
> Gate: a job runs across two engineers and a vendor at three rates, and the client's cleared-engineer
> rule blocks an unapproved offer.

### R17 — Communication engine

> Build R17: templates, channel routing (in-app, email, SMS, push), quiet hours, digests,
> announcements, ticket-by-email, quick replies, optional WhatsApp.
>
> Gate: an engineer receives an SMS offer; a client email becomes a ticket; quiet hours suppress
> non-urgent sends and say when they will go.

### R18 — Automation and scheduling

> Build R18: rules builder, the five example rules, scheduled reports, daily summary, monitoring
> alerts → tickets, recurring automation.
>
> Gate: five rules running on demo data, each with a visible "what fired and why" trail.

### R19 — Data-centre depth

> Build R19: cable register, rack elevation editor, change requests, RAMS, permit-to-work, incidents,
> remote session logs and config backups, bulk asset import, tool register, RMA.
>
> Gate: a rack is rebuilt in the portal and printed; a change moves approve → window → done with
> rollback notes.

### R20 — Insight and intelligence

> Build R20: quality and demand reports, client health score, engineer scorecards, smart dispatch
> ranking, SLA prediction, capacity warnings, resource planner, calendar sync.
>
> Gate: the top three clients have health scores with named drivers; a shortlist explains its ranking.

### R21 — Scale and polish

> Build R21: PWA, i18n (EN/PT/ES first), WCAG AA audit, performance budgets in CI, observability,
> light theme for print, onboarding tour, keyboard shortcuts everywhere.
>
> Gate: Lighthouse ≥ 95 performance and accessibility on `/portal`; every flow keyboard-only;
> `pt-PT` client surface complete.

---

## 4. Merge gate prompt — paste before any merge

> Review the current PR against `docs/UPGRADE-PROGRAMME.md` §8 and the release gate. For each line of
> the gate, say **pass** or **fail** with the evidence (command output, RPC result, screenshot path or
> SQL result). Then check:
>
> - `git diff main...HEAD` contains no unrelated change, no secret, no debug log, no commented-out
>   block, and no client bundle import of a server-only module.
> - `pg_proc.proacl` for every new function is `authenticated` + `service_role` only.
> - Every new table has RLS and a select policy, and no write policies.
> - `npx tsc --noEmit`, `npx vitest run`, `npm run build` all exit 0, with the test count reported.
> - The demo dataset is intact and `portal_purge_demo()` still removes everything the release seeded.
> - `docs/V*.md` exists, the matrix counts in the doc match a fresh count, and the agent log has the
>   QA table.
>
> If anything fails, fix it in the same branch and re-report. Do not merge.

---

## 5. When to stop and ask the owner

Stop and ask, rather than guessing, if a release would:

- change how money is calculated or billed (tax, rounding, discounts, FX);
- delete or rewrite historical financial records;
- need a paid third-party service beyond the free tier;
- alter who can see another organisation's data;
- change the public marketing site;
- require a schema change that cannot be expressed additively.

---

## 6. The polish pass — run after every third release

> Run the craft pass on the whole console, not just the new release: consistent spacing and type from
> the tokens, every table responsive as cards below 640 px, every async action with optimistic state
> and a toast that names what happened, every error with a sentence and a retry, every empty state with
> one clear next action, focus visible everywhere, Escape closing every overlay, and reduced-motion
> honoured. List what you changed and what you chose not to.
