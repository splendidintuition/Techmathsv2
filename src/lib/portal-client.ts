/**
 * Portal R6 — client-facing data layer.
 *
 * A client account never reads the operational tables directly for money: every call below is a
 * security-definer RPC in `supabase/migrations/20261105120000_portal_v6_client_portal.sql` that
 * resolves the caller's own organisation first. Drafts are never exposed, and a client only ever
 * sees its own quotes, invoices, tickets and sites.
 */
import { PortalV2Error, callRpc, describeError, humanise, type Tone } from "@/lib/portal-v2";
import { formatMoney } from "@/lib/portal-money";

export type QuoteStatus = "sent" | "accepted" | "declined" | "expired" | "converted";
export type InvoiceStatusLite = "sent" | "part_paid" | "paid" | "overdue";
export type TicketStatusLite = string;

const CLIENT_ERROR_COPY: Record<string, string> = {
  not_a_client_account: "This workspace belongs to a client account. Sign in with your company login.",
  site_not_in_client_organization: "That site is not part of your account.",
  quote_not_found: "That quote is no longer available to you.",
  quote_not_awaiting_response: "That quote has already been answered, or it has expired.",
  invoice_not_found: "That invoice is no longer available to you.",
  ticket_not_found: "That request is no longer available to you.",
  ticket_not_awaiting_approval: "That job is not waiting for your sign-off any more.",
  invalid_ticket_fields: "Give the request a title between 3 and 240 characters.",
  feature_disabled: "Quotes are not open for online acceptance at the moment. Reply to your account manager instead.",
  not_authenticated: "Your session has expired. Sign in again.",
};

export function clientError(error: unknown): PortalV2Error {
  const raw = (error ?? {}) as { message?: string };
  const message = (raw.message ?? "").trim();
  if (message.startsWith("feature_disabled:")) {
    return new PortalV2Error("feature_disabled", CLIENT_ERROR_COPY.feature_disabled!);
  }
  const copy = CLIENT_ERROR_COPY[message];
  if (copy) return new PortalV2Error(message, copy);
  return describeError(error);
}

/* ------------------------------------------------------------------ shapes */

export interface ClientOrganization {
  id: string;
  name: string;
  billing_email: string | null;
  vat_number: string | null;
  country_code: string | null;
  vat_rate: number;
  currency: string;
}

export interface ClientStats {
  open_tickets: number;
  awaiting_approval: number;
  quotes_awaiting: number;
  invoices_open: number;
  outstanding: number;
  overdue: number;
  paid_this_year: number;
  next_visit_at: string | null;
}

export interface ClientQuote {
  id: string;
  number: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  subtotal: number;
  vat_rate: number;
  vat_total: number;
  total: number;
  valid_until: string | null;
  sent_at: string | null;
  responded_at: string | null;
  accepted_by_name: string | null;
  declined_reason: string | null;
  site_name: string | null;
  line_count: number;
  can_respond: boolean;
}

