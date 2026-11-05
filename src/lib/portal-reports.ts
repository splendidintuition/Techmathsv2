/**
 * Portal R8 — reports and exports.
 *
 * The numbers come from `reports_ops`, `reports_finance` and `reports_sla` in
 * `supabase/migrations/20261105160000_portal_v8_reports.sql`. Nothing is recomputed in the browser:
 * the CSV is a straight serialisation of what the database returned, so a report can never disagree
 * with the table it came from.
 */
import { PortalV2Error, callRpc, csvFromRows, describeError } from "@/lib/portal-v2";

export type RangeKey = "7d" | "30d" | "90d" | "month" | "quarter";

export interface ReportBucket {
  /** Aggregate rows are keyed by `key` (status, priority, month, country); aging rows use `bucket`
   *  and debtors use `name`, so the discriminator is optional. */
  key?: string;
  count?: number;
  invoiced?: number;
  collected?: number;
  invoiced_gross?: number;
  vat?: number;
  amount?: number;
  name?: string;
  oldest_due?: string | null;
  bucket?: string;
  [extra: string]: unknown;
}

export interface OpsSummary {
  created: number;
  closed: number;
  open_now: number;
  unassigned_now: number;
  sla_tracked: number;
  sla_met: number;
  sla_breached: number;
  sla_at_risk: number;
  avg_response_minutes: number | null;
  avg_close_hours: number | null;
  logged_hours: number;
}

export interface OpsClientRow {
  organization_id: string;
  name: string;
  created: number;
  closed: number;
  open_now: number;
  sla_breached: number;
}

export interface OpsDayRow {
  day: string;
  created: number;
  closed: number;
}

export interface OpsEngineerRow {
  engineer_id: string;
  name: string;
  assigned: number;
  closed: number;
  hours: number;
  rating: number | null;
}

export interface OpsReport {
  range: { from: string; to: string };
  summary: OpsSummary;
  by_status: ReportBucket[];
  by_priority: ReportBucket[];
  by_category: ReportBucket[];
  by_country: ReportBucket[];
  by_client: OpsClientRow[];
  daily: OpsDayRow[];
  engineers: OpsEngineerRow[];
}

export interface FinanceSummary {
  invoiced_net: number;
  invoiced_gross: number;
  vat_billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  expenses_net: number;
  labour_cost: number;
  margin: number;
  margin_pct: number | null;
}

export interface FinanceClientRow {
  organization_id: string;
  name: string;
  invoiced_net: number;
  expenses: number;
  margin: number;
  margin_pct: number | null;
}

export interface FinanceReport {
  range: { from: string; to: string };
  summary: FinanceSummary;
  by_client: FinanceClientRow[];
  by_country: ReportBucket[];
  by_month: ReportBucket[];
  aging: ReportBucket[];
  debtors: ReportBucket[];
}

export interface SlaRow {
  organization_id: string;
  organization_name: string;
  contract_name: string | null;
  kind: string | null;
  coverage: string | null;
  response_minutes: number | null;
  tickets: number;
  met: number;
  breached: number;
  at_risk: number;
  avg_response_minutes: number | null;
  compliance_pct: number | null;
}

export interface SlaReport {
  range: { from: string; to: string };
  rows: SlaRow[];
}

const REPORT_ERROR_COPY: Record<string, string> = {
  invalid_date_range: "The end date cannot be before the start date.",
  not_authorized: "Your account does not have permission to read this report.",
};

export function reportError(error: unknown): PortalV2Error {
  const raw = (error ?? {}) as { message?: string };
  const message = (raw.message ?? "").trim();
  const copy = REPORT_ERROR_COPY[message];
  if (copy) return new PortalV2Error(message, copy);
  return describeError(error);
}

export const reportsApi = {
  ops: (from?: string | null, to?: string | null) =>
    callRpc<OpsReport>("reports_ops", { p_from: from ?? null, p_to: to ?? null }),
  finance: (from?: string | null, to?: string | null) =>
    callRpc<FinanceReport>("reports_finance", { p_from: from ?? null, p_to: to ?? null }),
  sla: (from?: string | null, to?: string | null) =>
    callRpc<SlaReport>("reports_sla", { p_from: from ?? null, p_to: to ?? null }),
};

/* ---------------------------------------------------------------- ranges */

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Inclusive range for a preset, anchored on `now`. */
export function rangeFor(key: RangeKey, now: Date = new Date()): { from: string; to: string } {
  const to = iso(now);
  switch (key) {
    case "7d":
      return { from: iso(new Date(now.getTime() - 6 * 86_400_000)), to };
    case "90d":
      return { from: iso(new Date(now.getTime() - 89 * 86_400_000)), to };
    case "month":
      return { from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to };
    case "quarter":
      return {
        from: iso(new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1))),
        to,
      };
    case "30d":
    default:
      return { from: iso(new Date(now.getTime() - 29 * 86_400_000)), to };
  }
}

