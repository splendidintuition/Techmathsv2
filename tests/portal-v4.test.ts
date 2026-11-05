import { describe, expect, it } from "vitest";
import {
  auditHeadline,
  availableTabs,
  coverageSummary,
  csvFromRows,
  displayRate,
  heldPermissions,
  siteSubtitle,
  verificationTone,
  type AuditEntry,
  type ClientRecord,
} from "@/lib/portal-v2";

const client = (overrides: Partial<ClientRecord> = {}): ClientRecord => ({
  id: "c1",
  name: "Northwind",
  type: "client",
  billing_email: "ap@northwind.example",
  vat_number: "PT000000000",
  country_code: "PT",
  is_demo: false,
  created_at: "2026-11-04T00:00:00.000Z",
  open_tickets: 3,
  sites: [
    {
      id: "s1",
      name: "Lisbon DC1",
      address: "Rua A 1, Lisbon",
      country_code: "PT",
      latitude: 38.72,
      longitude: -9.14,
      geofence_radius_m: 150,
      is_demo: false,
      has_access_notes: true,
      assets: 4,
    },
    {
      id: "s2",
      name: "Madrid DC2",
      address: "Calle B 2, Madrid",
      country_code: "ES",
      latitude: null,
      longitude: null,
      geofence_radius_m: 200,
      is_demo: false,
      has_access_notes: false,
      assets: 0,
    },
  ],
  ...overrides,
});

describe("R4 clients and sites", () => {
  it("counts clients, sites, access coverage and open tickets", () => {
    const summary = coverageSummary([client(), client({ id: "c2", name: "Second", open_tickets: 1, sites: [] })]);
    expect(summary.clients).toBe(2);
    expect(summary.sites).toBe(2);
    expect(summary.withAccess).toBe(1);
    expect(summary.tickets).toBe(4);
  });

  it("returns a zeroed summary for an empty list", () => {
    expect(coverageSummary([])).toEqual({ clients: 0, sites: 0, withAccess: 0, tickets: 0 });
  });

  it("describes a site without leaking anything sensitive", () => {
    expect(siteSubtitle(client().sites[0]!)).toBe("Rua A 1, Lisbon · PT · 150 m geofence");
    expect(siteSubtitle({ address: "  ", country_code: null, geofence_radius_m: 25 })).toBe("25 m geofence");
  });

  it("hides pay rates unless the account holds people.pay_rates", () => {
    expect(displayRate(35, false)).toBe("hidden");
    expect(displayRate(null, false)).toBe("hidden");
    expect(displayRate(35, true, "EUR")).toBe("35.00 EUR/h");
    expect(displayRate(null, true)).toBe("not set");
    expect(displayRate(undefined, true)).toBe("not set");
  });

  it("maps verification status to a tone", () => {
    expect(verificationTone("approved")).toBe("good");
    expect(verificationTone("pending")).toBe("warn");
    expect(verificationTone("rejected")).toBe("danger");
    expect(verificationTone("suspended")).toBe("danger");
    expect(verificationTone("something-else")).toBe("muted");
  });
});

describe("R4 audit log helpers", () => {
  it("writes RFC 4180 CSV with quoted separators and doubled quotes", () => {
    const csv = csvFromRows(
      ["Who", "What"],
      [
        ["Ana, Lisbon", 'saved "DC1"'],
        ["Bo", null],
      ],
    );
    expect(csv.split("\n")).toEqual(['Who,What', '"Ana, Lisbon","saved ""DC1"""', "Bo,"]);
  });

  it("escapes newlines so one row stays one line", () => {
    const csv = csvFromRows(["Note"], [["line one\nline two"]]);
    expect(csv).toBe('Note\n"line one\nline two"');
  });

  it("turns an action key into a readable headline", () => {
    const entry = { entity: "engineer_profile", action: "engineer.profile_saved" } as Pick<AuditEntry, "entity" | "action">;
    expect(auditHeadline(entry)).toBe("engineer profile → profile saved");
    expect(auditHeadline({ entity: "site_access", action: "site.access_updated" })).toBe("site access → access updated");
  });
});

describe("R4 tab gating", () => {
  it("shows the clients tab to anyone who can view or edit clients", () => {
    expect(availableTabs(heldPermissions(["clients.view"]))).toContain("clients");
    expect(availableTabs(heldPermissions(["clients.edit"]))).toContain("clients");
    expect(availableTabs(heldPermissions(["tickets.view"]))).not.toContain("clients");
  });

  it("shows the audit tab only with audit.view", () => {
    expect(availableTabs(heldPermissions(["audit.view"]))).toContain("audit");
    expect(availableTabs(heldPermissions(["settings.users", "clients.edit"]))).not.toContain("audit");
  });

  it("always keeps the overview first", () => {
    expect(availableTabs(heldPermissions([]))[0]).toBe("overview");
  });
});
