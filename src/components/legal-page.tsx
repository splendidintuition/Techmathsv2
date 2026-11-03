import type { ReactNode } from "react";
import Link from "next/link";
import { COMPANY } from "@/lib/content/site";
import { Pill } from "./ui";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Shared shell for Privacy, Cookie and Terms pages. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="shell relative py-16 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-7">
            <ol className="flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
              <li>
                <Link href="/" className="hover:text-accent">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-accent">{title}</li>
            </ol>
          </nav>
          <Pill>{eyebrow}</Pill>
          <h1 className="mt-6 max-w-3xl text-[clamp(2rem,4.6vw,3.2rem)]">{title}</h1>
          <p className="mt-5 max-w-2xl text-[1rem] leading-relaxed text-mute">{intro}</p>
          <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute/70">
            Last updated {updated}
          </p>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-[112px]">
              <p className="eyebrow mb-4">Contents</p>
              <ul className="space-y-2.5 border-l border-[color:var(--tm-line)]">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block border-l border-transparent pl-4 text-[0.82rem] leading-snug text-mute transition-colors hover:border-accent hover:text-mist"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="max-w-3xl space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="flex items-baseline gap-3 text-[1.35rem]">
                  <span className="font-mono text-[0.66rem] tracking-[0.16em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                <div className="mt-4 space-y-4 text-[0.94rem] leading-relaxed text-mute">{s.body}</div>
              </section>
            ))}

            <div className="rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] p-7">
              <h2 className="text-[1.15rem]">Contact</h2>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-mute">
                {COMPANY.legalName} · {COMPANY.headquarters.address}
                <br />
                <a href={`mailto:${COMPANY.email}`} className="link-underline text-mist">
                  {COMPANY.email}
                </a>{" "}
                · {COMPANY.phone}
              </p>
              <p className="mt-4 text-[0.82rem] text-mute/80">
                Company and contact details on this page are placeholders pending confirmation. This document is a
                drafting template and should be reviewed by qualified counsel in each jurisdiction where you
                operate before launch.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
