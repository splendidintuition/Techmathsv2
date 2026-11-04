import { describe, expect, it } from "vitest";
import {
  availableTabs,
  describeError,
  expiringWarranties,
  formatMinutes,
  groupPermissions,
  heldPermissions,
  hoursFromMinutes,
  humanise,
  metricCells,
  PortalV2Error,
  rackLayout,
  rackOccupancy,
  slaLabel,
  statusTone,
  type AssetRow,
  type PermissionEntry,
  type PortalMetrics,
} from "@/lib/portal-v2";

const entry = (key: string, area: string, sort: number, sensitive = false): PermissionEntry => ({
  key,
  area,
  label: key,
  description: "",
  sensitive,
  sort_order: sort,
});

function asset(partial: Partial<AssetRow>): AssetRow {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    organization_id: "org",
    site_id: "site",
    parent_id: partial.parent_id ?? null,
    kind: partial.kind ?? "device",
    name: partial.name ?? "device",
    status: partial.status ?? "in_service",
    room: null,
    row_label: null,
    rack_label: null,
    u_position: partial.u_position ?? null,
    u_height: partial.u_height ?? 1,
    model: null,
    serial_number: null,
    vendor: null,
    asset_tag: null,
    warranty_expires_at: partial.warranty_expires_at ?? null,
    power_draw_w: null,
    notes: "",
    is_demo: false,
  };
}

const metrics: PortalMetrics = {
  generated_at: "2026-11-04T10:00:00.000Z",
  tickets: {
    total: 10,
    open: 6,
    unassigned: 2,
    sla_at_risk: 1,
    sla_breached: 0,
    critical_open: 0,
    awaiting_approval: 3,
    closed_30d: 4,
    by_status: { new: 3, assigned: 3 },
    by_priority: { high: 2 },
  },
  people: { engineers_total: 5, engineers_available: 2, engineers_on_duty: 1, pending_verification: 1 },
  time: { hours_this_month: 42.5, pending_approval: 4, approved_hours: 100 },
  assets: { total: 20, devices: 15, in_service: 18, warranty_expiring_90d: 2 },
  schedule: { active_plans: 3, plans_due: 1, visits_today: 2, visits_week: 7 },
  money: { hidden: true },
};

describe("permission grouping", () => {
  it("orders areas by the plan's §14 sequence", () => {
    const grouped = groupPermissions([
      entry("settings.users", "Settings", 112),
      entry("tickets.view", "Tickets", 10),
      entry("finance.margins", "Finance", 63),
    ]);
    expect(grouped.map((group) => group.area)).toEqual(["Tickets", "Finance", "Settings"]);
  });

  it("sorts inside an area by sort_order", () => {
    const grouped = groupPermissions([entry("tickets.edit", "Tickets", 12), entry("tickets.view", "Tickets", 10)]);
    expect(grouped[0]!.items.map((item) => item.key)).toEqual(["tickets.view", "tickets.edit"]);
  });

  it("keeps unknown areas at the end instead of dropping them", () => {
    const grouped = groupPermissions([entry("x.y", "Warehouse", 1), entry("tickets.view", "Tickets", 10)]);
    expect(grouped.map((group) => group.area)).toEqual(["Tickets", "Warehouse"]);
  });
});

describe("tab visibility", () => {
  it("always exposes the control room and hides what the user cannot use", () => {
    expect(availableTabs(heldPermissions([]))).toEqual(["overview"]);
  });

  it("reveals a tab only when a matching permission is held", () => {
    const tabs = availableTabs(heldPermissions(["assets.view", "settings.users", "tickets.status"]));
    expect(tabs).toContain("assets");
    expect(tabs).toContain("people");
    expect(tabs).toContain("tickets");
    expect(tabs).not.toContain("templates");
    expect(tabs).not.toContain("schedule");
  });
});

