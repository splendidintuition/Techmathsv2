"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Database, Trash2, ArrowUpRight } from "lucide-react";
import {
  controlApi,
  metricCells,
  slaLabel,
  statusTone,
  describeError,
  type CapacityDay,
  type PortalMetrics,
  type SearchHit,
} from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Loading, Panel, Pill, Stat, inputClass } from "@/components/portal/v2/ui";

/** R2 Overview: the "control room" wall. Live metrics, capacity, global search. */
export function ControlOverview({
  canManageDemo,
  onOpen,
}: {
  canManageDemo: boolean;
  onOpen?: (href: string) => void;
}) {
  const [metrics, setMetrics] = useState<PortalMetrics | null>(null);
  const [capacity, setCapacity] = useState<CapacityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [demoBusy, setDemoBusy] = useState(false);
  const [demoNote, setDemoNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextMetrics, nextCapacity] = await Promise.all([controlApi.metrics(), controlApi.capacity(7)]);
      setMetrics(nextMetrics);
      setCapacity(nextCapacity);
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      controlApi
        .search(trimmed)
        .then((results) => {
          if (alive) setHits(results);
        })
        .catch(() => {
          if (alive) setHits([]);
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 260);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const cells = useMemo(() => metricCells(metrics), [metrics]);
  const peakDay = useMemo(
    () => capacity.reduce((worst, day) => (day.visits > worst.visits ? day : worst), capacity[0] ?? { visits: 0 } as CapacityDay),
    [capacity],
  );

  const runDemo = async (mode: "seed" | "purge") => {
    setDemoBusy(true);
    setDemoNote("");
    try {
      if (mode === "seed") {
        const result = await controlApi.seedDemo();
        setDemoNote(`Seeded demo client with ${result.tickets} tickets.`);
      } else {
        const removed = await controlApi.purgeDemo();
        setDemoNote(`Removed ${removed} demo client(s) and all demo records.`);
      }
      await load();
    } catch (caught) {
      setDemoNote(describeError(caught).message);
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7E8CA0]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets, assets, sites, people…"
              className={`${inputClass} pl-9`}
              aria-label="Search the operations portal"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="mt-2 rounded-[10px] border border-white/[0.08] bg-[#0A1017] p-1.5">
              {searching && <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">searching…</div>}
              {!searching && hits.length === 0 && (
                <div className="px-2 py-1.5 text-[12px] text-[#8A99AB]">No matches. Try a ticket number, serial or site name.</div>
              )}
              {hits.map((hit) => (
                <button
                  key={`${hit.kind}-${hit.id}`}
                  type="button"
                  onClick={() => onOpen?.(hit.href)}
                  className="flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left hover:bg-white/[0.06]"
                >
                  <Pill tone="accent">{hit.kind}</Pill>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-[#E8EEF9]">{hit.title}</span>
                    <span className="block truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[#7E8CA0]">{hit.subtitle}</span>
                  </span>
                  <ArrowUpRight size={13} className="shrink-0 text-[#7E8CA0]" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManageDemo && (
            <>
              <Button onClick={() => void runDemo("seed")} disabled={demoBusy} title="Create a tagged demo client, site, rack and tickets">
                <Database size={13} /> Seed demo
              </Button>
              <Button variant="danger" onClick={() => void runDemo("purge")} disabled={demoBusy} title="Remove every demo-tagged record">
                <Trash2 size={13} /> Purge
              </Button>
            </>
          )}
          <Button onClick={() => void load()} disabled={loading} title="Refresh metrics">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </div>

      {demoNote && (
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{demoNote}</div>
      )}

      {loading && !metrics ? (
        <Loading label="Loading control metrics" />
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cells.map((cell) => (
              <Stat key={cell.key} label={cell.label} value={cell.value} hint={cell.hint} tone={cell.tone} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Panel title="Next 7 days" subtitle="Booked visits, unassigned work and planned leave">
              {capacity.length === 0 ? (
                <Empty title="Nothing scheduled" body="Schedule a visit or run a recurring plan to see the shape of the week here." />
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {capacity.map((day) => {
                    const intensity = peakDay.visits > 0 ? Math.min(1, day.visits / peakDay.visits) : 0;
                    return (
                      <div key={day.date} className="rounded-[10px] border border-white/[0.07] p-2 text-center">
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7E8CA0]">{day.label}</div>
                        <div
                          className="mx-auto mt-1.5 flex h-16 w-full items-end justify-center rounded-[6px]"
                          style={{ background: `rgba(41,230,255,${0.06 + intensity * 0.22})` }}
                          title={`${day.visits} visits · ${day.unassigned} unassigned · ${day.on_leave} on leave`}
                        >
                          <span className="pb-1 text-[15px] font-semibold text-[#EAF8FF]">{day.visits}</span>
                        </div>
                        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#7E8CA0]">
                          {day.unassigned > 0 ? `${day.unassigned} gap` : "covered"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="Pipeline by status" subtitle="Every ticket the database knows about">
              <div className="space-y-1.5">
                {Object.entries(metrics.tickets.by_status ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const total = Math.max(1, metrics.tickets.total);
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <span className="w-[132px] shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-[#9AA9BC]">
                          {status.replace(/_/g, " ")}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <span
                            className="block h-full rounded-full bg-[#29E6FF]/70"
                            style={{ width: `${Math.max(4, (count / total) * 100)}%` }}
                          />
                        </span>
                        <span className="w-6 text-right font-mono text-[10px] text-[#C7D3E3]">{count}</span>
                      </div>
                    );
                  })}
                {Object.keys(metrics.tickets.by_status ?? {}).length === 0 && (
                  <Empty title="No tickets yet" body="Raise a ticket from a template or seed the demo dataset to explore the console." />
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Hours this month</div>
                  <div className="text-[16px] font-semibold text-[#E8EEF9]">{metrics.time.hours_this_month}h</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Awaiting sign-off</div>
                  <div className="text-[16px] font-semibold text-[#E8EEF9]">{metrics.tickets.awaiting_approval}</div>
                </div>
                {!metrics.money.hidden && (
                  <>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Open budget</div>
                      <div className="text-[16px] font-semibold text-[#E8EEF9]">{Number(metrics.money.budget_open ?? 0).toFixed(0)} €</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Estimated hours open</div>
                      <div className="text-[16px] font-semibold text-[#E8EEF9]">{Number(metrics.money.estimated_hours_open ?? 0)}h</div>
                    </div>
                  </>
                )}
              </div>
            </Panel>
          </div>

          <Panel title="Today" subtitle="What to look at first">
            <ul className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  title: "Unassigned open work",
                  count: metrics.tickets.unassigned,
                  tone: metrics.tickets.unassigned > 0 ? statusTone("waiting_parts") : statusTone("closed"),
                },
                {
                  title: "SLA pressure",
                  count: metrics.tickets.sla_at_risk,
                  tone: metrics.tickets.sla_breached > 0 ? statusTone("critical") : statusTone("closed"),
                },
                {
                  title: "Engineers verified",
                  count: metrics.people.engineers_total - metrics.people.pending_verification,
                  tone: statusTone("in_progress"),
                },
              ].map((item) => (
                <li key={item.title} className="flex items-center justify-between rounded-[10px] border border-white/[0.07] px-3 py-2.5">
                  <span className="text-[12px] text-[#C7D3E3]">{item.title}</span>
                  <Pill tone={item.tone}>{String(item.count)}</Pill>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5F6F84]">
              snapshot {new Date(metrics.generated_at).toLocaleString("en-GB", { timeZone: "Europe/Lisbon" })} · Lisbon · next SLA{" "}
              {slaLabel(metrics.tickets.sla_at_risk > 0 ? new Date(Date.now() + 3_600_000).toISOString() : null)}
            </p>
          </Panel>
        </>
      ) : (
        <Empty
          title="Metrics unavailable"
          body="The control metrics RPC only returns data to internal users (Admin and Staff). Ask an Admin for the reports.operations permission."
        />
      )}
    </div>
  );
}
