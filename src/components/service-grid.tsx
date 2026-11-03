import type { Service } from "@/lib/types";
import { ServiceIcon } from "./icons";
import { Magnetic, Reveal } from "./motion";
import { IconArrow } from "./icons";
import Link from "next/link";

/**
 * Home page service grid: nine cards with an icon, a hover sweep and a
 * progressive reveal. Server-rendered; only the reveal observer is client JS.
 */
export function ServiceGrid({ services }: { services: Service[] }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-[16px] border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s, i) => (
        <Reveal as="li" key={s.slug} delay={i * 45} className="bg-ink">
          <Link
            href={`/services/${s.slug}`}
            className="sweep group relative flex h-full flex-col justify-between gap-8 p-6 transition-colors duration-500 hover:bg-[color:var(--tm-panel)] sm:p-7"
          >
            <div className="relative z-[2]">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--tm-line)] text-mute transition-all duration-500 group-hover:border-accent group-hover:text-accent">
                  <ServiceIcon name={s.icon} className="h-5 w-5" />
                </span>
                <span className="font-mono text-[0.62rem] tracking-[0.16em] text-mute">
                  {String(s.position).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-6 text-[1.22rem]">{s.title}</h3>
              <p className="mt-3 text-[0.88rem] leading-relaxed text-mute">{s.short}</p>
            </div>
            <div className="relative z-[2] flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-accent">
              Service detail
              <IconArrow className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
            </div>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}

/** Compact horizontal card used on hub pages and related-service blocks. */
export function ServiceCardRow({ services, title }: { services: Service[]; title?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s, i) => (
        <Reveal key={s.slug} delay={i * 40}>
          <Magnetic strength={0.06}>
            <Link
              href={`/services/${s.slug}`}
              className="card-surface group flex h-full items-start gap-4 p-5 transition-all duration-500 hover:border-accent/45"
            >
              <span className="mt-0.5 text-mute transition-colors group-hover:text-accent">
                <ServiceIcon name={s.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[0.98rem] text-mist">{s.title}</span>
                <span className="mt-1 block text-[0.82rem] leading-relaxed text-mute">{s.short}</span>
              </span>
            </Link>
          </Magnetic>
        </Reveal>
      ))}
      {title && <p className="sr-only">{title}</p>}
    </div>
  );
}
