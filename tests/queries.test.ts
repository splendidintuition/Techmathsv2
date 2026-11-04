import { describe, expect, it } from "vitest";
import * as queries from "@/lib/queries";
import { SERVICES } from "@/lib/content/services";

describe("catalogue", () => {
  it("exposes the full service catalogue", () => {
    expect(queries.listServices()).toHaveLength(SERVICES.length);
    expect(queries.listServices().map((s) => s.slug)).toContain("rack-and-stack");
  });

  it("returns typed structured fields", () => {
    const s = queries.getService("structured-cabling");
    expect(s).not.toBeNull();
    if (!s) return;
    expect(s.included.length).toBeGreaterThan(3);
    expect(s.method[0]).toMatchObject({ title: expect.any(String), detail: expect.any(String) });
    expect(s.faqs[0]?.q).toBeTruthy();
    expect(s.kpis[0]?.value).toBeTruthy();
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
