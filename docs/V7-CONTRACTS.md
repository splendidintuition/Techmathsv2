# Release 7 — contracts, SLA tiers, retainers and bundles

The plan asked for four commercial instruments (§3.4) and the build had none of them: the
`clients.contracts` permission key existed only to gate rate cards. R7 adds the contract itself and
makes it do work — an SLA tier sets the response clock on every ticket, a retainer tracks included
hours month by month, a prepaid bundle draws down, and a framework ties the terms together.

- Migration: `supabase/migrations/20261105140000_portal_v7_contracts.sql`
- Data layer: `src/lib/portal-contracts.ts`
- UI: `src/components/portal/v7/contracts-room.tsx` (portal sidebar → **Contracts**, admin/staff)
- Client-facing read: `portal_client_contracts()` rendered in the R6 workspace agreement card
- Tests: `tests/portal-v7.test.ts`

## Data model

| Column | Meaning |
| --- | --- |
| `kind` | `sla_tier`, `retainer`, `prepaid_bundle`, `framework` |
| `status` | `draft → active → paused / expired / cancelled` |
| `starts_on`, `ends_on` | the window the contract is in force; `ends_on` null means open ended |
| `response_minutes`, `resolution_minutes` | SLA targets in minutes (15 min – 30 days), resolution ≥ response |
| `coverage` | `business_hours`, `extended`, `24x7` |
| `monthly_fee`, `included_hours`, `overage_rate` | retainer terms |
| `bundle_hours`, `bundle_consumed` | prepaid hours, drawn down by hand or by the console |
| `reference`, `notes`, `is_demo` | housekeeping |

`tickets.contract_id` records which contract governed a ticket. A unique partial index allows exactly
one active `sla_tier` per organisation, because two live tiers would make `sla_due_at` ambiguous.

## What the database does

- **`portal_apply_contract_sla`** — a `before insert` trigger on `tickets`. If the ticket has no
  contract, it takes `contract_active_for(client_org_id)` (SLA tier first, then framework, then
  retainer, then bundle) and, when that contract has a response target, sets `contract_id` and
  `sla_due_at = now() + target`. A coordinator cannot forget the clock, and a client raising the
  ticket from the portal gets the same treatment.
- **`contract_usage(id)`** — approved field time inside the contract period, retainer period reset to
  the current month, plus first-response SLA counts (met, breached, at risk) and a compliance
  percentage. Breach = responded after `sla_due_at`, or never responded and the clock has passed.
- **`contract_metrics()`** — active count, retainer MRR, included hours, bundle hours left, renewals
  inside 30 days, clients on an SLA tier, 24×7 coverage, breaches in the last 30 days.
- **`portal_client_contracts()`** — the client-safe shape: kind, targets, coverage, hours left and
  on-time percentage. No fee, no margin, no internal note.

`client_contracts` itself is **internal-only under RLS**: its select policy calls `contract_can_view`,
which now answers true only for an internal user holding `clients.contracts` or `clients.view`. A
client therefore cannot read the table, call `contract_get` (`not_authorized`) or see a fee anywhere;
the agreement reaches them through the definer function above. That predicate is the one helper
granted to `authenticated`, because Postgres evaluates a policy as the caller — everything else
(`contract_can_manage`, `contract_active_for`, `contract_usage`, the trigger) is revoked from every
API role.

All writes are security-definer RPCs behind `clients.contracts` (`contract_save`,
`contract_set_status`, `contract_consume_bundle`). Reads are allowed with `clients.view`. Every
change is written to `audit_logs` with before/after.

## Console behaviour

- Four stat cards: active contracts, retainer MRR, bundle hours left, renewals inside 30 days with the
  30-day breach count.
- Filters: active / draft / paused / all.
- Each card shows kind, status, window ("`26 days left`", "`Ends today`", "`Open ended`"), SLA headline
  ("`24×7 cover · 4 h response · 1 d resolution`"), ticket count, on-time pill, and for a retainer or
  bundle a usage bar with overage in currency.
- Actions: edit, activate, pause, cancel, and **draw down** for a bundle (audited, refuses to exceed
  the purchased hours).
- A read-only account sees the contracts but no action buttons; the database would refuse anyway.

## How to test

1. As admin, open **Contracts** → the DEMO Gold SLA (240 min response, 24×7) and the smart-hands
   retainer (1 400 EUR/month, 20 h) are listed as active.
2. Create a ticket for the demo client without a due date (`create_ticket` with `p_sla_due_at => null`).
   It saves with `contract_id` = Gold SLA and a due date four hours out. Delete the test ticket after.
3. **Edit** the retainer, raise included hours, save — the usage bar rescales and the audit log gains
   a `contract.updated` row.
4. **Draw down** on a prepaid bundle: enter more hours than remain and the save is refused with
   `bundle_exhausted`.
5. Activate a second SLA tier for the same client: refused with `sla_tier_already_active`.
6. Sign in as the client: the agreement card shows the targets and hours left, never the fee.

## Files changed

| File | What it holds |
| --- | --- |
| `supabase/migrations/20261105140000_portal_v7_contracts.sql` | types, table, trigger, RPCs, RLS, purge |
| `src/lib/portal-contracts.ts` | `contractApi`, types, minutes/window/usage helpers |
| `src/components/portal/v7/contracts-room.tsx` | console list, editor, status actions, bundle draw-down |
| `src/components/portal/v6/client-room.tsx` | agreement card in the client workspace |
| `src/lib/portal-client.ts` | `clientApi.contracts`, agreement copy helpers |
| `src/components/operations-portal.tsx` | **Contracts** page |
| `tests/portal-v7.test.ts` | 13 assertions over windows, usage and copy |

## Not covered

- Automatic invoicing of retainer fees or overage — the money spine still invoices work, not time.
- Contract documents (PDF), signatures and amendment history.
- Cleared-engineer lists and client-specific dispatch rules.
- Renewal workflow: renewals are flagged, not generated.
