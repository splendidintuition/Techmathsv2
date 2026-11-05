import { describe, expect, it } from "vitest";
import {
  attentionItems,
  billingTotals,
  clientError,
  clientStatusLabel,
  clientStatusTone,
  daysUntil,
  invoiceCsv,
  invoiceTone,
  quoteTone,
  settlementPct,
  validityCopy,
  visitCopy,
  type ClientInvoice,
  type ClientInvoiceDetail,
  type ClientQuote,
  type ClientStats,
} from "@/lib/portal-client";

const NOW = new Date("2026-11-05T12:00:00.000Z");

const stats = (overrides: Partial<ClientStats> = {}): ClientStats => ({
  open_tickets: 2,
  awaiting_approval: 0,
  quotes_awaiting: 0,
  invoices_open: 0,
  outstanding: 0,
  overdue: 0,
  paid_this_year: 0,
  next_visit_at: null,
  ...overrides,
});

const invoice = (overrides: Partial<ClientInvoice> = {}): ClientInvoice => ({
  id: "i1",
  number: "INV-2026-0001",
  title: "Rack and stack",
  status: "sent",
  currency: "EUR",
  subtotal: 1000,
  vat_rate: 23,
  vat_total: 230,
  total: 1230,
  amount_paid: 0,
  balance: 1230,
  reference: "",
  issued_at: "2026-11-01T09:00:00.000Z",
  due_at: "2026-11-15",
  paid_at: null,
  site_name: "Lisbon DC1",
  is_overdue: false,
  ...overrides,
});

const quote = (overrides: Partial<ClientQuote> = {}): ClientQuote => ({
  id: "q1",
  number: "Q-2026-0001",
  title: "Smart hands",
  status: "sent",
  currency: "EUR",
  subtotal: 550,
  vat_rate: 23,
  vat_total: 126.5,
  total: 676.5,
  valid_until: "2026-11-12",
  sent_at: "2026-11-01T09:00:00.000Z",
  responded_at: null,
  accepted_by_name: null,
  declined_reason: null,
  site_name: "Lisbon DC1",
  line_count: 2,
  can_respond: true,
  ...overrides,
});

describe("R6 client status vocabulary", () => {
  it("translates internal states into client language", () => {
    expect(clientStatusLabel("completed_pending_approval")).toBe("Waiting for your approval");
    expect(clientStatusLabel("en_route")).toBe("Engineer on the way");
    expect(clientStatusLabel("offered")).toBe("Matching an engineer");
    expect(clientStatusLabel("closed")).toBe("Completed");
  });

  it("falls back to a humanised token for unknown states", () => {
    expect(clientStatusLabel("waiting_parts")).toBe("Waiting on parts");
    expect(clientStatusLabel("something_new")).toBe("Something new");
  });

  it("tones statuses the way the pills read", () => {
    expect(clientStatusTone("completed_pending_approval")).toBe("warn");
    expect(clientStatusTone("on_site")).toBe("accent");
    expect(clientStatusTone("closed")).toBe("good");
    expect(clientStatusTone("cancelled")).toBe("danger");
  });
});

describe("R6 quote and invoice tones", () => {
  it("marks an accepted quote good and a declined one danger", () => {
    expect(quoteTone("accepted")).toBe("good");
    expect(quoteTone("converted")).toBe("good");
    expect(quoteTone("declined")).toBe("danger");
    expect(quoteTone("sent")).toBe("warn");
    expect(quoteTone("expired")).toBe("muted");
  });

  it("prioritises overdue over part-paid", () => {
    expect(invoiceTone(invoice({ status: "part_paid" }))).toBe("warn");
    expect(invoiceTone(invoice({ status: "part_paid", is_overdue: true }))).toBe("danger");
    expect(invoiceTone(invoice({ status: "paid" }))).toBe("good");
    expect(invoiceTone(invoice({ status: "sent" }))).toBe("accent");
  });
});

describe("R6 attention list", () => {
  it("stays empty when nothing needs the client", () => {
    expect(attentionItems(stats())).toEqual([]);
  });

  it("orders quotes first, then sign-offs, then overdue money", () => {
    const items = attentionItems(stats({ quotes_awaiting: 2, awaiting_approval: 1, overdue: 480 }));
    expect(items.map((item) => item.key)).toEqual(["quotes", "approvals", "overdue"]);
    expect(items[0].count).toBe(2);
  });

  it("signals overdue money as a single flag regardless of amount", () => {
    const items = attentionItems(stats({ overdue: 12.5 }));
    expect(items.find((item) => item.key === "overdue")?.count).toBe(1);
    expect(items.find((item) => item.key === "overdue")?.tone).toBe("danger");
  });
});

