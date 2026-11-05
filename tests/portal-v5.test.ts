import { describe, expect, it } from "vitest";
import {
  actionableOffers,
  minutesLeft,
  notificationTone,
  offerCountdown,
  offerHistory,
  offerTone,
  relativeTime,
  type OfferInboxItem,
} from "@/lib/portal-dispatch";

const NOW = new Date("2026-11-05T12:00:00.000Z").getTime();

const offer = (overrides: Partial<OfferInboxItem> = {}): OfferInboxItem => ({
  id: "o1",
  ticket_id: "t1",
  ticket_number: 7,
  title: "Rack and stack two servers",
  description: "Hall 2, rack 14",
  priority: "normal",
  status: "pending",
  offered_rate: 35,
  expires_at: "2026-11-05T12:45:00.000Z",
  responded_at: null,
  decline_reason: null,
  scheduled_for: null,
  sla_due_at: null,
  estimated_hours: 3,
  site_name: "Lisbon DC1",
  site_address: "Rua A 1",
  client_name: "Northwind",
  ...overrides,
});

describe("R5 offer timing", () => {
  it("rounds the remaining window up to whole minutes", () => {
    expect(minutesLeft("2026-11-05T12:45:00.000Z", NOW)).toBe(45);
    expect(minutesLeft("2026-11-05T12:00:30.000Z", NOW)).toBe(1);
  });

  it("never reports a negative window", () => {
    expect(minutesLeft("2026-11-05T11:00:00.000Z", NOW)).toBe(0);
    expect(minutesLeft("not-a-date", NOW)).toBe(0);
  });

  it("formats the countdown the way the offer card does", () => {
    expect(offerCountdown("2026-11-05T12:45:00.000Z", NOW)).toBe("expires in 45 min");
    expect(offerCountdown("2026-11-05T13:00:00.000Z", NOW)).toBe("expires in 1 h");
    expect(offerCountdown("2026-11-05T14:10:00.000Z", NOW)).toBe("expires in 2 h 10 min");
    expect(offerCountdown("2026-11-05T11:59:00.000Z", NOW)).toBe("expired");
  });
});

describe("R5 offer lists", () => {
  it("sorts actionable offers by the closest deadline", () => {
    const soon = offer({ id: "soon", expires_at: "2026-11-05T12:10:00.000Z" });
    const later = offer({ id: "later", expires_at: "2026-11-05T13:30:00.000Z" });
    const accepted = offer({ id: "done", status: "accepted" });
    const expired = offer({ id: "gone", expires_at: "2026-11-05T11:00:00.000Z" });

    expect(actionableOffers([later, accepted, soon, expired], NOW).map((row) => row.id)).toEqual(["soon", "later"]);
  });

  it("moves answered offers, and offers whose clock ran out, into history", () => {
    const pending = offer({ id: "open" });
    const accepted = offer({ id: "accepted", status: "accepted" });
    const expired = offer({ id: "stale", expires_at: "2026-11-05T11:00:00.000Z" });
    const taken = offer({ id: "taken", status: "taken" });

    const history = offerHistory([pending, accepted, expired, taken], NOW).map((row) => row.id);
    expect(history).not.toContain("open");
    expect(new Set(history)).toEqual(new Set(["accepted", "stale", "taken"]));
  });

  it("colours offer states consistently", () => {
    expect(offerTone("pending")).toBe("accent");
    expect(offerTone("accepted")).toBe("good");
    expect(offerTone("declined")).toBe("danger");
    expect(offerTone("taken")).toBe("muted");
    expect(offerTone("expired")).toBe("muted");
  });
});

describe("R5 notifications", () => {
  it("describes recency in the formats the bell uses", () => {
    expect(relativeTime(new Date(NOW - 20_000).toISOString(), NOW)).toBe("just now");
    expect(relativeTime(new Date(NOW - 12 * 60_000).toISOString(), NOW)).toBe("12 min ago");
    expect(relativeTime(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe("3 h ago");
    expect(relativeTime(new Date(NOW - 26 * 3_600_000).toISOString(), NOW)).toBe("yesterday");
    expect(relativeTime(new Date(NOW - 5 * 86_400_000).toISOString(), NOW)).toBe("5 d ago");
    expect(relativeTime("nonsense", NOW)).toBe("");
  });

  it("maps notification kinds to tones", () => {
    expect(notificationTone("offer")).toBe("accent");
    expect(notificationTone("money")).toBe("warn");
    expect(notificationTone("ticket")).toBe("good");
    expect(notificationTone("system")).toBe("muted");
  });
});
