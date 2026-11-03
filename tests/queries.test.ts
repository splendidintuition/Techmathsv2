import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolated database per test run so the suite never touches data/techmaths.db.
const tmpDb = path.join(os.tmpdir(), `tm-test-${process.pid}-${Date.now()}.db`);
process.env.TECHMATHS_DB = tmpDb;

// Imported after the env var is set: db.ts reads TECHMATHS_DB on first open.
const { getDb } = await import("@/lib/db");
const queries = await import("@/lib/queries");
const { seedContent } = await import("@/lib/seed");
const { SERVICES } = await import("@/lib/content/services");

beforeAll(() => {
  queries.ensureSeeded();
});

describe("seeding", () => {
  it("seeds the full service catalogue", () => {
    expect(queries.listServices()).toHaveLength(SERVICES.length);
    expect(queries.listServices().map((s) => s.slug)).toContain("rack-and-stack");
  });

  it("hydrates JSON columns into typed arrays", () => {
    const s = queries.getService("structured-cabling");
    expect(s).not.toBeNull();
    if (!s) return;
    expect(Array.isArray(s.included)).toBe(true);
    expect(s.included.length).toBeGreaterThan(3);
    expect(s.method[0]).toMatchObject({ title: expect.any(String), detail: expect.any(String) });
    expect(s.faqs[0]?.q).toBeTruthy();
    expect(s.kpis[0]?.value).toBeTruthy();
  });

  it("is idempotent — re-seeding does not duplicate rows", () => {
    const before = queries.listProjects().length;
    const result = seedContent(getDb());
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBeGreaterThan(0);
    expect(queries.listProjects()).toHaveLength(before);
  });

  it("returns null for an unknown slug rather than throwing", () => {
    expect(queries.getService("does-not-exist")).toBeNull();
    expect(queries.getProject("does-not-exist")).toBeNull();
    expect(queries.getInsight("does-not-exist")).toBeNull();
  });
});

describe("content queries", () => {
  it("orders services by position", () => {
    const positions = queries.listServices().map((s) => s.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("filters projects by service, industry and country", () => {
    const all = queries.listProjects();
    const cabling = queries.listProjects({ service: "structured-cabling" });
    expect(cabling.length).toBeGreaterThan(0);
    expect(cabling.length).toBeLessThan(all.length);
    expect(cabling.every((p) => p.services.includes("structured-cabling"))).toBe(true);

    const de = queries.listProjects({ country: "DE" });
    expect(de.every((p) => p.country === "DE")).toBe(true);

    const none = queries.listProjects({ service: "structured-cabling", country: "IN" });
    expect(none).toHaveLength(0);
  });

  it("exposes coverage with mobilisation times sorted fastest first", () => {
    const c = queries.listCoverage();
    expect(c.length).toBeGreaterThan(20);
    const hours = c.map((x) => x.mobiliseHours);
    expect(hours).toEqual([...hours].sort((a, b) => a - b));
    expect(c.some((x) => x.hq && x.code === "PT")).toBe(true);
  });

  it("lists insights newest first with parsed tags", () => {
    const list = queries.listInsights();
    expect(list.length).toBeGreaterThan(0);
    const dates = list.map((i) => i.publishedOn);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(list[0].tags.length).toBeGreaterThan(0);
  });

  it("filters insights by category and full-text query", () => {
    const cat = queries.listInsights({ category: "Structured cabling" });
    expect(cat.length).toBeGreaterThan(0);
    expect(cat.every((i) => i.category === "Structured cabling")).toBe(true);
    expect(queries.listInsights({ q: "blanking panel" }).length).toBeGreaterThan(0);
    expect(queries.listInsights({ q: "zzzzz-no-match" })).toHaveLength(0);
  });
});

describe("search", () => {
  it("finds services by keyword", () => {
    const hits = queries.search("fibre");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.href === "/services/structured-cabling")).toBe(true);
  });

  it("returns typed hits with valid hrefs", () => {
    for (const h of queries.search("commissioning")) {
      expect(["service", "project", "insight", "page"]).toContain(h.kind);
      expect(h.href.startsWith("/")).toBe(true);
      expect(h.title.length).toBeGreaterThan(0);
    }
  });

  it("ignores one-character queries", () => {
    expect(queries.search("a")).toHaveLength(0);
    expect(queries.search("")).toHaveLength(0);
  });
});

describe("leads", () => {
  it("creates a lead with a TM-<year>-<code> reference", () => {
    const lead = queries.createLead({
      name: "Test Operator",
      email: "ops@example.com",
      country: "Portugal",
      services: ["rack-and-stack"],
      racks: 12,
      consentPrivacy: true,
      consentMarketing: false,
      source: "vitest",
    });
    expect(lead.reference).toMatch(new RegExp(`^TM-${new Date().getFullYear()}-[A-Z0-9]{5}$`));
    expect(lead.status).toBe("new");
    expect(lead.racks).toBe(12);
    expect(lead.id).toBeGreaterThan(0);
  });

  it("round-trips through the queue and supports status changes", () => {
    const before = queries.listLeads().length;
    const lead = queries.createLead({
      name: "Second Operator",
      email: "two@example.com",
      country: "Germany",
      services: ["remote-smart-hands"],
      consentPrivacy: true,
      consentMarketing: true,
    });
    expect(queries.listLeads()).toHaveLength(before + 1);

    queries.setLeadStatus(lead.id, "quoted");
    const found = queries.listLeads().find((l) => l.id === lead.id);
    expect(found?.status).toBe("quoted");
    expect(found?.consentMarketing).toBe(true);
  });

  it("counts subscribers and rejects duplicates", () => {
    const start = queries.subscriberCount();
    expect(queries.addSubscriber("dupe@example.com").duplicate).toBe(false);
    expect(queries.addSubscriber("DUPE@example.com").duplicate).toBe(true);
    expect(queries.subscriberCount()).toBe(start + 1);
  });

  it("records analytics events for the traffic panel", () => {
    queries.trackEvent("pageview", { path: "/coverage", referrer: "google.com" });
    const traffic = queries.trafficStats(30);
    expect(traffic.views.reduce((a, b) => a + b.n, 0)).toBeGreaterThan(0);
    expect(traffic.topPaths.some((p) => p.path === "/coverage")).toBe(true);
  });
});

describe("database integrity", () => {
  it("uses WAL journaling and enforces foreign keys", () => {
    const db = getDb();
    expect((db.pragma("journal_mode", { simple: true }) as string).toLowerCase()).toBe("wal");
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("enforces a unique reference per lead", () => {
    const db = getDb();
    expect(() =>
      db
        .prepare(
          `INSERT INTO leads (reference, name, email, country, services, consent_privacy)
           VALUES ((SELECT reference FROM leads LIMIT 1), 'x', 'x@x.com', 'PT', '[]', 1)`
        )
        .run()
    ).toThrow();
  });
});

afterAll(() => {
  try {
    getDb().close();
  } catch {
    /* already closed */
  }
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(tmpDb + suffix, { force: true });
});
