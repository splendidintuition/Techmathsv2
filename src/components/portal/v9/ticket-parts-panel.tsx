"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Package, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/portal-money";
import {
  partError,
  partsApi,
  partsMargin,
  qtyCopy,
  unitCopy,
  type PartRow,
  type PartRow as Part,
  type TicketParts,
} from "@/lib/portal-parts";
import { Button, ErrorNote, Field, Loading, Pill, inputClass } from "@/components/portal/v2/ui";

/**
 * The parts drawer on a ticket. Stock leaves the shelf when a part is added here and comes back when
 * it is removed, so the ticket and the warehouse never disagree.
 */
export function TicketPartsPanel({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<TicketParts | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ part_id: string; location_id: string; quantity: string; billable: boolean; note: string }>({
    part_id: "",
    location_id: "",
    quantity: "1",
    billable: true,
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await partsApi.ticketParts(ticketId);
      setData(next);
    } catch (caught) {
      // A client account has no business seeing the warehouse; hide the panel instead of shouting.
      if (partError(caught).code === "not_authorized") setHidden(true);
      else setError(partError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadParts() {
    if (parts.length > 0) return;
    try {
      setParts((await partsApi.list(null, null, false, false)).filter((part) => part.is_active));
    } catch (caught) {
      setError(partError(caught).message);
    }
  }

  const selected: PartRow | undefined = parts.find((part) => part.id === draft.part_id);
  const stockLocations = (selected?.locations ?? []).filter((row) => Number(row.quantity) > 0);

  async function addPart() {
    if (!draft.part_id || !draft.location_id) return;
    setBusy(true);
    setError("");
    try {
      await partsApi.addTicketPart({
        ticket_id: ticketId,
        part_id: draft.part_id,
        location_id: draft.location_id,
        quantity: Number(draft.quantity) || 0,
        billable: draft.billable,
        note: draft.note,
      });
      setDraft({ part_id: "", location_id: "", quantity: "1", billable: true, note: "" });
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  async function removePart(id: string) {
    setBusy(true);
    setError("");
    try {
      await partsApi.removeTicketPart(id);
      await load();
    } catch (caught) {
      setError(partError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;
  if (loading && !data) return null;

  const totals = data?.totals ?? { count: 0, cost: 0, charge: 0 };
  const rows = data?.rows ?? [];

  return (
    <div className="border-b border-white/[0.06] bg-white/[0.015]">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          void loadParts();
        }}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2 text-[11px] text-[#AEBBCC]">
          <Package size={13} className="text-[#29E6FF]" />
          Parts used
          <span className="font-mono text-[10px] text-[#6F7D91]">
            {totals.count} item{totals.count === 1 ? "" : "s"}
            {totals.charge > 0 ? ` · ${formatMoney(totals.charge)} charge` : ""}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {totals.count > 0 && <Pill tone={partsMargin(totals) >= 0 ? "good" : "warn"}>{formatMoney(partsMargin(totals))} margin</Pill>}
          <ChevronDown size={14} className={`text-[#6F7D91] transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {error && <ErrorNote message={error} onRetry={() => void load()} />}
          {loading && <Loading label="Loading parts" />}

          {rows.length === 0 && !loading ? (
            <p className="text-[11px] text-[#7E8CA0]">Nothing booked out for this job yet.</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2 rounded-[10px] bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] text-[#E8EEF9]">
                      {row.name}
                      <span className="ml-2 font-mono text-[10px] text-[#6F7D91]">{row.sku}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-[#7E8CA0]">
                      {unitCopy(row.quantity, row.unit)}
                      {row.location_name ? ` from ${row.location_name}` : ""}
                      {row.billable ? "" : " · not billable"}
                      {row.warranty_until ? ` · warranty to ${row.warranty_until}` : ""}
                      {row.serial ? ` · ${row.serial}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[11px] text-[#DCE6F5]">{formatMoney(row.sale_price * row.quantity, row.currency)}</div>
                      <div className="font-mono text-[9px] text-[#6F7D91]">cost {formatMoney(row.unit_cost * row.quantity, row.currency)}</div>
                    </div>
                    {data?.flags.can_stock && (
                      <button
                        type="button"
                        onClick={() => void removePart(row.id)}
                        disabled={busy}
                        title="Return to stock"
                        aria-label="Return to stock"
                        className="rounded-lg p-1.5 text-[#6F7D91] transition hover:bg-white/[0.06] hover:text-[#FFB4B4]"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data?.flags.can_stock && (
            <div className="rounded-[10px] border border-white/[0.07] p-3">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#6F7D91]">Book out a part</div>
              <div className="grid gap-2 sm:grid-cols-[1fr_130px_70px]">
                <Field label="Part">
                  <select
                    value={draft.part_id}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const nextPart = parts.find((part) => part.id === nextId);
                      const firstLocation = (nextPart?.locations ?? []).find((row) => Number(row.quantity) > 0);
                      setDraft({ ...draft, part_id: nextId, location_id: firstLocation?.location_id ?? "" });
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose a part</option>
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.sku} — {part.name} ({qtyCopy(part.quantity)} left)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="From">
                  <select
                    value={draft.location_id}
                    onChange={(event) => setDraft({ ...draft, location_id: event.target.value })}
                    className={inputClass}
                  >
                    <option value="">Location</option>
                    {stockLocations.map((row) => (
                      <option key={row.location_id} value={row.location_id}>
                        {row.name} ({qtyCopy(row.quantity)})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Qty">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draft.quantity}
                    onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-[11px] text-[#8A99AB]">
                  <input
                    type="checkbox"
                    checked={draft.billable}
                    onChange={(event) => setDraft({ ...draft, billable: event.target.checked })}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-[#0B1119]"
                  />
                  Charge the client for this part
                </label>
                <Button
                  variant="primary"
                  onClick={() => void addPart()}
                  disabled={busy || !draft.part_id || !draft.location_id}
                  className="px-3 py-1.5 text-[11px]"
                >
                  <Plus size={12} /> Add to ticket
                </Button>
              </div>
              {selected && (
                <p className="mt-2 text-[10px] text-[#6F7D91]">
                  Leaves stock immediately. Sale {formatMoney(selected.sale_price, selected.currency)} · cost{" "}
                  {formatMoney(selected.unit_cost, selected.currency)}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
