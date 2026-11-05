"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Download, Filter, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import {
  auditHeadline,
  controlApi,
  csvFromRows,
  describeError,
  humanise,
  type AuditEntry,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Loading, Panel, Pill, TableShell, inputClass } from "@/components/portal/v2/ui";

const ENTITY_SUGGESTIONS = [
  "organization",
  "site",
  "site_access",
  "ticket",
  "profile",
  "engineer_profile",
  "quote",
  "invoice",
  "expense",
  "payment",
  "asset",
];

function when(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function summarise(data: Record<string, unknown> | null): string {
  if (!data) return "—";
  const entries = Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("/") : String(value)}`)
    .join(" · ");
}

/**
 * R4 Audit log viewer (§3.8). Every privileged write already lands in audit_logs;
 * this screen makes that evidence readable, filterable and exportable. Read-only:
 * there is no write path, so the log cannot be edited from the product.
 */
export function ControlAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [entity, setEntity] = useState("");
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredEntity = useDeferredValue(entity);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await controlApi.listAudit({ entity: deferredEntity, limit }));
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [deferredEntity, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const actors = useMemo(() => {
    const names = new Set<string>();
    for (const entry of entries) {
      if (entry.actor_name) names.add(entry.actor_name);
      else if (entry.actor_email) names.add(entry.actor_email);
      else names.add("system");
    }
    return [...names].sort();
  }, [entries]);

  const download = () => {
    const csv = csvFromRows(
      ["When", "Actor", "Entity", "Action", "Entity id", "Before", "After"],
      entries.map((entry) => [
        entry.created_at,
        entry.actor_name ?? entry.actor_email ?? "system",
        entry.entity,
        entry.action,
        entry.entity_id ?? "",
        summarise(entry.before_data),
        summarise(entry.after_data),
      ]),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `techmaths-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading && entries.length === 0) return <Loading label="Reading the audit log" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <Panel
        title="Audit log"
        subtitle="Who changed what, when — readable and exportable, never writable"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6F84]" />
              <input
                value={entity}
                onChange={(event) => setEntity(event.target.value)}
                list="audit-entities"
                placeholder="Filter by entity"
                aria-label="Filter by entity"
                className={`${inputClass} w-[180px] pl-7`}
              />
              <datalist id="audit-entities">
                {ENTITY_SUGGESTIONS.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              aria-label="Rows to load"
              className={`${inputClass} w-[110px]`}
            >
              {[50, 100, 250, 500].map((value) => (
                <option key={value} value={value}>
                  {value} rows
                </option>
              ))}
            </select>
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button onClick={download} disabled={entries.length === 0}>
              <Download size={13} /> CSV
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11.5px] text-[#8A99AB]">
          <Pill tone="accent">
            <ScrollText size={10} /> {entries.length} entries
          </Pill>
          <Pill tone="muted">
            <ShieldCheck size={10} /> {actors.length} actors
          </Pill>
          <span>Audit rows are written by the database, not the browser, so a denied action still leaves no success record.</span>
        </div>

        {entries.length === 0 ? (
          <Empty
            title="No audit entries match"
            body="Clear the filter or widen the row count. Every privileged write from this point on is recorded automatically."
          />
        ) : (
          <TableShell head={["When", "Actor", "Entity", "Action", "Before → after"]}>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-white/[0.05] align-top">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-[#9AA9BC]">{when(entry.created_at)}</td>
                <td className="px-3 py-2 text-[12px] text-[#D7E1EF]">
                  {entry.actor_name ?? entry.actor_email ?? "system"}
                  {entry.actor_email && entry.actor_name && (
                    <span className="block text-[10.5px] text-[#6F7F93]">{entry.actor_email}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-[#B9C7D8]">{entry.entity}</td>
                <td className="px-3 py-2 text-[12px] text-[#E8EEF9]">
                  {auditHeadline(entry)}
                  <span className="block font-mono text-[10px] text-[#5F6F84]">{entry.action}</span>
                </td>
                <td className="px-3 py-2 text-[11px] text-[#8A99AB]">
                  <span className="block break-words">{summarise(entry.before_data)}</span>
                  <span className="block break-words text-[#A8F0CB]">{summarise(entry.after_data)}</span>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#3F4C5D]">
        {humanise("audit view")} · read-only · every row written by security-definer RPCs
      </p>
    </div>
  );
}
