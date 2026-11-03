import type { Metadata } from "next";
import { ServicesExplorer } from "@/components/services-explorer";
import { Reveal } from "@/components/motion";
import { Btn, SectionHead } from "@/components/ui";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { listServices } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Data center services",
  description:
    "Nine data center delivery services: rack and stack, structured cabling, server installation, OS and application deployment, network connection, commissioning and testing, remote and smart hands, decommissioning and migration, and SLA-based field support.",
  path: "/services",
  keywords: [
    "data center services",
    "rack and stack services",
    "structured cabling services",
    "data center installation",
    "remote hands services",
    "data center commissioning",
  ],
});

export default function ServicesPage() {
  const services = listServices();

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }]))}
      {jsonLd({
        "@type": "ItemList",
        name: "Tech Maths data center services",
        itemListElement: services.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.title,
          url: `/services/${s.slug}`,
        })),
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <SectionHead
            level="h1"
            eyebrow="Service catalogue"
            title={
              <>
                Everything between an empty hall
                <br />
                and an accepted deployment.
              </>
            }
            lead="Nine services that cover the whole delivery lifecycle. Take one, or take the sequence — most clients start with a build and stay for support."
          />
          <Reveal delay={180}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Btn href="/contact" arrow>
                Quick quote
              </Btn>
              <Btn href="/how-we-work" variant="outline">
                How we work
              </Btn>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <h2 className="mb-8 text-[clamp(1.5rem,3vw,2.1rem)]">The nine services</h2>
        <ServicesExplorer services={services} />
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead
            eyebrow="By phase"
            title="How the nine fit together"
            lead="Each group has a distinct skill set, but they share one documentation standard — which is why the handover pack is coherent whether you buy one service or all nine."
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_CATEGORIES.map((c, i) => (
              <Reveal key={c.id} delay={i * 80} className="bg-ink p-7">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-accent">
                  {String(i + 1).padStart(2, "0")} · {c.label}
                </p>
                <p className="mt-4 text-[0.95rem] leading-relaxed text-mist">{c.blurb}</p>
                <ul className="mt-5 space-y-2">
                  {c.slugs.map((slug) => {
                    const s = services.find((x) => x.slug === slug);
                    if (!s) return null;
                    return (
                      <li key={slug}>
                        <a href={`/services/${slug}`} className="link-underline text-[0.85rem] text-mute hover:text-mist">
                          {s.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
