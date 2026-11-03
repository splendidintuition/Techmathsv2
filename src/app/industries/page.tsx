import type { Metadata } from "next";
import Link from "next/link";
import { IconArrow, ServiceIcon } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { listIndustries, listServices } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Industries we deliver for",
  description:
    "Data center delivery for colocation providers, hyperscale operators, enterprise server rooms, telecom and network operators, and edge infrastructure — with the pressures each sector actually faces and the services that address them.",
  path: "/industries",
  keywords: ["colocation deployment", "hyperscale build-out", "enterprise server room", "telecom data center", "edge infrastructure deployment"],
});

export default function IndustriesPage() {
  const industries = listIndustries();
  const services = listServices();
  const bySlug = new Map(services.map((s) => [s.slug, s]));

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Industries", path: "/industries" }]))}
      {jsonLd({
        "@type": "ItemList",
        name: "Industries served",
        itemListElement: industries.map((i, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: i.title,
          description: i.summary,
        })),
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Reveal>
            <Pill tone="accent">Five sectors · one delivery standard</Pill>
          </Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">
            Different pressure,
            <br />
            same discipline.
          </h1>
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              A colocation provider absorbing customer deployments has a different problem from a hyperscale
              operator building three halls. The method does not change; what changes is where the risk sits and
              what gets checked hardest.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="space-y-20">
          {industries.map((ind, idx) => (
            <article
              key={ind.slug}
              id={ind.slug}
              className="grid scroll-mt-24 gap-10 border-t border-[color:var(--tm-line)] pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20"
            >
              <div>
                <Reveal>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-accent">
                    {String(idx + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-4 text-[clamp(1.7rem,3.4vw,2.4rem)]">{ind.title}</h2>
                  <p className="mt-5 text-[0.98rem] leading-relaxed text-mute">{ind.summary}</p>
                  <p className="mt-6 rounded-xl border border-accent/25 bg-[color:var(--tm-accent-soft)] p-4 text-[0.88rem] leading-relaxed text-mist">
                    {ind.proofPoint}
                  </p>
                </Reveal>
              </div>

              <div>
                <Reveal delay={100}>
                  <h3 className="eyebrow mb-4">What usually drives the work</h3>
                  <ul className="space-y-3">
                    {ind.pressures.map((p) => (
                      <li key={p} className="flex gap-3 text-[0.92rem] leading-relaxed text-mist/90">
                        <span className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>

                <Reveal delay={180}>
                  <h3 className="eyebrow mt-9 mb-4">Services we deliver here</h3>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {ind.services.map((slug) => {
                      const s = bySlug.get(slug);
                      if (!s) return null;
                      return (
                        <li key={slug}>
                          <Link
                            href={`/services/${slug}`}
                            className="group flex items-center gap-3 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-3 transition-colors hover:border-accent/45"
                          >
                            <ServiceIcon name={s.icon} className="h-4.5 w-4.5 text-mute transition-colors group-hover:text-accent" />
                            <span className="text-[0.88rem] text-mist">{s.title}</span>
                            <IconArrow className="ml-auto h-3.5 w-3.5 text-mute transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Reveal>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] p-8 sm:p-10">
          <SectionHead
            eyebrow="Not sure which box you fit?"
            title="Most clients are two or three of these at once"
            lead="A colocation provider running an edge programme, or an enterprise operating a private hyperscale-style estate. Tell us the shape of the work and we will tell you how we would staff it."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="/contact" size="lg" arrow>
              Describe your project
            </Btn>
            <Btn href="/projects" variant="outline" size="lg">
              See comparable work
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
