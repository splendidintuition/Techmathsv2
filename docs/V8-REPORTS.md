# Release 8 — reports and exports

The plan's reporting section (§9) and the export requirement (§10) were empty: the overview showed
counters and the audit log was the only thing that could leave the system. R8 adds three reports and
a CSV of each, computed in Postgres so a report can never disagree with the table it came from.

- Migration: `supabase/migrations/20261105160000_portal_v8_reports.sql`
- Data layer: `src/lib/portal-reports.ts`
- UI: `src/components/portal/v8/reports-room.tsx` (portal sidebar → **Reports**, admin/staff)
- Tests: `tests/portal-v8.test.ts`

## RPCs

| Function | Gate | Returns |
| --- | --- | --- |
| `reports_ops(p_from, p_to)` | `reports.operations` | volume per day, status/priority/category/country mix, clients in range, engineer load, SLA met/breached/at risk, average first response and close time, hours logged |
| `reports_sla(p_from, p_to)` | `reports.operations` | one row per client: governing contract, coverage, target, tickets, met, breached, at risk, compliance %, average response |
| `reports_finance(p_from, p_to)` | `reports.finance` | invoiced net/VAT/gross, collected, outstanding, overdue, approved expenses, labour cost, margin and margin %, by client, VAT by country, billing by month, aging buckets, top five debtors |

Both date arguments are inclusive and default sensibly (30 days for operations and SLA, three months
for finance). A reversed range raises `invalid_date_range`.

## What "first response" means

There is no separate response timestamp on a ticket, so a response is the first `ticket.status_changed`
event that moves it into `assigned`, `en_route`, `on_site`, `in_progress` or `completed_pending_approval`.
Met = that moment is at or before `sla_due_at`. Breached = it is after, or it never happened and the
clock has passed. Nothing is inferred from `updated_at`, which any edit would move.

## Margin

`revenue − expenses − labour`:

- revenue = invoice lines net of the document discount, for issued invoices in the window;
- expenses = **approved** expense claims (`spent_on` in the window);
- labour = approved time entries × the engineer's hourly rate.

Client rows on the finance tab deliberately show net revenue less expenses and say so, because pay
rates are only visible to accounts holding `people.pay_rates`.

## Exports

`CSV` only, generated in the browser from the payload already on screen (`opsCsv`, `financeCsv`,
`slaCsv`), named `operations-2026-10-07-2026-11-05.csv` and so on. Gated by `reports.export`; the
figures stay visible without it. No XLSX, no PDF, no scheduled email — those need a document service
and a mail provider that are not wired in.

## How to test

1. As admin, open **Reports**. The operations tab loads 30 days for the demo client.
2. Switch to **SLA**: one row for the demo client, governed by the Gold SLA (240 min target), with
   the compliance pill reading `—` until a ticket has been responded to.
3. Switch to **Finance**: net invoiced, VAT, collected, outstanding and aging match the Money console.
4. Pick **This month**, then widen **From** by hand — the report reloads on the custom window.
5. **Export CSV** — the file opens with the summary block, then the daily rows, then the client rows.
6. As `staff@`, the Finance tab is absent (needs `reports.finance`) and calling
   `reports_finance()` raises `not_authorized`.

## Files changed

| File | What it holds |
| --- | --- |
| `supabase/migrations/20261105160000_portal_v8_reports.sql` | the three report RPCs and their grants |
| `src/lib/portal-reports.ts` | `reportsApi`, payload types, ranges, compliance maths, CSV builders |
| `src/components/portal/v8/reports-room.tsx` | tabs, range picker, bars, tables, export |
| `src/components/operations-portal.tsx` | **Reports** page |
| `tests/portal-v8.test.ts` | 9 assertions over ranges, maths and CSV output |

## Not covered

- Reopened-ticket reporting (the status history exists, but nothing marks a reopen).
- Acceptance rate, on-time arrival and rework — no data for them yet.
- Hours by country and satisfaction scores.
- Scheduled or emailed reports; any format other than CSV.