describe("formatting", () => {
  it("formats minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(150)).toBe("2h 30m");
    expect(formatMinutes(-5)).toBe("0m");
  });

  it("converts minutes to hours with one decimal", () => {
    expect(hoursFromMinutes(90)).toBe(1.5);
    expect(hoursFromMinutes(null)).toBe(0);
  });

  it("humanises enum tokens", () => {
    expect(humanise("waiting_parts")).toBe("Waiting parts");
    expect(humanise("")).toBe("");
  });
});

describe("status tone", () => {
  it("maps operational statuses to pill tones", () => {
    expect(statusTone("closed")).toBe("good");
    expect(statusTone("waiting_client")).toBe("warn");
    expect(statusTone("critical")).toBe("danger");
    expect(statusTone("in_progress")).toBe("accent");
    expect(statusTone("something_unknown")).toBe("muted");
  });
});

describe("SLA wording", () => {
  const now = Date.parse("2026-11-04T10:00:00.000Z");

  it("describes future and overdue targets", () => {
    expect(slaLabel(null, now)).toBe("no SLA");
    expect(slaLabel("2026-11-04T13:00:00.000Z", now)).toBe("in 3h");
    expect(slaLabel("2026-11-06T10:00:00.000Z", now)).toBe("in 2d");
    expect(slaLabel("2026-11-03T10:00:00.000Z", now)).toBe("1d overdue");
  });
});

describe("metric cells", () => {
  it("returns nothing without a snapshot", () => {
    expect(metricCells(null)).toEqual([]);
  });

  it("escalates tone when work is unassigned or breached", () => {
    const cells = metricCells(metrics);
    expect(cells.find((cell) => cell.key === "open")?.tone).toBe("warn");
    expect(cells.find((cell) => cell.key === "sla")?.tone).toBe("warn");
    expect(cells.find((cell) => cell.key === "critical")?.tone).toBe("good");
    expect(cells).toHaveLength(8);
  });
});

describe("rack geometry", () => {
  const rows = [
    asset({ id: "a", u_position: 42, u_height: 1, name: "switch" }),
    asset({ id: "b", u_position: 32, u_height: 2, name: "node" }),
    asset({ id: "rack", kind: "rack", u_position: null }),
  ];

  it("expands multi-U devices across every slot they occupy", () => {
    const layout = rackLayout(rows);
    // u_position marks the top of a device, so a 2U unit at U32 also occupies U31.
    expect(layout.map((slot) => slot.u)).toEqual([42, 32, 31]);
    expect(layout.find((slot) => slot.u === 31)?.devices[0]?.id).toBe("b");
  });

  it("counts used and free units without double counting", () => {
    expect(rackOccupancy(rows, 42)).toEqual({ used: 3, free: 39, percent: 7 });
  });

  it("never reports a negative free count", () => {
    const full = Array.from({ length: 42 }, (_, index) => asset({ u_position: index + 1 }));
    expect(rackOccupancy(full, 42).free).toBe(0);
  });
});

describe("warranty watchlist", () => {
  const now = Date.parse("2026-11-04T00:00:00.000Z");

  it("keeps only expiries inside the horizon, soonest first", () => {
    const rows = [
      asset({ id: "late", warranty_expires_at: "2027-06-01" }),
      asset({ id: "soon", warranty_expires_at: "2026-11-20" }),
      asset({ id: "never", warranty_expires_at: null }),
    ];
    expect(expiringWarranties(rows, 90, now).map((row) => row.id)).toEqual(["soon"]);
  });
});

describe("error copy", () => {
  it("translates known SQLSTATE messages into operator language", () => {
    expect(describeError({ message: "last_admin_protected" }).message).toContain("last active Admin");
    expect(describeError({ message: "not_authorized" }).code).toBe("not_authorized");
  });

  it("falls back to the raw message for unmapped failures", () => {
    const error = describeError({ message: "connection reset", code: "08006" });
    expect(error.message).toBe("connection reset");
    expect(error.code).toBe("08006");
  });

  it("passes an existing PortalV2Error through untouched", () => {
    const original = new PortalV2Error("custom", "boom");
    expect(describeError(original)).toBe(original);
  });
});