export interface ClientQuoteLine {
  id: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ClientQuoteDetail extends ClientQuote {
  notes: string;
  terms: string;
  discount_pct: number;
  organization_name: string;
  lines: ClientQuoteLine[];
}

export interface ClientInvoice {
  id: string;
  number: string;
  title: string;
  status: InvoiceStatusLite;
  currency: string;
  subtotal: number;
  vat_rate: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  balance: number;
  reference: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  site_name: string | null;
  is_overdue: boolean;
}

export interface ClientPayment {
  id: string;
  amount: number;
  method: string;
  reference: string;
  received_at: string;
}

export interface ClientInvoiceDetail extends ClientInvoice {
  notes: string;
  discount_pct: number;
  organization_name: string;
  lines: ClientQuoteLine[];
  payments: ClientPayment[];
}

export interface ClientTicket {
  id: string;
  ticket_number: number;
  title: string;
  status: TicketStatusLite;
  priority: string;
  category: string;
  site_id: string;
  site_name: string | null;
  engineer_name: string | null;
  scheduled_for: string | null;
  sla_due_at: string | null;
  closed_at: string | null;
  created_at: string;
  awaiting_client: boolean;
}

export interface TimelineEntry {
  at: string;
  kind: string;
  label: string;
  note: string | null;
}

export interface ClientTicketDetail extends ClientTicket {
  description: string;
  site_address: string | null;
  timeline: TimelineEntry[];
}

export interface ClientSite {
  id: string;
  name: string;
  address: string;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  open_tickets: number;
  next_visit_at: string | null;
}

export type ContractKindLite = "retainer" | "prepaid_bundle" | "sla_tier" | "framework";

/** Client-safe agreement card: no fee, no margin, no internal note. */
export interface ClientContract {
  id: string;
  kind: ContractKindLite;
  status: string;
  name: string;
  reference: string;
  starts_on: string;
  ends_on: string | null;
  response_minutes: number | null;
  resolution_minutes: number | null;
  coverage: string;
  included_hours: number;
  bundle_hours: number;
  usage: {
    hours_used: number | string;
    included_remaining: number | string;
    bundle_remaining: number | string;
    sla_met: number | string;
    sla_breached: number | string;
    sla_compliance_pct: number | string | null;
  };
}

export interface ClientHome {
  organization: ClientOrganization;
  stats: ClientStats;
  quotes: ClientQuote[];
  invoices: ClientInvoice[];
  tickets: ClientTicket[];
}

/* --------------------------------------------------------------------- api */

export const clientApi = {
  home: () => callRpc<ClientHome>("portal_client_home"),
  quotes: (limit = 50) => callRpc<ClientQuote[]>("portal_client_quotes", { p_limit: limit }),
  quote: (id: string) => callRpc<ClientQuoteDetail>("portal_client_quote", { p_id: id }),
  respondQuote: (id: string, accept: boolean, reason?: string) =>
    callRpc<QuoteStatus>("portal_client_respond_quote", {
      p_quote_id: id,
      p_accept: accept,
      p_reason: reason ?? null,
    }),
  invoices: (limit = 50) => callRpc<ClientInvoice[]>("portal_client_invoices", { p_limit: limit }),
  invoice: (id: string) => callRpc<ClientInvoiceDetail>("portal_client_invoice", { p_id: id }),
  tickets: (limit = 60) => callRpc<ClientTicket[]>("portal_client_tickets", { p_limit: limit }),
  ticket: (id: string) => callRpc<ClientTicketDetail>("portal_client_ticket", { p_id: id }),
  signOff: (id: string, approve: boolean, note?: string) =>
    callRpc<TicketStatusLite>("portal_client_sign_off", {
      p_ticket_id: id,
      p_approve: approve,
      p_note: note ?? null,
    }),
  sites: () => callRpc<ClientSite[]>("portal_client_sites"),
  contracts: () => callRpc<ClientContract[]>("portal_client_contracts"),
  requestVisit: (siteId: string, title: string, description = "", preferredDate?: string | null) =>
    callRpc<string>("portal_client_request_visit", {
      p_site_id: siteId,
      p_title: title,
      p_description: description,
      p_preferred_date: preferredDate || null,
    }),
};

/* ---------------------------------------------------------- read helpers */

/** Client-friendly status copy. The operation's internal vocabulary never reaches the client. */
const CLIENT_STATUS_COPY: Record<string, string> = {
  new: "Received",
  triaged: "Being planned",
  offered: "Matching an engineer",
  assigned: "Engineer assigned",
  en_route: "Engineer on the way",
  on_site: "Engineer on site",
  in_progress: "Work in progress",
  waiting_client: "Waiting on you",
  waiting_parts: "Waiting on parts",
  completed_pending_approval: "Waiting for your approval",
  approved: "Approved",
  closed: "Completed",
  cancelled: "Cancelled",
  rejected: "Not proceeding",
};

export function clientStatusLabel(status: string): string {
  return CLIENT_STATUS_COPY[status] ?? humanise(status);
}

export function clientStatusTone(status: string): Tone {
  switch (status) {
    case "closed":
    case "approved":
      return "good";
    case "cancelled":
    case "rejected":
      return "danger";
    case "waiting_client":
    case "waiting_parts":
    case "completed_pending_approval":
      return "warn";
    case "assigned":
    case "en_route":
    case "on_site":
    case "in_progress":
      return "accent";
    default:
      return "muted";
  }
}

export function quoteTone(status: string): Tone {
  switch (status) {
    case "accepted":
    case "converted":
      return "good";
    case "declined":
      return "danger";
    case "expired":
      return "muted";
    default:
      return "warn";
  }
}

export function invoiceTone(invoice: Pick<ClientInvoice, "status" | "is_overdue">): Tone {
  if (invoice.status === "paid") return "good";
  if (invoice.is_overdue) return "danger";
  if (invoice.status === "part_paid") return "warn";
  return "accent";
}

/** Everything on the client home that expects the caller to do something, in priority order. */
export function attentionItems(stats: ClientStats): Array<{ key: string; label: string; hint: string; count: number; tone: Tone }> {
  const items = [
    {
      key: "quotes",
      label: "Quotes to approve",
      hint: "Accept or decline so work can be scheduled",
      count: stats.quotes_awaiting ?? 0,
      tone: "warn" as Tone,
    },
    {
      key: "approvals",
      label: "Jobs awaiting your sign-off",
      hint: "The engineer has finished and needs your confirmation",
      count: stats.awaiting_approval ?? 0,
      tone: "accent" as Tone,
    },
    {
      key: "overdue",
      label: "Invoices past their due date",
      hint: "Settle or query these with your account manager",
      count: stats.overdue > 0 ? 1 : 0,
      tone: "danger" as Tone,
    },
  ];
  return items.filter((item) => item.count > 0);
}

export function billingTotals(invoices: ClientInvoice[]): { billed: number; paid: number; outstanding: number; overdue: number } {
  return invoices.reduce(
    (acc, invoice) => {
      acc.billed += Number(invoice.total ?? 0);
      acc.paid += Number(invoice.amount_paid ?? 0);
      const balance = Number(invoice.balance ?? 0);
      if (invoice.status !== "paid" && balance > 0) {
        acc.outstanding += balance;
        if (invoice.is_overdue) acc.overdue += balance;
      }
      return acc;
    },
    { billed: 0, paid: 0, outstanding: 0, overdue: 0 },
  );
}

export function money(value: number | null | undefined, currency = "EUR"): string {
  return formatMoney(value, currency);
}

/** Whole days between now and an ISO timestamp. Negative means it has passed. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const startOfDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((utcTarget - startOfDay(now)) / 86_400_000);
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** "Tomorrow, 09:00" style copy for the next scheduled visit. */
export function visitCopy(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "No visit scheduled";
  const days = daysUntil(iso, now);
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  return `${label} · ${dateTime(iso)}`;
}

/** How long a quote has left before it lapses, for the list badge. */
export function validityCopy(quote: Pick<ClientQuote, "valid_until" | "status">, now: Date = new Date()): string {
  if (quote.status !== "sent") return "—";
  const days = daysUntil(quote.valid_until, now);
  if (days === null) return "No expiry";
  if (days < 0) return "Expired";
  if (days === 0) return "Last day";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/** Balance bar shown on the invoice detail: how much of the total has been settled. */
/** "4 h response · 24×7 cover" for the agreement card. */
export function agreementCopy(contract: ClientContract): string {
  const parts: string[] = [];
  const coverage =
    contract.coverage === "24x7" ? "24×7 cover" : contract.coverage === "extended" ? "Extended hours" : "Business hours";
  parts.push(coverage);
  if (contract.response_minutes) parts.push(`${targetCopy(contract.response_minutes)} response`);
  if (contract.resolution_minutes) parts.push(`${targetCopy(contract.resolution_minutes)} resolution`);
  return parts.join(" · ");
}

/** Minutes as "4 h" / "90 min" / "1 d 4 h". */
export function targetCopy(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "not set";
  const total = Math.max(0, Math.round(Number(minutes)));
  if (total < 60) return `${total} min`;
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (!days && mins) parts.push(`${mins} min`);
  return parts.join(" ");
}

export function contractKindCopy(kind: string): string {
  switch (kind) {
    case "sla_tier":
      return "SLA tier";
    case "retainer":
      return "Retainer";
    case "prepaid_bundle":
      return "Prepaid bundle";
    default:
      return "Framework";
  }
}

export function settlementPct(invoice: Pick<ClientInvoice, "total" | "amount_paid">): number {
  const total = Number(invoice.total ?? 0);
  if (total <= 0) return invoice.amount_paid > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((Number(invoice.amount_paid ?? 0) / total) * 100)));
}

/* ------------------------------------------------------------- exports */

/** Plain-text statement for the finance team — no PDF service is wired in this release. */
export function invoiceCsv(invoice: ClientInvoiceDetail): string {
  const rows: string[][] = [
    ["Invoice", invoice.number],
    ["Client", invoice.organization_name],
    ["Issued", invoice.issued_at ? shortDate(invoice.issued_at) : ""],
    ["Due", invoice.due_at ? shortDate(invoice.due_at) : ""],
    ["Currency", invoice.currency],
    [],
    ["Description", "Qty", "Unit", "Unit price", "Line total"],
    ...invoice.lines.map((line) => [
      line.description,
      String(line.quantity),
      line.unit,
      line.unit_price.toFixed(2),
      line.line_total.toFixed(2),
    ]),
    [],
    ["Subtotal", invoice.subtotal.toFixed(2)],
    [`VAT (${Number(invoice.vat_rate)}%)`, invoice.vat_total.toFixed(2)],
    ["Total", invoice.total.toFixed(2)],
    ["Paid", invoice.amount_paid.toFixed(2)],
    ["Balance", invoice.balance.toFixed(2)],
  ];
  return rows.map((row) => row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}
