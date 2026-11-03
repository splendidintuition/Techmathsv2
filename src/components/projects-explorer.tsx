"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { IconArrow, IconFilter } from "./icons";
import { PlaceholderTag } from "./ui";

/** Filterable case-study grid: service, industry and country. */
export function ProjectsExplorer({
  projects,
  serviceTitles,
}: {
  projects: Project[];
  serviceTitles: Record<string, string>;
}) {
  const [service, setService] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [country, setCountry] = useState("all");

  const services = useMemo(
    () => [...new Set(projects.flatMap((p) => p.services))].sort((a, b) => (serviceTitles[a] ?? a).localeCompare(serviceTitles[b] ?? b)),
    [projects, serviceTitles]
  );
  const industries = useMemo(() => [...new Set(projects.flatMap((p) => p.industries))].sort(), [projects]);
  const countries = useMemo(
    () => [...new Set(projects.map((p) => p.country))].sort(),
    [projects]
  );

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (service === "all" || p.services.includes(service)) &&
          (industry === "all" || p.industries.includes(industry)) &&
          (country === "all" || p.country === country)
      ),
    [projects, service, industry, country]
  );

  const reset = () => {
    setService("all");
    setIndustry("all");
    setCountry("all");
  };
  const isFiltered = service !== "all" || industry !== "all" || country !== "all";

  return (
    <div>
      <div className="flex flex-col gap-4 border-y border-[color:var(--tm-line)] py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Service" value={service} onChange={setService} options={services.map((s) => [s, serviceTitles[s] ?? s])} />
          <Select label="Industry" value={industry} onChange={setIndustry} options={industries.map((i) => [i, i])} />
          <Select label="Country" value={country} onChange={setCountry} options={countries.map((c) => [c, c])} />
        </div>
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mute">
            {filtered.length} of {projects.length}
          </p>
          {isFiltered && (
            <button
              type="button"
              onClick={reset}
              className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-accent hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-[color:var(--tm-line-strong)] p-8 text-center text-[0.9rem] text-mute">
          No published case matches that combination yet.{" "}
          <Link href="/contact" className="link-underline text-accent">
            Ask us for a comparable reference
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 lg:grid-cols-2">
          {filtered.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/projects/${p.slug}`}
                className="sweep card-surface group flex h-full flex-col gap-6 p-7 transition-colors hover:border-accent/45"
              >
                <div className="relative z-[2] flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-accent">
                    {p.region} · {p.year}
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">
                    {p.duration}
                  </span>
                  {p.isPlaceholder && <PlaceholderTag />}
                </div>
                <div className="relative z-[2]">
                  <h3 className="text-[1.28rem] leading-snug">{p.title}</h3>
                  <p className="mt-3 text-[0.9rem] leading-relaxed text-mute">{p.summary}</p>
                </div>
                <dl className="relative z-[2] mt-auto grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[color:var(--tm-line)] pt-5 sm:grid-cols-4">
                  {p.metrics.slice(0, 4).map((m) => (
                    <div key={m.label}>
                      <dt className="sr-only">{m.label}</dt>
                      <dd className="font-display text-[1.15rem] leading-none text-mist">{m.value}</dd>
                      <dd className="mt-1.5 text-[0.68rem] leading-snug text-mute">{m.label}</dd>
                    </div>
                  ))}
                </dl>
                <span className="relative z-[2] inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-accent">
                  <IconFilter className="h-3.5 w-3.5" />
                  {p.services.map((s) => serviceTitles[s] ?? s).join(" · ")}
                  <IconArrow className="ml-auto h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-3.5 py-2 text-[0.82rem] text-mist outline-none transition-colors focus:border-accent"
      >
        <option value="all">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
