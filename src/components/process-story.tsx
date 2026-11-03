"use client";

import { useEffect, useRef, useState } from "react";

type Stage = {
  id: string;
  step: string;
  title: string;
  duration: string;
  summary: string;
  detail: string;
  outputs: string[];
  gate: string;
};

/**
 * Scroll-driven process story: a pinned stage on the left renders the active
 * stage as a schematic, while the eight stages scroll past on the right.
 * The active stage is driven by IntersectionObserver, not scroll math.
 */
export function ProcessStory({ stages }: { stages: Stage[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the viewport centre.
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
        if (!best) return;
        const idx = refs.current.findIndex((el) => el === best.target);
        if (idx >= 0) setActive(idx);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [stages.length]);

  const stage = stages[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
      {/* Pinned schematic */}
      <div className="hidden lg:block">
        <div className="sticky top-[112px]">
          <div className="card-surface relative overflow-hidden p-8">
            <div className="grid-field pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-accent">
                Stage {stage.step} / 08 · {stage.duration}
              </p>
              <h3 className="mt-4 text-[2.4rem] leading-none">{stage.title}</h3>
              <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-mute">{stage.detail}</p>

              {/* Schematic: the eight stages as a pipeline with the active node lit */}
              <svg viewBox="0 0 400 96" className="mt-8 w-full" aria-hidden="true">
                <line x1="14" y1="48" x2="386" y2="48" stroke="var(--tm-line-strong)" strokeWidth="1" />
                {stages.map((s, i) => {
                  const x = 14 + (372 / (stages.length - 1)) * i;
                  const on = i === active;
                  const done = i < active;
                  return (
                    <g key={s.id}>
                      {on && <circle cx={x} cy={48} r="16" fill="var(--tm-accent)" opacity="0.16" />}
                      <circle
                        cx={x}
                        cy={48}
                        r={on ? 7 : 4}
                        fill={on ? "var(--tm-accent)" : done ? "var(--tm-mist)" : "var(--tm-ink-2)"}
                        stroke={on || done ? "var(--tm-accent)" : "var(--tm-line-strong)"}
                        strokeWidth="1"
                        opacity={on ? 1 : done ? 0.75 : 1}
                        style={{ transition: "r .4s cubic-bezier(.16,1,.3,1), fill .4s" }}
                      />
                      <text
                        x={x}
                        y={i % 2 === 0 ? 22 : 82}
                        textAnchor="middle"
                        fontSize="8"
                        fontFamily="var(--tm-font-mono)"
                        letterSpacing="0.6"
                        fill={on ? "var(--tm-accent)" : "var(--tm-mute)"}
                      >
                        {s.title.toUpperCase().slice(0, 10)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="mt-6 border-t border-[color:var(--tm-line)] pt-5">
                <p className="eyebrow mb-3">Outputs at this stage</p>
                <ul className="space-y-1.5">
                  {stage.outputs.map((o) => (
                    <li key={o} className="flex gap-2.5 text-[0.85rem] text-mist/85">
                      <span className="mt-2 h-px w-3 shrink-0 bg-accent" />
                      {o}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 rounded-lg border border-accent/30 bg-[color:var(--tm-accent-soft)] px-3.5 py-2.5 text-[0.82rem] text-accent">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em]">Quality gate</span>
                  <br />
                  {stage.gate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling stages */}
      <ol className="space-y-4">
        {stages.map((s, i) => (
          <li
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`rounded-2xl border p-6 transition-all duration-500 sm:p-7 ${
              i === active
                ? "border-accent/45 bg-[color:var(--tm-panel)]"
                : "border-[color:var(--tm-line)] bg-transparent"
            }`}
          >
            <div className="flex items-baseline gap-4">
              <span className={`font-mono text-[0.7rem] tracking-[0.18em] ${i === active ? "text-accent" : "text-mute"}`}>
                {s.step}
              </span>
              <h3 className="text-[1.5rem]">{s.title}</h3>
              <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">{s.duration}</span>
            </div>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-mute">{s.summary}</p>
            {/* Mobile renders the full detail inline; desktop shows it in the pinned stage. */}
            <div className="mt-4 lg:hidden">
              <p className="text-[0.88rem] leading-relaxed text-mist/85">{s.detail}</p>
              <ul className="mt-3 space-y-1.5">
                {s.outputs.map((o) => (
                  <li key={o} className="flex gap-2.5 text-[0.82rem] text-mute">
                    <span className="mt-2 h-px w-3 shrink-0 bg-accent" />
                    {o}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg border border-accent/25 bg-[color:var(--tm-accent-soft)] px-3 py-2 text-[0.8rem] text-accent">
                {s.gate}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
