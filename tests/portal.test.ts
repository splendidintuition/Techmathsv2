import { describe, expect, it } from "vitest";
import { portalHref } from "@/lib/portal-url";
import { isSupabaseConfigured } from "@/lib/supabase-browser";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("portalHref", () => {
  it("returns portal link without audience", () => {
    const href = portalHref();
    expect(href).toBeDefined();
    expect(typeof href).toBe("string");
  });

  it("appends audience parameter", () => {
    const clientHref = portalHref("client");
    expect(clientHref).toContain("audience=client");

    const engineerHref = portalHref("engineer");
    expect(engineerHref).toContain("audience=engineer");
  });
});

describe("isSupabaseConfigured", () => {
  it("evaluates whether environment variables are set", () => {
    expect(typeof isSupabaseConfigured).toBe("boolean");
  });
});

describe("middleware", () => {
  it("rewrites / to /portal when host is portal subdomain", () => {
    const req = new NextRequest("https://portal.techmaths-dc.com/", {
      headers: { host: "portal.techmaths-dc.com" },
    });
    const res = middleware(req);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/portal");
  });

  it("passes through requests for the apex domain", () => {
    const req = new NextRequest("https://techmaths-dc.com/", {
      headers: { host: "techmaths-dc.com" },
    });
    const res = middleware(req);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
