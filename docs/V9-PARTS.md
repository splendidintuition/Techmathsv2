# Release 9 — parts, stock and consumables

§7.2 of the plan asked for a parts catalog, stock per warehouse or engineer kit, parts requested from
a ticket, low-stock alerts, purchase orders, returns and warranty tracking. The build had two
permission keys (`assets.stock`, `assets.purchase_orders`) and nothing behind them — a job could be
staffed and invoiced, but the box of SFPs that went into the rack existed nowhere.

R9 adds a small inventory spine. The rule that shapes it: **stock only ever changes through one
function**, so the ledger and the balance cannot drift apart, and a shelf can never go negative.

- Migration: `supabase/migrations/20261105180000_portal_v9_parts.sql`
- Data layer: `src/lib/portal-parts.ts`
- UI: `src/components/portal/v9/parts-room.tsx` (sidebar → **Stock**), and
  `src/components/portal/v9/ticket-parts-panel.tsx` (the parts drawer inside a ticket)
- Tests: `tests/portal-v9.test.ts` — 18 assertions over quantities, stock tone, ledger copy, order
  progress, margin and CSV output

## Data model

| Table | Holds |
| --- | --- |
| `parts` | the catalog: SKU (unique, case-insensitive), name, category, brand, unit, cost, sale price, supplier, reorder point and quantity, barcode, active flag |
| `stock_locations` | `warehouse`, `van`, `kit` or `office`, optionally owned by an engineer |
| `part_stock` | one row per part per location — the current count |
| `stock_movements` | the append-only ledger: kind, signed quantity, balance after, cost, ticket, purchase order, actor |
| `ticket_parts` | what was fitted to a job: quantity, cost and sale price snapshotted at the time, billable flag, warranty date, serial |
| `purchase_orders` / `purchase_order_lines` | supplier, expected date, status, and per-line ordered vs received |

## The rules the database enforces

- **One door for stock.** `part_stock_move(part, location, kind, quantity, …)` is the only writer.
  `receive` / `return` add, `issue` subtracts, `adjust` sets the count to the number you counted. A
  movement that would take the shelf below zero raises `insufficient_stock` before anything is written.
- **A ticket consumes stock exactly once.** `ticket_part_add` issues first, then records the line;
  if the shelf is empty the whole call fails. `ticket_part_remove` puts it back as a `return`
  movement, so the ledger explains both directions.
- **Receiving is per line.** `purchase_order_receive` refuses `over_receipt`, moves the stock at the
  order line's unit cost, and flips the order to `partial` or `received` — you cannot mark a whole
  order received without saying where each part landed.
- **Margin is honest.** `money_job_margins` now subtracts `quantity × unit_cost` from approved field
  time and expenses, per ticket and in the totals.
- **Everything is audited.** `part.created`, `part.updated`, `stock.moved`, `ticket.part_added`,
  `ticket.part_removed`, `order.created`, `order.status_changed`, `order.received`.

## Permissions

R9 adds no new keys — it uses the ones the registry already had, so custom roles keep working:

| Key | What it opens |
| --- | --- |
| `assets.view` | read the catalog, stock, ledger and orders (admin, staff, freelancer by default) |
| `assets.edit` | create and edit parts |
| `assets.stock` | move stock, add and remove locations, book parts onto a ticket |
| `assets.purchase_orders` | raise, send, cancel and receive purchase orders (admin by default) |

The reads go through security-definer RPCs; the tables are readable under RLS only with
`assets.view`. Writes have no policies at all, so nothing can bypass the RPCs. Helper predicates
(`parts_can_stock`, `parts_can_order`, `parts_can_edit`) are revoked from every API role;
`parts_can_view` keeps an EXECUTE grant for `authenticated` because Postgres evaluates the policies
as the caller. A client account calling `parts_metrics()` gets `not_authorized`, and the ticket drawer
hides itself rather than showing an error.

## Using it

1. **Stock → Catalog → New part.** SKU, name, cost, sale price and a reorder point. The reorder point
   is what drives "at reorder point" — leave it at 0 for a part you do not want flagged.
2. **New location** for a van, kit or second warehouse.
3. **Move** on a part: receive into a location, issue it out, return it, or set the counted quantity.
   Every one of those writes a ledger row with the balance after it.
4. **Orders → New order**: supplier, expected date, one or more lines. *Mark sent* when it goes out,
   then **Receive** per line to put the stock on a shelf.
5. **Tickets → Chat/thread drawer → Parts used**: book a part onto the job, tick or untick "charge the
   client", and remove it to send it back to stock.

## Demo data

`parts_seed_demo()` (admin only) creates two locations, five parts (patch leads, SFP+ optics, a patch
panel, a PDU and a spare PSU), opening stock and ledger entries, a sent purchase order with two lines,
and two parts booked onto the demo installation ticket. All of it is `is_demo` and
`portal_purge_demo()` removes parts, locations, movements, ticket parts and orders before it touches
the demo client.

## How to test

1. As admin: **Stock**. Five demo parts, €2 206.40 at cost, two at their reorder point, one open order.
2. **Move** on *Cat5/6 patch lead*: issue 999 from the van → refused with *"There is not enough of that
   part at this location."* Issue 4 → count drops, ledger gains an `Issued −4 → 16` row.
3. **Orders** → `PO-DEMO-0001` is `Part received` with a 30 % progress bar on the patch leads.
   **Receive** the remaining 70 into the main warehouse → the order closes, stock rises, a `Received`
   ledger row appears.
4. **Catalog → Edit** a part's reorder point above its stock → it moves into "At reorder point" and the
   header counter goes up.
5. Open a ticket → **Parts used** → the two demo parts are listed with a €154 charge and an €86.40
   margin. Add one more, then remove it: stock returns and the ticket total drops back.
6. **Reports → Finance** for the demo client: the job's margin now accounts for the parts cost.
7. Sign in as a client account: `parts_metrics()` raises `not_authorized` and no Stock entry appears.

## Files changed

| File | What it holds |
| --- | --- |
| `supabase/migrations/20261105180000_portal_v9_parts.sql` | seven tables, RPCs, ledger, purge, grants, patched margin function |
| `src/lib/portal-parts.ts` | `partsApi`, types, quantity/stock/ledger/order helpers, CSV builders |
| `src/components/portal/v9/parts-room.tsx` | Stock / Catalog / Orders tabs, part sheet, move, order and receive modals |
| `src/components/portal/v9/ticket-parts-panel.tsx` | parts drawer inside a ticket |
| `src/components/portal/ticket-chat.tsx` | mounts the drawer |
| `src/components/operations-portal.tsx` | **Stock** page and nav entry (admin, staff) |
| `tests/portal-v9.test.ts` | 18 assertions |

## Not covered

- Carrier tracking numbers and goods-received photos (need file storage).
- RMA workflow: supplier case, credit note, replacement — returns today are a ledger movement.
- Barcode scanning from the engineer app, and any parts screen in the app at all.
- Transfer between locations as a paired movement (use issue + receive for now; the ledger shows both).
- Stock valuation methods other than last cost, and no per-batch or serial-level stock.
