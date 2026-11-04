"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import {
  LINE_UNITS,
  formatMoney,
  moneyApi,
  moneyError,
  type ClientOrg,
  type LineUnit,
  type RateCard,
  type RateCardLine,
} from "@/lib/portal-money";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, TableShell, inputClass } from "@/components/portal/v2/ui";

const UNITS: LineUnit[] = LINE_UNITS;
const ROLES: RateCardLine["crew_role"][] = ["engineer", "lead", "helper", "remote"];

const emptyLine = (): RateCardLine => ({
  category: "installation",
  crew_role: "engineer",
  unit: "hour",
  unit_price: 0,
  engineer_cost: null,
  min_units: 1,
  notes: "",
});

/** R3 rate cards: what each client has agreed to pay per role, per unit. */
export function MoneyRateCards({
  canManage,
  showCost,
  clients,
  onChanged,
}: {
  canManage: boolean;
  showCost: boolean;
  clients: ClientOrg[];
  onChanged: () => void;
}) {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
    id: string | null;
    organization_id: string;
    name: string;
    currency: string;
    country_code: string;
    vat_rate: number;
    is_default: boolean;
    valid_from: string;
    valid_to: string;
    notes: string;
    lines: RateCardLine[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCards(await moneyApi.listRateCards());
    } catch (caught) {
      setError(moneyError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (card?: RateCard) => {
    setForm({
      id: card?.id ?? null,
      organization_id: card?.organization_id ?? "",
      name: card?.name ?? "",
      currency: card?.currency ?? "EUR",
      country_code: card?.country_code ?? "",
      vat_rate: Number(card?.vat_rate ?? 23),
      is_default: card?.is_default ?? false,
      valid_from: card?.valid_from ?? new Date().toISOString().slice(0, 10),
      valid_to: card?.valid_to ?? "",
      notes: card?.notes ?? "",
      lines: card && card.lines.length > 0 ? card.lines : [emptyLine()],
    });
  };

  const save = async () => {
    if (!form) return;
    setBusy(true);
    setNote("");
    try {
      await moneyApi.saveRateCard({
        p_id: form.id,
        p_organization_id: form.organization_id || null,
        p_name: form.name,
        p_currency: form.currency || "EUR",
        p_country_code: form.country_code || null,
        p_vat_rate: form.vat_rate,
        p_is_default: form.is_default,
        p_valid_from: form.valid_from || null,
        p_valid_to: form.valid_to || null,
        p_notes: form.notes,
        p_lines: form.lines
          .filter((line) => Number(line.unit_price) > 0)
          .map((line) => ({
            category: line.category.trim() || "general",
            crew_role: line.crew_role,
            unit: line.unit,
            unit_price: Number(line.unit_price) || 0,
            engineer_cost: line.engineer_cost === null ? null : Number(line.engineer_cost),
            min_units: Number(line.min_units) || 1,
            notes: line.notes ?? "",
          })),
      });
      setNote(`Saved rate card "${form.name}".`);
      setForm(null);
      await load();
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (card: RateCard) => {
    setBusy(true);
    setNote("");
    try {
      await moneyApi.deleteRateCard(card.id);
      setNote(`Deleted "${card.name}".`);
      await load();
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && cards.length === 0) return <Loading label="Loading rate cards" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <Panel
        title="Rate cards"
        subtitle="Agreed sell rates per role. The default card is what a quote falls back to when a client has no signed card."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => open()}>
                <Plus size={13} /> New card
              </Button>
            )}
          </div>
        }
      >
        {cards.length === 0 ? (
          <Empty
            title="No rate cards"
            body="Rate cards are the price list behind every quote line. Create one default card and per-client overrides as contracts land."
            action={
              canManage ? (
                <Button variant="primary" onClick={() => open()}>
                  <Plus size={13} /> Create a rate card
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <div key={card.id} className="rounded-[12px] border border-white/[0.08] bg-white/[0.015]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] text-[#E8EEF9]">{card.name}</span>
                      {card.is_default && <Pill tone="accent">default</Pill>}
                      {!card.is_active && <Pill tone="muted">inactive</Pill>}
                      {card.is_demo && <Pill tone="warn">demo</Pill>}
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
                      {card.client_name ?? "all clients"} · {card.currency} · VAT {Number(card.vat_rate)}% · from{" "}
                      {new Date(card.valid_from).toLocaleDateString("en-GB")}
                      {card.valid_to ? ` to ${new Date(card.valid_to).toLocaleDateString("en-GB")}` : ""}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1.5">
                      <Button onClick={() => open(card)}>Edit</Button>
                      <Button variant="danger" onClick={() => void remove(card)} disabled={busy}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  )}
                </div>
                <TableShell head={showCost ? ["Category", "Role", "Unit", "Sell rate", "Engineer cost", "Min units"] : ["Category", "Role", "Unit", "Sell rate", "Min units"]}>
                  {card.lines.map((line, index) => (
                    <tr key={line.id ?? index}>
                      <td className="border-b border-white/[0.06] px-3 py-2 text-[12px] text-[#C7D3E3]">{line.category}</td>
                      <td className="border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#9AA9BC]">
                        {line.crew_role}
                      </td>
                      <td className="border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#9AA9BC]">
                        {line.unit}
                      </td>
                      <td className="border-b border-white/[0.06] px-3 py-2 font-mono text-[11.5px] text-[#E8EEF9]">
                        {formatMoney(line.unit_price, card.currency)}
                      </td>
                      {showCost && (
                        <td className="border-b border-white/[0.06] px-3 py-2 font-mono text-[11px] text-[#8A99AB]">
                          {line.engineer_cost === null ? "—" : formatMoney(line.engineer_cost, card.currency)}
                        </td>
                      )}
                      <td className="border-b border-white/[0.06] px-3 py-2 font-mono text-[11px] text-[#8A99AB]">{line.min_units}</td>
                    </tr>
                  ))}
                </TableShell>
              </div>
            ))}
          </div>
        )}
        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
      </Panel>

      {form && (
        <Modal
          title={form.id ? "Edit rate card" : "New rate card"}
          onClose={() => setForm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void save()} disabled={busy || !form.name.trim()}>
                Save card
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="Standard 2026 rates" />
              </Field>
            </div>
            <Field label="Client" hint="Blank applies to every client">
              <select value={form.organization_id} onChange={(event) => setForm({ ...form, organization_id: event.target.value })} className={inputClass}>
                <option value="">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} className={inputClass} />
            </Field>
            <Field label="VAT %">
              <input value={form.vat_rate} onChange={(event) => setForm({ ...form, vat_rate: Number(event.target.value) })} inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="Country">
              <input value={form.country_code} onChange={(event) => setForm({ ...form, country_code: event.target.value.toUpperCase() })} className={inputClass} placeholder="PT" />
            </Field>
            <Field label="Valid from">
              <input type="date" value={form.valid_from} onChange={(event) => setForm({ ...form, valid_from: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Valid to" hint="Blank = open ended">
              <input type="date" value={form.valid_to} onChange={(event) => setForm({ ...form, valid_to: event.target.value })} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-[12px] text-[#C7D3E3] sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) => setForm({ ...form, is_default: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-[#0B1119]"
              />
              <span className="flex items-center gap-1">
                <Star size={12} className="text-[#29E6FF]" /> Use as the default card
              </span>
            </label>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} />
              </Field>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Rates</span>
              {form.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-2 gap-1.5 rounded-[10px] border border-white/[0.06] p-2 sm:grid-cols-7 sm:border-0 sm:p-0">
                  <input
                    value={line.category}
                    onChange={(event) => setForm({ ...form, lines: form.lines.map((row, position) => (position === index ? { ...row, category: event.target.value } : row)) })}
                    className={inputClass}
                    aria-label={`Rate ${index + 1} category`}
                  />
                  <select
                    value={line.crew_role}
                    onChange={(event) => setForm({ ...form, lines: form.lines.map((row, position) => (position === index ? { ...row, crew_role: event.target.value as RateCardLine["crew_role"] } : row)) })}
                    className={inputClass}
                    aria-label={`Rate ${index + 1} role`}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <select
                    value={line.unit}
                    onChange={(event) => setForm({ ...form, lines: form.lines.map((row, position) => (position === index ? { ...row, unit: event.target.value as LineUnit } : row)) })}
                    className={inputClass}
                    aria-label={`Rate ${index + 1} unit`}
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <input
                    value={line.unit_price}
                    onChange={(event) => setForm({ ...form, lines: form.lines.map((row, position) => (position === index ? { ...row, unit_price: Number(event.target.value) } : row)) })}
                    inputMode="decimal"
                    className={inputClass}
                    aria-label={`Rate ${index + 1} sell rate`}
                    placeholder="sell"
                  />
                  {showCost && (
                    <input
                      value={line.engineer_cost ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((row, position) =>
                            position === index ? { ...row, engineer_cost: event.target.value === "" ? null : Number(event.target.value) } : row,
                          ),
                        })
                      }
                      inputMode="decimal"
                      className={inputClass}
                      aria-label={`Rate ${index + 1} engineer cost`}
                      placeholder="cost"
                    />
                  )}
                  <input
                    value={line.min_units}
                    onChange={(event) => setForm({ ...form, lines: form.lines.map((row, position) => (position === index ? { ...row, min_units: Number(event.target.value) } : row)) })}
                    inputMode="decimal"
                    className={inputClass}
                    aria-label={`Rate ${index + 1} minimum units`}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, lines: form.lines.filter((_, position) => position !== index) })}
                    className="justify-self-end rounded-full p-1 text-[#7E8CA0] hover:bg-white/10 hover:text-[#FFB4B4]"
                    aria-label={`Remove rate ${index + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <Button onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}>
                <Plus size={13} /> Add rate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
