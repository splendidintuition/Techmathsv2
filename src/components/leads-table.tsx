"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";

const STATUSES = ["new", "qualified", "quoted", "won", "lost", "spam"] as const;

/** Lead queue: filter, status triage and CSV export. */
export function LeadsTable({ leads, serviceTitles }: { leads: Lead[]; serviceTitles: Record<string, string> }) {
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leads.filter((l) => {
      const okStatus = status === "all" || l.status === status;
      const okTerm =
        !term ||
        [l.name, l.email, l.company ?? "", l.country, l.reference, l.message ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return okStatus && okTerm;
    });
  }, [leads, status, q]);

  const exportCsv = () => {
    const header = [
      "reference",
      "created_at",
      "name",
      "email",
      "company",
      "phone",
      "country",
      "site",
      "services",
      "racks",
      "servers",
      "ports",
      "timeline",
      "urgency",
      "status",
      "consent_marketing",
      "message",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((l) =>
      [
        l.reference,
        l.createdAt,
        l.name,
        l.email,
        l.company,
        l.phone,
        l.country,
        l.siteLocation,
        l.services.map((s) => serviceTitles[s] ?? s).join("; "),
        l.racks,
        l.servers,
        l.ports,
        l.timeline,
        l.urgency,
        l.status,
        l.consentMarketing ? "yes" : "no",
        l.message,
      ]
        .map(esc)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `techmaths-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setStatusFor = async (lead: Lead, next: string) => {
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      lead.status = next;
      setStatus((s) => s); // force re-render of the memo input
      window.location.reload();
    }
  };

  if (leads.length === 0) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="text-[1rem] text-mist">No leads yet</p>
        <p className="mt-2 text-[0.86rem] text-mute">
          Submit the quote form on <a href="/contact" className="link-underline text-accent">/contact</a> and it will
          appear here with a reference number.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-3.5 py-2 text-[0.82rem] text-mist outline-none focus:border-accent"
          >
            <option value="all">All statuses ({leads.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s} ({leads.filter((l) => l.status === s).length})
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, company, reference…"
            aria-label="Search leads"
            className="w-full rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-2 text-[0.84rem] text-mist outline-none focus:border-accent sm:w-72"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="shrink-0 rounded-full border border-[color:var(--tm-line)] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:border-accent hover:text-accent"
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      <ul className="mt-6 space-y-2">
        {filtered.map((l) => (
          <li key={l.id} className="card-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === l.id ? null : l.id)}
              aria-expanded={open === l.id}
              className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 p-5 text-left transition-colors hover:bg-[color:var(--tm-panel)]"
            >
              <span className="font-mono text-[0.72rem] text-accent">{l.reference}</span>
              <span className="text-[0.92rem] text-mist">{l.name}</span>
              <span className="text-[0.82rem] text-mute">{l.email}</span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mute">{l.country}</span>
              <StatusPill status={l.status} />
              <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">
                {l.createdAt}
              </span>
            </button>

            {open === l.id && (
              <div className="grid gap-6 border-t border-[color:var(--tm-line)] p-5 sm:grid-cols-2">
                <dl className="space-y-2 text-[0.84rem]">
                  {[
                    ["Company", l.company],
                    ["Phone", l.phone],
                    ["Site", l.siteLocation],
                    ["Timeline", l.timeline],
                    ["Priority", l.urgency],
                    ["Source", l.source],
                    ["Racks / servers / ports", [l.racks, l.servers, l.ports].filter((v) => v != null).join(" / ") || "—"],
                    ["Marketing consent", l.consentMarketing ? "yes" : "no"],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex gap-3">
                      <dt className="w-44 shrink-0 text-mute">{k}</dt>
                      <dd className="text-mist">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <p className="eyebrow mb-2">Services requested</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {l.services.map((s) => (
                      <li
                        key={s}
                        className="rounded-full border border-[color:var(--tm-line)] px-2.5 py-1 text-[0.76rem] text-mist/85"
                      >
                        {serviceTitles[s] ?? s}
                      </li>
                    ))}
                  </ul>
                  {l.message && (
                    <>
                      <p className="eyebrow mt-5 mb-2">Message</p>
                      <p className="whitespace-pre-wrap text-[0.84rem] leading-relaxed text-mute">{l.message}</p>
                    </>
                  )}
                  <div className="mt-5 flex items-center gap-3">
                    <label htmlFor={`status-${l.id}`} className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">
                      Set status
                    </label>
                    <select
                      id={`status-${l.id}`}
                      value={l.status}
                      onChange={(e) => setStatusFor(l, e.target.value)}
                      className="rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-3 py-1.5 text-[0.8rem] text-mist outline-none focus:border-accent"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "won"
      ? "border-accent/45 bg-[color:var(--tm-accent-soft)] text-accent"
      : status === "spam" || status === "lost"
        ? "border-[color:var(--tm-line)] text-mute"
        : "border-[color:var(--tm-line-strong)] text-mute";
  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] ${tone}`}>
      {status}
    </span>
  );
}
