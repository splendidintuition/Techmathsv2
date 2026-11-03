"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Insight } from "@/lib/types";
import { IconArrow, IconDoc, IconDownload, IconSearch } from "./icons";

const KIND_LABEL: Record<Insight["kind"], string> = {
  article: "Article",
  checklist: "Checklist",
  guide: "Guide",
};

/** Searchable, filterable Insights index. */
export function InsightsExplorer({
  insights,
  categories,
}: {
  insights: Insight[];
  categories: Array<{ name: string; count: number }>;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [kind, setKind] = useState("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return insights.filter((i) => {
      const okCat = cat === "all" || i.category === cat;
      const okKind = kind === "all" || i.kind === kind;
      const okTerm = !term || [i.title, i.excerpt, i.body, ...i.tags].join(" ").toLowerCase().includes(term);
      return okCat && okKind && okTerm;
    });
  }, [insights, q, cat, kind]);

  return (
    <div>
      <div className="flex flex-col gap-4 border-y border-[color:var(--tm-line)] py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={cat === "all"} onClick={() => setCat("all")} label="All topics" />
          {categories.map((c) => (
            <Chip key={c.name} active={cat === c.name} onClick={() => setCat(c.name)} label={`${c.name} (${c.count})`} />
          ))}
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-2.5 transition-colors focus-within:border-accent lg:w-80">
          <IconSearch className="h-4 w-4 shrink-0 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles, checklists, guides…"
            aria-label="Search insights"
            className="w-full bg-transparent text-[0.88rem] text-mist outline-none placeholder:text-mute"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(["all", "guide", "checklist", "article"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`font-mono text-[0.6rem] uppercase tracking-[0.14em] transition-colors ${
              kind === k ? "text-accent" : "text-mute hover:text-mist"
            }`}
          >
            {k === "all" ? "All formats" : KIND_LABEL[k]}
          </button>
        ))}
        <p aria-live="polite" className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-[color:var(--tm-line-strong)] p-8 text-center text-[0.9rem] text-mute">
          Nothing matched. Try a different term, or{" "}
          <Link href="/contact" className="link-underline text-accent">
            ask us the question directly
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {filtered.map((i) => (
            <li key={i.slug}>
              <Link
                href={`/insights/${i.slug}`}
                className="sweep card-surface group flex h-full flex-col gap-5 p-7 transition-colors hover:border-accent/45"
              >
                <div className="relative z-[2] flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-accent/40 bg-[color:var(--tm-accent-soft)] px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-accent">
                    {KIND_LABEL[i.kind]}
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">{i.category}</span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">
                    {i.readMinutes} min
                  </span>
                  {i.download && (
                    <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-mute">
                      <IconDownload className="h-3.5 w-3.5" />
                      Downloadable
                    </span>
                  )}
                </div>
                <div className="relative z-[2]">
                  <h3 className="text-[1.22rem] leading-snug">{i.title}</h3>
                  <p className="mt-3 text-[0.88rem] leading-relaxed text-mute">{i.excerpt}</p>
                </div>
                <div className="relative z-[2] mt-auto flex items-center justify-between gap-4 border-t border-[color:var(--tm-line)] pt-4">
                  <span className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">
                    <IconDoc className="h-3.5 w-3.5" />
                    {i.publishedOn}
                  </span>
                  <span className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute transition-colors group-hover:text-accent">
                    Read
                    <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] transition-colors ${
        active
          ? "border-accent bg-[color:var(--tm-accent-soft)] text-accent"
          : "border-[color:var(--tm-line)] text-mute hover:border-[color:var(--tm-line-strong)] hover:text-mist"
      }`}
    >
      {label}
    </button>
  );
}
