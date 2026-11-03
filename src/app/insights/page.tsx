import type { Metadata } from "next";
import { InsightsExplorer } from "@/components/insights-explorer";
import { Reveal } from "@/components/motion";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { insightCategories, listInsights } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Insights — field notes, checklists and guides",
  description:
    "Practical data center engineering writing from the Tech Maths delivery team: cabling certification, ESD control, decommissioning checklists, failover testing, scope-of-work guidance and remote hands SLAs.",
  path: "/insights",
  keywords: ["data center checklist", "cabling certification guide", "ESD control checklist", "data center scope of work", "remote hands SLA"],
});

export default function InsightsPage() {
  const insights = listInsights();
  const categories = insightCategories();
  const downloadable = insights.filter((i) => i.download).length;

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Insights", path: "/insights" }]))}
      {jsonLd({
        "@type": "Blog",
        name: "Tech Maths Insights",
        description: "Practical data center engineering notes from the delivery team.",
        blogPost: insights.map((i) => ({
          "@type": "BlogPosting",
          headline: i.title,
          datePublished: i.publishedOn,
          url: `/insights/${i.slug}`,
          author: { "@type": "Person", name: i.author },
        })),
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">{insights.length} published</Pill>
              <Pill>{downloadable} downloadable</Pill>
            </div>
          </Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">
            Field notes,
            <br />
            not marketing.
          </h1>
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              The things our engineers argue about on site, written down: what to insist on in a scope of work,
              what an auditor actually checks, and how to prove a claim instead of making one.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <h2 className="mb-8 text-[clamp(1.5rem,3vw,2.1rem)]">Field notes, checklists and guides</h2>
        <InsightsExplorer insights={insights} categories={categories} />
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead
            eyebrow="Need something specific?"
            title="We write these because clients keep asking"
            lead="If there is a checklist, standard or comparison you would find useful, tell us — several of these started as a client question."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="/contact" size="lg" arrow>
              Suggest a topic
            </Btn>
            <Btn href="/services" variant="outline" size="lg">
              Browse services
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
