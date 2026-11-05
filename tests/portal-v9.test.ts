import { describe, expect, it } from "vitest";
import {
  exportName,
  filterParts,
  locationKindCopy,
  lowStockRows,
  movementDelta,
  movementLabel,
  movementTone,
  orderProgress,
  orderStatusCopy,
  orderTone,
  partError,
  partsCsv,
  partsMargin,
  purchaseOrdersCsv,
  qtyCopy,
  stockCopy,
  stockTone,
  unitCopy,
  type PartRow,
  type PurchaseOrderRow,
} from "@/lib/portal-parts";

const part = (overrides: Partial<PartRow> = {}): PartRow => ({
  id: "p1",
  sku: "CAT6-SFTP-5",
  name: "Cat6 S/FTP patch lead, 5 m",
  description: "",
  category: "Cabling",
  brand: "Excel",
  unit: "unit",
  unit_cost: 6.4,
  sale_price: 14.5,
  currency: "EUR",
  supplier: "Excel Networking",
  reorder_point: 25,
  reorder_quantity: 100,
  barcode: "",
  is_active: true,
  is_demo: false,
  quantity: 180,
  stock_value: 1152,
  low: false,
  locations: [],
  ...overrides,
});

const order = (overrides: Partial<PurchaseOrderRow> = {}): PurchaseOrderRow => ({
  id: "o1",
  reference: "PO-DEMO-0001",
  supplier: "Excel Networking",
  status: "sent",
  currency: "EUR",
  ordered_on: "2026-11-05",
  expected_on: "2026-11-10",
  notes: "",
  is_demo: true,
  created_at: "2026-11-05T09:00:00Z",
  received_at: null,
  total: 866,
  lines: [
    {
      id: "l1",
      part_id: "p1",
      part_name: "Cat6 S/FTP patch lead, 5 m",
      sku: "CAT6-SFTP-5",
      quantity: 100,
      received_quantity: 30,
      remaining: 70,
      unit_cost: 6.2,
    },
  ],
  ...overrides,
});

describe("R9 part quantities", () => {
  it("prints counts without trailing decimals", () => {
    expect(qtyCopy(4)).toBe("4");
    expect(qtyCopy("4.50")).toBe("4.5");
    expect(qtyCopy(0)).toBe("0");
    expect(qtyCopy(null)).toBe("0");
  });

  it("pluralises the unit and only says units for the generic unit", () => {
    expect(unitCopy(1, "unit")).toBe("1 unit");
    expect(unitCopy(4, "unit")).toBe("4 units");
    expect(unitCopy(4, "box")).toBe("4 box");
    expect(unitCopy(2.5, "m")).toBe("2.5 m");
  });
});

describe("R9 stock state", () => {
  it("turns red when empty, amber at the reorder point, green above it", () => {
    expect(stockTone({ quantity: 0, low: true })).toBe("danger");
    expect(stockTone({ quantity: 25, low: true })).toBe("warn");
    expect(stockTone({ quantity: 180, low: false })).toBe("good");
    expect(stockTone({ quantity: 180, low: false, is_active: false })).toBe("muted");
  });

  it("says the same thing in words", () => {
    expect(stockCopy({ quantity: 0, low: true })).toBe("Out of stock");
    expect(stockCopy({ quantity: 25, low: true })).toBe("At reorder point");
    expect(stockCopy({ quantity: 180, low: false })).toBe("In stock");
    expect(stockCopy({ quantity: 180, low: false, is_active: false })).toBe("Archived");
  });

  it("only counts active parts as low", () => {
    const rows = [
      part({ id: "a", low: true }),
      part({ id: "b", low: false }),
      part({ id: "c", low: true, is_active: false }),
    ];
    expect(lowStockRows(rows).map((row) => row.id)).toEqual(["a"]);
  });
});

describe("R9 filtering", () => {
  it("matches name, sku, brand and category, and honours the category filter", () => {
    const rows = [
      part({ id: "a", name: "Patch lead", sku: "CAT6", brand: "Excel", category: "Cabling" }),
      part({ id: "b", name: "SFP+ 10G", sku: "SFP-10G-SR", brand: "Finisar", category: "Optics" }),
    ];
    expect(filterParts(rows, "sfp", null).map((row) => row.id)).toEqual(["b"]);
    expect(filterParts(rows, "finisar", null).map((row) => row.id)).toEqual(["b"]);
    expect(filterParts(rows, "", "Cabling").map((row) => row.id)).toEqual(["a"]);
    expect(filterParts(rows, "  ", null)).toHaveLength(2);
  });
});

