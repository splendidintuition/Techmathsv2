/**
 * Portal R3 — money spine data layer.
 *
 * Read/write surface for rate cards, quotes, invoices and payments. Every write is a
 * security-definer RPC in `supabase/migrations/20261104130000_portal_v3_money.sql`;
 * the tables themselves are select-only for the API.
 */
import { supabase } from "@/lib/supabase-browser";
import { PortalV2Error, describeError, type Tone } from "@/lib/portal-v2";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "converted" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "part_paid" | "paid" | "overdue" | "void";
export type PaymentMethod = "bank_transfer" | "card" | "stripe" | "cash" | "direct_debit" | "credit_note";
export type LineUnit = "hour" | "day" | "visit" | "unit" | "fixed";

export const MONEY_FLAGS = {
  sendQuotes: "money.send_quotes",
  sendInvoices: "money.send_invoices",
  recordPayments: "money.record_payments",
} as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "card",
  "stripe",
  "cash",
  "direct_debit",
  "credit_note",
];

export const LINE_UNITS: LineUnit[] = ["hour", "day", "visit", "unit", "fixed"];

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected";
export type ExpenseCategory =
  | "travel"
  | "accommodation"
  | "parts"
  | "shipping"
  | "software"
  | "subcontract"
  | "training"
  | "other";

export const EXPENSE_STATUSES: ExpenseStatus[] = ["draft", "submitted", "approved", "rejected"];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "travel",
  "accommodation",
  "parts",
  "shipping",
  "software",
  "subcontract",
  "training",
  "other",
];

const MONEY_ERROR_COPY: Record<string, string> = {
  quote_not_editable: "Only draft quotes can be edited. Cancel it and raise a new one.",
  quote_not_draft: "That quote has already left the building.",
  quote_not_accepted: "Only an accepted quote can become an invoice.",
  quote_not_awaiting_response: "That quote is not waiting for a client decision.",
  quote_has_no_lines: "Add at least one line before sending.",
  quote_title_required: "Give the quote a title.",
  invoice_not_editable: "Only draft invoices can be edited.",
  invoice_not_draft: "That invoice has already been issued.",
  invoice_has_no_value: "An invoice needs at least one line and a non-zero total.",
  invoice_has_payments: "Reverse the recorded payments before voiding.",
  invoice_not_issued: "Issue the invoice before recording a payment against it.",
  invoice_is_void: "That invoice is void.",
  invoice_already_void: "That invoice is already void.",
  payment_exceeds_balance: "That payment is larger than the outstanding balance.",
  invalid_payment_amount: "Enter a payment amount greater than zero.",
  rate_card_name_required: "Give the rate card a name.",
  invalid_validity_window: "The end date cannot be before the start date.",
  expense_not_found: "That expense no longer exists.",
  expense_not_editable: "Only draft or rejected expenses can be edited.",
  expense_not_submittable: "Only a draft can be submitted for approval.",
  expense_not_awaiting_review: "That expense is not waiting for a decision.",
  expense_not_deletable: "Only a draft can be deleted. Reject it instead.",
  expense_amount_required: "Enter an amount greater than zero.",
  expense_description_required: "Say what the money was spent on.",
  expense_receipt_required: "A reimbursable claim needs a receipt link.",
  expense_site_mismatch: "That site does not belong to the chosen client.",
  expense_ticket_mismatch: "That ticket does not belong to the chosen client.",
  expense_self_approval: "You cannot approve your own expense. Ask another admin.",
  invalid_expense_category: "Pick one of the listed categories.",
  invalid_vat_rate: "The VAT rate must be between 0 and 100.",
  client_organization_required: "Choose a client first.",
  not_found: "That record no longer exists.",
};

/** Translate an RPC failure into operator language, including the flag guard. */
export function moneyError(error: unknown): PortalV2Error {
  const raw = (error ?? {}) as { message?: string; code?: string };
  const message = (raw.message ?? "").trim();
  if (message.startsWith("feature_disabled:")) {
    return new PortalV2Error(
      "feature_disabled",
      "That action is switched off. An Admin can enable it under Money → Settings.",
    );
  }
  if (MONEY_ERROR_COPY[message]) return new PortalV2Error(message, MONEY_ERROR_COPY[message]!);
  return describeError(error);
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) {
    throw new PortalV2Error("supabase_not_configured", "The portal is not connected to its database.");
  }
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw moneyError(error);
  return data as T;
}

/* ------------------------------------------------------------------ shapes */

