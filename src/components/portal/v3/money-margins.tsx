"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import {
  formatMoney,
  jobTotals,
  marginTone,
  moneyApi,
  moneyError,
  type ClientOrg,
  type JobMarginRow,
  type JobMargins,
} from "@/lib/portal-money";
import { humanise } from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Panel, Pill, Stat, TableShell, inputClass } from "@/components/portal/v2/ui";

type Preset = "month" | "30d" | "quarter" | "year" | "custom";

const iso = (date: Date) => date.toISOString().slice(0, 10);

function rangeFor(preset: Preset, today = new Date()): { from: string; to: string } {
  const to = iso(today);
  if (preset === "month") return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to };
  if (preset === "quarter") {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    return { from: iso(new Date(today.getFullYear(), quarterStartMonth, 1)), to };
  }
  if (preset === "year") return { from: iso(new Date(today.getFullYear(), 0, 1)), to };
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { from: iso(start), to };
}

/** R3.2 job costing: what each job earned after labour and approved costs. */
export function MoneyMargins({ clients }: { clients: ClientOrg[] }) {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(rangeFor("month").from);
  const [to, setTo] = useState(rangeFor("month").to);
  const [organizationId, setOrganizationId] = useState("");
  const [data, setData] = useState<JobMargins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextFrom = from, nextTo = to, nextOrg = organizationId) => {
      setLoading(true);
      setError("");
      try {
        setData(await moneyApi.jobMargins(nextFrom, nextTo, nextOrg || null));
      } catch (caught) {
        setError(moneyError(caught).message);
      } finally {
        setLoading(false);
      }
    },
    [from, to, organizationId],
  );

  useEffect(() => {
    void load(from, to, organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, organizationId]);

  const applyPreset = (next: Preset) => {
    setPreset(next);
    const range = rangeFor(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const totals = useMemo(() => (data ? jobTotals(data.jobs) : null), [data]);
  const unpriced = totals ? totals.unpricedHours : 0;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <Panel
        title="Job costing"
        subtitle="Revenue attributed to a job, minus approved costs and logged labour at the engineer's rate"
        action={
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Period">
            <div className="flex flex-wrap gap-1">
              {(["month", "30d", "quarter", "year"] as Preset[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => applyPreset(option)}
                  className={`rounded-full border px-2.5 py-[4px] font-mono text-[10px] uppercase tracking-[0.1em] transition ${
                    preset === option
                      ? "border-[#29E6FF]/50 bg-[#29E6FF]/15 text-[#9DF3FF]"
                      : "border-white/12 bg-white/[0.03] text-[#8A99AB] hover:border-white/25"
                  }`}
                >
                  {option === "30d" ? "30 days" : option}
                </button>
              ))}
            </div>
          </Field>
          <Field label="From">
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setPreset("custom");
                setFrom(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setPreset("custom");
                setTo(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Client">
            <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={inputClass}>
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      {loading && !data ? (
        <Loading label="Costing jobs" />
      ) : data && totals ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue attributed" value={formatMoney(totals.revenue)} hint={`${data.jobs.length} jobs in range`} tone="accent" />
            <Stat
              label="Direct cost"
              value={formatMoney(totals.expenses + totals.labourCost)}
              hint={`${formatMoney(totals.labourCost)} labour · ${totals.labourHours.toFixed(1)} h`}
              tone="warn"
            />
            <Stat label="Margin" value={formatMoney(totals.margin)} hint={totals.marginPct === null ? "no revenue yet" : `${totals.marginPct}% of revenue`} tone={marginTone(totals.marginPct)} />
            <Stat
              label="Unallocated revenue"
              value={formatMoney(data.unallocated.revenue_net)}
              hint="invoices with no job on the line"
              tone={data.unallocated.revenue_net > 0 ? "warn" : "muted"}
            />
          </div>

          {unpriced > 0 && (
            <div className="flex items-start gap-2 rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#FFD48A]">
              <AlertTriangle size={14} className="mt-[1px] shrink-0" />
              <span>
                {unpriced.toFixed(1)} hours have no engineer rate, so their cost is missing from the margin. Add an hourly rate under People
                to make the number complete.
              </span>
            </div>
          )}

          <Panel
            title="By job"
            subtitle={`${new Date(data.from).toLocaleDateString("en-GB")} → ${new Date(data.to).toLocaleDateString("en-GB")}`}
          >
            {data.jobs.length === 0 ? (
              <Empty
                title="No attributed work in this period"
                body="Attach an invoice or quote line to a ticket and its revenue appears here, next to the labour and approved expenses booked against that job."
              />
            ) : (
              <TableShell head={["Job", "Client", "Revenue", "Labour", "Expenses", "Margin", "Margin %"]}>
                {data.jobs.map((row) => (
                  <JobRow key={row.ticket_id} row={row} />
                ))}
                <tr>
                  <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#7E8CA0]" colSpan={2}>
                    total
                  </td>
                  <td className="px-3 py-2 font-mono text-[11.5px] text-[#E8EEF9]">{formatMoney(totals.revenue)}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#8A99AB]">
                    {formatMoney(totals.labourCost)}
                    <div className="text-[9.5px] text-[#5F6F84]">{totals.labourHours.toFixed(1)} h</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#8A99AB]">{formatMoney(totals.expenses)}</td>
                  <td className="px-3 py-2 font-mono text-[11.5px] text-[#E8EEF9]">{formatMoney(totals.margin)}</td>
                  <td className="px-3 py-2">
                    {totals.marginPct === null ? (
                      <span className="font-mono text-[10px] text-[#5F6F84]">—</span>
                    ) : (
                      <Pill tone={marginTone(totals.marginPct)}>{totals.marginPct}%</Pill>
                    )}
                  </td>
                </tr>
              </TableShell>
            )}
          </Panel>

          <Panel title="What is not attributed" subtitle="Money in the period that no job has claimed">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Revenue" value={formatMoney(data.unallocated.revenue_net)} hint="issued invoices, no job on the line" tone="muted" />
              <Stat label="Approved expenses" value={formatMoney(data.unallocated.expenses_net)} hint="no ticket on the claim" tone="muted" />
              <Stat
                label="Labour"
                value={`${data.unallocated.labour_hours.toFixed(1)} h`}
                hint={`${formatMoney(data.unallocated.labour_cost)} with no job`}
                tone="muted"
              />
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#5F6F84]">
              <TrendingUp size={12} className="mt-[2px] shrink-0" />
              Everything here is deliberately left out of the job margins instead of being spread across jobs, so a job total is only ever what
              somebody explicitly attributed to it.
            </p>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function JobRow({ row }: { row: JobMarginRow }) {
  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
        <span className="block text-[12.5px] text-[#E8EEF9]">{row.title}</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
          T-{row.ticket_number} · {humanise(row.status)}
        </span>
      </td>
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
        <span className="block text-[12px] text-[#C7D3E3]">{row.client_name ?? "internal"}</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">{row.site_name ?? "no site"}</span>
      </td>
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11.5px] text-[#E8EEF9]">{formatMoney(row.revenue_net)}</td>
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11px] text-[#8A99AB]">
        {formatMoney(row.labour_cost)}
        <div className="text-[9.5px] text-[#5F6F84]">
          {Number(row.labour_hours).toFixed(1)} h{Number(row.unpriced_hours) > 0 ? ` · ${Number(row.unpriced_hours).toFixed(1)} h unrated` : ""}
        </div>
      </td>
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11px] text-[#8A99AB]">{formatMoney(row.expenses_net)}</td>
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11.5px] text-[#E8EEF9]">{formatMoney(row.margin)}</td>
      <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
        {row.margin_pct === null ? (
          <span className="font-mono text-[10px] text-[#5F6F84]">no revenue</span>
        ) : (
          <Pill tone={marginTone(row.margin_pct)}>{row.margin_pct}%</Pill>
        )}
      </td>
    </tr>
  );
}
