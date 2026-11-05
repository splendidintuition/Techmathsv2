/**
 * Portal v2 — "Control" data layer.
 *
 * Every read and write in the R2 console goes through a security-definer RPC in
 * `supabase/migrations/20261104120000_portal_v2_control.sql`. Nothing here talks
 * to a table directly except the read-only list helpers, so the permission model
 * is enforced by PostgreSQL rather than by whether a button is rendered.
 */
import { supabase } from "@/lib/supabase-browser";

export type AppRole = "admin" | "staff" | "freelancer" | "client";
export type Availability = "offline" | "available" | "busy";
export type ScopeType = "country" | "client" | "site" | "team";
export type AssetKind = "site" | "room" | "row" | "rack" | "device";
export type AssetStatus = "planned" | "in_service" | "maintenance" | "decommissioned" | "retired";
export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";
export type BulkAction = "priority" | "status" | "assign" | "tag" | "close";

/** Error carrying the SQLSTATE-derived code so callers can branch on intent. */
export class PortalV2Error extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PortalV2Error";
    this.code = code;
  }
}

const ERROR_COPY: Record<string, string> = {
  not_authorized: "Your account does not have permission for that action.",
  not_authenticated: "Your session has expired. Sign in again.",
  last_admin_protected: "This is the last active Admin. Promote another Admin first.",
  cannot_change_own_role: "You cannot change your own role.",
  cannot_suspend_self: "You cannot suspend your own account.",
  unknown_permission: "That permission key is not in the registry.",
  user_not_found: "That person no longer exists.",
  site_required: "Choose a site first.",
  site_not_found: "That site no longer exists.",
  asset_not_found: "That asset no longer exists.",
  asset_access_denied: "You cannot reach that asset.",
  asset_name_required: "Give the asset a name.",
  organization_scope_denied: "That client is outside your access scope.",
  template_not_found: "That template is not available.",
  plan_not_found: "That recurring plan no longer exists.",
  plan_title_required: "Give the plan a title.",
  invalid_window: "The end time must be after the start time.",
  invalid_weekday: "Pick a valid weekday.",
  invalid_availability: "Availability must be offline, available or busy.",
  ticket_access_denied: "You cannot reach that ticket.",
  unknown_bulk_action: "That bulk action is not supported.",
  client_name_required: "Give the client a name.",
  client_not_found: "That client no longer exists.",
  site_name_required: "Give the site a name.",
  site_address_required: "A site needs a street address.",
  organization_required: "Choose the client this site belongs to.",
  invalid_geofence: "The geofence must be between 25 and 2000 metres.",
  invalid_email: "That billing email does not look right.",
  invalid_rate: "A pay rate cannot be negative.",
  invalid_currency: "Use a three-letter currency code, for example EUR.",
  invalid_verification: "Verification must be pending, approved, rejected or suspended.",
  supabase_not_configured: "The portal is not connected to its database. Check the deployment environment.",
};

const CODE_BY_SQLSTATE: Record<string, string> = {
  "42501": "not_authorized",
  P0002: "not_found",
  "22023": "invalid_argument",
};

/** Turn a PostgREST/Supabase error into a PortalV2Error with readable copy. */
export function describeError(error: unknown): PortalV2Error {
  if (error instanceof PortalV2Error) return error;
  const raw = (error ?? {}) as { message?: string; code?: string; details?: string };
  const message = (raw.message ?? "").trim();
  if (ERROR_COPY[message]) return new PortalV2Error(message, ERROR_COPY[message]!);
  const mapped = raw.code ? CODE_BY_SQLSTATE[raw.code] : undefined;
  if (mapped && mapped !== "not_authorized") {
    return new PortalV2Error(mapped, message.replace(/_/g, " ") || ERROR_COPY[mapped]!);
  }
  if (mapped) return new PortalV2Error(mapped, ERROR_COPY[mapped]!);
  return new PortalV2Error(raw.code ?? "unknown_error", message || "Something went wrong. Try again.");
}

