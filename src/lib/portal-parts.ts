/**
 * Portal R9 — parts, stock and consumables.
 *
 * Every write is a security-definer RPC in
 * `supabase/migrations/20261105180000_portal_v9_parts.sql`, gated by the existing permission keys
 * `assets.view`, `assets.edit`, `assets.stock` and `assets.purchase_orders`. Stock only ever moves
 * through `part_stock_move`, which refuses to take a shelf below zero.
 */
import { PortalV2Error, callRpc, csvFromRows, describeError, type Tone } from "@/lib/portal-v2";

export type StockLocationKind = "warehouse" | "van" | "kit" | "office";
export type StockMovementKind = "receive" | "issue" | "return" | "adjust";
export type PurchaseOrderStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

export const LOCATION_KINDS: StockLocationKind[] = ["warehouse", "van", "kit", "office"];
export const MOVEMENT_KINDS: StockMovementKind[] = ["receive", "issue", "return", "adjust"];

const PART_ERROR_COPY: Record<string, string> = {
  part_not_found: "That part no longer exists.",
  part_sku_required: "Give the part a SKU.",
  part_name_required: "Give the part a name.",
  part_sku_taken: "Another part already uses that SKU.",
  invalid_price: "Cost and sale price cannot be negative.",
  location_not_found: "That stock location no longer exists.",
  location_name_required: "Give the location a name.",
  location_name_taken: "Another location already uses that name.",
  quantity_required: "Enter a quantity.",
  quantity_must_be_positive: "Quantity has to be greater than zero.",
  insufficient_stock: "There is not enough of that part at this location.",
  no_change: "That adjustment would not change the count.",
  ticket_part_not_found: "That part is no longer on the ticket.",
  supplier_required: "Name the supplier before saving the order.",
  order_lines_required: "An order needs at least one part.",
  purchase_order_not_found: "That purchase order no longer exists.",
  order_line_not_found: "That order line no longer exists.",
  order_already_closed: "That order is closed and cannot change.",
  receive_through_lines: "Receive stock line by line so the shelf it lands on is recorded.",
  invalid_order_status: "That status cannot be set by hand.",
  over_receipt: "You cannot receive more than the order asks for.",
  demo_dataset_missing: "Run the money demo seed first so there is a demo client to attach stock to.",
};

export function partError(error: unknown): PortalV2Error {
  const raw = (error ?? {}) as { message?: string };
  const message = (raw.message ?? "").trim();
  const copy = PART_ERROR_COPY[message];
  if (copy) return new PortalV2Error(message, copy);
  return describeError(error);
}

export interface PartLocationBalance {
  location_id: string;
  name: string;
  kind: StockLocationKind;
  quantity: number;
}

export interface PartRow {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  unit: string;
  unit_cost: number;
  sale_price: number;
  currency: string;
  supplier: string;
  reorder_point: number;
  reorder_quantity: number;
  barcode: string;
  is_active: boolean;
  is_demo: boolean;
  quantity: number;
  stock_value: number;
  low: boolean;
  locations: PartLocationBalance[];
}

export interface StockMovementRow {
  id: number;
  kind: StockMovementKind;
  quantity: number;
  balance_after: number;
  location_name: string;
  ticket_number: number | null;
  reference: string;
  note: string;
  created_at: string;
}

export interface PartDetail extends PartRow {
  used_on_tickets: number;
  movements: StockMovementRow[];
}

export interface StockLocationRow {
  id: string;
  name: string;
  kind: StockLocationKind;
  owner_id: string | null;
  owner_name: string | null;
  notes: string;
  is_demo: boolean;
  skus: number;
  value: number;
}

export interface PartsMetrics {
  skus: number;
  all_skus: number;
  locations: number;
  stock_value: number;
  low_stock: number;
  out_of_stock: number;
  open_orders: number;
  movements_30d: number;
  categories: string[];
  flags: { can_stock: boolean; can_order: boolean; can_edit: boolean };
}

export interface TicketPartRow {
  id: string;
  part_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  sale_price: number;
  currency: string;
  billable: boolean;
  warranty_until: string | null;
  serial: string;
  note: string;
  location_name: string | null;
  created_at: string;
}

export interface TicketParts {
  ticket_id: string;
  rows: TicketPartRow[];
  totals: { count: number; cost: number; charge: number };
  flags: { can_stock: boolean; can_order: boolean };
}

export interface PurchaseOrderLine {
  id: string;
  part_id: string;
  part_name: string;
  sku: string;
  quantity: number;
  received_quantity: number;
  remaining: number;
  unit_cost: number;
}

export interface PurchaseOrderRow {
  id: string;
  reference: string;
  supplier: string;
  status: PurchaseOrderStatus;
  currency: string;
  ordered_on: string;
  expected_on: string | null;
  notes: string;
  is_demo: boolean;
  created_at: string;
  received_at: string | null;
  total: number;
  lines: PurchaseOrderLine[];
}

