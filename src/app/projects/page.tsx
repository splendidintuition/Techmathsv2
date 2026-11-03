import type { Metadata } from "next";
import { ProjectsExplorer } from "@/components/projects-explorer";
import { Reveal } from "@/components/motion";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { listProjects, serviceTitleMap } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Projects & case studies",
  description:
    "Data center delivery case studies with scope, method and measured results: hyperscale fit-outs, colocation deployments, live-facility cabling refreshes, migrations, fabric commissioning and edge rollouts across Europe, the UK, US and India.",
  path: "/projects",
  keywords: ["data center case study", "data center project reference", "rack deployment case study", "data center migration case study"],
});

export default function ProjectsPage() {
  const projects = listProjects();
  const serviceTitles = serviceTitleMap();

  const totalRacks = projects.reduce((sum, p) => {
    const m = p.metrics.find((x) => /rack/i.test(x.label));
    return sum + (m ? parseInt(m.value.replace(/[^0-9]/g, ""), 10) || 0 : 0);
  }, 0);

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Projects", path: "/projects" }]))}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">{projects.length} published cases</Pill>
              <Pill tone="warn">Illustrative until real references are supplied</Pill>
            </div>
          </Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">
            Evidence, not adjectives.
          </h1>
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              Each case sets out the problem, what we actually did, and the numbers afterwards. Client names are
              withheld until references are approved for publication — the scope and results are representative of
              work we deliver.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-[color:var(--tm-line)] pt-8 sm:grid-cols-4">
              {[
                { v: String(projects.length), l: "published cases" },
                { v: `${totalRacks.toLocaleString("en-GB")}+`, l: "racks across cases" },
                { v: String(new Set(projects.map((p) => p.country)).size), l: "countries represented" },
                { v: String(new Set(projects.flatMap((p) => p.services)).size), l: "services exercised" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="font-display text-[1.9rem] leading-none">{s.v}</dd>
                  <dd className="mt-2 text-[0.78rem] text-mute">{s.l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <h2 className="mb-8 text-[clamp(1.5rem,3vw,2.1rem)]">Delivery cases</h2>
        <ProjectsExplorer projects={projects} serviceTitles={serviceTitles} />
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead
            eyebrow="References"
            title="Need a comparable reference under NDA?"
            lead="We can share fuller detail, including client names and site specifics, under a confidentiality agreement — including the test evidence behind the results."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn href="/contact" size="lg" arrow>
              Request references
            </Btn>
            <Btn href="/how-we-work" variant="outline" size="lg">
              How we deliver
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
