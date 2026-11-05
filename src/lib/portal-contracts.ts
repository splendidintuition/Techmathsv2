/**
 * Portal R7 — contracts, SLA tiers, retainers and prepaid bundles.
 *
 * All writes are security-definer RPCs in
 * `supabase/migrations/20261105140000_portal_v7_contracts.sql`, gated by `clients.contracts`.
 * The SLA target is copied onto each ticket by a database trigger, so a coordinator cannot forget it.
 */
import { PortalV2Error, callRpc, describeError, type Tone } from "@/lib/portal-v2";
import { formatMoney } from "@/lib/portal-money";

export type ContractKind = "retainer" | "prepaid_bundle" | "sla_tier" | "framework";
export type ContractStatus = "draft" | "active" | "paused" | "expired" | "cancelled";
export type ContractCoverage = "business_hours" | "extended" | "24x7";

export const CONTRACT_KINDS: ContractKind[] = ["sla_tier", "retainer", "prepaid_bundle", "framework"];
export const CONTRACT_STATUSES: ContractStatus[] = ["draft", "active", "paused", "expired", "cancelled"];
export const CONTRACT_COVERAGE: ContractCoverage[] = ["business_hours", "extended", "24x7"];

const CONTRACT_ERROR_COPY: Record<string, string> = {
  contract_not_found: "That contract no longer exists.",
  contract_name_required: "Give the contract a name.",
  contract_dates_required: "A contract needs a start date.",
  contract_already_cancelled: "That contract is cancelled and cannot be revived. Raise a new one.",
  sla_tier_already_active: "This client already has an active SLA tier. Pause or end it first.",
  client_organization_required: "Contracts attach to a client organisation, not an internal one.",
  not_a_bundle: "Only a prepaid bundle can be drawn down by hand.",
  invalid_hours: "Enter a number of hours greater than zero.",
  bundle_exhausted: "That would take the bundle past its purchased hours.",
};

export function contractError(error: unknown): PortalV2Error {
  const raw = (error ?? {}) as { message?: string };
  const message = (raw.message ?? "").trim();
  const copy = CONTRACT_ERROR_COPY[message];
  if (copy) return new PortalV2Error(message, copy);
  return describeError(error);
}

export interface ContractUsage {
  contract_id: string;
  kind: ContractKind;
  status: ContractStatus;
  included_hours: number;
  bundle_hours: number;
  bundle_consumed: number;
  hours_used: number;
  included_remaining: number;
  bundle_remaining: number;
  overage_hours: number;
  overage_value: number;
  period_start: string;
  period_end: string;
  tickets: number;
  sla_met: number;
  sla_breached: number;
  sla_at_risk: number;
  sla_compliance_pct: number | null;
}

export interface ContractRow {
  id: string;
  organization_id: string;
  organization_name: string;
  kind: ContractKind;
  status: ContractStatus;
  name: string;
  reference: string;
  currency: string;
  starts_on: string;
  ends_on: string | null;
  response_minutes: number | null;
  resolution_minutes: number | null;
  coverage: ContractCoverage;
  monthly_fee: number;
  included_hours: number;
  bundle_hours: number;
  bundle_consumed: number;
  overage_rate: number | null;
  notes: string;
  is_demo: boolean;
  created_at: string;
  usage: ContractUsage;
}

export interface ContractMetrics {
  active: number;
  draft: number;
  mrr: number;
  retained_hours: number;
  bundle_hours_left: number;
  expiring_30d: number;
  sla_clients: number;
  sla_cover_24x7: number;
  breached_30d: number;
  flags: { can_manage: boolean };
}

export interface ContractInput {
  id?: string | null;
  organization_id: string;
  kind: ContractKind;
  name: string;
  status?: ContractStatus;
  reference?: string;
  currency?: string;
  starts_on: string;
  ends_on?: string | null;
  response_minutes?: number | null;
  resolution_minutes?: number | null;
  coverage?: ContractCoverage;
  monthly_fee?: number;
  included_hours?: number;
  bundle_hours?: number;
  overage_rate?: number | null;
  notes?: string;
}

export const contractApi = {
  list: (organizationId?: string | null, status?: string | null) =>
    callRpc<ContractRow[]>("contract_list", {
      p_organization_id: organizationId ?? null,
      p_status: status ?? null,
    }),
  get: (id: string) => callRpc<ContractRow>("contract_get", { p_id: id }),
  save: (input: ContractInput) =>
    callRpc<string>("contract_save", {
      p_id: input.id ?? null,
      p_organization_id: input.organization_id,
      p_kind: input.kind,
      p_name: input.name,
      p_status: input.status ?? "draft",
      p_reference: input.reference ?? "",
      p_currency: input.currency ?? "EUR",
      p_starts_on: input.starts_on,
      p_ends_on: input.ends_on ?? null,
      p_response_minutes: input.response_minutes ?? null,
      p_resolution_minutes: input.resolution_minutes ?? null,
      p_coverage: input.coverage ?? "business_hours",
      p_monthly_fee: input.monthly_fee ?? 0,
      p_included_hours: input.included_hours ?? 0,
      p_bundle_hours: input.bundle_hours ?? 0,
      p_overage_rate: input.overage_rate ?? null,
      p_notes: input.notes ?? "",
    }),
  setStatus: (id: string, status: ContractStatus) =>
    callRpc<ContractStatus>("contract_set_status", { p_id: id, p_status: status }),
  consumeBundle: (id: string, hours: number, note = "") =>
    callRpc<number>("contract_consume_bundle", { p_id: id, p_hours: hours, p_note: note }),
  metrics: () => callRpc<ContractMetrics>("contract_metrics"),
  seedDemo: () => callRpc<{ organization: string; sla: string; retainer: string }>("contract_seed_demo"),
};

