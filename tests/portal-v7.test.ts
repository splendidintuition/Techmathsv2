import { describe, expect, it } from "vitest";
import {
  bundleUsagePct,
  complianceTone,
  contractError,
  contractHeadline,
  contractStatusTone,
  daysBetween,
  expiringSoon,
  feeCopy,
  includedUsagePct,
  minutesCopy,
  windowCopy,
  type ContractRow,
} from "@/lib/portal-contracts";

const NOW = new Date("2026-11-05T12:00:00.000Z");

const contract = (overrides: Partial<ContractRow> = {}): ContractRow => ({
  id: "c1",
  organization_id: "o1",
  organization_name: "Northwind Colocation",
  kind: "sla_tier",
  status: "active",
  name: "Gold SLA",
  reference: "DEMO-SLA",
  currency: "EUR",
  starts_on: "2026-10-06",
  ends_on: "2027-10-06",
  response_minutes: 240,
  resolution_minutes: 1440,
  coverage: "24x7",
  monthly_fee: 0,
  included_hours: 0,
  bundle_hours: 0,
  bundle_consumed: 0,
  overage_rate: null,
  notes: "",
  is_demo: true,
  created_at: "2026-10-06T09:00:00.000Z",
  usage: {
    contract_id: "c1",
    kind: "sla_tier",
    status: "active",
    included_hours: 0,
    bundle_hours: 0,
    bundle_consumed: 0,
    hours_used: 0,
    included_remaining: 0,
    bundle_remaining: 0,
    overage_hours: 0,
    overage_value: 0,
    period_start: "2026-10-06T00:00:00.000Z",
    period_end: "2027-10-07T00:00:00.000Z",
    tickets: 2,
    sla_met: 2,
    sla_breached: 0,
    sla_at_risk: 0,
    sla_compliance_pct: 100,
  },
  ...overrides,
});

describe("R7 SLA targets in words", () => {
  it("renders minutes, hours and days the way a coordinator reads them", () => {
    expect(minutesCopy(30)).toBe("30 min");
    expect(minutesCopy(60)).toBe("1 h");
    expect(minutesCopy(240)).toBe("4 h");
    expect(minutesCopy(90)).toBe("1 h 30 min");
    expect(minutesCopy(1440)).toBe("1 d");
    expect(minutesCopy(1500)).toBe("1 d 1 h");
    expect(minutesCopy(null)).toBe("not set");
  });

  it("summarises a tier on one line", () => {
    expect(contractHeadline(contract())).toBe("24×7 cover · 4 h response · 1 d resolution");
    expect(contractHeadline(contract({ coverage: "business_hours", response_minutes: null }))).toBe(
      "Business hours · 1 d resolution",
    );
  });
});

describe("R7 contract windows", () => {
  it("counts whole days between a date and now", () => {
    expect(daysBetween("2026-11-05", NOW)).toBe(0);
    expect(daysBetween("2026-12-05", NOW)).toBe(30);
    expect(daysBetween("2026-10-05", NOW)).toBe(-31);
    expect(daysBetween(null, NOW)).toBeNull();
  });

  it("describes where the contract sits in time", () => {
    expect(windowCopy(contract({ ends_on: "2027-10-06" }), NOW)).toBe("335 days left");
    expect(windowCopy(contract({ ends_on: "2026-11-06" }), NOW)).toBe("1 day left");
    expect(windowCopy(contract({ ends_on: "2026-11-05" }), NOW)).toBe("Ends today");
    expect(windowCopy(contract({ ends_on: "2026-11-01" }), NOW)).toBe("Ended 4 days ago");
    expect(windowCopy(contract({ ends_on: null }), NOW)).toBe("Open ended");
    expect(windowCopy(contract({ starts_on: "2026-12-01" }), NOW)).toBe("Starts in 26 days");
    expect(windowCopy(contract({ status: "cancelled" }), NOW)).toBe("Cancelled");
  });

  it("flags renewals inside the thirty day window", () => {
    expect(expiringSoon(contract({ ends_on: "2026-11-25" }), 30, NOW)).toBe(true);
    expect(expiringSoon(contract({ ends_on: "2027-01-25" }), 30, NOW)).toBe(false);
    expect(expiringSoon(contract({ ends_on: "2026-11-25", status: "paused" }), 30, NOW)).toBe(false);
    expect(expiringSoon(contract({ ends_on: null }), 30, NOW)).toBe(false);
  });
});

describe("R7 usage bars", () => {
  it("never exceeds the bar when hours run over", () => {
    const retainer = contract({
      kind: "retainer",
      included_hours: 20,
      usage: { ...contract().usage, hours_used: 27 },
    });
    expect(includedUsagePct(retainer)).toBe(100);
  });

  it("computes the monthly draw-down", () => {
    const retainer = contract({ kind: "retainer", included_hours: 20, usage: { ...contract().usage, hours_used: 5 } });
    expect(includedUsagePct(retainer)).toBe(25);
    expect(includedUsagePct(contract({ included_hours: 0 }))).toBe(0);
  });

  it("computes bundle consumption", () => {
    const bundle = contract({ kind: "prepaid_bundle", bundle_hours: 40, bundle_consumed: 10 });
    expect(bundleUsagePct(bundle)).toBe(25);
    expect(bundleUsagePct(contract({ bundle_hours: 0 }))).toBe(0);
  });
});

describe("R7 contract tones and copy", () => {
  it("tones statuses", () => {
    expect(contractStatusTone("active")).toBe("good");
    expect(contractStatusTone("paused")).toBe("warn");
    expect(contractStatusTone("expired")).toBe("danger");
    expect(contractStatusTone("draft")).toBe("muted");
  });

  it("tones compliance bands", () => {
    expect(complianceTone(97)).toBe("good");
    expect(complianceTone(90)).toBe("warn");
    expect(complianceTone(70)).toBe("danger");
    expect(complianceTone(null)).toBe("muted");
  });

  it("describes the money in one line", () => {
    expect(feeCopy(contract({ kind: "retainer", monthly_fee: 1400, included_hours: 20 }))).toContain("1,400.00");
    expect(feeCopy(contract({ kind: "retainer", monthly_fee: 1400, included_hours: 20 }))).toContain("20 h included");
    expect(feeCopy(contract({ kind: "prepaid_bundle", bundle_hours: 40 }))).toBe("40 h prepaid");
    expect(feeCopy(contract({ kind: "sla_tier" }))).toBe("SLA cover");
  });

  it("explains the contract errors a coordinator will hit", () => {
    expect(contractError({ message: "sla_tier_already_active" }).message).toMatch(/already has an active SLA/);
    expect(contractError({ message: "bundle_exhausted" }).message).toMatch(/past its purchased hours/);
    expect(contractError({ message: "not_authorized" }).message).toMatch(/permission/i);
  });
});
