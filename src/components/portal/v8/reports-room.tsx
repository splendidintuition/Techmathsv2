"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { controlApi } from "@/lib/portal-v2";
import { formatMoney } from "@/lib/portal-money";
import {
  RANGE_LABELS,
  barWidth,
  bucketMax,
  compliancePct,
  exportName,
  financeCsv,
  hoursCopy,
  opsCsv,
  rangeFor,
  reportError,
  reportsApi,
  slaCsv,
  type FinanceReport,
  type OpsReport,
  type RangeKey,
  type SlaReport,
} from "@/lib/portal-reports";
import { Button, Empty, ErrorNote, Loading, Panel, Pill, Stat, TableShell } from "@/components/portal/v2/ui";

type Tab = "operations" | "finance" | "sla";

function downloadCsv(name: string, body: string) {
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BucketList({ title, rows, kind = "count" }: { title: string; rows: Array<Record<string, unknown>>; kind?: "count" | "money" }) {
  const max = bucketMax(rows as Array<{ count?: number; invoiced?: number; amount?: number }>);
  if (rows.length === 0) {
    return (
      <div className="text-[11px] text-[#6E7A8F]">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em]">{title}</span>
        <div className="mt-1">Nothing in this range.</div>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">{title}</div>
      <ul className="space-y-1.5">
        {rows.map((row) => {
          const key = String(row.key ?? row.bucket ?? "—");
          const value = Number(row.count ?? row.invoiced ?? row.amount ?? 0);
          return (
            <li key={key}>
              <div className="flex items-center justify-between text-[11px] text-[#DCE6F5]">
                <span className="truncate">{key}</span>
                <span className="text-[#AEBBCC]">{kind === "money" ? formatMoney(value) : value}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#29E6FF]" style={{ width: `${barWidth(value, max)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Sparkline({ days }: { days: Array<{ day: string; created: number; closed: number }> }) {
  const max = days.reduce((peak, day) => Math.max(peak, day.created, day.closed), 0);
  if (days.length === 0) return <Empty title="No activity in this range" body="Raise the range or pick a custom window." />;
  return (
    <div>
      <div className="flex h-24 items-end gap-[2px]">
        {days.map((day) => (
          <div key={day.day} className="group relative flex flex-1 items-end gap-[1px]">
            <div
              className="w-full rounded-t-[2px] bg-[#29E6FF]/70"
              style={{ height: `${Math.max(2, barWidth(day.created, max))}%` }}
              title={`${day.day} · ${day.created} raised`}
            />
            <div
              className="w-full rounded-t-[2px] bg-[#3DDC97]/70"
              style={{ height: `${Math.max(2, barWidth(day.closed, max))}%` }}
              title={`${day.day} · ${day.closed} closed`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6E7A8F]">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#29E6FF]" /> raised</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#3DDC97]" /> closed</span>
        <span className="ml-auto">{days[0]?.day} → {days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export function ReportsRoom() {
  const [tab, setTab] = useState<Tab>("operations");
  const [range, setRange] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);
  const [ops, setOps] = useState<OpsReport | null>(null);
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [sla, setSla] = useState<SlaReport | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const window_ = useMemo(() => custom ?? rangeFor(range), [custom, range]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (permissions.size === 0) {
        const keys = await controlApi.currentPermissions();
        setPermissions(new Set(Array.isArray(keys) ? keys : []));
      }
      if (tab === "finance") {
        setFinance(await reportsApi.finance(window_.from, window_.to));
      } else if (tab === "sla") {
        setSla(await reportsApi.sla(window_.from, window_.to));
      } else {
        setOps(await reportsApi.ops(window_.from, window_.to));
      }
    } catch (caught) {
      setError(reportError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [permissions.size, tab, window_.from, window_.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const canExport = permissions.has("reports.export");
  const canFinance = permissions.has("reports.finance");

  const exportCurrent = () => {
    if (tab === "finance" && finance) {
      downloadCsv(exportName("finance", finance.range), financeCsv(finance));
    } else if (tab === "sla" && sla) {
      downloadCsv(exportName("sla", sla.range), slaCsv(sla));
    } else if (ops) {
      downloadCsv(exportName("operations", ops.range), opsCsv(ops));
    }
  };

  const tabs: Array<{ key: Tab; label: string; icon: typeof BarChart3 }> = [
    { key: "operations", label: "Operations", icon: BarChart3 },
    { key: "sla", label: "SLA", icon: ShieldCheck },
    ...(canFinance ? [{ key: "finance" as Tab, label: "Finance", icon: Wallet }] : []),
  ];

  return (
    <div className="space-y-3">
      <Panel
        title="Reports"
        subtitle="Read from the live tables — nothing is cached and nothing is recalculated in the browser."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-full border border-white/10 p-0.5">
              {RANGE_LABELS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    setCustom(null);
                    setRange(option.key);
                  }}
                  className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition ${
                    !custom && range === option.key ? "bg-[#29E6FF]/15 text-[#9DF3FF]" : "text-[#7E8CA0] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button onClick={() => void load()}>
              <RefreshCw size={12} /> Refresh
            </Button>
            {canExport && (
              <Button variant="primary" onClick={exportCurrent}>
                <Download size={12} /> Export CSV
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] text-[#8A99AB]">
            From
            <input
              type="date"
              value={window_.from}
              onChange={(event) => setCustom({ from: event.target.value, to: window_.to })}
              className="ml-2 rounded-[8px] border border-white/12 bg-[#0B1119] px-2 py-1 text-[11px] text-[#E8EEF9]"
            />
          </label>
          <label className="text-[10px] text-[#8A99AB]">
            To
            <input
              type="date"
              value={window_.to}
              onChange={(event) => setCustom({ from: window_.from, to: event.target.value })}
              className="ml-2 rounded-[8px] border border-white/12 bg-[#0B1119] px-2 py-1 text-[11px] text-[#E8EEF9]"
            />
          </label>
          <div className="flex gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                  tab === key
                    ? "border-[#29E6FF]/30 bg-[#29E6FF]/[0.09] text-[#9DF3FF]"
                    : "border-white/10 bg-white/[0.02] text-[#8A99AB] hover:text-white"
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {loading && (
        <Panel title="Working">
          <Loading label="Running report" />
        </Panel>
      )}

      {error && !loading && <ErrorNote message={error} onRetry={load} />}

      {!loading && !error && tab === "operations" && ops && (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Raised" value={String(ops.summary.created)} hint={`${ops.summary.closed} closed in range`} tone="accent" />
            <Stat
              label="Open now"
              value={String(ops.summary.open_now)}
              hint={`${ops.summary.unassigned_now} unassigned`}
              tone={ops.summary.unassigned_now > 0 ? "warn" : "muted"}
            />
            <Stat
              label="SLA compliance"
              value={`${compliancePct(ops.summary.sla_met, ops.summary.sla_breached) ?? "—"}%`}
              hint={`${ops.summary.sla_met} met · ${ops.summary.sla_breached} breached`}
              tone={
                (compliancePct(ops.summary.sla_met, ops.summary.sla_breached) ?? 100) >= 95
                  ? "good"
                  : (compliancePct(ops.summary.sla_met, ops.summary.sla_breached) ?? 100) >= 85
                    ? "warn"
                    : "danger"
              }
            />
            <Stat
              label="Avg response"
              value={hoursCopy(ops.summary.avg_response_minutes)}
              hint={`${ops.summary.logged_hours} h logged`}
            />
          </div>

          <Panel title="Volume" subtitle="Tickets raised and closed per day.">
            <Sparkline days={ops.daily} />
          </Panel>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Breakdown">
              <div className="space-y-4">
                <BucketList title="By status" rows={ops.by_status as unknown as Array<Record<string, unknown>>} />
                <BucketList title="By priority" rows={ops.by_priority as unknown as Array<Record<string, unknown>>} />
                <BucketList title="By category" rows={ops.by_category as unknown as Array<Record<string, unknown>>} />
                <BucketList title="By country" rows={ops.by_country as unknown as Array<Record<string, unknown>>} />
              </div>
            </Panel>

            <Panel title="Clients in range" className="lg:col-span-2">
              {ops.by_client.length === 0 ? (
                <Empty title="No client activity" body="No tickets were raised for any client in this window." />
              ) : (
                <TableShell head={["Client", "Raised", "Closed", "Open now", "SLA breached"]}>
                  {ops.by_client.map((row) => (
                    <tr key={row.organization_id} className="text-[12px]">
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[#E8EEF9]">{row.name}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.created}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.closed}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.open_now}</td>
                      <td className="border-b border-white/[0.05] px-3 py-2">
                        {row.sla_breached > 0 ? <Pill tone="danger">{row.sla_breached}</Pill> : <Pill tone="good">none</Pill>}
                      </td>
                    </tr>
                  ))}
                </TableShell>
              )}
            </Panel>
          </div>

          <Panel title="Engineers" subtitle="Load in the selected window.">
            {ops.engineers.length === 0 ? (
              <Empty title="No field engineers yet" body="Invite an engineer to see their load here." />
            ) : (
              <TableShell head={["Engineer", "Assigned", "Closed", "Hours", "Rating"]}>
                {ops.engineers.map((row) => (
                  <tr key={row.engineer_id} className="text-[12px]">
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#E8EEF9]">{row.name || "Unnamed"}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.assigned}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.closed}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.hours}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">
                      {row.rating === null ? "—" : Number(row.rating).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>
        </>
      )}

      {!loading && !error && tab === "sla" && sla && (
        <Panel title="SLA by client" subtitle="First response against the target applied to the ticket.">
          {sla.rows.length === 0 ? (
            <Empty title="Nothing measured" body="No tickets were raised for a client in this window." />
          ) : (
            <TableShell head={["Client", "Contract", "Target", "Tickets", "Met", "Breached", "At risk", "Compliance", "Avg response"]}>
              {sla.rows.map((row) => (
                <tr key={row.organization_id} className="text-[12px]">
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#E8EEF9]">{row.organization_name}</td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.contract_name ?? "No contract"}</td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">
                    {row.response_minutes ? hoursCopy(row.response_minutes) : "—"}
                  </td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{row.tickets}</td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#3DDC97]">{row.met}</td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#FFB4B4]">{row.breached}</td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#FFD48A]">{row.at_risk}</td>
                  <td className="border-b border-white/[0.05] px-3 py-2">
                    {row.compliance_pct === null ? (
                      <Pill tone="muted">not measured</Pill>
                    ) : (
                      <Pill tone={row.compliance_pct >= 95 ? "good" : row.compliance_pct >= 85 ? "warn" : "danger"}>
                        {Number(row.compliance_pct)}%
                      </Pill>
                    )}
                  </td>
                  <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{hoursCopy(row.avg_response_minutes)}</td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>
      )}

      {!loading && !error && tab === "finance" && finance && (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Invoiced net" value={formatMoney(finance.summary.invoiced_net)} hint={`${formatMoney(finance.summary.vat_billed)} VAT`} tone="accent" />
            <Stat label="Collected" value={formatMoney(finance.summary.collected)} hint="Receipts in range" tone="good" />
            <Stat
              label="Outstanding"
              value={formatMoney(finance.summary.outstanding)}
              hint={`${formatMoney(finance.summary.overdue)} overdue`}
              tone={finance.summary.overdue > 0 ? "danger" : "muted"}
            />
            <Stat
              label="Margin"
              value={formatMoney(finance.summary.margin)}
              hint={finance.summary.margin_pct === null ? "No revenue in range" : `${finance.summary.margin_pct}% of net`}
              tone={(finance.summary.margin_pct ?? 0) >= 40 ? "good" : "warn"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Aging" subtitle="Open invoices by how late they are.">
              <BucketList title="Buckets" rows={finance.aging as unknown as Array<Record<string, unknown>>} kind="money" />
            </Panel>
            <Panel title="Billing by month" subtitle="Net invoiced against cash collected.">
              <BucketList title="Months" rows={finance.by_month as unknown as Array<Record<string, unknown>>} kind="money" />
            </Panel>
          </div>

          <Panel title="Client profitability" subtitle="Net revenue less approved expenses. Labour is excluded per client.">
            {finance.by_client.length === 0 ? (
              <Empty title="No billing or costs" body="No invoices or approved expenses landed in this window." />
            ) : (
              <TableShell head={["Client", "Invoiced net", "Expenses", "Margin", "Margin %"]}>
                {finance.by_client.map((row) => (
                  <tr key={row.organization_id} className="text-[12px]">
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#E8EEF9]">{row.name}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{formatMoney(row.invoiced_net)}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#AEBBCC]">{formatMoney(row.expenses)}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2 text-[#3DDC97]">{formatMoney(row.margin)}</td>
                    <td className="border-b border-white/[0.05] px-3 py-2">
                      {row.margin_pct === null ? <Pill tone="muted">—</Pill> : <Pill tone={row.margin_pct >= 40 ? "good" : "warn"}>{row.margin_pct}%</Pill>}
                    </td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="VAT by country" subtitle="Where the invoices were raised.">
              <BucketList title="Countries" rows={finance.by_country as unknown as Array<Record<string, unknown>>} kind="money" />
            </Panel>
            <Panel title="Largest open balances" subtitle="Chase these first.">
              <BucketList title="Debtors" rows={finance.debtors as unknown as Array<Record<string, unknown>>} kind="money" />
            </Panel>
          </div>
        </>
      )}

      {!canExport && (
        <p className="px-1 text-[10px] text-[#6E7A8F]">
          CSV export needs <span className="font-mono">reports.export</span>. The figures on screen are still live.
        </p>
      )}
    </div>
  );
}
