"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrow, IconSearch } from "./icons";
import type { SearchHit } from "@/lib/queries";

/** ⌘K search overlay backed by /api/search. Fully keyboard operable. */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    };
    window.addEventListener("tm:search-open", onOpen);
    return () => window.removeEventListener("tm:search-open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, hits.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, hits.length]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits ?? []);
        setActive(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[color:var(--tm-line-strong)] bg-[color:var(--tm-ink-2)] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-3 border-b border-[color:var(--tm-line)] px-5">
          <IconSearch className="h-4 w-4 text-accent" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[active]) {
                window.location.href = hits[active].href;
              }
            }}
            placeholder="Search services, projects, insights…"
            aria-label="Search query"
            className="w-full bg-transparent py-4 text-[0.95rem] text-mist outline-none placeholder:text-mute"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute hover:text-mist"
          >
            esc
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <p className="px-5 py-8 text-center text-[0.85rem] text-mute">
              Type at least two characters. Try <span className="text-mist">fibre</span>,{" "}
              <span className="text-mist">commissioning</span> or <span className="text-mist">Lisbon</span>.
            </p>
          ) : loading ? (
            <p className="px-5 py-8 text-center font-mono text-[0.7rem] uppercase tracking-[0.16em] text-mute">
              Searching…
            </p>
          ) : hits.length === 0 ? (
            <p className="px-5 py-8 text-center text-[0.85rem] text-mute">
              Nothing matched. <a href="/contact" className="link-underline text-accent">Ask us directly</a> — we
              probably do it anyway.
            </p>
          ) : (
            <ul ref={listRef} className="divide-y divide-[color:var(--tm-line)]">
              {hits.map((h, i) => (
                <li key={h.href + h.title}>
                  <a
                    href={h.href}
                    data-i={i}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-start gap-4 px-5 py-3.5 transition-colors ${
                      i === active ? "bg-[color:var(--tm-accent-soft)]" : "hover:bg-[color:var(--tm-panel)]"
                    }`}
                  >
                    <span className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-accent">
                      {h.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.92rem] text-mist">{h.title}</span>
                      <span className="mt-0.5 block truncate text-[0.78rem] text-mute">{h.blurb}</span>
                    </span>
                    <IconArrow className="mt-1 h-4 w-4 shrink-0 text-mute" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