describe("R9 ledger copy", () => {
  it("signs the movement by direction, not by the kind alone", () => {
    expect(movementDelta("receive", 180)).toBe("+180");
    expect(movementDelta("issue", 4)).toBe("−4");
    expect(movementDelta("return", 1)).toBe("+1");
    expect(movementDelta("adjust", -3)).toBe("−3");
  });

  it("labels and tones each movement", () => {
    expect(movementLabel("receive")).toBe("Received");
    expect(movementLabel("issue")).toBe("Issued");
    expect(movementLabel("return")).toBe("Returned");
    expect(movementLabel("adjust")).toBe("Adjusted");
    expect(movementTone("receive")).toBe("good");
    expect(movementTone("issue")).toBe("warn");
  });

  it("names locations in the language the ops team uses", () => {
    expect(locationKindCopy("van")).toBe("Van");
    expect(locationKindCopy("kit")).toBe("Kit");
  });
});

describe("R9 purchase orders", () => {
  it("tones and names each status", () => {
    expect(orderTone("received")).toBe("good");
    expect(orderTone("partial")).toBe("accent");
    expect(orderTone("cancelled")).toBe("danger");
    expect(orderStatusCopy("partial")).toBe("Part received");
    expect(orderStatusCopy("sent")).toBe("On order");
  });

  it("measures receipt progress and never exceeds 100%", () => {
    expect(orderProgress(order().lines[0])).toBe(30);
    expect(orderProgress({ ...order().lines[0], received_quantity: 100 })).toBe(100);
    expect(orderProgress({ ...order().lines[0], received_quantity: 500 })).toBe(100);
    expect(orderProgress({ ...order().lines[0], quantity: 0 })).toBe(0);
  });
});

describe("R9 ticket parts", () => {
  it("computes margin as charge minus cost", () => {
    expect(partsMargin({ cost: 67.6, charge: 154 })).toBe(86.4);
    expect(partsMargin({ cost: 10, charge: 0 })).toBe(-10);
    expect(partsMargin({ cost: 0, charge: 0 })).toBe(0);
  });
});

describe("R9 exports", () => {
  it("writes one row per part with the status wording", () => {
    const csv = partsCsv([part({ quantity: 25, low: true })]);
    const [head, row] = csv.split("\n");
    expect(head).toBe("SKU,Name,Category,Brand,Qty,Unit,Cost,Sale,Stock value,Reorder point,Status");
    // A name with a comma is quoted; everything else stays bare.
    expect(row).toBe('CAT6-SFTP-5,"Cat6 S/FTP patch lead, 5 m",Cabling,Excel,25,unit,6.4,14.5,1152,25,At reorder point');
  });

  it("writes one row per order line", () => {
    const csv = purchaseOrdersCsv([order()]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Reference,Supplier,Status,SKU,Part,Ordered,Received");
    expect(lines[1]).toBe('PO-DEMO-0001,Excel Networking,On order,CAT6-SFTP-5,"Cat6 S/FTP patch lead, 5 m",100,30');
  });

  it("still writes a row for an empty order", () => {
    const csv = purchaseOrdersCsv([order({ lines: [], status: "draft" })]);
    expect(csv.split("\n")[1]).toBe("PO-DEMO-0001,Excel Networking,Draft,,,,");
  });

  it("names the file with the export date", () => {
    expect(exportName("parts", new Date("2026-11-05T10:00:00Z"))).toBe("parts-2026-11-05.csv");
    expect(exportName("purchase-orders", new Date("2026-01-02T10:00:00Z"))).toBe("purchase-orders-2026-01-02.csv");
  });
});

describe("R9 errors", () => {
  it("translates database codes into something an operator can act on", () => {
    expect(partError({ message: "insufficient_stock" }).message).toBe(
      "There is not enough of that part at this location."
    );
    expect(partError({ message: "part_sku_taken" }).code).toBe("part_sku_taken");
    expect(partError({ message: "over_receipt" }).message).toBe(
      "You cannot receive more than the order asks for."
    );
  });

  it("falls back to the shared copy for unknown failures", () => {
    const error = partError({ message: "not_authenticated" });
    expect(error.message).toContain("session");
  });
});
