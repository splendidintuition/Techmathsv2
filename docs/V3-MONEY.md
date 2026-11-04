# Release 3 — Money spine

Rate cards → quotes → client decision → invoice → payment. No freelancer payouts, no card
processing, no automated VAT return. Every client-facing step is gated by a database feature flag
that an Admin controls.

- Migrations: `supabase/migrations/20261104130000_portal_v3_money.sql` and
  `20261104140000_portal_v3_expenses.sql` (R3.1 expenses)
- Data layer: `src/lib/portal-money.ts`
- UI: `src/components/portal/v3/` (`money-room.tsx`, `money-quotes.tsx`, `money-invoices.tsx`,
  `money-rate-cards.tsx`, `money-settings.tsx`, `line-editor.tsx`)
- Tests: `tests/portal-v3.test.ts`
- Entry point: the **Money** item in the portal sidebar (internal roles only)

## The three switches

| Flag | Unlocks | While off |
| --- | --- | --- |
| `money.send_quotes` | moving a quote from `draft` to `sent` | quotes stay private drafts |
| `money.send_invoices` | issuing a draft invoice with a due date | invoices stay drafts |
| `money.record_payments` | booking money received against an issued invoice | balances show what was billed, never what was collected |

All three start **off**. They are enforced inside the database, not in the browser: a blocked call
raises SQLSTATE `0A000` with the message `feature_disabled:<key>`, which the client translates into
"An Admin can enable it under Money → Settings". Setting a flag is itself audited with the admin's
name.

## Data model

| Table | Purpose |
| --- | --- |
| `feature_flags` | `key` → `enabled`; seeded with the three money keys, default false |
| `rate_cards` / `rate_card_lines` | agreed sell rate per client, role and unit (hour/day/visit/unit/fixed); `engineer_cost` is masked unless the caller holds `finance.margins` |
| `quotes` / `quote_lines` | `Q-YYYY-NNNN`; status, discount, VAT rate, validity, acceptance and decline record |
| `invoices` / `invoice_lines` | `INV-YYYY-NNNN`; status, issue and due dates, amount paid, balance, void reason |
| `payments` | amount, method, reference, received date, notes — one row per receipt |
| `expenses` | cost booked against a client, site or ticket: net, VAT rate, generated VAT and gross, category, vendor, receipt link, reimbursable flag, review trail |

`organizations.vat_rate` is added (default 23) so a quote can pre-fill the VAT rate.

**Totals** are computed in the database and mirrored by `documentTotals()` in the client:
each line is rounded to cents, summed, the percentage discount is applied to the net subtotal, then
VAT at the document's rate. `line_total` is a generated column. `balance = total − amount_paid`.

**Status machines**

- Quote: `draft → sent → accepted | declined`, then `accepted → converted`. `expired` and
  `cancelled` are terminal side states.
- Invoice: `draft → sent → part_paid → paid`. `overdue` is derived by the recalc function from the
  due date, never set by hand. `void` is only allowed while `amount_paid = 0` (otherwise
  `invoice_has_payments`).

## Expenses (R3.1)

Costs are internal: no client ever sees them, and nothing here pays anybody.

- `draft → submitted → approved | rejected`. Edits are allowed while `draft` or `rejected`; saving a
  rejected claim puts it back to draft so it re-enters review.
- Logging and approving are **separate permissions** (`finance.expenses` vs
  `finance.expenses_approve`), and self-approval is refused unless the actor is the admin — the
  single super user.
- A claim marked *reimbursable* (somebody paid personally) must carry a receipt link before it can
  be saved. Approval marks it as owed; it does not move money.
- VAT and gross are generated columns, so the ledger cannot disagree with itself.
- Metrics: awaiting value, approved this month, approved overall, reimbursable owed, and VAT on
  approved expenses year to date — a bookkeeping aid, not a VAT return.

## Permissions

| Key | Grants |
| --- | --- |
| `finance.invoices` | quotes, invoices, money metrics (the whole console body) |
| `finance.payments` | recording and reversing payments |
| `clients.contracts` | rate cards |
| `finance.margins` | visibility of `engineer_cost` on rate cards |
| `finance.expenses` | expenses tab: log, edit and submit claims |
| `finance.expenses_approve` | approve or reject a submitted claim (admin by default) |
| `settings.users` | the Settings tab, i.e. the flag switches and demo controls |

The Money sidebar item appears for internal roles only; the console then renders only the tabs the
database says the user holds. A user with no finance permission sees an explicit "no finance
permissions" panel, not an empty page.

## Guarantees

- Every write is a `security definer` RPC with `set search_path = ''`, an `auth.uid()` check, a
  permission check, a targeted SQLSTATE and an `audit_logs` row.
- Eight new tables, RLS enabled on all of them, one select policy each (writes only through RPCs).
- Demo data is tagged `is_demo` and removed by a single `portal_purge_demo()`: payments → invoices
  → quotes → rate cards → tickets → plans → templates → assets → demo organizations.

## Error codes shown to operators

`feature_disabled:<key>`, `quote_not_editable`, `quote_not_draft`, `quote_not_accepted`,
`quote_not_awaiting_response`, `quote_has_no_lines`, `quote_title_required`,
`invoice_not_editable`, `invoice_not_draft`, `invoice_has_no_value`, `invoice_has_payments`,
`invoice_not_issued`, `invoice_is_void`, `invoice_already_void`, `payment_exceeds_balance`,
`invalid_payment_amount`, `rate_card_name_required`, `invalid_validity_window`,
`client_organization_required`.

## Verified against the live database

Run as the admin account against `vwdqrbtrykrdwpbxbypj`:

1. `money_seed_demo()` created a tagged demo client, quote and part-paid invoice.
2. Sending a quote with `money.send_quotes` off → `0A000 feature_disabled:money.send_quotes`.
3. Flag on → send → accept → convert produced a draft invoice with the same totals.
4. Issuing with `money.send_invoices` off → `0A000 feature_disabled:money.send_invoices`;
   flag on → invoice `INV-2026-0002`, due date +14 days.
5. Payment with `money.record_payments` off → `0A000 feature_disabled:money.record_payments`;
   flag on → €500 brought the invoice to `part_paid` with a €828.40 balance.
6. Overpayment → `22023 payment_exceeds_balance`; voiding a paid invoice → `22023 invoice_has_payments`.
7. Balances, metrics and the audit trail (`quote.created`, `quote.sent`, `quote.accepted`,
   `invoice.from_quote`, `invoice.issued`, `payment.recorded`) all agreed with the UI maths.
8. All flags returned to **off** and `portal_purge_demo()` removed the demo rows.

## Verified against the live database

Expenses were exercised the same way: create → submit → reject → edit → resubmit → approve, with
the self-approval guard and the receipt requirement firing as designed, then removed with the demo
purge.

## Deliberately out of scope

Expenses, freelancer payouts, Stripe/card processing, VAT return filing and cross-border tax
rules. Portuguese VAT and cross-border payout treatment still need accountant sign-off before any
of that is built.
