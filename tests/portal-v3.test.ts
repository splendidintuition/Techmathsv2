import { describe, expect, it } from "vitest";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  PAYMENT_METHODS,
  expenseGross,
  expenseSummaryOf,
  expenseTone,
  expenseVat,
  agingBucket,
  blankLine,
  cleanLines,
  documentTotals,
  formatMoney,
  invoiceSummaryOf,
  invoiceTone,
  lineTotal,
  moneyError,
  quoteSummaryOf,
  quoteTone,
  type ExpenseRow,
  type InvoiceSummary,
  type QuoteSummary,
} from "@/lib/portal-money";

const today = new Date(2026, 10, 4); // 4 November 2026

const quote = (over: Partial<QuoteSummary>): QuoteSummary => ({
  id: Math.random().toString(36).slice(2),
  number: "Q-2026-0001",
  title: "Rack and stack",
  status: "draft",
  organization_id: "org-1",
  client_name: "Northwind",
  site_id: null,
  site_name: null,
  currency: "EUR",
  vat_rate: 23,
  subtotal: 1000,
  vat_total: 230,
  total: 1230,
  valid_until: null,
  sent_at: null,
  responded_at: null,
  accepted_by_name: null,
  declined_reason: null,
  converted_invoice_id: null,
  line_count: 1,
  is_demo: false,
  created_at: "2026-11-01T09:00:00Z",
  ...over,
});

const invoice = (over: Partial<InvoiceSummary>): InvoiceSummary => ({
  id: Math.random().toString(36).slice(2),
  number: "INV-2026-0001",
  title: "Rack and stack",
  status: "sent",
  organization_id: "org-1",
  client_name: "Northwind",
  site_id: null,
  site_name: null,
  quote_id: null,
  currency: "EUR",
  vat_rate: 23,
  subtotal: 1000,
  vat_total: 230,
  total: 1230,
  amount_paid: 0,
  balance: 1230,
  reference: "",
  issued_at: "2026-10-01T09:00:00Z",
  due_at: "2026-10-15T09:00:00Z",
  paid_at: null,
  void_reason: null,
  is_demo: false,
  created_at: "2026-10-01T09:00:00Z",
  ...over,
});