describe("R6 billing arithmetic", () => {
  it("sums billed, paid, outstanding and overdue balances", () => {
    const totals = billingTotals([
      invoice({ id: "a", total: 1230, amount_paid: 500, balance: 730 }),
      invoice({ id: "b", total: 100, amount_paid: 100, balance: 0, status: "paid" }),
      invoice({ id: "c", total: 400, amount_paid: 0, balance: 400, is_overdue: true }),
    ]);
    expect(totals.billed).toBe(1730);
    expect(totals.paid).toBe(600);
    expect(totals.outstanding).toBe(1130);
    expect(totals.overdue).toBe(400);
  });

  it("ignores a zero balance on a part paid invoice", () => {
    const totals = billingTotals([invoice({ status: "part_paid", amount_paid: 1230, balance: 0 })]);
    expect(totals.outstanding).toBe(0);
  });
});

describe("R6 dates and validity copy", () => {
  it("counts whole days until a date", () => {
    expect(daysUntil("2026-11-05", NOW)).toBe(0);
    expect(daysUntil("2026-11-06", NOW)).toBe(1);
    expect(daysUntil("2026-11-04", NOW)).toBe(-1);
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil("nope", NOW)).toBeNull();
  });

  it("writes the quote countdown the client sees", () => {
    expect(validityCopy(quote({ valid_until: "2026-11-12" }), NOW)).toBe("7 days left");
    expect(validityCopy(quote({ valid_until: "2026-11-06" }), NOW)).toBe("1 day left");
    expect(validityCopy(quote({ valid_until: "2026-11-05" }), NOW)).toBe("Last day");
    expect(validityCopy(quote({ valid_until: "2026-11-01" }), NOW)).toBe("Expired");
    expect(validityCopy(quote({ status: "accepted" }), NOW)).toBe("—");
  });

  it("describes the next visit in plain English", () => {
    expect(visitCopy(null, NOW)).toBe("No visit scheduled");
    expect(visitCopy("2026-11-05T15:00:00.000Z", NOW)).toContain("Today");
    expect(visitCopy("2026-11-06T09:00:00.000Z", NOW)).toContain("Tomorrow");
    expect(visitCopy("2026-11-09T09:00:00.000Z", NOW)).toContain("In 4 days");
  });

  it("computes settlement without exceeding the bar", () => {
    expect(settlementPct({ total: 1000, amount_paid: 250 })).toBe(25);
    expect(settlementPct({ total: 1000, amount_paid: 0 })).toBe(0);
    expect(settlementPct({ total: 1000, amount_paid: 1000 })).toBe(100);
    expect(settlementPct({ total: 0, amount_paid: 0 })).toBe(0);
  });
});

describe("R6 error copy", () => {
  it("explains a non-client login", () => {
    const error = clientError({ message: "not_a_client_account" });
    expect(error.message).toContain("client account");
  });

  it("explains a disabled quote flag", () => {
    const error = clientError({ message: "feature_disabled:money.send_quotes" });
    expect(error.message).toMatch(/not open/i);
  });

  it("falls back to the shared portal copy", () => {
    expect(clientError({ message: "not_authenticated" }).message).toMatch(/session/i);
  });
});

describe("R6 invoice export", () => {
  it("writes a quoted CSV with the money rows the finance team needs", () => {
    const detail: ClientInvoiceDetail = {
      ...invoice({ amount_paid: 230, balance: 1000, status: "part_paid" }),
      notes: "",
      discount_pct: 0,
      organization_name: "Northwind Colocation",
      lines: [
        {
          id: "l1",
          description: "Rack and stack, 8h",
          category: "rack_and_stack",
          unit: "hour",
          quantity: 8,
          unit_price: 68,
          line_total: 544,
        },
      ],
      payments: [],
    };
    const csv = invoiceCsv(detail);
    expect(csv.split("\n")[0]).toBe('"Invoice","INV-2026-0001"');
    expect(csv).toContain('"Rack and stack, 8h","8","hour","68.00","544.00"');
    expect(csv).toContain('"Balance","1000.00"');
    expect(csv).toContain('"VAT (23%)","230.00"');
  });
});