export interface PartInput {
  id?: string | null;
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  unit?: string;
  unit_cost?: number;
  sale_price?: number;
  currency?: string;
  supplier?: string;
  reorder_point?: number;
  reorder_quantity?: number;
  description?: string;
  barcode?: string;
  is_active?: boolean;
}

export interface OrderLineInput {
  part_id: string;
  quantity: number;
  unit_cost: number;
}

export const partsApi = {
  metrics: () => callRpc<PartsMetrics>("parts_metrics"),
  list: (query?: string | null, category?: string | null, lowOnly = false, includeInactive = false) =>
    callRpc<PartRow[]>("parts_list", {
      p_query: query ?? null,
      p_category: category ?? null,
      p_low_only: lowOnly,
      p_include_inactive: includeInactive,
    }),
  get: (id: string) => callRpc<PartDetail>("part_get", { p_id: id }),
  save: (input: PartInput) =>
    callRpc<string>("part_save", {
      p_id: input.id ?? null,
      p_sku: input.sku,
      p_name: input.name,
      p_category: input.category ?? "General",
      p_brand: input.brand ?? "",
      p_unit: input.unit ?? "unit",
      p_unit_cost: input.unit_cost ?? 0,
      p_sale_price: input.sale_price ?? 0,
      p_currency: input.currency ?? "EUR",
      p_supplier: input.supplier ?? "",
      p_reorder_point: input.reorder_point ?? 0,
      p_reorder_quantity: input.reorder_quantity ?? 0,
      p_description: input.description ?? "",
      p_barcode: input.barcode ?? "",
      p_is_active: input.is_active ?? true,
    }),
  locations: () => callRpc<StockLocationRow[]>("stock_locations_list"),
  saveLocation: (input: {
    id?: string | null;
    name: string;
    kind?: StockLocationKind;
    owner_id?: string | null;
    notes?: string;
  }) =>
    callRpc<string>("stock_location_save", {
      p_id: input.id ?? null,
      p_name: input.name,
      p_kind: input.kind ?? "warehouse",
      p_owner_id: input.owner_id ?? null,
      p_notes: input.notes ?? "",
    }),
  move: (input: {
    part_id: string;
    location_id: string;
    kind: StockMovementKind;
    quantity: number;
    note?: string;
  }) =>
    callRpc<{ balance: number; delta: number; location_id: string }>("part_stock_move", {
      p_part_id: input.part_id,
      p_location_id: input.location_id,
      p_kind: input.kind,
      p_quantity: input.quantity,
      p_note: input.note ?? "",
    }),
  ticketParts: (ticketId: string) => callRpc<TicketParts>("ticket_parts_list", { p_ticket_id: ticketId }),
  addTicketPart: (input: {
    ticket_id: string;
    part_id: string;
    location_id: string;
    quantity: number;
    billable?: boolean;
    warranty_until?: string | null;
    serial?: string;
    note?: string;
  }) =>
    callRpc<string>("ticket_part_add", {
      p_ticket_id: input.ticket_id,
      p_part_id: input.part_id,
      p_location_id: input.location_id,
      p_quantity: input.quantity,
      p_billable: input.billable ?? true,
      p_warranty_until: input.warranty_until ?? null,
      p_serial: input.serial ?? "",
      p_note: input.note ?? "",
    }),
  removeTicketPart: (id: string) => callRpc<boolean>("ticket_part_remove", { p_id: id }),
  orders: () => callRpc<PurchaseOrderRow[]>("purchase_order_list"),
  saveOrder: (input: {
    id?: string | null;
    supplier: string;
    expected_on?: string | null;
    notes?: string;
    lines: OrderLineInput[];
  }) =>
    callRpc<string>("purchase_order_save", {
      p_id: input.id ?? null,
      p_supplier: input.supplier,
      p_expected_on: input.expected_on ?? null,
      p_notes: input.notes ?? "",
      // Parallel arrays, not a jsonb blob — PostgREST maps uuid[] and numeric[] unambiguously.
      p_part_ids: input.lines.map((line) => line.part_id),
      p_quantities: input.lines.map((line) => line.quantity),
      p_costs: input.lines.map((line) => line.unit_cost),
    }),
  setOrderStatus: (id: string, status: PurchaseOrderStatus) =>
    callRpc<PurchaseOrderStatus>("purchase_order_set_status", { p_id: id, p_status: status }),
  receive: (lineId: string, quantity: number, locationId: string) =>
    callRpc<{ order_id: string; open_lines: number; remaining: number }>("purchase_order_receive", {
      p_line_id: lineId,
      p_quantity: quantity,
      p_location_id: locationId,
    }),
  seedDemo: () =>
    callRpc<{ warehouse: string; van: string; order: string }>("parts_seed_demo"),
};

/* ---------------------------------------------------------------- helpers */

const KIND_META: Record<StockLocationKind, { label: string; hint: string }> = {
  warehouse: { label: "Warehouse", hint: "Fixed stock in a building." },
  van: { label: "Van", hint: "Mobile stock carried by an engineer." },
  kit: { label: "Kit", hint: "A job box or flight case." },
  office: { label: "Office", hint: "Small stock held at a desk." },
};