describe("money math", () => {
  it("rounds each line to cents before summing", () => {
    expect(lineTotal(3, 33.333)).toBe(100);
    expect(lineTotal(1.5, 66.67)).toBe(100.01);
  });

  it("refuses negative quantities and prices", () => {
    expect(lineTotal(-2, 100)).toBe(0);
    expect(lineTotal(2, -100)).toBe(0);
  });

  it("applies discount to the net subtotal, then VAT", () => {
    const totals = documentTotals([{ quantity: 10, unit_price: 100 }], { vatRate: 23, discountPct: 10 });
    expect(totals.subtotal).toBe(900);
    expect(totals.vat).toBe(207);
    expect(totals.total).toBe(1107);
  });

  it("defaults to no discount and treats missing vat as 0%", () => {
    const totals = documentTotals([{ quantity: 2, unit_price: 50 }], { vatRate: 0 });
    expect(totals.subtotal).toBe(100);
    expect(totals.vat).toBe(0);
    expect(totals.total).toBe(100);
  });

  it("clamps a discount above 100%", () => {
    const totals = documentTotals([{ quantity: 1, unit_price: 100 }], { vatRate: 23, discountPct: 150 });
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("formats currency in en-GB euros", () => {
    expect(formatMoney(1234.5)).toBe("€1,234.50");
    expect(formatMoney(null)).toBe("€0.00");
    expect(formatMoney(10, "USD")).toContain("10.00");
  });
});

describe("receivables aging", () => {
  it("puts anything not yet due in current", () => {
    expect(agingBucket("2026-11-04", today)).toBe("current");
    expect(agingBucket("2026-12-01", today)).toBe("current");
    expect(agingBucket(null, today)).toBe("current");
  });

  it("splits overdue invoices by 30-day bands", () => {
    expect(agingBucket("2026-11-03", today)).toBe("d1_30");
    expect(agingBucket("2026-10-05", today)).toBe("d1_30");
    expect(agingBucket("2026-10-04", today)).toBe("d31_60");
    expect(agingBucket("2026-09-05", today)).toBe("d31_60");
    expect(agingBucket("2026-09-04", today)).toBe("d61_90");
    expect(agingBucket("2026-08-06", today)).toBe("d61_90");
    expect(agingBucket("2026-08-05", today)).toBe("d90_plus");
  });

  it("treats an unparseable date as current", () => {
    expect(agingBucket("not-a-date", today)).toBe("current");
  });
});

describe("status tones", () => {
  it("maps quote statuses onto the shared palette", () => {
    expect(quoteTone("accepted")).toBe("good");
    expect(quoteTone("converted")).toBe("good");
    expect(quoteTone("sent")).toBe("accent");
    expect(quoteTone("declined")).toBe("muted");
    expect(quoteTone("draft")).toBe("muted");
  });

  it("maps invoice statuses onto the shared palette", () => {
    expect(invoiceTone("paid")).toBe("good");
    expect(invoiceTone("part_paid")).toBe("warn");
    expect(invoiceTone("overdue")).toBe("danger");
    expect(invoiceTone("sent")).toBe("accent");
    expect(invoiceTone("void")).toBe("muted");
  });
});

describe("summaries", () => {
  it("counts open, accepted and pipeline, and ignores drafts in win rate", () => {
    const summary = quoteSummaryOf([
      quote({ status: "draft", total: 999 }),
      quote({ status: "sent", total: 1000 }),
      quote({ status: "accepted", total: 500 }),
      quote({ status: "converted", total: 200 }),
      quote({ status: "declined", total: 700 }),
    ]);
    expect(summary.open).toBe(1);
    expect(summary.accepted).toBe(2);
    expect(summary.pipeline).toBe(1000);
    expect(summary.winRate).toBe(66.7);
  });

  it("reports zero win rate when nothing has been decided", () => {
    expect(quoteSummaryOf([quote({ status: "draft" })]).winRate).toBe(0);
    expect(quoteSummaryOf([]).pipeline).toBe(0);
  });

  it("sums outstanding balance only over live invoices", () => {
    const summary = invoiceSummaryOf([
      invoice({ status: "sent", balance: 1230, due_at: "2026-12-01T09:00:00Z" }),
      invoice({ status: "part_paid", balance: 500, due_at: "2026-11-01T09:00:00Z" }),
      invoice({ status: "paid", balance: 0, amount_paid: 1230 }),
      invoice({ status: "void", balance: 1230 }),
      invoice({ status: "draft", balance: 800 }),
    ], today);
    expect(summary.outstanding).toBe(1730);
    expect(summary.overdue).toBe(500);
    expect(summary.paidThisSet).toBe(1230);
    expect(summary.openCount).toBe(2);
  });
});

describe("editor helpers", () => {
  it("drops empty rows and trims the rest", () => {
    const cleaned = cleanLines([
      { ...blankLine(), description: "  Install switch  ", category: " ", quantity: 2, unit_price: 45 },
      { ...blankLine(), description: "   " },
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]).toMatchObject({ description: "Install switch", category: "general", quantity: 2, unit_price: 45 });
  });

  it("ships six payment methods, none of them automated", () => {
    expect(PAYMENT_METHODS).toHaveLength(6);
    expect(PAYMENT_METHODS).toContain("bank_transfer");
  });
});

describe("money errors", () => {
  it("explains a disabled feature flag in operator language", () => {
    const error = moneyError({ message: "feature_disabled:money.send_invoices", code: "0A000" });
    expect(error.code).toBe("feature_disabled");
    expect(error.message).toContain("switched off");
  });

  it("maps targeted sqlstate messages to copy", () => {
    expect(moneyError({ message: "payment_exceeds_balance" }).message).toContain("larger than the outstanding balance");
    expect(moneyError({ message: "invoice_has_payments" }).message).toContain("Reverse the recorded payments");
    expect(moneyError({ message: "quote_not_accepted" }).message).toContain("accepted quote");
  });

  it("falls back to the generic description for unknown messages", () => {
    const error = moneyError({ message: "something unexpected", code: "XX000" });
    expect(error.message.length).toBeGreaterThan(0);
  });
});

describe("expenses", () => {
  const expense = (over: Partial<ExpenseRow>): ExpenseRow => ({
    id: Math.random().toString(36).slice(2),
    spent_on: "2026-11-02",
    category: "travel",
    vendor: "CP",
    description: "Lisbon to Porto",
    currency: "EUR",
    amount_net: 100,
    vat_rate: 23,
    vat_amount: 23,
    amount_gross: 123,
    reimbursable: false,
    receipt_url: "",
    notes: "",
    status: "submitted",
    organization_id: null,
    client_name: null,
    site_id: null,
    site_name: null,
    ticket_id: null,
    ticket_number: null,
    ticket_title: null,
    submitted_at: null,
    reviewed_at: null,
    reviewed_by_name: null,
    review_note: "",
    created_by: null,
    created_by_name: null,
    is_demo: false,
    created_at: "2026-11-02T10:00:00Z",
    ...over,
  });

  it("derives VAT and gross the way the generated columns do", () => {
    expect(expenseVat(100, 23)).toBe(23);
    expect(expenseGross(100, 23)).toBe(123);
    expect(expenseVat(84.5, 6)).toBe(5.07);
    expect(expenseGross(84.5, 6)).toBe(89.57);
    expect(expenseVat(33.33, 23)).toBe(7.67);
    expect(expenseGross(33.33, 23)).toBe(41);
  });

  it("clamps nonsense VAT rates", () => {
    expect(expenseVat(100, -5)).toBe(0);
    expect(expenseVat(100, 250)).toBe(100);
    expect(expenseVat(Number.NaN, 23)).toBe(0);
  });

  it("tones expense statuses", () => {
    expect(expenseTone("approved")).toBe("good");
    expect(expenseTone("submitted")).toBe("accent");
    expect(expenseTone("rejected")).toBe("danger");
    expect(expenseTone("draft")).toBe("muted");
  });

  it("summarises awaiting, approved, reimbursable and this month", () => {
    const summary = expenseSummaryOf(
      [
        expense({ status: "submitted", amount_gross: 123 }),
        expense({ status: "submitted", amount_gross: 50 }),
        expense({ status: "approved", amount_gross: 200, reimbursable: true }),
        expense({ status: "approved", amount_gross: 100, spent_on: "2026-10-31" }),
        expense({ status: "draft", amount_gross: 999 }),
        expense({ status: "rejected", amount_gross: 999 }),
      ],
      today,
    );
    expect(summary.awaiting).toBe(173);
    expect(summary.awaitingCount).toBe(2);
    expect(summary.approved).toBe(300);
    expect(summary.reimbursable).toBe(200);
    expect(summary.month).toBe(200);
  });

  it("ships eight categories, travel first", () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(8);
    expect(EXPENSE_CATEGORIES[0]).toBe("travel");
    expect(EXPENSE_STATUSES).toEqual(["draft", "submitted", "approved", "rejected"]);
  });
});
