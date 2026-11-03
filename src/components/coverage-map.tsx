"use client";

import { useMemo, useState } from "react";
import { COUNTRY_PATHS, HUB_POINTS, HQ_POINT, LAND_PATH, MAP_VIEWBOX } from "@/lib/content/worldmap";
import type { CoverageCountry } from "@/lib/types";
import { IconClock, IconPin } from "./icons";

const REGION_ORDER = [
  "Iberia",
  "UK & Ireland",
  "Western Europe",
  "Benelux",
  "DACH",
  "Nordics",
  "Southern Europe",
  "Central & Eastern Europe",
  "Americas",
  "Asia-Pacific",
] as const;

function arc(from: { x: number; y: number }, to: { x: number; y: number }, lift = 0.22) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mx = (from.x + to.x) / 2 - dy * lift;
  const my = (from.y + to.y) / 2 + dx * lift * 0.35 - Math.abs(dx) * 0.06;
  return `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`;
}

export function CoverageMap({ countries }: { countries: CoverageCountry[] }) {
  const [selected, setSelected] = useState<string>("PT");
  const [region, setRegion] = useState<string>("All");

  const byCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);
  const visible = useMemo(
    () => (region === "All" ? countries : countries.filter((c) => c.region === region)),
    [countries, region]
  );
  const active = byCode.get(selected) ?? countries[0];
  const activeHubs = HUB_POINTS.filter((h) => h.code === selected);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]">
      <div className="relative overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] p-2 sm:p-4">
        <svg
          viewBox={MAP_VIEWBOX}
          className="h-auto w-full"
          role="group"
          aria-label={`World map showing Tech Maths coverage across ${countries.length} countries. Each country is a button that shows its mobilisation time.`}
        >
          <defs>
            <radialGradient id="hqGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--tm-accent)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--tm-accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Base landmass */}
          <path d={LAND_PATH} fill="currentColor" className="text-mist" opacity="0.07" />

          {/* Covered countries */}
          {visible.map((c) => {
            const d = COUNTRY_PATHS[c.code];
            if (!d) return null;
            const on = c.code === selected;
            return (
              <path
                key={c.code}
                d={d}
                role="button"
                tabIndex={0}
                aria-label={`${c.name}: engineers mobilised in ${c.mobiliseHours} hours`}
                aria-pressed={on}
                onClick={() => setSelected(c.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(c.code);
                  }
                }}
                className="cursor-pointer outline-none transition-all duration-300"
                fill={on ? "var(--tm-accent)" : "var(--tm-accent)"}
                fillOpacity={on ? 0.85 : 0.2}
                stroke={on ? "var(--tm-accent)" : "var(--tm-accent)"}
                strokeOpacity={on ? 1 : 0.45}
                strokeWidth={on ? 1.1 : 0.5}
                style={{ filter: on ? "drop-shadow(0 0 10px var(--tm-glow))" : undefined }}
              >
                <title>{`${c.name} — ${c.mobiliseHours}h mobilisation`}</title>
              </path>
            );
          })}

          {/* Deployment arcs from the Lisbon HQ to the selected country's hubs */}
          {activeHubs.map((hub) => (
            <path
              key={`arc-${hub.name}`}
              d={arc(HQ_POINT, hub)}
              fill="none"
              stroke="var(--tm-accent)"
              strokeOpacity="0.45"
              strokeWidth="0.8"
              strokeDasharray="3 4"
              className="motion-safe:[animation:tm-dash_18s_linear_infinite]"
            />
          ))}

          {/* Hub markers */}
          {HUB_POINTS.filter((h) => region === "All" || visible.some((c) => c.code === h.code)).map((hub) => {
            const on = hub.code === selected;
            return (
              <g key={hub.name} className="cursor-pointer" onClick={() => setSelected(hub.code)}>
                <circle cx={hub.x} cy={hub.y} r={hub.hq ? 9 : on ? 5 : 3.2} fill="url(#hqGlow)" />
                <circle
                  cx={hub.x}
                  cy={hub.y}
                  r={hub.hq ? 3.4 : on ? 2.4 : 1.7}
                  fill={on || hub.hq ? "var(--tm-accent)" : "var(--tm-mist)"}
                  opacity={on || hub.hq ? 1 : 0.55}
                />
                {hub.hq && (
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r="7"
                    fill="none"
                    stroke="var(--tm-accent)"
                    strokeWidth="0.7"
                    opacity="0.6"
                    className="motion-safe:pulse-dot origin-center"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )}
              </g>
            );
          })}

          <text
            x={HQ_POINT.x + 10}
            y={HQ_POINT.y - 8}
            fill="var(--tm-accent)"
            fontSize="9"
            fontFamily="var(--tm-font-mono)"
            letterSpacing="1.2"
          >
            LISBON HQ
          </text>
        </svg>

        <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-mute/70">
          Select a country · {visible.length} shown
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-wrap gap-1.5">
          {["All", ...REGION_ORDER].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              aria-pressed={region === r}
              className={`rounded-full border px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] transition-colors ${
                region === r
                  ? "border-accent bg-[color:var(--tm-accent-soft)] text-accent"
                  : "border-[color:var(--tm-line)] text-mute hover:border-[color:var(--tm-line-strong)] hover:text-mist"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {active && (
          <div className="card-surface mt-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{active.region}</p>
                <h2 className="mt-2 text-[1.6rem]">{active.name}</h2>
              </div>
              {active.hq && (
                <span className="rounded-full border border-accent/45 bg-[color:var(--tm-accent-soft)] px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-accent">
                  Headquarters
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-3">
              <IconClock className="h-5 w-5 text-accent" />
              <div>
                <p className="font-display text-[1.35rem] leading-none">
                  {active.mobiliseHours}
                  <span className="text-accent">h</span>
                </p>
                <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-mute">
                  typical mobilisation
                </p>
              </div>
            </div>

            <p className="mt-5 text-[0.9rem] leading-relaxed text-mute">{active.note}</p>

            <div className="mt-5">
              <p className="eyebrow mb-2.5 flex items-center gap-2">
                <IconPin className="h-3.5 w-3.5" /> Hubs & cities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {active.hubs.map((hub) => (
                  <span
                    key={hub}
                    className="rounded-full border border-[color:var(--tm-line)] px-2.5 py-1 text-[0.76rem] text-mist/85"
                  >
                    {hub}
                  </span>
                ))}
              </div>
            </div>

            <a
              href={`/contact?country=${encodeURIComponent(active.name)}`}
              className="mt-6 inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-accent"
            >
              Request engineers in {active.name}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
