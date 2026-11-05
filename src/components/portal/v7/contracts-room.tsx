"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, FileSignature, Lock, Plus, RefreshCw, Timer, Wallet } from "lucide-react";
import { moneyApi, type ClientOrg } from "@/lib/portal-money";
import {
  CONTRACT_COVERAGE,
  CONTRACT_KINDS,
  KIND_META,
  bundleUsagePct,
  complianceTone,
  contractApi,
  contractError,
  contractHeadline,
  contractStatusTone,
  expiringSoon,
  feeCopy,
  includedUsagePct,
  minutesCopy,
  windowCopy,
  type ContractInput,
  type ContractKind,
  type ContractMetrics,
  type ContractRow,
  type ContractStatus,
  type ContractCoverage,
} from "@/lib/portal-contracts";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, Stat, inputClass } from "@/components/portal/v2/ui";

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "paused", label: "Paused" },
  { key: "", label: "All" },
];

type FormState = {
  id: string | null;
  organization_id: string;
  kind: ContractKind;
  name: string;
  status: ContractStatus;
  reference: string;
  currency: string;
  starts_on: string;
  ends_on: string;
  response_hours: string;
  resolution_hours: string;
  coverage: ContractCoverage;
  monthly_fee: string;
  included_hours: string;
  bundle_hours: string;
  overage_rate: string;
  notes: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(orgId = "", kind: ContractKind = "sla_tier"): FormState {
  return {
    id: null,
    organization_id: orgId,
    kind,
    name: "",
    status: "draft",
    reference: "",
    currency: "EUR",
    starts_on: today(),
    ends_on: "",
    response_hours: kind === "sla_tier" ? "4" : "",
    resolution_hours: kind === "sla_tier" ? "24" : "",
    coverage: kind === "sla_tier" ? "24x7" : "business_hours",
    monthly_fee: "",
    included_hours: kind === "retainer" ? "20" : "",
    bundle_hours: kind === "prepaid_bundle" ? "40" : "",
    overage_rate: "",
    notes: "",
  };
}

function formFromContract(contract: ContractRow): FormState {
  return {
    id: contract.id,
    organization_id: contract.organization_id,
    kind: contract.kind,
    name: contract.name,
    status: contract.status,
    reference: contract.reference,
    currency: contract.currency,
    starts_on: contract.starts_on,
    ends_on: contract.ends_on ?? "",
    response_hours: contract.response_minutes ? String(contract.response_minutes / 60) : "",
    resolution_hours: contract.resolution_minutes ? String(contract.resolution_minutes / 60) : "",
    coverage: contract.coverage,
    monthly_fee: String(contract.monthly_fee ?? ""),
    included_hours: String(contract.included_hours ?? ""),
    bundle_hours: String(contract.bundle_hours ?? ""),
    overage_rate: contract.overage_rate === null ? "" : String(contract.overage_rate),
    notes: contract.notes,
  };
}

function hoursToMinutes(value: string): number | null {
  const hours = Number(value);
  if (!value.trim() || Number.isNaN(hours) || hours <= 0) return null;
  return Math.round(hours * 60);
}

function toInput(form: FormState): ContractInput {
  return {
    id: form.id,
    organization_id: form.organization_id,
    kind: form.kind,
    name: form.name.trim(),
    status: form.status,
    reference: form.reference.trim(),
    currency: form.currency,
    starts_on: form.starts_on,
    ends_on: form.ends_on || null,
    response_minutes: hoursToMinutes(form.response_hours),
    resolution_minutes: hoursToMinutes(form.resolution_hours),
    coverage: form.coverage,
    monthly_fee: Number(form.monthly_fee || 0),
    included_hours: Number(form.included_hours || 0),
    bundle_hours: Number(form.bundle_hours || 0),
    overage_rate: form.overage_rate.trim() ? Number(form.overage_rate) : null,
    notes: form.notes,
  };
}

function ContractEditor({
  form,
  clients,
  onClose,
  onSaved,
}: {
  form: FormState;
  clients: ClientOrg[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [state, setState] = useState<FormState>(form);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await contractApi.save(toInput(state));
      await onSaved();
      onClose();
    } catch (caught) {
      setError(contractError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  const isSla = state.kind === "sla_tier" || state.kind === "framework";
  const isRetainer = state.kind === "retainer";
  const isBundle = state.kind === "prepaid_bundle";

  return (
    <Modal
      title={state.id ? "Edit contract" : "New contract"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !state.organization_id || state.name.trim().length < 2}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save contract"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client">
            <select
              value={state.organization_id}
              onChange={(event) => update("organization_id", event.target.value)}
              className={inputClass}
              disabled={Boolean(state.id)}
            >
              <option value="">Choose a client…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind" hint={KIND_META[state.kind].hint}>
            <select
              value={state.kind}
              onChange={(event) => update("kind", event.target.value as ContractKind)}
              className={inputClass}
            >
              {CONTRACT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_META[kind].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Name">
          <input
            value={state.name}
            onChange={(event) => update("name", event.target.value)}
            className={inputClass}
            placeholder="Gold SLA 2026"
            maxLength={160}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <select
              value={state.status}
              onChange={(event) => update("status", event.target.value as ContractStatus)}
              className={inputClass}
            >
              {(["draft", "active", "paused", "expired", "cancelled"] as ContractStatus[]).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts">
            <input type="date" value={state.starts_on} onChange={(event) => update("starts_on", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Ends" hint="Leave empty for open ended.">
            <input type="date" value={state.ends_on} onChange={(event) => update("ends_on", event.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Reference">
            <input value={state.reference} onChange={(event) => update("reference", event.target.value)} className={inputClass} placeholder="PO-2026-14" />
          </Field>
          <Field label="Currency">
            <input value={state.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} className={inputClass} maxLength={3} />
          </Field>
          <Field label="Coverage">
            <select
              value={state.coverage}
              onChange={(event) => update("coverage", event.target.value as ContractCoverage)}
              className={inputClass}
            >
              {CONTRACT_COVERAGE.map((coverage) => (
                <option key={coverage} value={coverage}>
                  {coverage}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {isSla && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Response (hours)" hint="Copied onto every ticket raised during the contract.">
              <input value={state.response_hours} onChange={(event) => update("response_hours", event.target.value)} className={inputClass} inputMode="decimal" placeholder="4" />
            </Field>
            <Field label="Resolution (hours)">
              <input value={state.resolution_hours} onChange={(event) => update("resolution_hours", event.target.value)} className={inputClass} inputMode="decimal" placeholder="24" />
            </Field>
          </div>
        )}

        {isRetainer && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Monthly fee">
              <input value={state.monthly_fee} onChange={(event) => update("monthly_fee", event.target.value)} className={inputClass} inputMode="decimal" placeholder="1400" />
            </Field>
            <Field label="Included hours / month">
              <input value={state.included_hours} onChange={(event) => update("included_hours", event.target.value)} className={inputClass} inputMode="decimal" placeholder="20" />
            </Field>
            <Field label="Overage rate / hour">
              <input value={state.overage_rate} onChange={(event) => update("overage_rate", event.target.value)} className={inputClass} inputMode="decimal" placeholder="62" />
            </Field>
          </div>
        )}

        {isBundle && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prepaid hours">
              <input value={state.bundle_hours} onChange={(event) => update("bundle_hours", event.target.value)} className={inputClass} inputMode="decimal" placeholder="40" />
            </Field>
            <Field label="Overage rate / hour">
              <input value={state.overage_rate} onChange={(event) => update("overage_rate", event.target.value)} className={inputClass} inputMode="decimal" placeholder="58" />
            </Field>
          </div>
        )}

        <Field label="Notes">
          <textarea value={state.notes} onChange={(event) => update("notes", event.target.value)} rows={3} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

function ContractCard({
  contract,
  canManage,
  onEdit,
  onStatus,
  onConsume,
}: {
  contract: ContractRow;
  canManage: boolean;
  onEdit: () => void;
  onStatus: (status: ContractStatus) => void;
  onConsume: () => void;
}) {
  const includedPct = includedUsagePct(contract);
  const bundlePct = bundleUsagePct(contract);
  const compliance = contract.usage.sla_compliance_pct;

  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="accent">{KIND_META[contract.kind].label}</Pill>
            <Pill tone={contractStatusTone(contract.status)}>{contract.status}</Pill>
            {expiringSoon(contract) && <Pill tone="warn">expires soon</Pill>}
          </div>
          <div className="mt-1.5 truncate text-[13px] font-medium text-[#E8EEF9]">{contract.name}</div>
          <div className="mt-0.5 text-[11px] text-[#8A99AB]">
            {contract.organization_name}
            {contract.reference ? ` · ${contract.reference}` : ""}
          </div>
        </div>
        <div className="text-right text-[11px] text-[#8A99AB]">
          <div>{windowCopy(contract)}</div>
          <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#6E7A8F]">{feeCopy(contract)}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-[#AEBBCC] sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Timer size={12} className="text-[#29E6FF]" /> {contractHeadline(contract)}
        </div>
        <div className="flex items-center gap-1.5">
          <FileSignature size={12} className="text-[#29E6FF]" />
          {contract.usage.tickets} ticket{contract.usage.tickets === 1 ? "" : "s"} in scope
          {compliance !== null && (
            <span className="ml-1">
              <Pill tone={complianceTone(compliance)}>{Number(compliance)}% on time</Pill>
            </span>
          )}
        </div>
      </div>

      {(contract.kind === "retainer" || contract.kind === "prepaid_bundle") && (
        <div className="mt-3 space-y-1.5">
          {contract.kind === "retainer" && (
            <>
              <div className="flex items-center justify-between text-[10.5px] text-[#8A99AB]">
                <span>This month</span>
                <span>
                  {Number(contract.usage.hours_used)} h of {Number(contract.included_hours)} h
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${includedPct >= 100 ? "bg-[#FF6B6B]" : includedPct >= 80 ? "bg-[#FFB020]" : "bg-[#29E6FF]"}`}
                  style={{ width: `${includedPct}%` }}
                />
              </div>
              {contract.usage.overage_hours > 0 && (
                <div className="text-[10px] text-[#FFD48A]">
                  {Number(contract.usage.overage_hours)} h over included · {Number(contract.usage.overage_value).toFixed(2)}{" "}
                  {contract.currency} at the overage rate
                </div>
              )}
            </>
          )}
          {contract.kind === "prepaid_bundle" && (
            <>
              <div className="flex items-center justify-between text-[10.5px] text-[#8A99AB]">
                <span>Bundle</span>
                <span>
                  {Number(contract.usage.bundle_remaining).toFixed(1)} h left of {Number(contract.bundle_hours)} h
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${bundlePct >= 100 ? "bg-[#FF6B6B]" : bundlePct >= 80 ? "bg-[#FFB020]" : "bg-[#3DDC97]"}`}
                  style={{ width: `${bundlePct}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-2.5">
          <Button onClick={onEdit}>Edit</Button>
          {contract.status !== "active" && contract.status !== "cancelled" && (
            <Button variant="primary" onClick={() => onStatus("active")}>
              Activate
            </Button>
          )}
          {contract.status === "active" && (
            <Button onClick={() => onStatus("paused")}>Pause</Button>
          )}
          {contract.kind === "prepaid_bundle" && contract.status === "active" && (
            <Button onClick={onConsume}>
              <Wallet size={12} /> Draw down
            </Button>
          )}
          {contract.status !== "cancelled" && (
            <Button variant="danger" onClick={() => onStatus("cancelled")}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ContractsRoom() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [metrics, setMetrics] = useState<ContractMetrics | null>(null);
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [filter, setFilter] = useState("active");
  const [editor, setEditor] = useState<FormState | null>(null);
  const [consuming, setConsuming] = useState<ContractRow | null>(null);
  const [consumeHours, setConsumeHours] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, head, clientRows] = await Promise.all([
        contractApi.list(null, null),
        contractApi.metrics(),
        moneyApi.clients(),
      ]);
      setContracts(rows ?? []);
      setMetrics(head);
      setClients(clientRows ?? []);
    } catch (caught) {
      setError(contractError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = Boolean(metrics?.flags?.can_manage);
  const visible = useMemo(
    () => (filter ? contracts.filter((contract) => contract.status === filter) : contracts),
    [contracts, filter],
  );

  const changeStatus = async (contract: ContractRow, status: ContractStatus) => {
    setBusy(contract.id);
    setError("");
    try {
      await contractApi.setStatus(contract.id, status);
      await load();
    } catch (caught) {
      setError(contractError(caught).message);
    } finally {
      setBusy("");
    }
  };

  const consume = async () => {
    if (!consuming) return;
    setBusy(consuming.id);
    setError("");
    try {
      await contractApi.consumeBundle(consuming.id, Number(consumeHours), "Draw-down from the contracts console");
      setConsuming(null);
      setConsumeHours("");
      await load();
    } catch (caught) {
      setError(contractError(caught).message);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <Panel title="Contracts">
        <Loading label="Loading contracts" />
      </Panel>
    );
  }

  if (metrics && !canManage && contracts.length === 0) {
    return (
      <Panel title="Contracts">
        <div className="flex items-start gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-[12px] text-[#AEBBCC]">
          <Lock size={14} className="mt-0.5 text-[#FFB020]" />
          <span>
            Your account cannot read contracts. An Admin can grant <span className="font-mono text-[11px]">clients.contracts</span>{" "}
            under Control → People.
          </span>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={error} onRetry={load} />}

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active contracts" value={String(metrics?.active ?? 0)} hint={`${metrics?.draft ?? 0} in draft`} tone="accent" />
        <Stat label="Retainer MRR" value={`${Number(metrics?.mrr ?? 0).toFixed(0)} EUR`} hint={`${Number(metrics?.retained_hours ?? 0)} h included`} tone="good" />
        <Stat
          label="Bundle hours left"
          value={String(Number(metrics?.bundle_hours_left ?? 0))}
          hint="Prepaid hours not yet drawn down"
        />
        <Stat
          label="Expiring in 30 days"
          value={String(metrics?.expiring_30d ?? 0)}
          hint={`${metrics?.breached_30d ?? 0} SLA breaches in 30 days`}
          tone={(metrics?.expiring_30d ?? 0) > 0 || (metrics?.breached_30d ?? 0) > 0 ? "warn" : "good"}
        />
      </div>

      <Panel
        title="Contracts"
        subtitle="SLA tiers, retainers and prepaid bundles. Targets apply to tickets automatically."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-full border border-white/10 p-0.5">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
                    filter === option.key ? "bg-[#29E6FF]/15 text-[#9DF3FF]" : "text-[#7E8CA0] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button onClick={() => void load()}>
              <RefreshCw size={12} /> Refresh
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => setEditor(blankForm(clients[0]?.id ?? ""))}>
                <Plus size={13} /> New contract
              </Button>
            )}
          </div>
        }
      >
        {visible.length === 0 ? (
          <Empty
            title={filter ? `No ${filter} contracts` : "No contracts yet"}
            body="SLA tiers set the response clock on every ticket. Retainers track included hours, bundles track prepaid hours."
            action={
              canManage ? (
                <Button variant="primary" onClick={() => setEditor(blankForm(clients[0]?.id ?? ""))}>
                  <Plus size={13} /> Create the first contract
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {visible.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                canManage={canManage}
                onEdit={() => setEditor(formFromContract(contract))}
                onStatus={(status) => void changeStatus(contract, status)}
                onConsume={() => {
                  setConsuming(contract);
                  setConsumeHours("");
                }}
              />
            ))}
          </div>
        )}
      </Panel>

      {!canManage && (
        <p className="px-1 text-[10px] text-[#6E7A8F]">
          Read-only: you can see contracts through <span className="font-mono">clients.view</span> but not change them.
        </p>
      )}

      {editor && (
        <ContractEditor
          form={editor}
          clients={clients}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}

      {consuming && (
        <Modal
          title={`Draw down · ${consuming.name}`}
          onClose={() => setConsuming(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConsuming(null)}>Cancel</Button>
              <Button variant="primary" disabled={busy === consuming.id || !consumeHours} onClick={() => void consume()}>
                {busy === consuming.id ? "Saving…" : "Draw down"}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-[12px] text-[#AEBBCC]">
              {Number(consuming.usage.bundle_remaining).toFixed(1)} h left of {Number(consuming.bundle_hours)} h.
              Draw-downs are audited against your name.
            </p>
            <Field label="Hours to consume">
              <input
                value={consumeHours}
                onChange={(event) => setConsumeHours(event.target.value)}
                className={inputClass}
                inputMode="decimal"
                placeholder="2.5"
              />
            </Field>
            {Number(consumeHours) > Number(consuming.usage.bundle_remaining) && (
              <p className="text-[11px] text-[#FFB4B4]">
                That is more than the remaining balance ({Number(consuming.usage.bundle_remaining).toFixed(1)} h).
              </p>
            )}
          </div>
        </Modal>
      )}

      <p className="px-1 text-[10px] text-[#6E7A8F]">
        <CalendarClock size={10} className="mr-1 inline" />
        Hours used are approved field time inside the contract period; retainer usage resets monthly.
      </p>
    </div>
  );
}
