"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, ClipboardList, PackagePlus, RefreshCw, Search, Truck } from "lucide-react";
import { formatMoney } from "@/lib/portal-money";
import {
  LOCATION_KINDS,
  MOVEMENT_KINDS,
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
  partsApi,
  purchaseOrdersCsv,
  partsCsv,
  qtyCopy,
  stockCopy,
  stockTone,
  unitCopy,
  type PartDetail,
  type PartRow,
  type PartsMetrics,
  type PurchaseOrderLine,
  type PurchaseOrderRow,
  type PurchaseOrderStatus,
  type StockLocationRow,
  type StockMovementKind,
} from "@/lib/portal-parts";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, Stat, inputClass } from "@/components/portal/v2/ui";

type Tab = "stock" | "catalog" | "orders";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "stock", label: "Stock" },
  { key: "catalog", label: "Catalog" },
  { key: "orders", label: "Orders" },
];

type PartForm = {
  id: string | null;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  unit_cost: string;
  sale_price: string;
  supplier: string;
  reorder_point: string;
  reorder_quantity: string;
  description: string;
  is_active: boolean;
};

const EMPTY_PART: PartForm = {
  id: null,
  sku: "",
  name: "",
  category: "General",
  brand: "",
  unit: "unit",
  unit_cost: "0",
  sale_price: "0",
  supplier: "",
  reorder_point: "0",
  reorder_quantity: "0",
  description: "",
  is_active: true,
};

type OrderDraftLine = { part_id: string; quantity: string; unit_cost: string };

function formFrom(part: PartRow): PartForm {
  return {
    id: part.id,
    sku: part.sku,
    name: part.name,
    category: part.category,
    brand: part.brand,
    unit: part.unit,
    unit_cost: String(part.unit_cost),
    sale_price: String(part.sale_price),
    supplier: part.supplier,
    reorder_point: String(part.reorder_point),
    reorder_quantity: String(part.reorder_quantity),
    description: part.description,
    is_active: part.is_active,
  };
}