/* ---------------------------------------------------------------- helpers */

export const KIND_META: Record<ContractKind, { label: string; hint: string }> = {
  sla_tier: { label: "SLA tier", hint: "Response and resolution targets applied to every ticket." },
  retainer: { label: "Retainer", hint: "Monthly fee with a block of included hours." },
  prepaid_bundle: { label: "Prepaid bundle", hint: "Hours bought up front and drawn down." },
  framework: { label: "Framework", hint: "Umbrella agreement that sets the commercial terms." },
};

export function contractStatusTone(status: string): Tone {
  switch (status) {
    case "active":
      return "good";
    case "paused":
      return "warn";
    case "cancelled":
    case "expired":
      return "danger";
    default:
      return "muted";
  }
}

/** "4 h" / "90 min" / "1 d 4 h" — the way a coordinator reads an SLA target. */
export function minutesCopy(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) return "not set";
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

export function coverageCopy(coverage: string): string {
  switch (coverage) {
    case "24x7":
      return "24×7 cover";
    case "extended":
      return "Extended hours";
    default:
      return "Business hours";
  }
}

/** One-line summary used in lists and on the client portal card. */
export function contractHeadline(contract: Pick<ContractRow, "kind" | "coverage" | "response_minutes" | "resolution_minutes">): string {
  const parts = [coverageCopy(contract.coverage)];
  if (contract.response_minutes) parts.push(`${minutesCopy(contract.response_minutes)} response`);
  if (contract.resolution_minutes) parts.push(`${minutesCopy(contract.resolution_minutes)} resolution`);
  return parts.join(" · ");
}

function startOfDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: string | null | undefined, now: Date = new Date()): number | null {
  if (!from) return null;
  const target = new Date(from);
  if (Number.isNaN(target.getTime())) return null;
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((utcTarget - startOfDay(now)) / 86_400_000);
}

/** Where the contract sits in time, in words. */
export function windowCopy(
  contract: Pick<ContractRow, "starts_on" | "ends_on" | "status">,
  now: Date = new Date(),
): string {
  if (contract.status === "cancelled") return "Cancelled";
  const untilStart = daysBetween(contract.starts_on, now);
  if (untilStart !== null && untilStart > 0) return `Starts in ${untilStart} day${untilStart === 1 ? "" : "s"}`;
  if (!contract.ends_on) return "Open ended";
  const untilEnd = daysBetween(contract.ends_on, now);
  if (untilEnd === null) return "Open ended";
  if (untilEnd < 0) return `Ended ${Math.abs(untilEnd)} day${Math.abs(untilEnd) === 1 ? "" : "s"} ago`;
  if (untilEnd === 0) return "Ends today";
  return `${untilEnd} day${untilEnd === 1 ? "" : "s"} left`;
}

export function expiringSoon(
  contract: Pick<ContractRow, "ends_on" | "status">,
    days = 30,
  now: Date = new Date(),
): boolean {
  if (contract.status !== "active" || !contract.ends_on) return false;
  const untilEnd = daysBetween(contract.ends_on, now);
  return untilEnd !== null && untilEnd >= 0 && untilEnd <= days;
}

/** Percentage of included hours consumed this period. */
export function includedUsagePct(contract: Pick<ContractRow, "included_hours" | "usage">): number {
  const included = Number(contract.included_hours ?? 0);
  if (included <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Number(contract.usage?.hours_used ?? 0) / included) * 100)));
}

export function bundleUsagePct(contract: Pick<ContractRow, "bundle_hours" | "bundle_consumed">): number {
  const total = Number(contract.bundle_hours ?? 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Number(contract.bundle_consumed ?? 0) / total) * 100)));
}

export function complianceTone(pct: number | null | undefined): Tone {
  if (pct === null || pct === undefined) return "muted";
  if (pct >= 95) return "good";
  if (pct >= 85) return "warn";
  return "danger";
}

export function feeCopy(
  contract: Pick<ContractRow, "kind" | "monthly_fee" | "currency" | "included_hours" | "bundle_hours">,
): string {
  if (contract.kind === "retainer" && Number(contract.monthly_fee) > 0) {
    return `${formatMoney(contract.monthly_fee, contract.currency)}/mo · ${Number(contract.included_hours)} h included`;
  }
  if (contract.kind === "prepaid_bundle") {
    return `${Number(contract.bundle_hours)} h prepaid`;
  }
  return contract.kind === "sla_tier" ? "SLA cover" : "Framework terms";
}
