import { afterEach, describe, expect, it, vi } from "vitest";
import { syncLeadToHubSpot } from "../src/lib/hubspot";
import type { Lead } from "../src/lib/types";

const lead: Lead = {
  id: 1, reference: "TM-TEST", createdAt: "2026-11-04T00:00:00Z", status: "new", notified: false,
  name: "Test Person", email: "test@example.com", country: "Portugal", services: ["cabling"],
  consentPrivacy: true, consentMarketing: false, spamScore: 0, message: "<script>example</script>",
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("HubSpot lead sync", () => {
  it("does nothing without credentials", async () => {
    vi.stubEnv("HUBSPOT_ACCESS_TOKEN", "");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await syncLeadToHubSpot(lead);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("updates an existing contact and associates an escaped enquiry note", async () => {
    vi.stubEnv("HUBSPOT_ACCESS_TOKEN", "test-only");
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ id: "123" }))
      .mockResolvedValueOnce(Response.json({ id: "456" }));
    vi.stubGlobal("fetch", fetcher);
    await syncLeadToHubSpot(lead);
    expect(fetcher.mock.calls[1][0]).toContain("test%40example.com?idProperty=email");
    expect(fetcher.mock.calls[1][1].method).toBe("PATCH");
    const note = JSON.parse(fetcher.mock.calls[2][1].body);
    expect(note.associations[0].to.id).toBe("123");
    expect(note.properties.hs_note_body).toContain("&lt;script&gt;");
    expect(note.properties.hs_note_body).toContain("Marketing consent: no");
  });
  it("reports API failures without including response bodies", async () => {
    vi.stubEnv("HUBSPOT_ACCESS_TOKEN", "test-only");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private response", { status: 401 })));
    await expect(syncLeadToHubSpot(lead)).rejects.toThrow("HubSpot contact sync failed (HTTP 401)");
  });
  it("does not send suspected spam to HubSpot", async () => {
    vi.stubEnv("HUBSPOT_ACCESS_TOKEN", "test-only");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await syncLeadToHubSpot({ ...lead, spamScore: 40 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
