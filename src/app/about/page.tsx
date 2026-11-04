import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { IconGlobe, IconPin, IconShield } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Btn, PlaceholderTag, Pill, SectionHead } from "@/components/ui";
import { COMPANY, PLACEHOLDER_REGISTER, STATS } from "@/lib/content/site";
import { listCoverage, listTeam, listTestimonials } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Tech Maths",
  description:
    "Tech Maths is a specialist data center engineering partner headquartered in Lisbon, with delivery teams across Europe, the UK, the United States and India. Learn about our approach and delivery standards.",
  path: "/about",
  keywords: ["data center engineering company", "data center services company Lisbon", "data center engineers Portugal"],
});

const VALUES = [
  {
    t: "Evidence over assertion",
    d: "We would rather show a test result than describe a capability. If we cannot evidence it, we do not claim it.",
  },
  {
    t: "Document as you go",
    d: "As-builts are updated during the job. A handover pack reconstructed at the end is a guess with a cover sheet.",
  },
  {
    t: "Say the awkward thing early",
    d: "If a design will not work, or a deadline is not realistic, you hear it at the plan stage — when it is cheap to change.",
  },
  {
    t: "Leave the site better",
    d: "Cable dressed, labels legible, containment closed, floor clean. The next engineer should find it easier than we did.",
  },
];

export default function AboutPage() {
  const team = listTeam();
  const testimonials = listTestimonials();
  const coverage = listCoverage();
  const european = coverage.filter((c) => c.region !== "Americas" && c.region !== "Asia-Pacific");

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }]))}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">
                <IconPin className="h-3 w-3" />
                {COMPANY.headquarters.city}, {COMPANY.headquarters.country}
              </Pill>
              {COMPANY.founded && <Pill>Founded {COMPANY.founded}</Pill>}
              <Pill tone="warn">Team profiles are placeholders</Pill>
            </div>
          </Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">
            A specialist partner,
            <br />
            not a general IT shop.
          </h1>
          <Reveal delay={160}>
            <div className="mt-7 max-w-2xl space-y-5 text-[1.02rem] leading-relaxed text-mute">
              <p>
                Tech Maths exists because data center delivery kept getting treated as unskilled labour. It is not.
                Rack loading, bend radius, ESD handling, firmware baselines, failover behaviour and the
                documentation that makes all of it auditable — these are crafts, and they are the difference
                between a deployment that runs for ten years and one that generates tickets for ten years.
              </p>
              <p>{COMPANY.positioning}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-b border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)]">
        <div className="shell grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 70}>
              <p className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-none">
                {s.value}
                <span className="text-accent">{s.suffix}</span>
              </p>
              <p className="mt-3 text-[0.85rem] text-mute">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="shell py-20 sm:py-24">
        <SectionHead
          eyebrow="What we hold to"
          title="Four rules that shape every project"
          lead="They are unfashionable in a tender, which is exactly why they are worth stating."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.t} delay={i * 80} className="bg-ink p-7 sm:p-8">
              <p className="font-mono text-[0.62rem] tracking-[0.18em] text-accent">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 text-[1.2rem]">{v.t}</h3>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-mute">{v.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Publish only verified team profiles. */}
      {team.length > 0 && (
      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20 sm:py-24">
        <div className="shell">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <SectionHead
              eyebrow="The team"
              title="Named engineers, not a labour pool"
              lead="Repeat clients get the same people back on site, which is why site familiarity compounds instead of resetting on every visit."
            />
          </div>

          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <Reveal as="li" key={m.name} delay={i * 60} className="bg-ink p-7">
                <div className="flex items-center gap-4">
                  {/* Avatar placeholder — replace with a real photograph */}
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--tm-line-strong)] font-mono text-[0.72rem] tracking-[0.1em] text-mute"
                    aria-hidden="true"
                  >
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[1.05rem] text-mist">{m.name}</h3>
                    <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent">{m.role}</p>
                  </div>
                </div>
                <p className="mt-5 text-[0.86rem] leading-relaxed text-mute">{m.bio}</p>
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {m.certifications.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-[color:var(--tm-line)] px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-mute"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      )}

      {/* Coverage + offices */}
      <section className="shell py-20 sm:py-24">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <SectionHead
            eyebrow="Where we are"
            title="Lisbon headquarters. International delivery."
            lead="Our registered company is based in Prior Velho, Lisboa. Tech Maths coordinates data-centre services across Europe, the UK, the United States and India; site availability and mobilisation are confirmed for each project."
          />
          <div>
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2">
              {COMPANY.offices.map((o) => (
                <li key={o.city} className="bg-ink p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[1.05rem] text-mist">{o.city}</h3>
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-accent">{o.country}</span>
                  </div>
                  <p className="mt-2 text-[0.84rem] text-mute">{o.role}</p>
                  <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">{o.address}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: IconGlobe, v: `${european.length}`, l: "European countries" },
                { icon: IconShield, v: "4h", l: "quote response" },
              ].map(({ icon: Icon, v, l }) => (
                <div key={l} className="card-surface flex items-center gap-3 p-4">
                  <Icon className="h-4 w-4 text-accent" />
                  <div>
                    <p className="font-display text-[1.2rem] leading-none">{v}</p>
                    <p className="mt-1.5 text-[0.72rem] text-mute">{l}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <SectionHead eyebrow="What clients say" title="References" />
            <PlaceholderTag label="Illustrative quotes" />
          </div>
          <ul className="mt-12 grid gap-4 lg:grid-cols-2">
            {testimonials.map((t, i) => (
              <Reveal as="li" key={i} delay={i * 70} className="card-surface p-7">
                <blockquote className="text-[1rem] leading-relaxed text-mist">“{t.quote}”</blockquote>
                <footer className="mt-5 border-t border-[color:var(--tm-line)] pt-4">
                  <p className="text-[0.86rem] text-mist">{t.author}</p>
                  <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">
                    {t.role} · {t.company}
                  </p>
                </footer>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Pre-launch checklist — visible so nothing illustrative reaches production silently */}
      <section className="shell py-20">
        <SectionHead
          eyebrow="Pre-launch checklist"
          title="What the company still needs to supply"
          lead="Every item below is currently illustrative and is marked as such on the page where it appears. This list is also rendered inside the admin console."
        />
        <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2">
          {PLACEHOLDER_REGISTER.map((p) => (
            <li key={p.item} className="bg-ink p-5">
              <p className="text-[0.9rem] text-mist">{p.item}</p>
              <p className="mt-2 font-mono text-[0.6rem] tracking-[0.06em] text-mute">{p.where}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Btn href="/contact" size="lg" arrow>
            Work with us
          </Btn>
          <Btn href="/admin" variant="outline" size="lg">
            Open the admin console
          </Btn>
        </div>
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <FaqList
            idPrefix="about-faq"
            faqs={[
              {
                q: "Are your engineers employees or contractors?",
                a: "Our delivery crews are our own people, inducted to the same standards and working to the same method. Where a licensed trade is required, we coordinate a specialist and say so at the brief stage.",
              },
              {
                q: "Can you provide certification and insurance documents?",
                a: "Yes. Public liability insurance, ESD training records and vendor certifications are available on request during the tender process.",
              },
              {
                q: "Do you work under NDA?",
                a: "Routinely. Every engineer on site is under confidentiality, and we sign client NDAs before survey where required.",
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