export interface DocumentLine {
  id?: string;
  description: string;
  category: string;
  unit: LineUnit;
  quantity: number;
  unit_price: number;
  line_total?: number;
}

export interface QuoteSummary {
  id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  organization_id: string;
  client_name: string;
  site_id: string | null;
  site_name: string | null;
  currency: string;
  vat_rate: number;
  subtotal: number;
  vat_total: number;
  total: number;
  valid_until: string | null;
  sent_at: string | null;
  responded_at: string | null;
  accepted_by_name: string | null;
  declined_reason: string | null;
  converted_invoice_id: string | null;
  line_count: number;
  is_demo: boolean;
  created_at: string;
}

export interface QuoteDetail extends Omit<QuoteSummary, "line_count"> {
  discount_pct: number;
  notes: string;
  terms: string;
  lines: DocumentLine[];
}

export interface InvoiceSummary {
  id: string;
  number: string;
  title: string;
  status: InvoiceStatus;
  organization_id: string;
  client_name: string;
  site_id: string | null;
  site_name: string | null;
  quote_id: string | null;
  currency: string;
  vat_rate: number;
  subtotal: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  balance: number;
  reference: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  void_reason: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  received_at: string;
  notes: string;
  is_demo: boolean;
}

export interface InvoiceDetail extends InvoiceSummary {
  client_vat_number: string | null;
  vat_country_code: string | null;
  discount_pct: number;
  notes: string;
  lines: DocumentLine[];
  payments: InvoicePayment[];
}

export interface RateCardLine {
  id?: string;
  category: string;
  crew_role: "engineer" | "lead" | "helper" | "remote";
  unit: LineUnit;
  unit_price: number;
  engineer_cost: number | null;
  min_units: number;
  notes: string;
}

export interface RateCard {
  id: string;
  organization_id: string | null;
  client_name: string | null;
  name: string;
  currency: string;
  country_code: string | null;
  vat_rate: number;
  is_default: boolean;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  notes: string;
  is_demo: boolean;
  lines: RateCardLine[];
}

export interface MoneyMetrics {
  generated_at: string;
  quotes: {
    draft: number;
    sent: number;
    accepted: number;
    declined: number;
    pipeline_value: number;
    accepted_value: number;
    win_rate: number;
  };
  invoices: {
    draft: number;
    sent: number;
    part_paid: number;
    paid: number;
    overdue: number;
    void: number;
  };
  receivables: {
    outstanding: number;
    overdue: number;
    current: number;
    d1_30: number;
    d31_60: number;
    d61_90: number;
    d90_plus: number;
  };
  revenue: { invoiced_this_month: number; invoiced_this_year: number; collected_this_month: number };
  flags: Record<string, boolean>;
}

export type MoneyFlags = Record<string, boolean>;

export interface ExpenseRow {
  id: string;
  spent_on: string;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  currency: string;
  amount_net: number;
  vat_rate: number;
  vat_amount: number;
  amount_gross: number;
  reimbursable: boolean;
  receipt_url: string;
  notes: string;
  status: ExpenseStatus;
  organization_id: string | null;
  client_name: string | null;
  site_id: string | null;
  site_name: string | null;
  ticket_id: string | null;
  ticket_number: number | null;
  ticket_title: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  review_note: string;
  created_by: string | null;
  created_by_name: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface ExpenseMetrics {
  counts: { draft: number; submitted: number; approved: number; rejected: number };
  awaiting_value: number;
  approved_this_month: number;
  approved_ytd: number;
  reimbursable_value: number;
  vat_reclaimable: number;
  by_category: Array<{ category: ExpenseCategory; count: number; gross: number }>;
  generated_at: string;
}

/* ------------------------------------------------------- pure computations */

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Line total as the database computes it (rounded per line). */
export function lineTotal(quantity: number, unitPrice: number): number {
  const qty = Number.isFinite(quantity) ? quantity : 0;
  const price = Number.isFinite(unitPrice) ? unitPrice : 0;
  return round2(Math.max(0, qty) * Math.max(0, price));
}

/** Document totals, mirroring `money_recalc_quote` / `money_recalc_invoice`. */
export function documentTotals(
  lines: Array<Pick<DocumentLine, "quantity" | "unit_price">>,
  options: { vatRate: number; discountPct?: number } = { vatRate: 23 },
): { subtotal: number; vat: number; total: number } {
  const net = lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unit_price), 0);
  const discount = Math.min(100, Math.max(0, options.discountPct ?? 0));
  const subtotal = round2(net * (1 - discount / 100));
  const vat = round2((subtotal * Math.min(100, Math.max(0, options.vatRate))) / 100);
  return { subtotal, vat, total: round2(subtotal + vat) };
}

