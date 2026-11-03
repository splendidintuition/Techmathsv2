import { describe, expect, it } from "vitest";
import { quoteSchema, spamScore, subscribeSchema } from "@/lib/validation";

const valid = {
  services: ["rack-and-stack", "structured-cabling"],
  country: "Portugal",
  siteLocation: "Lisbon DC1",
  racks: "24",
  servers: "180",
  ports: "1200",
  timeline: "2–4 weeks",
  urgency: "High",
  name: "Ana Ferreira",
  email: "Ana.Ferreira@Example.COM ",
  company: "Example Colocation",
  phone: "+351 900 000 000",
  message: "Two halls, Cat 6A and OS2.",
  consentPrivacy: true,
  consentMarketing: false,
  source: "contact",
};

describe("quoteSchema", () => {
  it("accepts a complete submission and normalises it", () => {
    const r = quoteSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (!r.success) return;
    // email is lowercased and trimmed; counts are coerced to numbers
    expect(r.data.email).toBe("ana.ferreira@example.com");
    expect(r.data.racks).toBe(24);
    expect(r.data.servers).toBe(180);
    expect(r.data.ports).toBe(1200);
    expect(r.data.services).toEqual(["rack-and-stack", "structured-cabling"]);
  });

  it("rejects an empty service selection", () => {
    const r = quoteSchema.safeParse({ ...valid, services: [] });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues[0]?.path[0]).toBe("services");
  });

  it("rejects a service slug that is not in the catalogue", () => {
    const r = quoteSchema.safeParse({ ...valid, services: ["not-a-service"] });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = quoteSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues[0]?.path[0]).toBe("email");
  });

  it("requires explicit privacy consent", () => {
    const r = quoteSchema.safeParse({ ...valid, consentPrivacy: false });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.some((i) => i.path[0] === "consentPrivacy")).toBe(true);
  });

  it("allows optional fields to be omitted entirely", () => {
    const r = quoteSchema.safeParse({
      services: ["remote-smart-hands"],
      country: "Germany",
      name: "Miguel Costa",
      email: "miguel@example.de",
      consentPrivacy: true,
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.racks).toBeUndefined();
    expect(r.data.message).toBeUndefined();
  });

  it("rejects absurd volumes rather than storing them", () => {
    expect(quoteSchema.safeParse({ ...valid, racks: "99999999" }).success).toBe(false);
  });
});

describe("spamScore", () => {
  const base = { email: "buyer@acme-datacenters.com", formStartedAt: Date.now() - 60_000 };

  it("scores a clean business submission as low risk", () => {
    expect(spamScore(base)).toBeLessThan(10);
  });

  it("flags a filled honeypot as certain spam", () => {
    expect(spamScore({ ...base, website: "http://spam.example" })).toBeGreaterThanOrEqual(100);
  });

  it("flags an impossibly fast five-step submission", () => {
    const fast = spamScore({ ...base, formStartedAt: Date.now() - 500 });
    expect(fast).toBeGreaterThanOrEqual(40);
  });

  it("flags link-stuffed messages", () => {
    const msg = "check http://a.com http://b.com http://c.com http://d.com";
    expect(spamScore({ ...base, message: msg })).toBeGreaterThan(spamScore(base));
  });

  it("caps the score at 100", () => {
    const score = spamScore({
      email: "x@mailinator.com",
      website: "bot",
      formStartedAt: Date.now(),
      message: "http://a.com http://b.com http://c.com http://d.com",
    });
    expect(score).toBe(100);
  });
});

describe("subscribeSchema", () => {
  it("accepts a confirmed subscription", () => {
    const r = subscribeSchema.safeParse({ email: " Ops@Example.com ", consent: true });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.email).toBe("ops@example.com");
  });

  it("rejects without consent", () => {
    expect(subscribeSchema.safeParse({ email: "ops@example.com", consent: false }).success).toBe(false);
  });
});
