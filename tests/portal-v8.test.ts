import { describe, expect, it } from "vitest";
import {
  barWidth,
  bucketMax,
  compliancePct,
  exportName,
  financeCsv,
  hoursCopy,
  opsCsv,
  rangeFor,
  reportError,
  slaCsv,
  type FinanceReport,
  type OpsReport,
  type SlaReport,
} from "@/lib/portal-reports";

const NOW = new Date("2026-11-05T12:00:00.000Z");

describe("R8 report ranges", () => {
  it("returns inclusive windows for every preset", () => {
    expect(rangeFor("7d", NOW)).toEqual({ from: "2026-10-30", to: "2026-11-05" });
    expect(rangeFor("30d", NOW)).toEqual({ from: "2026-10-07", to: "2026-11-05" });
    expect(rangeFor("90d", NOW)).toEqual({ from: "2026-08-08", to: "2026-11-05" });
    expect(rangeFor("month", NOW)).toEqual({ from: "2026-11-01", to: "2026-11-05" });
    expect(rangeFor("quarter", NOW)).toEqual({ from: "2026-10-01", to: "2026-11-05" });
  });

  it("falls back to the thirty day window", () => {
    expect(rangeFor("30d", NOW).from).toBe("2026-10-07");
  });
});

describe("R8 derived metrics", () => {
  it("computes compliance, and refuses to invent it", () => {
    expect(compliancePct(9, 1)).toBe(90);
    expect(compliancePct(0, 0)).toBeNull();
    expect(compliancePct(2, 1)).toBe(66.7);
  });

  it("writes response times in the right unit", () => {
    expect(hoursCopy(null)).toBe("—");
    expect(hoursCopy(45)).toBe("45 min");
    expect(hoursCopy(240)).toBe("4 h");
    expect(hoursCopy(290)).toBe("4.8 h");
    expect(hoursCopy(1440)).toBe("24 h");
  });

  it("sizes bars against the biggest bucket", () => {
    expect(bucketMax([{ count: 3 }, { count: 9 }, { count: 5 }])).toBe(9);
    expect(bucketMax([{ invoiced: 120 }, { invoiced: 80 }])).toBe(120);
    expect(bucketMax([])).toBe(0);
    expect(barWidth(9, 9)).toBe(100);
    expect(barWidth(0, 9)).toBe(2);
    expect(barWidth(5, 0)).toBe(0);
  });

  it("names exports after the report and the window", () => {
    expect(exportName("finance", { from: "2026-08-01", to: "2026-10-31" })).toBe(
      "finance-2026-08-01-2026-10-31.csv",
    );
  });
});

const ops: OpsReport = {
  range: { from: "2026-10-07", to: "2026-11-05" },
  summary: {
    created: 12,
    closed: 9,
    open_now: 3,
    unassigned_now: 1,
    sla_tracked: 8,
    sla_met: 7,
    sla_breached: 1,
    sla_at_risk: 0,
    avg_response_minutes: 96,
    avg_close_hours: 26.5,
    logged_hours: 41.25,
  },
  by_status: [{ key: "closed", count: 9 }],
  by_priority: [{ key: "normal", count: 10 }],
  by_category: [{ key: "rack_and_stack", count: 4 }],
  by_country: [{ key: "PT", count: 7 }],
  by_client: [
    { organization_id: "o1", name: "Northwind", created: 12, closed: 9, open_now: 3, sla_breached: 1 },
  ],
  daily: [
    { day: "2026-10-07", created: 2, closed: 1 },
    { day: "2026-10-08", created: 0, closed: 3 },
  ],
  engineers: [{ engineer_id: "e1", name: "Rui", assigned: 5, closed: 4, hours: 18.5, rating: 4.6 }],
};

const finance: FinanceReport = {
  range: { from: "2026-08-01", to: "2026-10-31" },
  summary: {
    invoiced_net: 1156,
    invoiced_gross: 1421.88,
    vat_billed: 265.88,
    collected: 568.75,
    outstanding: 853.13,
    overdue: 0,
    expenses_net: 84.5,
    labour_cost: 320,
    margin: 751.5,
    margin_pct: 65,
  },
  by_client: [
    { organization_id: "o1", name: "Northwind", invoiced_net: 1156, expenses: 84.5, margin: 1071.5, margin_pct: 92.7 },
  ],
  by_country: [{ key: "PT", invoiced_gross: 1421.88, vat: 265.88 }],
  by_month: [{ key: "2026-11", invoiced: 1156, collected: 568.75 }],
  aging: [{ bucket: "current", count: 1, amount: 853.13 }],
  debtors: [{ name: "Northwind", amount: 853.13, oldest_due: "2026-11-15" }],
};

const sla: SlaReport = {
  range: { from: "2026-10-07", to: "2026-11-05" },
  rows: [
    {
      organization_id: "o1",
      organization_name: "Northwind",
      contract_name: "Gold SLA",
      kind: "sla_tier",
      coverage: "24x7",
      response_minutes: 240,
      tickets: 8,
      met: 7,
      breached: 1,
      at_risk: 0,
      avg_response_minutes: 96,
      compliance_pct: 87.5,
    },
  ],
};

describe("R8 exports", () => {
  it("serialises the operations report with summary, days and clients", () => {
    const csv = opsCsv(ops);
    expect(csv).toContain("Tickets created,12");
    expect(csv).toContain("2026-10-07,2,1");
    expect(csv).toContain("Northwind,12,9,3,1");
  });

  it("serialises the finance report with aging and months", () => {
    const csv = financeCsv(finance);
    expect(csv).toContain("Invoiced net,1156");
    expect(csv).toContain("Margin %,65");
    expect(csv).toContain("current,1,853.13");
    expect(csv).toContain("2026-11,1156,568.75");
  });

  it("serialises the SLA report one row per client", () => {
    const csv = slaCsv(sla);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Client,Contract,Coverage,Response target (min),Tickets,Met,Breached,At risk,Compliance %,Avg response (min)",
    );
    expect(lines[1]).toBe("Northwind,Gold SLA,24x7,240,8,7,1,0,87.5,96");
  });

  it("explains a reversed date range", () => {
    expect(reportError({ message: "invalid_date_range" }).message).toMatch(/end date/i);
    expect(reportError({ message: "not_authorized" }).message).toMatch(/permission/i);
  });
});