export function locationKindCopy(kind: StockLocationKind): string {
  return KIND_META[kind]?.label ?? "Location";
}

/** Trims pointless decimals: 4 → "4", 4.50 → "4.5". */
export function qtyCopy(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function unitCopy(qty: number, unit: string): string {
  const n = Math.abs(Number(qty) || 0);
  const label = (unit || "unit").trim();
  if (n === 1) return `1 ${label}`;
  return `${qtyCopy(qty)} ${label === "unit" ? "units" : label}`;
}

export function stockTone(row: { quantity: number; low: boolean; is_active?: boolean }): Tone {
  if (row.is_active === false) return "muted";
  if (Number(row.quantity) <= 0) return "danger";
  if (row.low) return "warn";
  return "good";
}

export function stockCopy(row: { quantity: number; low: boolean; is_active?: boolean }): string {
  if (row.is_active === false) return "Archived";
  if (Number(row.quantity) <= 0) return "Out of stock";
  if (row.low) return "At reorder point";
  return "In stock";
}

export function lowStockRows<T extends { low: boolean; is_active: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.is_active && row.low);
}

export function partsValueTotal(rows: Array<{ stock_value: number }>): number {
  return Math.round(rows.reduce((sum, row) => sum + (Number(row.stock_value) || 0), 0) * 100) / 100;
}

export function movementLabel(kind: StockMovementKind): string {
  switch (kind) {
    case "receive":
      return "Received";
    case "issue":
      return "Issued";
    case "return":
      return "Returned";
    default:
      return "Adjusted";
  }
}

/** "+180" / "−4" — the signed number a ledger column shows. */
export function movementDelta(kind: StockMovementKind, quantity: number): string {
  const n = Math.abs(Number(quantity) || 0);
  const sign = quantity < 0 || kind === "issue" ? "−" : "+";
  return `${sign}${qtyCopy(n)}`;
}

export function movementTone(kind: StockMovementKind): Tone {
  switch (kind) {
    case "receive":
      return "good";
    case "issue":
      return "warn";
    case "return":
      return "accent";
    default:
      return "muted";
  }
}

export function orderTone(status: PurchaseOrderStatus): Tone {
  switch (status) {
    case "received":
      return "good";
    case "partial":
      return "accent";
    case "sent":
      return "warn";
    case "cancelled":
      return "danger";
    default:
      return "muted";
  }
}

export function orderStatusCopy(status: PurchaseOrderStatus): string {
  switch (status) {
    case "received":
      return "Received";
    case "partial":
      return "Part received";
    case "sent":
      return "On order";
    case "cancelled":
      return "Cancelled";
    default:
      return "Draft";
  }
}

export function orderProgress(line: PurchaseOrderLine): number {
  const ordered = Number(line.quantity) || 0;
  if (ordered <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((Number(line.received_quantity) || 0) / ordered) * 100)));
}

/** Ticket margin on parts alone: what the client is charged minus what the shelf cost. */
export function partsMargin(totals: { cost: number; charge: number }): number {
  return Math.round(((Number(totals.charge) || 0) - (Number(totals.cost) || 0)) * 100) / 100;
}

export function filterParts(rows: PartRow[], query: string, category: string | null): PartRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (category && row.category !== category) return false;
    if (!needle) return true;
    return (
      row.name.toLowerCase().includes(needle) ||
      row.sku.toLowerCase().includes(needle) ||
      row.brand.toLowerCase().includes(needle) ||
      row.category.toLowerCase().includes(needle)
    );
  });
}

export function partsCsv(rows: PartRow[]): string {
  return csvFromRows(
    ["SKU", "Name", "Category", "Brand", "Qty", "Unit", "Cost", "Sale", "Stock value", "Reorder point", "Status"],
    rows.map((row) => [
      row.sku,
      row.name,
      row.category,
      row.brand,
      qtyCopy(row.quantity),
      row.unit,
      row.unit_cost,
      row.sale_price,
      row.stock_value,
      row.reorder_point,
      stockCopy(row),
    ])
  );
}

export function purchaseOrdersCsv(orders: PurchaseOrderRow[]): string {
  const rows: Array<Array<string | number | null>> = [];
  for (const order of orders) {
    if (order.lines.length === 0) {
      rows.push([order.reference, order.supplier, orderStatusCopy(order.status), "", "", "", ""]);
      continue;
    }
    for (const line of order.lines) {
      rows.push([
        order.reference,
        order.supplier,
        orderStatusCopy(order.status),
        line.sku,
        line.part_name,
        qtyCopy(line.quantity),
        qtyCopy(line.received_quantity),
      ]);
    }
  }
  return csvFromRows(
    ["Reference", "Supplier", "Status", "SKU", "Part", "Ordered", "Received"],
    rows
  );
}

export function exportName(prefix: string, date: Date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `${prefix}-${stamp}.csv`;
}