export const RANGE_LABELS: Array<{ key: RangeKey; label: string }> = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
];

/* --------------------------------------------------------------- helpers */

/** Compliance as a number, or null when nothing was measured yet. */
export function compliancePct(met: number, breached: number): number | null {
  const measured = Number(met) + Number(breached);
  if (!measured) return null;
  return Math.round((Number(met) / measured) * 1000) / 10;
}

export function hoursCopy(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  const value = Number(minutes);
  if (!Number.isFinite(value)) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = value / 60;
  return `${hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10} h`;
}

/** Biggest bucket wins; used to size the inline bars without a chart library. */
export function bucketMax<T extends { count?: number; invoiced?: number; amount?: number }>(rows: T[]): number {
  return rows.reduce((max, row) => Math.max(max, Number(row.count ?? row.invoiced ?? row.amount ?? 0)), 0);
}

export function barWidth(value: number, max: number): number {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.max(2, Math.round((Number(value) / max) * 100)));
}

/** Ops report → CSV rows, one row per daily point plus the summary block. */
export function opsCsv(report: OpsReport): string {
  const summary = csvFromRows(
    ["Metric", "Value"],
    [
      ["Range", `${report.range.from} → ${report.range.to}`],
      ["Tickets created", report.summary.created],
      ["Tickets closed", report.summary.closed],
      ["Open now", report.summary.open_now],
      ["Unassigned now", report.summary.unassigned_now],
      ["SLA tracked", report.summary.sla_tracked],
      ["SLA met", report.summary.sla_met],
      ["SLA breached", report.summary.sla_breached],
      ["Average response (min)", report.summary.avg_response_minutes],
      ["Average close (h)", report.summary.avg_close_hours],
      ["Hours logged", report.summary.logged_hours],
    ],
  );
  const daily = csvFromRows(
    ["Day", "Created", "Closed"],
    report.daily.map((row) => [row.day, row.created, row.closed]),
  );
  const clients = csvFromRows(
    ["Client", "Created", "Closed", "Open now", "SLA breached"],
    report.by_client.map((row) => [row.name, row.created, row.closed, row.open_now, row.sla_breached]),
  );
  return [summary, "", daily, "", clients].join("\n");
}

export function financeCsv(report: FinanceReport): string {
  const summary = csvFromRows(
    ["Metric", "Value"],
    [
      ["Range", `${report.range.from} → ${report.range.to}`],
      ["Invoiced net", report.summary.invoiced_net],
      ["VAT billed", report.summary.vat_billed],
      ["Invoiced gross", report.summary.invoiced_gross],
      ["Collected", report.summary.collected],
      ["Outstanding", report.summary.outstanding],
      ["Overdue", report.summary.overdue],
      ["Expenses", report.summary.expenses_net],
      ["Labour cost", report.summary.labour_cost],
      ["Margin", report.summary.margin],
      ["Margin %", report.summary.margin_pct],
    ],
  );
  const clients = csvFromRows(
    ["Client", "Invoiced net", "Expenses", "Margin", "Margin %"],
    report.by_client.map((row) => [row.name, row.invoiced_net, row.expenses, row.margin, row.margin_pct]),
  );
  const aging = csvFromRows(
    ["Aging bucket", "Invoices", "Amount"],
    report.aging.map((row) => [row.bucket ?? "", row.count ?? 0, row.amount ?? 0]),
  );
  const months = csvFromRows(
    ["Month", "Invoiced", "Collected"],
    report.by_month.map((row) => [row.key ?? "", row.invoiced ?? 0, row.collected ?? 0]),
  );
  return [summary, "", clients, "", aging, "", months].join("\n");
}

export function slaCsv(report: SlaReport): string {
  return csvFromRows(
    ["Client", "Contract", "Coverage", "Response target (min)", "Tickets", "Met", "Breached", "At risk", "Compliance %", "Avg response (min)"],
    report.rows.map((row) => [
      row.organization_name,
      row.contract_name ?? "—",
      row.coverage ?? "—",
      row.response_minutes,
      row.tickets,
      row.met,
      row.breached,
      row.at_risk,
      row.compliance_pct,
      row.avg_response_minutes,
    ]),
  );
}

/** Tidy spreadsheet-friendly name, e.g. `finance-2026-08-01-2026-10-31.csv`. */
export function exportName(kind: string, range: { from: string; to: string }): string {
  return `${kind}-${range.from}-${range.to}.csv`;
}