function requireClient() {
  if (!supabase) {
    return null;
  }
  return supabase;
}

/** Call a security-definer RPC, normalising errors. */
export async function callRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = requireClient();
  if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
  const { data, error } = await client.rpc(fn, args);
  if (error) throw describeError(error);
  return data as T;
}

/* ------------------------------------------------------------------ shapes */

export interface PermissionEntry {
  key: string;
  area: string;
  label: string;
  description: string;
  sensitive: boolean;
  sort_order: number;
}

export interface PortalUser {
  id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  locale: string;
  country_code: string | null;
  phone: string | null;
  created_at: string;
  availability: Availability | null;
  verification_status: string | null;
  hourly_rate: number | null;
  permissions: Record<string, boolean>;
  overrides: Record<string, boolean>;
  scopes: Array<{ type: ScopeType; value: string }>;
}

export interface ClientSite {
  id: string;
  name: string;
  address: string;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  is_demo: boolean;
  has_access_notes: boolean;
  assets: number;
}

export interface ClientRecord {
  id: string;
  name: string;
  type: string;
  billing_email: string | null;
  vat_number: string | null;
  country_code: string | null;
  is_demo: boolean;
  created_at: string;
  open_tickets: number;
  sites: ClientSite[];
}

export interface SiteAccess {
  site_id: string;
  site_name: string;
  instructions: string;
  updated_at: string | null;
}

export type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";

export interface EngineerRow {
  user_id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  skills: string[];
  countries: string[];
  currency: string;
  availability: Availability;
  verification_status: VerificationStatus;
  rating: number | null;
  has_profile: boolean;
  hourly_rate: number | null;
  open_tickets: number;
  hours_30d: number;
}

