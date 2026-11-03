import Link from "next/link";
import { COUNTRY_PATHS, HUB_POINTS, HQ_POINT, LAND_PATH, MAP_VIEWBOX } from "@/lib/content/worldmap";
import { listCoverage } from "@/lib/queries";
import { IconArrow, IconClock } from "./icons";

/**
 * Static, non-interactive coverage preview for the home page.
 * No client JavaScript: the full interactive map lives on /coverage.
 */
export function CoverageTeaser() {
  const countries = listCoverage();
  const fastest = countries.slice(0, 6);
  const european = countries.filter((c) => c.region !== "Americas" && c.region !== "Asia-Pacific").length;

  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] lg:grid-cols-[1.5fr_1fr]">
      <div className="relative bg-ink p-4 sm:p-6">
        <svg
          viewBox={MAP_VIEWBOX}
          className="h-auto w-full"
          role="img"
          aria-label={`Map of ${countries.length} countries covered by Tech Maths, with hubs across Europe, the UK, the US and India`}
        >
          <path d={LAND_PATH} fill="currentColor" className="text-mist" opacity="0.07" />
          {countries.map((c) => {
            const d = COUNTRY_PATHS[c.code];
            if (!d) return null;
            return (
              <path
                key={c.code}
                d={d}
                fill="var(--tm-accent)"
                fillOpacity={c.hq ? 0.9 : 0.22}
                stroke="var(--tm-accent)"
                strokeOpacity={c.hq ? 1 : 0.5}
                strokeWidth="0.5"
              >
                <title>{`${c.name} — ${c.mobiliseHours}h`}</title>
              </path>
            );
          })}
          {HUB_POINTS.map((hub) => (
            <circle
              key={hub.name}
              cx={hub.x}
              cy={hub.y}
              r={hub.hq ? 3.2 : 1.6}
              fill={hub.hq ? "var(--tm-accent)" : "var(--tm-mist)"}
              opacity={hub.hq ? 1 : 0.5}
            />
          ))}
          <circle cx={HQ_POINT.x} cy={HQ_POINT.y} r="8" fill="none" stroke="var(--tm-accent)" strokeOpacity="0.45" />
        </svg>
        <p className="mt-2 text-center font-mono text-[0.58rem] uppercase tracking-[0.16em] text-mute">
          {european} European countries · hubs in 7 cities
        </p>
      </div>

      <div className="bg-ink p-6 sm:p-8">
        <p className="eyebrow">Fastest mobilisation</p>
        <ul className="mt-5 divide-y divide-[color:var(--tm-line)]">
          {fastest.map((c) => (
            <li key={c.code} className="flex items-center justify-between gap-4 py-3">
              <span className="text-[0.92rem] text-mist">
                {c.name}
                {c.hq && <span className="ml-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-accent">HQ</span>}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[0.72rem] text-mute">
                <IconClock className="h-3.5 w-3.5" />
                {c.mobiliseHours}h
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/coverage"
          className="group mt-6 inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-accent"
        >
          Full coverage map
          <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
