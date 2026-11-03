import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { IconDoc, IconShield } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { ProcessStory } from "@/components/process-story";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { PROCESS, SAFETY_STANDARDS } from "@/lib/content/site";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "How we work",
  description:
    "The Tech Maths delivery method: brief, survey, plan, mobilise, execute, test, document, handover — with defined outputs and a quality gate at every stage, plus our ESD, safety, change-control and documentation standards.",
  path: "/how-we-work",
  keywords: ["data center delivery process", "data center commissioning process", "ESD control", "change control", "as-built documentation"],
});

const HANDOVER_PACK = [
  { n: "01", t: "As-built drawings", d: "Rack elevations, containment routes and cable paths in PDF and DWG, revised to reflect what was actually installed." },
  { n: "02", t: "Asset register", d: "Every device by serial number, make, model, rack, U position, PDU and outlet, with firmware and BIOS versions where we installed them." },
  { n: "03", t: "Cabling schedules", d: "Link-by-link schedules, patching tables, port maps and the administration scheme used." },
  { n: "04", t: "Test & certification results", d: "Native certifier exports plus PDF summaries, acceptance test results, failover evidence and re-test records." },
  { n: "05", t: "Defect register", d: "Every fault found, its severity, owner, fix and closure evidence — including anything accepted as residual risk." },
  { n: "06", t: "Runbooks & deviations", d: "Operational notes for your team, plus a deviation log explaining every change from the approved plan." },
];

export default function HowWeWorkPage() {
  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "How we work", path: "/how-we-work" }]))}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Reveal>
            <Pill tone="accent">Eight stages · one quality gate each</Pill>
          </Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">
            The method is the product.
          </h1>
          <Reveal delay={160}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              Anyone can mount a server. What separates a delivery partner from a labour supplier is whether the
              work is repeatable, evidenced and documented well enough that the next engineer does not have to
              guess. This is how every Tech Maths project runs, whether it is one rack or three halls.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="shell py-20 sm:py-24">
        <h2 className="mb-10 text-[clamp(1.6rem,3.4vw,2.4rem)]">The eight stages</h2>
        <ProcessStory stages={PROCESS} />
      </section>

      {/* Standards */}
      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20 sm:py-24">
        <div className="shell">
          <SectionHead
            eyebrow="Standards"
            title="Safety, ESD, change control and documentation"
            lead="These are not policies we quote in a tender. They are the controls an auditor can check on the floor, and the reason our handover packs survive scrutiny."
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2">
            {SAFETY_STANDARDS.map((s, i) => (
              <Reveal key={s.title} delay={i * 80} className="bg-ink p-7 sm:p-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--tm-line)] text-accent">
                  <IconShield className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-[1.2rem]">{s.title}</h3>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-mute">{s.detail}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Handover pack */}
      <section className="shell py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionHead
              eyebrow="Sample handover pack"
              title="What you receive at acceptance"
              lead="Six documents, issued in your document structure if you have one. Written during the job, not reconstructed afterwards — which is why the as-builts match the hall."
            />
            <div className="mt-8">
              <Btn href="/contact" arrow>
                Request a sample pack
              </Btn>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-[color:var(--tm-line)] px-6 py-4">
              <span className="flex items-center gap-2.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mute">
                <IconDoc className="h-4 w-4 text-accent" />
                handover-pack.pdf
              </span>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute/60">6 sections</span>
            </div>
            <ul className="divide-y divide-[color:var(--tm-line)]">
              {HANDOVER_PACK.map((h) => (
                <li key={h.n} className="flex gap-5 px-6 py-5">
                  <span className="font-mono text-[0.66rem] tracking-[0.16em] text-accent">{h.n}</span>
                  <div>
                    <p className="text-[0.98rem] text-mist">{h.t}</p>
                    <p className="mt-1.5 text-[0.84rem] leading-relaxed text-mute">{h.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quality commitments + FAQ */}
      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHead
            eyebrow="Commitments"
            title="What we will and will not do"
            lead="A short list of rules our crews work to. They exist because each one has cost somebody money in the past."
          />
          <ul className="space-y-4">
            {[
              { t: "We will log every deviation.", d: "If reality disagrees with the plan, it is written down the same day with the reason and the approval." },
              { t: "We will not mark a failing test as passed.", d: "A defect is closed with a re-test, or accepted by you in writing as residual risk. There is no third option." },
              { t: "We will not touch production unrecorded.", d: "Live work happens under your change control, in an agreed window, with a rollback defined first." },
              { t: "We will document as we go.", d: "As-builts are updated during the job. A documentation backlog at handover is a defect like any other." },
              { t: "We will tell you when the scope is wrong.", d: "If the design will not work as drawn, you hear it at the plan stage — not from an engineer improvising on the floor." },
            ].map((c, i) => (
              <Reveal as="li" key={c.t} delay={i * 70} className="rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] p-5">
                <p className="text-[1rem] text-mist">{c.t}</p>
                <p className="mt-2 text-[0.86rem] leading-relaxed text-mute">{c.d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell py-20">
        <FaqList
          idPrefix="hww-faq"
          faqs={[
            {
              q: "How quickly can a project start?",
              a: "Standard requests are quoted within four business hours and can mobilise inside two weeks. Emergency work mobilises from the nearest hub, often the same day for hub sites.",
            },
            {
              q: "Can you work under our existing method statements?",
              a: "Yes. Send your RAMS, change-control process and site procedures and we work to them. Where you do not have them, we provide ours for your approval before mobilisation.",
            },
            {
              q: "What happens if a project overruns?",
              a: "You hear about the risk before it becomes an overrun. Progress is reported daily against the programme, with blockers named and a recovery proposal attached.",
            },
            {
              q: "Do you subcontract?",
              a: "Our engineers are our own crews. Where a task needs a licensed trade — electrical works upstream of the PDU, for example — we say so at the brief stage and coordinate the specialist rather than quietly passing the work on.",
            },
          ]}
        />
      </section>
    </>
  );
}
