import type { Metadata } from "next";
import { IconArrow, IconCheck } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { COMPANY } from "@/lib/content/site";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Careers at Tech Maths",
  description:
    "Explore career opportunities with Tech Maths, a data centre services brand operated by Splendidintuition Lda in Lisbon. Send an expression of interest to our team.",
  path: "/careers",
  keywords: ["data centre careers", "data center engineer jobs Portugal", "Tech Maths careers"],
});

const WORK_AREAS = [
  { title: "Data centre engineering", detail: "Rack installation, server deployment, commissioning and on-site technical support." },
  { title: "Structured cabling", detail: "Copper and fibre installation, labelling, certification testing and clear handover records." },
  { title: "Network and systems", detail: "Network connection, OS and application installation, configuration and verification." },
  { title: "Project delivery", detail: "Planning, site coordination, safe execution and documentation for critical environments." },
];

export default function CareersPage() {
  const subject = encodeURIComponent("Career enquiry — Tech Maths");
  const mailto = `mailto:${COMPANY.email}?subject=${subject}`;
  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }]))}
      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Reveal><Pill tone="accent">Careers · Lisbon and field delivery</Pill></Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">Build the work behind the infrastructure.</h1>
          <Reveal delay={120}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              Tech Maths works in the places where reliability is built by hand: equipment rooms, data halls and network spaces. If you have practical experience and care about doing the work safely and documenting it properly, introduce yourself.
            </p>
          </Reveal>
          <div className="mt-8"><Btn href={mailto} arrow>Send a career enquiry</Btn></div>
        </div>
      </section>

      <section className="shell grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <SectionHead eyebrow="Work areas" title="Skills that keep critical sites moving" lead="These are areas connected to our services—not a list of confirmed vacancies." />
        </div>
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2">
          {WORK_AREAS.map((area) => (
            <li key={area.title} className="bg-[color:var(--tm-ink-2)] p-6">
              <h2 className="font-display text-[1.1rem]">{area.title}</h2>
              <p className="mt-3 text-[0.86rem] leading-relaxed text-mute">{area.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell border-t border-[color:var(--tm-line)] py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead eyebrow="How to get in touch" title="Tell us what you can do" lead="A short introduction is enough to start a conversation. Please include the role or kind of work you are interested in and the locations where you can work." />
            <a href={mailto} className="mt-7 inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-accent hover:text-mist">
              {COMPANY.email}<IconArrow className="h-4 w-4" />
            </a>
          </div>
          <div className="card-surface p-7 sm:p-8">
            <p className="eyebrow">Current vacancies</p>
            <h2 className="mt-3 text-[1.45rem]">No roles are listed here right now.</h2>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-mute">
              You can still send an expression of interest to {COMPANY.email}. Include your CV or a short work history, relevant certifications, preferred location and availability. Please do not send identity documents or other sensitive personal information in your first email.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Mention hands-on data centre, cabling, server, network or project experience.",
                "Tell us which languages you use professionally and where you can travel.",
                "We will reply if there is a suitable opportunity to discuss.",
              ].map((line) => <li key={line} className="flex gap-2.5 text-[0.84rem] leading-relaxed text-mist/90"><IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{line}</li>)}
            </ul>
            <a href={mailto} className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[0.86rem] font-medium text-[color:var(--tm-accent-ink)] transition-opacity hover:opacity-90">
              Email your interest<IconArrow className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
