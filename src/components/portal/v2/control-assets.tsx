"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, ChevronRight, Plus, RefreshCw, Server, Trash2 } from "lucide-react";
import {
  controlApi,
  controlReads,
  describeError,
  expiringWarranties,
  humanise,
  rackLayout,
  rackOccupancy,
  statusTone,
  type AssetKind,
  type AssetRow,
  type AssetStatus,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, inputClass } from "@/components/portal/v2/ui";

type Site = { id: string; name: string; organization_id: string; address: string };

const KINDS: AssetKind[] = ["room", "row", "rack", "device"];
const STATUSES: AssetStatus[] = ["planned", "in_service", "maintenance", "decommissioned", "retired"];

const BLANK = {
  name: "",
  kind: "device" as AssetKind,
  status: "in_service" as AssetStatus,
  model: "",
  serial_number: "",
  vendor: "",
  asset_tag: "",
  u_position: "",
  u_height: "1",
  power_draw_w: "",
  notes: "",
};

/** R2 asset inventory (§7.1): site → room → row → rack → device, with U occupancy. */
export function ControlAssets({ canEdit }: { canEdit: boolean }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof BLANK | null>(null);
  const [formSiteId, setFormSiteId] = useState<string>("");
  const [formParentId, setFormParentId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextAssets, nextSites] = await Promise.all([controlReads.assets(), controlReads.sites()]);
      setAssets(nextAssets);
      setSites(nextSites);
      setFormSiteId((current) => current || nextSites[0]?.id || "");
      setSelectedId((current) => current ?? nextAssets[0]?.id ?? null);
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const childrenOf = useCallback((parentId: string | null) => assets.filter((asset) => asset.parent_id === parentId), [assets]);
  const selected = useMemo(() => assets.find((asset) => asset.id === selectedId) ?? null, [assets, selectedId]);
  const selectedChildren = useMemo(() => (selected ? childrenOf(selected.id) : []), [selected, childrenOf]);
  const layout = useMemo(() => (selected?.kind === "rack" ? rackLayout(selectedChildren) : []), [selected, selectedChildren]);
  const occupancy = useMemo(() => (selected?.kind === "rack" ? rackOccupancy(selectedChildren) : null), [selected, selectedChildren]);
  const warranties = useMemo(() => expiringWarranties(assets, 90), [assets]);

  const openForm = (kind: AssetKind, parentId: string | null, siteId: string) => {
    setForm({ ...BLANK, kind });
    setFormParentId(parentId ?? "");
    setFormSiteId(siteId);
  };

  const submit = async () => {
    if (!form) return;
    setBusy(true);
    setNote("");
    try {
      await controlApi.saveAsset({
        p_id: null,
        p_site_id: formSiteId,
        p_parent_id: formParentId || null,
        p_kind: form.kind,
        p_name: form.name,
        p_status: form.status,
        p_model: form.model || null,
        p_serial_number: form.serial_number || null,
        p_vendor: form.vendor || null,
        p_asset_tag: form.asset_tag || null,
        p_u_position: form.u_position ? Number(form.u_position) : null,
        p_u_height: form.u_height ? Number(form.u_height) : 1,
        p_power_draw_w: form.power_draw_w ? Number(form.power_draw_w) : null,
        p_notes: form.notes,
      });
      setNote(`Saved ${form.kind} "${form.name}".`);
      setForm(null);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (asset: AssetRow) => {
    setBusy(true);
    setNote("");
    try {
      await controlApi.deleteAsset(asset.id);
      setNote(`Deleted "${asset.name}". The deletion is in the asset event log.`);
      setSelectedId(null);
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && assets.length === 0) return <Loading label="Loading inventory" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <Panel title="Locations" subtitle="Rooms, rows, racks and devices" action={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></Button>}>
          {sites.length === 0 ? (
            <Empty title="No sites" body="Create a client site first — assets always hang off a site so the map and access codes stay consistent." />
          ) : (
            <div className="space-y-3">
              {sites.map((site) => {
                const siteAssets = assets.filter((asset) => asset.site_id === site.id && asset.parent_id === null);
                const siteDevices = assets.filter((asset) => asset.site_id === site.id).length;
                return (
                  <div key={site.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-[#E8EEF9]">{site.name}</div>
                        <div className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#7E8CA0]">{site.address}</div>
                      </div>
                      {canEdit && (
                        <button type="button" onClick={() => openForm("room", null, site.id)} className="rounded-full p-1 text-[#29E6FF] hover:bg-white/10" title="Add a room">
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      {siteAssets.length === 0 && <div className="pl-1 text-[11px] text-[#5F6F84]">No rooms recorded · {siteDevices} assets</div>}
                      {siteAssets.map((asset) => (
                        <AssetBranch
                          key={asset.id}
                          asset={asset}
                          depth={0}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          childrenOf={childrenOf}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title={selected ? selected.name : "Select an asset"}
            subtitle={selected ? `${humanise(selected.kind)} · ${humanise(selected.status)}${selected.rack_label ? ` · rack ${selected.rack_label}` : ""}` : "Pick a location on the left"}
            action={
              selected && canEdit ? (
                <div className="flex gap-2">
                  <Button onClick={() => openForm("device", selected.kind === "rack" ? selected.id : selected.parent_id, selected.site_id)}>
                    <Plus size={13} /> Child
                  </Button>
                  <Button variant="danger" onClick={() => void remove(selected)} disabled={busy}>
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              ) : undefined
            }
          >
            {!selected ? (
              <Empty title="Nothing selected" body="Every asset lives in a site, room, row, rack, device hierarchy so you can find kit years later." />
            ) : (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ["Model", selected.model ?? "—"],
                    ["Serial", selected.serial_number ?? "—"],
                    ["Vendor", selected.vendor ?? "—"],
                    ["Asset tag", selected.asset_tag ?? "—"],
                    ["Power", selected.power_draw_w ? `${selected.power_draw_w} W` : "—"],
                    ["Warranty", selected.warranty_expires_at ? new Date(selected.warranty_expires_at).toLocaleDateString("en-GB") : "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#7E8CA0]">{label}</dt>
                      <dd className="truncate text-[12px] text-[#DCE6F5]">{value}</dd>
                    </div>
                  ))}
                </dl>

                {selected.kind === "rack" && occupancy && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9AA9BC]">
                        U occupancy · {occupancy.used}/42 used · {occupancy.percent}%
                      </span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.08]">
                        <span className="block h-full rounded-full bg-[#29E6FF]" style={{ width: `${occupancy.percent}%` }} />
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: 42 }, (_, index) => 42 - index).map((u) => {
                        const slot = layout.find((entry) => entry.u === u);
                        const device = slot?.devices[0];
                        return (
                          <div
                            key={u}
                            className={`rounded-[6px] border px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.06em] ${
                              device
                                ? "border-[#29E6FF]/30 bg-[#29E6FF]/10 text-[#9DF3FF]"
                                : "border-white/[0.06] bg-white/[0.015] text-[#4C5A6D]"
                            }`}
                            title={device ? `${device.name} (${device.serial_number ?? "no serial"})` : `U${u} free`}
                          >
                            U{u} · {device ? device.name.slice(0, 16) : "free"}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedChildren.length > 0 && (
                  <div>
                    <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9AA9BC]">Children</div>
                    <ul className="space-y-1">
                      {selectedChildren.map((child) => (
                        <li key={child.id}>
                          <button type="button" onClick={() => setSelectedId(child.id)} className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left hover:bg-white/[0.04]">
                            <Boxes size={12} className="text-[#29E6FF]" />
                            <span className="flex-1 truncate text-[12px] text-[#DCE6F5]">{child.name}</span>
                            <Pill tone={statusTone(child.status)}>{humanise(child.status)}</Pill>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.notes && <p className="text-[11.5px] leading-relaxed text-[#8A99AB]">{selected.notes}</p>}
              </div>
            )}
            {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
          </Panel>

          <Panel title="Warranty watchlist" subtitle="Anything expiring in the next 90 days">
            {warranties.length === 0 ? (
              <p className="text-[12px] text-[#7E8CA0]">Nothing expiring. Good news for the budget.</p>
            ) : (
              <ul className="space-y-1">
                {warranties.map((asset) => (
                  <li key={asset.id} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-white/[0.03]">
                    <Server size={12} className="text-[#FFB020]" />
                    <button type="button" onClick={() => setSelectedId(asset.id)} className="flex-1 truncate text-left text-[12px] text-[#DCE6F5]">
                      {asset.name}
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#FFB020]">
                      {asset.warranty_expires_at ? new Date(asset.warranty_expires_at).toLocaleDateString("en-GB") : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {form && (
        <Modal
          title={`Add ${form.kind}`}
          onClose={() => setForm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setForm(null)}>Cancel</Button>
              <Button variant="primary" onClick={() => void submit()} disabled={busy || !form.name.trim()}>
                Save {form.kind}
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="e.g. Leaf switch A1-01-05" />
              </Field>
            </div>
            <Field label="Kind">
              <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as AssetKind })} className={inputClass}>
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {humanise(kind)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AssetStatus })} className={inputClass}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {humanise(status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Serial number">
              <input value={form.serial_number} onChange={(event) => setForm({ ...form, serial_number: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Vendor">
              <input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Asset tag">
              <input value={form.asset_tag} onChange={(event) => setForm({ ...form, asset_tag: event.target.value })} className={inputClass} />
            </Field>
            <Field label="U position" hint="Top of the device, 1–42">
              <input value={form.u_position} onChange={(event) => setForm({ ...form, u_position: event.target.value })} inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="U height">
              <input value={form.u_height} onChange={(event) => setForm({ ...form, u_height: event.target.value })} inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="Power draw (W)">
              <input value={form.power_draw_w} onChange={(event) => setForm({ ...form, power_draw_w: event.target.value })} inputMode="numeric" className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} className={inputClass} />
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AssetBranch({
  asset,
  depth,
  selectedId,
  onSelect,
  childrenOf,
}: {
  asset: AssetRow;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  childrenOf: (parentId: string | null) => AssetRow[];
}) {
  const children = childrenOf(asset.id);
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(asset.id)}
        style={{ paddingLeft: 6 + depth * 12 }}
        className={`flex w-full items-center gap-1.5 rounded-[7px] py-1 pr-1.5 text-left ${asset.id === selectedId ? "bg-[#29E6FF]/10" : "hover:bg-white/[0.04]"}`}
      >
        <ChevronRight size={11} className={children.length > 0 ? "text-[#29E6FF]" : "text-transparent"} />
        <span className="flex-1 truncate text-[11.5px] text-[#DCE6F5]">{asset.name}</span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#5F6F84]">{asset.kind}</span>
      </button>
      {children.map((child) => (
        <AssetBranch key={child.id} asset={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} childrenOf={childrenOf} />
      ))}
    </div>
  );
}
