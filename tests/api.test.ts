import { afterAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

const tmpDb = path.join(os.tmpdir(), `tm-api-${process.pid}-${Date.now()}.db`);
process.env.TECHMATHS_DB = tmpDb;
process.env.ADMIN_TOKEN = "test-token-123";

const { POST: createLeadRoute, GET: listLeadRoute } = await import("@/app/api/leads/route");
const { POST: subscribe } = await import("@/app/api/subscribe/route");
const { GET: searchRoute } = await import("@/app/api/search/route");
const { GET: health } = await import("@/app/api/health/route");
const { GET: download } = await import("@/app/api/download/[slug]/route");
const { PATCH: patchLead } = await import("@/app/api/admin/leads/[id]/route");
const queries = await import("@/lib/queries");
const { listLeads } = queries;

const json = (body: unknown) => new NextRequest("http://localhost/api", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const validLead = {
  services: ["rack-and-stack", "structured-cabling"],
  country: "Portugal",
  siteLocation: "Lisbon DC1",
  racks: 24,
  name: "Ana Ferreira",
  email: "ana@example.com",
  company: "Example Colocation",
  message: "Two halls to build.",
  consentPrivacy: true,
  consentMarketing: false,
  source: "vitest",
  formStartedAt: Date.now() - 90_000,
};

describe("POST /api/leads", () => {
  it("creates a lead and returns a reference with 201", async () => {
    const res = await createLeadRoute(json(validLead));
    expect(res.status).toBe(201);
    const data = (await res.json()) as { ok: boolean; reference: string; message: string };
    expect(data.ok).toBe(true);
    expect(data.reference).toMatch(/^TM-\d{4}-[A-Z0-9]{5}$/);
    expect(data.message).toContain("Ana");
  });

  it("returns an explicit 503 when storage is unavailable, without claiming success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = vi.spyOn(queries, "createLead").mockImplementationOnce(() => {
      throw new Error("SQLITE_READONLY: attempt to write a readonly database");
    });
    try {
      const res = await createLeadRoute(json(validLead));
      expect(res.status).toBe(503);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.reference).toBeUndefined();
      expect(data.message).toContain("has not been sent");
    } finally {
      storage.mockRestore();
      log.mockRestore();
    }
  });

  it("persists the lead with its parsed fields", () => {
    const leads = listLeads();
    expect(leads.length).toBeGreaterThan(0);
    const lead = leads.find((l) => l.email === "ana@example.com");
    expect(lead).toBeTruthy();
    expect(lead?.services).toEqual(["rack-and-stack", "structured-cabling"]);
    expect(lead?.racks).toBe(24);
    expect(lead?.consentPrivacy).toBe(true);
  });

  it("returns 422 with field-level errors for an invalid payload", async () => {
    const res = await createLeadRoute(json({ ...validLead, email: "nope", services: [] }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { ok: boolean; errors: Record<string, string> };
    expect(data.ok).toBe(false);
    expect(data.errors.email).toBeTruthy();
    expect(data.errors.services).toBeTruthy();
  });

  it("returns 400 for a malformed body", async () => {
    const res = await createLeadRoute(
      new NextRequest("http://localhost/api", { method: "POST", body: "not json", headers: { "content-type": "application/json" } })
    );
    expect(res.status).toBe(400);
  });

  it("accepts a honeypot submission but stores nothing routable", async () => {
    const before = listLeads().length;
    const res = await createLeadRoute(json({ ...validLead, website: "http://bots.example" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { reference: string };
    expect(data.reference).toBe("TM-0000-0000");
    expect(listLeads()).toHaveLength(before);
  });

  it("requires the admin cookie to list leads", async () => {
    const denied = await listLeadRoute(new NextRequest("http://localhost/api/leads"));
    expect(denied.status).toBe(401);

    const allowed = await listLeadRoute(
      new NextRequest("http://localhost/api/leads", { headers: { cookie: "tm_admin=test-token-123" } })
    );
    expect(allowed.status).toBe(200);
    const data = (await allowed.json()) as { leads: unknown[] };
    expect(Array.isArray(data.leads)).toBe(true);
  });
});

describe("POST /api/subscribe", () => {
  it("subscribes a new address", async () => {
    const res = await subscribe(json({ email: "reader@example.com", consent: true }));
    expect(res.status).toBe(201);
    const data = (await res.json()) as { ok: boolean; duplicate: boolean };
    expect(data.ok).toBe(true);
    expect(data.duplicate).toBe(false);
  });

  it("reports a repeat subscription as a duplicate rather than an error", async () => {
    const res = await subscribe(json({ email: "reader@example.com", consent: true }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { duplicate: boolean };
    expect(data.duplicate).toBe(true);
  });

  it("rejects an address without consent", async () => {
    const res = await subscribe(json({ email: "x@example.com", consent: false }));
    expect(res.status).toBe(422);
  });
});

describe("GET /api/search", () => {
  it("returns hits for a real query", async () => {
    const res = await searchRoute(new NextRequest("http://localhost/api/search?q=certification"));
    const data = (await res.json()) as { hits: Array<{ href: string }> };
    expect(data.hits.length).toBeGreaterThan(0);
    expect(data.hits[0].href.startsWith("/")).toBe(true);
  });

  it("returns an empty list for a too-short query", async () => {
    const res = await searchRoute(new NextRequest("http://localhost/api/search?q=a"));
    const data = (await res.json()) as { hits: unknown[] };
    expect(data.hits).toHaveLength(0);
  });
});

describe("GET /api/download/[slug]", () => {
  it("serves a published insight as a Markdown attachment", async () => {
    const res = await download(new NextRequest("http://localhost/x"), {
      params: Promise.resolve({ slug: "certify-every-link" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toContain("certify-every-link.md");
    const text = await res.text();
    expect(text).toContain("# Certify every link");
    expect(text).toContain("Tech Maths");
  });

  it("404s for an unknown slug", async () => {
    const res = await download(new NextRequest("http://localhost/x"), {
      params: Promise.resolve({ slug: "no-such-article" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/leads/[id]", () => {
  it("rejects an unauthenticated status change", async () => {
    const lead = listLeads()[0];
    const res = await patchLead(
      new NextRequest("http://localhost/x", { method: "PATCH", body: JSON.stringify({ status: "won" }) }),
      { params: Promise.resolve({ id: String(lead.id) }) }
    );
    expect(res.status).toBe(401);
  });

  it("updates status when authenticated", async () => {
    const lead = listLeads()[0];
    const res = await patchLead(
      new NextRequest("http://localhost/x", {
        method: "PATCH",
        headers: { cookie: "tm_admin=test-token-123" },
        body: JSON.stringify({ status: "qualified" }),
      }),
      { params: Promise.resolve({ id: String(lead.id) }) }
    );
    expect(res.status).toBe(200);
    expect(listLeads().find((l) => l.id === lead.id)?.status).toBe("qualified");
  });

  it("rejects an unknown status value", async () => {
    const lead = listLeads()[0];
    const res = await patchLead(
      new NextRequest("http://localhost/x", {
        method: "PATCH",
        headers: { cookie: "tm_admin=test-token-123" },
        body: JSON.stringify({ status: "banana" }),
      }),
      { params: Promise.resolve({ id: String(lead.id) }) }
    );
    expect(res.status).toBe(422);
  });

  it("rejects a non-numeric id", async () => {
    const res = await patchLead(
      new NextRequest("http://localhost/x", {
        method: "PATCH",
        headers: { cookie: "tm_admin=test-token-123" },
        body: JSON.stringify({ status: "won" }),
      }),
      { params: Promise.resolve({ id: "abc" }) }
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/health", () => {
  it("reports the database and content inventory", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      checks: { database: { ok: boolean }; content: { services: number; projects: number; insights: number } };
    };
    expect(data.ok).toBe(true);
    expect(data.checks.database.ok).toBe(true);
    expect(data.checks.content.services).toBe(9);
    expect(data.checks.content.projects).toBeGreaterThan(0);
    expect(data.checks.content.insights).toBeGreaterThan(0);
  });
});

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(tmpDb + suffix, { force: true });
});