function downloadCsv(name: string, body: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PartsRoom() {
  const [tab, setTab] = useState<Tab>("stock");
  const [metrics, setMetrics] = useState<PartsMetrics | null>(null);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [locations, setLocations] = useState<StockLocationRow[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [detail, setDetail] = useState<PartDetail | null>(null);
  const [editing, setEditing] = useState<PartForm | null>(null);
  const [partFormError, setPartFormError] = useState("");
  const [moveTarget, setMoveTarget] = useState<PartRow | PartDetail | null>(null);
  const [moveForm, setMoveForm] = useState<{ kind: StockMovementKind; location_id: string; quantity: string; note: string }>({
    kind: "receive",
    location_id: "",
    quantity: "1",
    note: "",
  });
  const [orderDraft, setOrderDraft] = useState<{ supplier: string; expected_on: string; notes: string; lines: OrderDraftLine[] } | null>(
    null
  );
  const [receive, setReceive] = useState<{ order: PurchaseOrderRow; line: PurchaseOrderLine; quantity: string; location_id: string } | null>(
    null
  );
  const [locationDraft, setLocationDraft] = useState<{ name: string; kind: (typeof LOCATION_KINDS)[number]; notes: string } | null>(null);

  const canStock = metrics?.flags.can_stock ?? false;
  const canEdit = metrics?.flags.can_edit ?? false;
  const canOrder = metrics?.flags.can_order ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextMetrics, nextParts, nextLocations, nextOrders] = await Promise.all([
        partsApi.metrics(),
        partsApi.list(null, null, false, true),
        partsApi.locations(),
        partsApi.orders(),
      ]);
      setMetrics(nextMetrics);
      setParts(nextParts);
      setLocations(nextLocations);
      setOrders(nextOrders);
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const rows = filterParts(parts, query, category || null);
    return lowOnly ? lowStockRows(rows) : rows;
  }, [parts, query, category, lowOnly]);

  const activeParts = useMemo(() => parts.filter((part) => part.is_active), [parts]);
  const lowCount = useMemo(() => lowStockRows(parts).length, [parts]);

  async function openDetail(partId: string) {
    try {
      setDetail(await partsApi.get(partId));
    } catch (caught) {
      setError(partError(caught).message);
    }
  }

  async function submitPart() {
    if (!editing) return;
    setBusy(true);
    setPartFormError("");
    try {
      await partsApi.save({
        id: editing.id,
        sku: editing.sku,
        name: editing.name,
        category: editing.category,
        brand: editing.brand,
        unit: editing.unit,
        unit_cost: Number(editing.unit_cost) || 0,
        sale_price: Number(editing.sale_price) || 0,
        supplier: editing.supplier,
        reorder_point: Number(editing.reorder_point) || 0,
        reorder_quantity: Number(editing.reorder_quantity) || 0,
        description: editing.description,
        is_active: editing.is_active,
      });
      setEditing(null);
      await load();
    } catch (caught) {
      setPartFormError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  function openMove(part: PartRow | PartDetail) {
    const firstWithStock = part.locations.find((row) => Number(row.quantity) > 0) ?? part.locations[0];
    setMoveForm({
      kind: "receive",
      location_id: firstWithStock?.location_id ?? locations[0]?.id ?? "",
      quantity: "1",
      note: "",
    });
    setMoveTarget(part);
  }

  async function submitMove() {
    if (!moveTarget) return;
    setBusy(true);
    try {
      await partsApi.move({
        part_id: moveTarget.id,
        location_id: moveForm.location_id,
        kind: moveForm.kind,
        quantity: Number(moveForm.quantity) || 0,
        note: moveForm.note,
      });
      setMoveTarget(null);
      if (detail) await openDetail(detail.id);
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitLocation() {
    if (!locationDraft) return;
    setBusy(true);
    try {
      await partsApi.saveLocation({ name: locationDraft.name, kind: locationDraft.kind, notes: locationDraft.notes });
      setLocationDraft(null);
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOrder() {
    if (!orderDraft) return;
    setBusy(true);
    try {
      await partsApi.saveOrder({
        supplier: orderDraft.supplier,
        expected_on: orderDraft.expected_on || null,
        notes: orderDraft.notes,
        lines: orderDraft.lines
          .filter((line) => line.part_id)
          .map((line) => ({
            part_id: line.part_id,
            quantity: Number(line.quantity) || 0,
            unit_cost: Number(line.unit_cost) || 0,
          })),
      });
      setOrderDraft(null);
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  async function setOrderStatus(order: PurchaseOrderRow, status: PurchaseOrderStatus) {
    setBusy(true);
    try {
      await partsApi.setOrderStatus(order.id, status);
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReceive() {
    if (!receive) return;
    setBusy(true);
    try {
      await partsApi.receive(receive.line.id, Number(receive.quantity) || 0, receive.location_id);
      setReceive(null);
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  async function seedDemo() {
    setBusy(true);
    try {
      await partsApi.seedDemo();
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !metrics) return <Loading label="Loading stock" />;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-[#F2F7FF]">Stock</h1>
          <p className="mt-1 text-[12px] text-[#8A99AB]">
            Parts catalog, warehouse and van counts, and purchase orders. Every count change is a ledger entry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void load()} disabled={busy}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button onClick={() => downloadCsv(exportName("parts"), partsCsv(visible))} disabled={visible.length === 0}>
            <ClipboardList size={13} /> CSV
          </Button>
          {canStock && (
            <Button onClick={() => setLocationDraft({ name: "", kind: "van", notes: "" })}>
              <Boxes size={13} /> New location
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => setEditing({ ...EMPTY_PART })}>
              <PackagePlus size={13} /> New part
            </Button>
          )}
          {canOrder && (
            <Button variant="primary" onClick={() => setOrderDraft({ supplier: "", expected_on: "", notes: "", lines: [{ part_id: "", quantity: "1", unit_cost: "0" }] })}>
              <Truck size={13} /> New order
            </Button>
          )}
        </div>
      </header>

      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active SKUs" value={String(metrics?.skus ?? 0)} hint={`${metrics?.all_skus ?? 0} in the catalog`} tone="accent" />
        <Stat
          label="Stock value"
          value={formatMoney(metrics?.stock_value ?? 0)}
          hint="At cost, across every location"
          tone="good"
        />
        <Stat
          label="At reorder point"
          value={String(metrics?.low_stock ?? 0)}
          hint={lowCount ? "Order before the next job" : "Nothing needs ordering"}
          tone={(metrics?.low_stock ?? 0) > 0 ? "warn" : "good"}
        />
        <Stat
          label="Open orders"
          value={String(metrics?.open_orders ?? 0)}
          hint={`${metrics?.movements_30d ?? 0} movements in 30 days`}
          tone="muted"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`rounded-full px-3 py-1.5 text-[12px] transition ${
              tab === entry.key
                ? "border border-[#29E6FF]/30 bg-[#29E6FF]/10 text-[#9DF3FF]"
                : "border border-white/10 text-[#8A99AB] hover:text-white"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <Panel
          title="On hand"
          subtitle={`${visible.length} part${visible.length === 1 ? "" : "s"} shown`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6F84]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, SKU, brand"
                  className={`${inputClass} w-[190px] pl-8`}
                />
              </div>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={`${inputClass} w-[150px]`}>
                <option value="">All categories</option>
                {(metrics?.categories ?? []).map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <Button
                variant={lowOnly ? "primary" : "ghost"}
                onClick={() => setLowOnly((current) => !current)}
                title="Only parts at or below their reorder point"
              >
                Low only
              </Button>
            </div>
          }
        >
          {visible.length === 0 ? (
            <Empty
              title={parts.some((part) => part.is_active) ? "No parts match that filter" : "No parts yet"}
              body={
                parts.some((part) => part.is_active)
                  ? "Clear the search or the low-stock filter to see the rest of the catalog."
                  : "Add the first part to start tracking stock, or load the demo catalog to see how the ledger behaves."
              }
              action={
                (canOrder || canEdit) && !parts.some((part) => part.is_active) ? (
                  <div className="mt-2 flex gap-2">
                    {canEdit && <Button onClick={() => setEditing({ ...EMPTY_PART })}>Add a part</Button>}
                    {canOrder && <Button onClick={() => void seedDemo()}>Load demo stock</Button>}
                  </div>
                ) : undefined
              }
            />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Part", "On hand", "Status", "Value", ""].map((cell) => (
                      <th
                        key={cell}
                        className="whitespace-nowrap border-b border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((part) => (
                    <tr key={part.id} className="align-top transition hover:bg-white/[0.02]">
                      <td className="border-b border-white/[0.05] px-3 py-2.5">
                        <button type="button" onClick={() => void openDetail(part.id)} className="text-left">
                          <div className="text-[12.5px] font-medium text-[#E8EEF9]">{part.name}</div>
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6F7D91]">
                            {part.sku} · {part.category}
                            {part.is_active ? "" : " · archived"}
                          </div>
                        </button>
                      </td>
                      <td className="whitespace-nowrap border-b border-white/[0.05] px-3 py-2.5 text-[12px] text-[#DCE6F5]">
                        {unitCopy(part.quantity, part.unit)}
                        {part.reorder_point > 0 && (
                          <div className="mt-0.5 text-[10px] text-[#6F7D91]">reorder at {qtyCopy(part.reorder_point)}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap border-b border-white/[0.05] px-3 py-2.5">
                        <Pill tone={stockTone(part)}>{stockCopy(part)}</Pill>
                      </td>
                      <td className="whitespace-nowrap border-b border-white/[0.05] px-3 py-2.5 text-[12px] text-[#AEBBCC]">
                        {formatMoney(part.stock_value, part.currency)}
                      </td>
                      <td className="whitespace-nowrap border-b border-white/[0.05] px-3 py-2.5 text-right">
                        {canStock && (
                          <Button onClick={() => openMove(part)} className="px-2.5 py-1 text-[11px]">
                            Move
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "catalog" && (
        <Panel title="Catalog" subtitle="Cost, sale price and reorder rules for every part">
          {parts.length === 0 ? (
            <Empty title="The catalog is empty" body="Parts exist per SKU, with a cost, a sale price and an optional reorder point." />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr>
                    {["SKU", "Name", "Category", "Cost", "Sale", "Margin", "Reorder", ""].map((cell) => (
                      <th
                        key={cell}
                        className="whitespace-nowrap border-b border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parts.map((part) => (
                    <tr key={part.id} className="hover:bg-white/[0.02]">
                      <td className="border-b border-white/[0.05] px-3 py-2 font-mono text-[11px] text-[#9FB0C4]">{part.sku}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[12.5px] text-[#E8EEF9]">
                        {part.name}
                        {part.is_active ? "" : <span className="ml-2 text-[10px] text-[#6F7D91]">archived</span>}
                      </td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[12px] text-[#AEBBCC]">{part.category}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[12px] text-[#AEBBCC]">{formatMoney(part.unit_cost, part.currency)}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[12px] text-[#AEBBCC]">{formatMoney(part.sale_price, part.currency)}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[12px] text-[#9DF3FF]">
                        {formatMoney(part.sale_price - part.unit_cost, part.currency)}
                      </td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[12px] text-[#AEBBCC]">
                        {part.reorder_point > 0 ? qtyCopy(part.reorder_point) : "—"}
                      </td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-right">
                        {canEdit && (
                          <Button onClick={() => setEditing(formFrom(part))} className="px-2.5 py-1 text-[11px]">
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "orders" && (
        <Panel
          title="Purchase orders"
          subtitle="Raise an order, then receive it line by line into a location"
          action={
            canOrder ? (
              <Button onClick={() => downloadCsv(exportName("purchase-orders"), purchaseOrdersCsv(orders))} disabled={orders.length === 0}>
                <ClipboardList size={13} /> CSV
              </Button>
            ) : undefined
          }
        >
          {orders.length === 0 ? (
            <Empty
              title="No purchase orders"
              body="An order groups the parts you asked a supplier for. Receiving a line puts stock on a shelf and leaves a ledger entry."
              action={canOrder ? <Button onClick={() => setOrderDraft({ supplier: "", expected_on: "", notes: "", lines: [{ part_id: "", quantity: "1", unit_cost: "0" }] })}>Raise an order</Button> : undefined}
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9FB0C4]">{order.reference}</span>
                        <Pill tone={orderTone(order.status)}>{orderStatusCopy(order.status)}</Pill>
                      </div>
                      <div className="mt-1 text-[12px] text-[#E8EEF9]">{order.supplier}</div>
                      <div className="mt-0.5 text-[11px] text-[#7E8CA0]">
                        {order.expected_on ? `Expected ${order.expected_on}` : "No expected date"} · {formatMoney(order.total, order.currency)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canOrder && order.status === "draft" && (
                        <Button onClick={() => void setOrderStatus(order, "sent")} disabled={busy}>
                          Mark sent
                        </Button>
                      )}
                      {canOrder && (order.status === "draft" || order.status === "sent") && (
                        <Button variant="danger" onClick={() => void setOrderStatus(order, "cancelled")} disabled={busy}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead>
                        <tr>
                          {["Part", "Ordered", "Received", "Progress", ""].map((cell) => (
                            <th
                              key={cell}
                              className="whitespace-nowrap border-b border-white/[0.06] px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#6F7D91]"
                            >
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="border-b border-white/[0.04] px-2 py-2 text-[12px] text-[#DCE6F5]">
                              {line.part_name}
                              <span className="ml-2 font-mono text-[10px] text-[#6F7D91]">{line.sku}</span>
                            </td>
                            <td className="border-b border-white/[0.04] px-2 py-2 text-[12px] text-[#AEBBCC]">{qtyCopy(line.quantity)}</td>
                            <td className="border-b border-white/[0.04] px-2 py-2 text-[12px] text-[#AEBBCC]">{qtyCopy(line.received_quantity)}</td>
                            <td className="border-b border-white/[0.04] px-2 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-[80px] overflow-hidden rounded-full bg-white/[0.08]">
                                  <div className="h-full rounded-full bg-[#29E6FF]" style={{ width: `${orderProgress(line)}%` }} />
                                </div>
                                <span className="font-mono text-[10px] text-[#7E8CA0]">{orderProgress(line)}%</span>
                              </div>
                            </td>
                            <td className="border-b border-white/[0.04] px-2 py-2 text-right">
                              {(canStock || canOrder) && line.remaining > 0 && order.status !== "cancelled" && (
                                <Button
                                  onClick={() =>
                                    setReceive({
                                      order,
                                      line,
                                      quantity: String(line.remaining),
                                      location_id: locations[0]?.id ?? "",
                                    })
                                  }
                                  className="px-2.5 py-1 text-[11px]"
                                >
                                  Receive
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Part detail */}
      {detail && (
        <Modal
          title={`${detail.name} · ${detail.sku}`}
          onClose={() => setDetail(null)}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              {canEdit && <Button onClick={() => setEditing(formFrom(detail))}>Edit part</Button>}
              {canStock && <Button variant="primary" onClick={() => openMove(detail)}>Move stock</Button>}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] border border-white/[0.07] p-2.5">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6F7D91]">On hand</div>
                <div className="mt-1 text-[15px] text-[#F2F7FF]">{unitCopy(detail.quantity, detail.unit)}</div>
              </div>
              <div className="rounded-[10px] border border-white/[0.07] p-2.5">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6F7D91]">Cost / sale</div>
                <div className="mt-1 text-[15px] text-[#F2F7FF]">
                  {formatMoney(detail.unit_cost, detail.currency)} · {formatMoney(detail.sale_price, detail.currency)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#6F7D91]">Locations</div>
              {detail.locations.length === 0 ? (
                <p className="text-[12px] text-[#8A99AB]">No stock recorded at any location yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.locations.map((row) => (
                    <div key={row.location_id} className="flex items-center justify-between rounded-[10px] bg-white/[0.02] px-3 py-2">
                      <div className="text-[12px] text-[#DCE6F5]">
                        {row.name}
                        <span className="ml-2 text-[10px] uppercase tracking-[0.1em] text-[#6F7D91]">{locationKindCopy(row.kind)}</span>
                      </div>
                      <div className="text-[12px] text-[#AEBBCC]">{unitCopy(row.quantity, detail.unit)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#6F7D91]">Last movements</div>
              {detail.movements.length === 0 ? (
                <p className="text-[12px] text-[#8A99AB]">Nothing has moved yet.</p>
              ) : (
                <div className="space-y-1">
                  {detail.movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill tone={movementTone(movement.kind)}>{movementLabel(movement.kind)}</Pill>
                          <span className="truncate text-[11px] text-[#8A99AB]">
                            {movement.location_name}
                            {movement.ticket_number ? ` · ticket #${movement.ticket_number}` : ""}
                          </span>
                        </div>
                        {movement.note && <div className="mt-0.5 truncate text-[10px] text-[#6F7D91]">{movement.note}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-[#DCE6F5]">{movementDelta(movement.kind, movement.quantity)}</div>
                        <div className="font-mono text-[9px] text-[#6F7D91]">→ {qtyCopy(movement.balance_after)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Part editor */}
      {editing && (
        <Modal
          title={editing.id ? "Edit part" : "New part"}
          onClose={() => {
            setEditing(null);
            setPartFormError("");
          }}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submitPart()} disabled={busy}>
                {editing.id ? "Save part" : "Create part"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {partFormError && <ErrorNote message={partFormError} />}
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU">
                <input value={editing.sku} onChange={(event) => setEditing({ ...editing, sku: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Name">
                <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Category">
                <input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Brand">
                <input value={editing.brand} onChange={(event) => setEditing({ ...editing, brand: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Unit">
                <input value={editing.unit} onChange={(event) => setEditing({ ...editing, unit: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Supplier">
                <input value={editing.supplier} onChange={(event) => setEditing({ ...editing, supplier: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Unit cost">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editing.unit_cost}
                  onChange={(event) => setEditing({ ...editing, unit_cost: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Sale price">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editing.sale_price}
                  onChange={(event) => setEditing({ ...editing, sale_price: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Reorder point" hint="Low-stock alert when the total reaches this.">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={editing.reorder_point}
                  onChange={(event) => setEditing({ ...editing, reorder_point: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Reorder quantity">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={editing.reorder_quantity}
                  onChange={(event) => setEditing({ ...editing, reorder_quantity: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                rows={2}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-[12px] text-[#AEBBCC]">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-[#0B1119]"
              />
              Active — archived parts stay on historic tickets but leave the pickers
            </label>
          </div>
        </Modal>
      )}

      {/* Stock move */}
      {moveTarget && (
        <Modal
          title={`Move stock · ${moveTarget.name}`}
          onClose={() => setMoveTarget(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setMoveTarget(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submitMove()} disabled={busy || !moveForm.location_id}>
                Apply movement
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] text-[#8A99AB]">
              On hand now: <span className="text-[#E8EEF9]">{unitCopy(moveTarget.quantity, moveTarget.unit)}</span>
              {moveTarget.locations.length > 0 && (
                <span className="ml-2">
                  (
                  {moveTarget.locations
                    .map((row) => `${row.name} ${qtyCopy(row.quantity)}`)
                    .join(" · ")}
                  )
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Movement">
                <select
                  value={moveForm.kind}
                  onChange={(event) => setMoveForm({ ...moveForm, kind: event.target.value as StockMovementKind })}
                  className={inputClass}
                >
                  {MOVEMENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {movementLabel(kind)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <select
                  value={moveForm.location_id}
                  onChange={(event) => setMoveForm({ ...moveForm, location_id: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Choose a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label={moveForm.kind === "adjust" ? "Counted quantity" : "Quantity"}
              hint={moveForm.kind === "adjust" ? "An adjustment sets the count to this number." : undefined}
            >
              <input
                type="number"
                step="1"
                min={moveForm.kind === "adjust" ? "0" : "1"}
                value={moveForm.quantity}
                onChange={(event) => setMoveForm({ ...moveForm, quantity: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Note" hint="Shown in the ledger, so say why.">
              <input value={moveForm.note} onChange={(event) => setMoveForm({ ...moveForm, note: event.target.value })} className={inputClass} />
            </Field>
          </div>
        </Modal>
      )}

      {/* New order */}
      {orderDraft && (
        <Modal
          title="New purchase order"
          onClose={() => setOrderDraft(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setOrderDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submitOrder()} disabled={busy}>
                Save as draft
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Supplier">
                <input
                  value={orderDraft.supplier}
                  onChange={(event) => setOrderDraft({ ...orderDraft, supplier: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Expected">
                <input
                  type="date"
                  value={orderDraft.expected_on}
                  onChange={(event) => setOrderDraft({ ...orderDraft, expected_on: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6F7D91]">Lines</div>
              {orderDraft.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_70px_80px_28px] items-end gap-2">
                  <select
                    value={line.part_id}
                    onChange={(event) => {
                      const part = activeParts.find((entry) => entry.id === event.target.value);
                      const next = [...orderDraft.lines];
                      next[index] = {
                        ...line,
                        part_id: event.target.value,
                        unit_cost: part ? String(part.unit_cost) : line.unit_cost,
                      };
                      setOrderDraft({ ...orderDraft, lines: next });
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose a part</option>
                    {activeParts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.sku} — {part.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(event) => {
                      const next = [...orderDraft.lines];
                      next[index] = { ...line, quantity: event.target.value };
                      setOrderDraft({ ...orderDraft, lines: next });
                    }}
                    className={inputClass}
                    aria-label="Quantity"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_cost}
                    onChange={(event) => {
                      const next = [...orderDraft.lines];
                      next[index] = { ...line, unit_cost: event.target.value };
                      setOrderDraft({ ...orderDraft, lines: next });
                    }}
                    className={inputClass}
                    aria-label="Unit cost"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setOrderDraft({
                        ...orderDraft,
                        lines: orderDraft.lines.length === 1 ? orderDraft.lines : orderDraft.lines.filter((_, i) => i !== index),
                      })
                    }
                    className="pb-2 text-[11px] text-[#8A99AB] hover:text-white"
                    aria-label="Remove line"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button
                onClick={() => setOrderDraft({ ...orderDraft, lines: [...orderDraft.lines, { part_id: "", quantity: "1", unit_cost: "0" }] })}
                className="px-2.5 py-1 text-[11px]"
              >
                <Boxes size={12} /> Add line
              </Button>
            </div>
            <Field label="Notes">
              <input
                value={orderDraft.notes}
                onChange={(event) => setOrderDraft({ ...orderDraft, notes: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Receive a line */}
      {receive && (
        <Modal
          title={`Receive · ${receive.line.part_name}`}
          onClose={() => setReceive(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setReceive(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submitReceive()} disabled={busy || !receive.location_id}>
                Receive into stock
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] text-[#8A99AB]">
              {receive.order.reference} · {receive.line.quantity - receive.line.received_quantity} of {receive.line.quantity} still to come
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={receive.quantity}
                  onChange={(event) => setReceive({ ...receive, quantity: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Into">
                <select
                  value={receive.location_id}
                  onChange={(event) => setReceive({ ...receive, location_id: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Choose a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-[11px] text-[#7E8CA0]">
              Receiving writes a ledger entry at the order&apos;s unit cost. The order only closes when every line is complete.
            </p>
          </div>
        </Modal>
      )}

      {/* New location */}
      {locationDraft && (
        <Modal
          title="New stock location"
          onClose={() => setLocationDraft(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setLocationDraft(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submitLocation()} disabled={busy || locationDraft.name.trim().length < 2}>
                Create location
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <Field label="Name" hint="Warehouse, van or kit — the name is what the ledger shows.">
              <input
                value={locationDraft.name}
                onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })}
                className={inputClass}
                placeholder="Van 2 — Porto"
              />
            </Field>
            <Field label="Kind">
              <select
                value={locationDraft.kind}
                onChange={(event) => setLocationDraft({ ...locationDraft, kind: event.target.value as (typeof LOCATION_KINDS)[number] })}
                className={inputClass}
              >
                {LOCATION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {locationKindCopy(kind)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input
                value={locationDraft.notes}
                onChange={(event) => setLocationDraft({ ...locationDraft, notes: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
