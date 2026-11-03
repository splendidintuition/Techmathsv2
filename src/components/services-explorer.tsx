"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SERVICE_CATEGORIES, categoryOf } from "@/lib/categories";
import type { Service } from "@/lib/types";
import { IconArrow, IconSearch, ServiceIcon } from "./icons";

/** Filterable service catalogue: category chips plus a text filter. */
export function ServicesExplorer({ services }: { services: Service[] }) {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s) => {
      const okCat = cat === "all" || categoryOf(s.slug).id === cat;
      const okTerm =
        !term ||
        [s.title, s.short, s.summary, ...s.included, ...s.keywords].join(" ").toLowerCase().includes(term);
      return okCat && okTerm;
    });
  }, [services, cat, q]);

  return (
    <div>
      <div className="flex flex-col gap-5 border-y border-[color:var(--tm-line)] py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")} label={`All services (${services.length})`} />
          {SERVICE_CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              active={cat === c.id}
              onClick={() => setCat(c.id)}
              label={`${c.label} (${c.slugs.length})`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-2.5 transition-colors focus-within:border-accent lg:w-72">
          <IconSearch className="h-4 w-4 shrink-0 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter services…"
            aria-label="Filter services by keyword"
            className="w-full bg-transparent text-[0.88rem] text-mist outline-none placeholder:text-mute"
          />
        </div>
      </div>

      <p aria-live="polite" className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mute">
        {filtered.length} {filtered.length === 1 ? "service" : "services"} shown
        {cat !== "all" && ` · ${SERVICE_CATEGORIES.find((c) => c.id === cat)?.label}`}
      </p>

      <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <li key={s.slug} className="bg-ink">
            <Link
              href={`/services/${s.slug}`}
              className="sweep group flex h-full flex-col gap-6 p-6 transition-colors hover:bg-[color:var(--tm-panel)] sm:p-7"
            >
              <div className="relative z-[2] flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--tm-line)] text-mute transition-colors group-hover:border-accent group-hover:text-accent">
                  <ServiceIcon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-mute">
                  {categoryOf(s.slug).label}
                </span>
              </div>
              <div className="relative z-[2]">
                <h3 className="text-[1.2rem]">{s.title}</h3>
                <p className="mt-2.5 text-[0.87rem] leading-relaxed text-mute">{s.short}</p>
              </div>
              <div className="relative z-[2] mt-auto flex items-center gap-2 pt-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-accent">
                View service
                <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-[color:var(--tm-line-strong)] p-6 text-center text-[0.9rem] text-mute">
          Nothing matched that filter.{" "}
          <Link href="/contact" className="link-underline text-accent">
            Tell us what you need
          </Link>{" "}
          — the catalogue is not the limit of what we do.
        </p>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "border-accent bg-[color:var(--tm-accent-soft)] text-accent"
          : "border-[color:var(--tm-line)] text-mute hover:border-[color:var(--tm-line-strong)] hover:text-mist"
      }`}
    >
      {label}
    </button>
  );
}