export function formatMoney(amount: number | null | undefined, currency = "EUR"): string {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export type AgingBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";

/** Which receivables bucket an invoice falls into, based on its due date. */
export function agingBucket(dueAt: string | null | undefined, today: Date = new Date()): AgingBucket {
  if (!dueAt) return "current";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "current";
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const days = Math.floor((startOfToday - startOfDue) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

export function quoteTone(status: QuoteStatus | string): Tone {
  switch (status) {
    case "accepted":
    case "converted":
      return "good";
    case "sent":
      return "accent";
    case "declined":
    case "cancelled":
    case "expired":
      return "muted";
    default:
      return "muted";
  }
}

export function invoiceTone(status: InvoiceStatus | string): Tone {
  switch (status) {
    case "paid":
      return "good";
    case "part_paid":
      return "warn";
    case "overdue":
      return "danger";
    case "void":
      return "muted";
    case "sent":
      return "accent";
    default:
      return "muted";
  }
}

/** Headline numbers for the quotes header. */
export function quoteSummaryOf(rows: QuoteSummary[]): {
  open: number;
  accepted: number;
  pipeline: number;
  winRate: number;
} {
  const decided = rows.filter((row) => ["accepted", "converted", "declined"].includes(row.status)).length;
  const won = rows.filter((row) => ["accepted", "converted"].includes(row.status)).length;
  return {
    open: rows.filter((row) => row.status === "sent").length,
    accepted: won,
    pipeline: round2(rows.filter((row) => row.status === "sent").reduce((sum, row) => sum + Number(row.total), 0)),
    winRate: decided === 0 ? 0 : Math.round((won / decided) * 1000) / 10,
  };
}

/** Headline numbers for the invoices header. */
export function invoiceSummaryOf(rows: InvoiceSummary[], today: Date = new Date()): {
  outstanding: number;
  overdue: number;
  paidThisSet: number;
  openCount: number;
} {
  const open = rows.filter((row) => ["sent", "part_paid", "overdue"].includes(row.status));
  return {
    outstanding: round2(open.reduce((sum, row) => sum + Number(row.balance), 0)),
    overdue: round2(
      open
        .filter((row) => agingBucket(row.due_at, today) !== "current")
        .reduce((sum, row) => sum + Number(row.balance), 0),
    ),
    paidThisSet: round2(rows.reduce((sum, row) => sum + Number(row.amount_paid), 0)),
    openCount: open.length,
  };
}

/** A blank editor row matching the shape the RPC expects. */
export function blankLine(): DocumentLine {
  return { description: "", category: "general", unit: "hour", quantity: 1, unit_price: 0 };
}

/** Strip editor rows the RPC would skip anyway (no description). */
export function cleanLines(lines: DocumentLine[]) {
  return lines
    .filter((line) => line.description.trim().length > 0)
    .map((line) => ({
      description: line.description.trim(),
      category: line.category.trim() || "general",
      unit: line.unit,
      quantity: Number(line.quantity) || 0,
      unit_price: Number(line.unit_price) || 0,
    }));
}

/* ------------------------------------------------------------- expenses */

/** VAT portion of an expense, rounded the way the generated column does. */
export function expenseVat(net: number, rate: number): number {
  const amount = Number.isFinite(net) ? Math.max(0, net) : 0;
  const pct = Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : 0;
  return round2((amount * pct) / 100);
}

export function expenseGross(net: number, rate: number): number {
  return round2((Number.isFinite(net) ? Math.max(0, net) : 0) + expenseVat(net, rate));
}

export function expenseTone(status: ExpenseStatus | string): Tone {
  switch (status) {
    case "approved":
      return "good";
    case "submitted":
      return "accent";
    case "rejected":
      return "danger";
    default:
      return "muted";
  }
}

/** Headline numbers for the expenses header, from the rows already on screen. */
export function expenseSummaryOf(
  rows: ExpenseRow[],
  today: Date = new Date(),
): { awaiting: number; awaitingCount: number; approved: number; reimbursable: number; month: number } {
  const approvedRows = rows.filter((row) => row.status === "approved");
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  return {
    awaiting: round2(rows.filter((row) => row.status === "submitted").reduce((sum, row) => sum + Number(row.amount_gross), 0)),
    awaitingCount: rows.filter((row) => row.status === "submitted").length,
    approved: round2(approvedRows.reduce((sum, row) => sum + Number(row.amount_gross), 0)),
    reimbursable: round2(
      approvedRows.filter((row) => row.reimbursable).reduce((sum, row) => sum + Number(row.amount_gross), 0),
    ),
    month: round2(
      approvedRows
        .filter((row) => new Date(`${row.spent_on}T00:00:00`).getTime() >= monthStart)
        .reduce((sum, row) => sum + Number(row.amount_gross), 0),
    ),
  };
}

/* ------------------------------------------------------------ RPC surface */

export interface ClientOrg {
  id: string;
  name: string;
  vat_number: string | null;
  country_code: string | null;
}

export const moneyApi = {
  /** Client organizations, read directly under the `org_select_members` policy. */
  async clients(): Promise<ClientOrg[]> {
    if (!supabase) throw new PortalV2Error("supabase_not_configured", "The portal is not connected to its database.");
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, vat_number, country_code")
      .eq("type", "client")
      .order("name");
    if (error) throw moneyError(error);
    return (data ?? []) as ClientOrg[];
  },

  flags: () => rpc<MoneyFlags>("money_flags"),
  setFlag: (key: string, enabled: boolean) => rpc<boolean>("money_set_flag", { p_key: key, p_enabled: enabled }),
  metrics: () => rpc<MoneyMetrics>("money_metrics"),

  listRateCards: () => rpc<RateCard[]>("money_list_rate_cards"),
  saveRateCard: (payload: Record<string, unknown>) => rpc<string>("money_save_rate_card", payload),
  deleteRateCard: (id: string) => rpc<boolean>("money_delete_rate_card", { p_id: id }),

  listQuotes: (status?: string) => rpc<QuoteSummary[]>("money_list_quotes", { p_status: status ?? null }),
  getQuote: (id: string) => rpc<QuoteDetail>("money_get_quote", { p_id: id }),
  saveQuote: (payload: Record<string, unknown>) => rpc<string>("money_save_quote", payload),
  sendQuote: (id: string) => rpc<boolean>("money_send_quote", { p_quote_id: id }),
  respondQuote: (id: string, accept: boolean, name?: string, reason?: string) =>
    rpc<QuoteStatus>("money_respond_quote", {
      p_quote_id: id,
      p_accept: accept,
      p_name: name ?? null,
      p_reason: reason ?? null,
    }),
  quoteToInvoice: (id: string) => rpc<string>("money_quote_to_invoice", { p_quote_id: id }),

  listInvoices: (status?: string) => rpc<InvoiceSummary[]>("money_list_invoices", { p_status: status ?? null }),
  getInvoice: (id: string) => rpc<InvoiceDetail>("money_get_invoice", { p_id: id }),
  saveInvoice: (payload: Record<string, unknown>) => rpc<string>("money_save_invoice", payload),
  sendInvoice: (id: string, dueDays = 14) =>
    rpc<boolean>("money_send_invoice", { p_invoice_id: id, p_due_days: dueDays }),
  voidInvoice: (id: string, reason: string) =>
    rpc<boolean>("money_void_invoice", { p_invoice_id: id, p_reason: reason }),
  recordPayment: (payload: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    receivedAt?: string;
    notes?: string;
  }) =>
    rpc<string>("money_record_payment", {
      p_invoice_id: payload.invoiceId,
      p_amount: payload.amount,
      p_method: payload.method,
      p_reference: payload.reference ?? "",
      p_received_at: payload.receivedAt ?? null,
      p_notes: payload.notes ?? "",
    }),
  deletePayment: (id: string) => rpc<boolean>("money_delete_payment", { p_payment_id: id }),

  listExpenses: (status?: string) => rpc<ExpenseRow[]>("money_list_expenses", { p_status: status ?? null }),
  saveExpense: (payload: Record<string, unknown>) => rpc<string>("money_save_expense", payload),
  submitExpense: (id: string) => rpc<ExpenseStatus>("money_submit_expense", { p_id: id }),
  reviewExpense: (id: string, approve: boolean, note = "") =>
    rpc<ExpenseStatus>("money_review_expense", { p_id: id, p_approve: approve, p_note: note }),
  deleteExpense: (id: string) => rpc<boolean>("money_delete_expense", { p_id: id }),
  expenseMetrics: () => rpc<ExpenseMetrics>("money_expense_metrics"),

  seedDemo: () => rpc<{ client: string; quote: string; invoice: string }>("money_seed_demo"),
};