export interface AuditEntry {
  id: number;
  entity: string;
  entity_id: string | null;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

export interface PortalMetrics {
  generated_at: string;  tickets: {
    total: number;
    open: number;
    unassigned: number;
    sla_at_risk: number;
    sla_breached: number;
    critical_open: number;
    awaiting_approval: number;
    closed_30d: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
  };
  people: {
    engineers_total: number;
    engineers_available: number;
    engineers_on_duty: number;
    pending_verification: number;
  };
  time: { hours_this_month: number; pending_approval: number; approved_hours: number };
  assets: { total: number; devices: number; in_service: number; warranty_expiring_90d: number };
  schedule: { active_plans: number; plans_due: number; visits_today: number; visits_week: number };
  money: { hidden?: boolean; budget_open?: number; estimated_hours_open?: number };
}

export interface SearchHit {
  kind: "ticket" | "asset" | "site" | "person";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface CapacityDay {
  date: string;
  label: string;
  visits: number;
  unassigned: number;
  on_leave: number;
}

export interface AssetRow {
  id: string;
  organization_id: string;
  site_id: string;
  parent_id: string | null;
  kind: AssetKind;
  name: string;
  status: AssetStatus;
  room: string | null;
  row_label: string | null;
  rack_label: string | null;
  u_position: number | null;
  u_height: number;
  model: string | null;
  serial_number: string | null;
  vendor: string | null;
  asset_tag: string | null;
  warranty_expires_at: string | null;
  power_draw_w: number | null;
  notes: string;
  is_demo: boolean;
}

export interface RecurringPlan {
  id: string;
  organization_id: string;
  site_id: string;
  template_id: string | null;
  title: string;
  category: string;
  priority: string;
  cadence: Cadence;
  interval_count: number;
  next_run_at: string;
  end_at: string | null;
  is_active: boolean;
  is_demo: boolean;
}

export interface TicketTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  checklist: string[];
  estimated_hours: number | null;
  sla_hours: number | null;
  is_active: boolean;
  is_demo: boolean;
}

export interface BulkTicketRow {
  id: string;
  ticket_number: number;
  title: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  client_org_id: string;
  scheduled_for: string | null;
  sla_due_at: string | null;
  tags: string[];
}

/* ------------------------------------------------------- pure formatting */

export const PERMISSION_AREA_ORDER = [
  "Tickets",
  "Dispatch",
  "Clients",
  "People",
  "Time",
  "Finance",
  "Assets",
  "Schedule",
  "Live map",
  "Reports",
  "Settings",
] as const;

export const TICKET_STATUSES = [
  "new",
  "triaged",
  "offered",
  "assigned",
  "en_route",
  "on_site",
  "in_progress",
  "waiting_client",
  "waiting_parts",
  "completed_pending_approval",
  "approved",
  "closed",
  "cancelled",
  "rejected",
] as const;

export const TICKET_PRIORITIES = ["low", "normal", "high", "critical"] as const;

/** Group the permission registry into ordered areas for the admin matrix. */
export function groupPermissions(entries: PermissionEntry[]): Array<{ area: string; items: PermissionEntry[] }> {
  const buckets = new Map<string, PermissionEntry[]>();
  for (const entry of entries) {
    const list = buckets.get(entry.area) ?? [];
    list.push(entry);
    buckets.set(entry.area, list);
  }
  return [...buckets.entries()]
    .map(([area, items]) => ({
      area,
      items: [...items].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => {
      const ai = PERMISSION_AREA_ORDER.indexOf(a.area as (typeof PERMISSION_AREA_ORDER)[number]);
      const bi = PERMISSION_AREA_ORDER.indexOf(b.area as (typeof PERMISSION_AREA_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

/** Human label for an enum-ish token: `waiting_parts` → `Waiting parts`. */
export function humanise(token: string): string {
  const cleaned = token.replace(/_/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export type Tone = "accent" | "warn" | "danger" | "muted" | "good";

/** Status pill colour, kept in one place so tables and boards agree. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "closed":
    case "approved":
      return "good";
    case "cancelled":
    case "rejected":
      return "muted";
    case "completed_pending_approval":
    case "waiting_parts":
    case "waiting_client":
      return "warn";
    case "critical":
      return "danger";
    case "in_progress":
    case "on_site":
    case "en_route":
      return "accent";
    default:
      return "muted";
  }
}

/** Minutes → `4h 30m`. Nullish and negative input collapse to `0m`. */
export function formatMinutes(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(minutes ?? 0)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** Hours from a numeric minute sum, one decimal. */
export function hoursFromMinutes(minutes: number | null | undefined): number {
  return Math.round((Number(minutes ?? 0) / 60) * 10) / 10;
}

/** Relative SLA wording: `2d overdue`, `in 3h`, or `no SLA`. */
export function slaLabel(dueAt: string | null | undefined, now: number = Date.now()): string {
  if (!dueAt) return "no SLA";
  const target = new Date(dueAt).getTime();
  if (Number.isNaN(target)) return "no SLA";
  const diff = target - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor(abs / 3_600_000);
  const label = days >= 1 ? `${days}d` : hours >= 1 ? `${hours}h` : `${Math.max(1, Math.floor(abs / 60_000))}m`;
  return diff < 0 ? `${label} overdue` : `in ${label}`;
}

/** Shape a metric snapshot into display cells, respecting hidden finance data. */
export function metricCells(metrics: PortalMetrics | null): Array<{ key: string; label: string; value: string; hint: string; tone: Tone }> {
  if (!metrics) return [];
  return [
    {
      key: "open",
      label: "Open tickets",
      value: String(metrics.tickets.open),
      hint: `${metrics.tickets.unassigned} unassigned`,
      tone: metrics.tickets.unassigned > 0 ? "warn" : "accent",
    },
    {
      key: "sla",
      label: "SLA at risk",
      value: String(metrics.tickets.sla_at_risk),
      hint: `${metrics.tickets.sla_breached} breached`,
      tone: metrics.tickets.sla_breached > 0 ? "danger" : metrics.tickets.sla_at_risk > 0 ? "warn" : "good",
    },
    {
      key: "critical",
      label: "Critical open",
      value: String(metrics.tickets.critical_open),
      hint: `${metrics.tickets.awaiting_approval} awaiting sign-off`,
      tone: metrics.tickets.critical_open > 0 ? "danger" : "good",
    },
    {
      key: "engineers",
      label: "Engineers on duty",
      value: String(metrics.people.engineers_on_duty),
      hint: `${metrics.people.engineers_available} available · ${metrics.people.engineers_total} total`,
      tone: "accent",
    },
    {
      key: "hours",
      label: "Hours pending approval",
      value: String(metrics.time.pending_approval),
      hint: `${metrics.time.hours_this_month}h logged this month`,
      tone: metrics.time.pending_approval > 0 ? "warn" : "muted",
    },
    {
      key: "visits",
      label: "Visits today",
      value: String(metrics.schedule.visits_today),
      hint: `${metrics.schedule.visits_week} in the next 7 days`,
      tone: "accent",
    },
    {
      key: "assets",
      label: "Assets in service",
      value: String(metrics.assets.in_service),
      hint: `${metrics.assets.devices} devices · ${metrics.assets.warranty_expiring_90d} warranties expiring`,
      tone: metrics.assets.warranty_expiring_90d > 0 ? "warn" : "muted",
    },
    {
      key: "plans",
      label: "Recurring plans due",
      value: String(metrics.schedule.plans_due),
      hint: `${metrics.schedule.active_plans} active plans`,
      tone: metrics.schedule.plans_due > 0 ? "warn" : "good",
    },
  ];
}

/** Only the permission keys the signed-in user actually holds. */
export function heldPermissions(permissions: string[] | null | undefined): Set<string> {
  return new Set(Array.isArray(permissions) ? permissions : []);
}

/** Tab visibility derived from permissions, never from a hardcoded role name. */
export function availableTabs(permissions: Set<string>): string[] {
  const tabs = ["overview"];
  if (permissions.has("tickets.edit") || permissions.has("tickets.assign") || permissions.has("tickets.status")) {
    tabs.push("tickets");
  }
  if (permissions.has("schedule.view") || permissions.has("schedule.recurring")) tabs.push("schedule");
  if (permissions.has("assets.view")) tabs.push("assets");
  if (permissions.has("people.view") || permissions.has("settings.users")) tabs.push("people");
  if (permissions.has("clients.view") || permissions.has("clients.edit")) tabs.push("clients");
  if (permissions.has("settings.templates")) tabs.push("templates");
  if (permissions.has("audit.view")) tabs.push("audit");
  return tabs;
}

/* ------------------------------------------------- R4 read-model helpers */

/** Pay rates are only rendered when the caller holds people.pay_rates. */
export function displayRate(rate: number | null | undefined, visible: boolean, currency = "EUR"): string {
  if (!visible) return "hidden";
  if (rate === null || rate === undefined || !Number.isFinite(Number(rate))) return "not set";
  return `${Number(rate).toFixed(2)} ${currency}/h`;
}

/** One-line site subtitle: address, country and geofence, nothing sensitive. */
export function siteSubtitle(site: Pick<ClientSite, "address" | "country_code" | "geofence_radius_m">): string {
  const parts = [site.address?.trim()].filter(Boolean) as string[];
  if (site.country_code) parts.push(site.country_code.toUpperCase());
  parts.push(`${site.geofence_radius_m} m geofence`);
  return parts.join(" · ");
}

/** Coverage summary used in the client list header and empty states. */
export function coverageSummary(clients: ClientRecord[]): {
  clients: number;
  sites: number;
  withAccess: number;
  tickets: number;
} {
  return clients.reduce(
    (acc, client) => {
      acc.clients += 1;
      acc.sites += client.sites.length;
      acc.withAccess += client.sites.filter((site) => site.has_access_notes).length;
      acc.tickets += client.open_tickets;
      return acc;
    },
    { clients: 0, sites: 0, withAccess: 0, tickets: 0 },
  );
}

/** RFC 4180-safe CSV. Embedded quotes are doubled; values with , " or newline are quoted. */
export function csvFromRows(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(cell).join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n");
}

/** Audit rows say what happened in plain words; the raw action string stays available. */
export function auditHeadline(entry: Pick<AuditEntry, "entity" | "action">): string {
  const entity = entry.entity.replace(/_/g, " ");
  const action = entry.action.split(".").pop() ?? entry.action;
  return `${entity} → ${action.replace(/_/g, " ")}`;
}

/** Verification tone for the engineer directory. */
export function verificationTone(status: string): Tone {
  switch (status) {
    case "approved":
      return "good";
    case "pending":
      return "warn";
    case "rejected":
    case "suspended":
      return "danger";
    default:
      return "muted";
  }
}

/** Point-in-time occupancy of a rack: devices grouped by U slot, highest first. */
export function rackLayout(rows: AssetRow[]): Array<{ u: number; devices: AssetRow[] }> {
  const slots = new Map<number, AssetRow[]>();
  for (const row of rows) {
    if (row.kind !== "device") continue;
    const top = row.u_position ?? 0;
    for (let offset = 0; offset < Math.max(1, row.u_height); offset += 1) {
      const u = top - offset;
      if (u < 1) continue;
      const list = slots.get(u) ?? [];
      list.push(row);
      slots.set(u, list);
    }
  }
  return [...slots.entries()].sort((a, b) => b[0] - a[0]).map(([u, devices]) => ({ u, devices }));
}

/** Free-vs-used unit count for a rack of `rackUnits` U. */
export function rackOccupancy(rows: AssetRow[], rackUnits = 42): { used: number; free: number; percent: number } {
  const used = new Set<number>();
  for (const row of rows) {
    if (row.kind !== "device") continue;
    const top = row.u_position ?? 0;
    for (let offset = 0; offset < Math.max(1, row.u_height); offset += 1) {
      const u = top - offset;
      if (u >= 1 && u <= rackUnits) used.add(u);
    }
  }
  const total = Math.max(1, rackUnits);
  return { used: used.size, free: total - used.size, percent: Math.round((used.size / total) * 100) };
}

/** Upcoming warranty expiries within `days`, newest first. */
export function expiringWarranties(rows: AssetRow[], days = 90, now: number = Date.now()): AssetRow[] {
  const horizon = now + days * 86_400_000;
  return rows
    .filter((row) => {
      if (!row.warranty_expires_at) return false;
      const at = new Date(row.warranty_expires_at).getTime();
      return Number.isFinite(at) && at <= horizon;
    })
    .sort((a, b) => String(a.warranty_expires_at).localeCompare(String(b.warranty_expires_at)));
}

/* ------------------------------------------------------------ RPC surface */

export const controlApi = {
  async permissionRegistry(): Promise<PermissionEntry[]> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { data, error } = await client
      .from("permission_registry")
      .select("key, area, label, description, sensitive, sort_order")
      .order("sort_order");
    if (error) throw describeError(error);
    return (data ?? []) as PermissionEntry[];
  },

  currentPermissions: () => callRpc<string[]>("current_permissions"),
  metrics: () => callRpc<PortalMetrics>("portal_metrics"),
  search: (query: string) => callRpc<SearchHit[]>("portal_search", { p_query: query }),
  capacity: (days = 7) => callRpc<CapacityDay[]>("portal_capacity", { p_days: days }),
  listUsers: () => callRpc<PortalUser[]>("portal_list_users"),
  setRole: (userId: string, role: AppRole) =>
    callRpc<AppRole>("portal_set_role", { p_user_id: userId, p_role: role }),
  setPermission: (userId: string, permission: string, granted: boolean, clear = false) =>
    callRpc<null>("portal_set_permission", {
      p_user_id: userId,
      p_permission: permission,
      p_granted: granted,
      p_clear_override: clear,
    }),
  setScope: (userId: string, type: ScopeType, value: string, enabled = true) =>
    callRpc<null>("portal_set_scope", {
      p_user_id: userId,
      p_scope_type: type,
      p_scope_value: value,
      p_enabled: enabled,
    }),
  setUserActive: (userId: string, active: boolean) =>
    callRpc<boolean>("portal_set_user_active", { p_user_id: userId, p_active: active }),
  bulkUpdate: (ids: string[], action: BulkAction, value?: string | null) =>
    callRpc<number>("bulk_update_tickets", { p_ticket_ids: ids, p_action: action, p_value: value ?? null }),
  createFromTemplate: (args: {
    templateId: string;
    siteId: string;
    clientOrgId: string;
    title?: string | null;
    scheduledFor?: string | null;
    priority?: string | null;
  }) =>
    callRpc<string>("create_ticket_from_template", {
      p_template_id: args.templateId,
      p_site_id: args.siteId,
      p_client_org_id: args.clientOrgId,
      p_title: args.title ?? null,
      p_scheduled_for: args.scheduledFor ?? null,
      p_priority: args.priority ?? null,
    }),
  setCrew: (ticketId: string, engineerId: string, crewRole: "lead" | "helper") =>
    callRpc<null>("set_ticket_crew", {
      p_ticket_id: ticketId,
      p_engineer_id: engineerId,
      p_crew_role: crewRole,
    }),
  saveAsset: (payload: Record<string, unknown>) => callRpc<string>("save_asset", payload),
  deleteAsset: (id: string) => callRpc<boolean>("delete_asset", { p_id: id }),
  savePlan: (payload: Record<string, unknown>) => callRpc<string>("save_recurring_plan", payload),
  deletePlan: (id: string) => callRpc<boolean>("delete_recurring_plan", { p_id: id }),
  runPlans: (limit = 5) => callRpc<number>("run_recurring_plans", { p_limit: limit }),
  setAvailability: (status: Availability) =>
    callRpc<Availability>("set_engineer_availability", { p_status: status }),
  seedDemo: () => callRpc<{ organization: string; site: string; tickets: number }>("portal_seed_demo"),
  purgeDemo: () => callRpc<number>("portal_purge_demo"),

  /* R4 — clients, sites, engineer profiles, audit log */
  listClients: () =>
    callRpc<{ clients: ClientRecord[]; generated_at: string }>("portal_list_clients").then((payload) => payload.clients ?? []),
  saveClient: (args: {
    id?: string | null;
    name: string;
    billingEmail?: string | null;
    vatNumber?: string | null;
    countryCode?: string | null;
  }) =>
    callRpc<string>("portal_save_client", {
      p_id: args.id ?? null,
      p_name: args.name,
      p_billing_email: args.billingEmail ?? null,
      p_vat_number: args.vatNumber ?? null,
      p_country_code: args.countryCode ?? null,
    }),
  saveSite: (args: {
    id?: string | null;
    organizationId?: string | null;
    name: string;
    address: string;
    countryCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geofenceRadiusM?: number | null;
  }) =>
    callRpc<string>("portal_save_site", {
      p_id: args.id ?? null,
      p_organization_id: args.organizationId ?? null,
      p_name: args.name,
      p_address: args.address,
      p_country_code: args.countryCode ?? null,
      p_latitude: args.latitude ?? null,
      p_longitude: args.longitude ?? null,
      p_geofence_radius_m: args.geofenceRadiusM ?? 150,
    }),
  getSiteAccess: (siteId: string) => callRpc<SiteAccess>("portal_get_site_access", { p_site_id: siteId }),
  saveSiteAccess: (siteId: string, instructions: string) =>
    callRpc<boolean>("portal_save_site_access", { p_site_id: siteId, p_instructions: instructions }),
  listEngineers: () =>
    callRpc<{ engineers: EngineerRow[]; rates_visible: boolean }>("portal_list_engineers").then((payload) => ({
      engineers: payload.engineers ?? [],
      ratesVisible: Boolean(payload.rates_visible),
    })),
  saveEngineerProfile: (args: {
    userId: string;
    hourlyRate?: number | null;
    currency?: string | null;
    verificationStatus?: VerificationStatus | null;
    skills?: string[] | null;
    countries?: string[] | null;
  }) =>
    callRpc<boolean>("portal_save_engineer_profile", {
      p_user_id: args.userId,
      p_hourly_rate: args.hourlyRate ?? null,
      p_currency: args.currency ?? null,
      p_verification_status: args.verificationStatus ?? null,
      p_skills: args.skills ?? null,
      p_countries: args.countries ?? null,
    }),
  listAudit: (filter: { entity?: string; actor?: string | null; limit?: number } = {}) =>
    callRpc<{ entries: AuditEntry[]; limit: number }>("portal_list_audit", {
      p_entity: filter.entity && filter.entity.trim() ? filter.entity.trim() : null,
      p_actor: filter.actor ?? null,
      p_limit: filter.limit ?? 100,
    }).then((payload) => payload.entries ?? []),
};

/** Writes that are plain table operations, still gated by RLS policies. */
export const controlWrites = {
  async saveTemplate(payload: {
    name: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    checklist: string[];
    estimated_hours: number | null;
    sla_hours: number | null;
  }): Promise<void> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { error } = await client.from("ticket_templates").insert({
      name: payload.name.trim(),
      category: payload.category.trim() || "general",
      priority: payload.priority,
      title: payload.title.trim() || payload.name.trim(),
      description: payload.description.trim(),
      checklist: payload.checklist,
      estimated_hours: payload.estimated_hours,
      sla_hours: payload.sla_hours,
      is_active: true,
    });
    if (error) throw describeError(error);
  },
};

/** Read-only table helpers for views RPCs don't cover (RLS still applies). */
export const controlReads = {
  async assets(): Promise<AssetRow[]> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { data, error } = await client
      .from("assets")
      .select(
        "id, organization_id, site_id, parent_id, kind, name, status, room, row_label, rack_label, u_position, u_height, model, serial_number, vendor, asset_tag, warranty_expires_at, power_draw_w, notes, is_demo",
      )
      .order("kind")
      .order("name");
    if (error) throw describeError(error);
    return (data ?? []) as AssetRow[];
  },

  async plans(): Promise<RecurringPlan[]> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { data, error } = await client
      .from("recurring_plans")
      .select(
        "id, organization_id, site_id, template_id, title, category, priority, cadence, interval_count, next_run_at, end_at, is_active, is_demo",
      )
      .order("next_run_at");
    if (error) throw describeError(error);
    return (data ?? []) as RecurringPlan[];
  },

  async templates(): Promise<TicketTemplate[]> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { data, error } = await client
      .from("ticket_templates")
      .select(
        "id, organization_id, name, category, priority, title, description, checklist, estimated_hours, sla_hours, is_active, is_demo",
      )
      .order("name");
    if (error) throw describeError(error);
    return (data ?? []) as TicketTemplate[];
  },

  async tickets(): Promise<BulkTicketRow[]> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { data, error } = await client
      .from("tickets")
      .select("id, ticket_number, title, status, priority, assigned_to, client_org_id, scheduled_for, sla_due_at, tags")
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw describeError(error);
    return (data ?? []) as BulkTicketRow[];
  },

  async sites(): Promise<Array<{ id: string; name: string; organization_id: string; address: string }>> {
    const client = requireClient();
    if (!client) throw new PortalV2Error("supabase_not_configured", ERROR_COPY.supabase_not_configured!);
    const { data, error } = await client.from("sites").select("id, name, organization_id, address").order("name");
    if (error) throw describeError(error);
    return (data ?? []) as Array<{ id: string; name: string; organization_id: string; address: string }>;
  },
};
