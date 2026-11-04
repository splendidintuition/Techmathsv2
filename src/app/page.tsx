import Link from "next/link";
import { CoverageTeaser } from "@/components/coverage-teaser";
import { FaqList } from "@/components/faq-list";
import { HeroCanvas } from "@/components/hero-canvas";
import {
  IconArrow,
  IconBolt,
  IconClock,
  IconGlobe,
  IconShield,
  IconUsers,
} from "@/components/icons";
import { Magnetic, MaskLines, Parallax, Reveal } from "@/components/motion";
import { ProcessStory } from "@/components/process-story";
import { ServiceGrid } from "@/components/service-grid";
import { Btn, Pill, PlaceholderTag, SectionHead, StatBlock } from "@/components/ui";
import { INDUSTRY_NAMES, COMPANY, HOME_FAQS, PROCESS, STATS, TRUST_POINTS } from "@/lib/content/site";
import { listProjects, listServices } from "@/lib/queries";
import { absoluteUrl, breadcrumbLd, faqLd, jsonLd, organizationLd } from "@/lib/seo";

export default function HomePage() {
  const services = listServices();
  const featured = listProjects().slice(0, 3);

  return (
    <>
      {jsonLd(organizationLd)}
      {jsonLd({
        "@type": "WebSite",
        "@id": `${absoluteUrl("/")}#website`,
        url: absoluteUrl("/"),
        name: COMPANY.name,
        publisher: { "@id": `${absoluteUrl("/")}#organization` },
        inLanguage: "en",
      })}
      {jsonLd(faqLd(HOME_FAQS))}
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }]))}

      {/* ------------------------------------------------------------ hero */}
      <section className="relative flex min-h-[calc(100dvh-72px)] items-center overflow-hidden">
        <HeroCanvas className="absolute inset-0 h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,transparent,var(--tm-ink)_78%)]"
          aria-hidden="true"
        />
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

        <div className="shell relative py-24 sm:py-28">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
                Engineers available this week
              </Pill>
              <Pill>Lisbon HQ · Europe · UK · US · India</Pill>
            </div>
          </Reveal>

          <MaskLines
            as="h1"
            className="mt-8 max-w-5xl text-[clamp(2.6rem,7.4vw,5.6rem)] font-medium tracking-[-0.045em]"
            lines={["Hands-on data center", "engineering, anywhere", "you build."]}
          />

          <Reveal delay={320}>
            <p className="mt-8 max-w-2xl text-[1.05rem] leading-relaxed text-mute sm:text-[1.15rem]">
              We build racks, pull and certify cable, install and configure servers and networks, commission the
              result and stay on call afterwards. One accountable crew, from survey to signed handover.
            </p>
          </Reveal>

          <Reveal delay={440}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Btn href="/contact" size="lg" arrow>
                  Request a quote
                </Btn>
              </Magnetic>
              <Magnetic strength={0.18}>
                <Btn href="/services" variant="outline" size="lg">
                  Explore services
                </Btn>
              </Magnetic>
            </div>
          </Reveal>

          <Reveal delay={560}>
            <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-[color:var(--tm-line)] pt-8 sm:grid-cols-4">
              {[
                { icon: IconGlobe, value: "28", label: "countries covered" },
                { icon: IconUsers, value: "60+", label: "field engineers" },
                { icon: IconClock, value: "4h", label: "quote response" },
                { icon: IconBolt, value: "2h", label: "emergency hands" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label}>
                  <Icon className="h-4 w-4 text-accent" />
                  <dt className="sr-only">{label}</dt>
                  <dd className="mt-2.5 font-display text-[1.6rem] leading-none">{value}</dd>
                  <dd className="mt-1.5 text-[0.76rem] text-mute">{label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex" aria-hidden="true">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-mute">Scroll</span>
          <span className="h-10 w-px bg-gradient-to-b from-accent to-transparent" />
        </div>
      </section>

      {/* ------------------------------------------------------ trust strip */}
      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)]">
        <div className="shell py-14">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
            <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4 lg:flex lg:gap-12">
              {STATS.map((s) => (
                <StatBlock
                  key={s.label}
                  value={s.value}
                  suffix={s.suffix}
                  label={s.label}
                />
              ))}
            </div>
            <ul className="grid gap-4 border-t border-[color:var(--tm-line)] pt-8 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
              {TRUST_POINTS.map((t, i) => (
                <Reveal as="li" key={t.label} delay={i * 70} className="flex gap-3">
                  <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-[0.9rem] text-mist">{t.label}</p>
                    <p className="mt-1 text-[0.8rem] leading-relaxed text-mute">{t.detail}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Industries served */}
        <div className="marquee-mask overflow-hidden border-t border-[color:var(--tm-line)] py-6">
          <p className="shell mb-5 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-mute">
            Industries served
          </p>
          <div className="marquee-track flex w-max items-center gap-14">
            {[...INDUSTRY_NAMES, ...INDUSTRY_NAMES].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="flex shrink-0 items-center gap-2.5 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-mute"
              >
                <span className="h-3 w-3 rounded-[3px] border border-[color:var(--tm-line-strong)]" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="shell py-24 sm:py-32" id="services">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead
            eyebrow="Service catalogue"
            title={
              <>
                Nine services.
                <br />
                One delivery standard.
              </>
            }
            lead="Every service is delivered by the same crews, to the same documentation standard, with the same quality gates — whether it is a single rack in Porto or a hall in Frankfurt."
          />
          <Reveal delay={200}>
            <Btn href="/services" variant="outline" arrow>
              All services
            </Btn>
          </Reveal>
        </div>
        <div className="mt-14">
          <ServiceGrid services={services} />
        </div>
      </section>

      {/* ----------------------------------------------------------- process */}
      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-24 sm:py-32">
        <div className="shell">
          <SectionHead
            eyebrow="How a deployment works"
            title={
              <>
                From brief to signed handover,
                <br />
                with a gate at every stage.
              </>
            }
            lead="Eight stages, each with defined outputs and a quality gate. Nothing moves to the next stage until the current one is complete and recorded."
            className="mb-16"
          />
          <ProcessStory stages={PROCESS} />
          <Reveal className="mt-12">
            <Btn href="/how-we-work" variant="outline" arrow>
              The full method, safety and documentation standards
            </Btn>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- coverage */}
      <section className="shell py-24 sm:py-32">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHead
            eyebrow="Coverage"
            title={
              <>
                Lisbon base.
                <br />
                Engineers where you build.
              </>
            }
            lead="Crews mobilise from Lisbon, Frankfurt, London, Amsterdam and Warsaw across Europe, with regional teams in the UK, the United States and India."
          />
          <Reveal delay={180}>
            <Btn href="/coverage" variant="outline" arrow>
              Coverage map & mobilisation times
            </Btn>
          </Reveal>
        </div>
        <div className="mt-14">
          <Parallax speed={0.04}>
            <CoverageTeaser />
          </Parallax>
        </div>
      </section>

      {/* ------------------------------------------------- featured projects */}
      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-24 sm:py-32">
        <div className="shell">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHead
              eyebrow="Selected work"
              title="What delivery actually looks like"
              lead="Scope, method and measured results. Every reference below is illustrative until real client references are supplied."
            />
            <div className="flex items-center gap-3">
              <PlaceholderTag />
              <Btn href="/projects" variant="outline" arrow>
                All projects
              </Btn>
            </div>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] lg:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal as="article" key={p.slug} delay={i * 90} className="bg-ink">
                <Link
                  href={`/projects/${p.slug}`}
                  className="sweep group flex h-full flex-col justify-between gap-8 p-7 transition-colors hover:bg-[color:var(--tm-panel)]"
                >
                  <div className="relative z-[2]">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute">
                      {p.region} · {p.year}
                    </p>
                    <h3 className="mt-4 text-[1.3rem] leading-snug">{p.title}</h3>
                    <p className="mt-3 text-[0.88rem] leading-relaxed text-mute">{p.summary}</p>
                  </div>
                  <div className="relative z-[2]">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[color:var(--tm-line)] pt-5">
                      {p.metrics.slice(0, 4).map((m) => (
                        <div key={m.label}>
                          <dt className="sr-only">{m.label}</dt>
                          <dd className="font-display text-[1.35rem] leading-none text-mist">{m.value}</dd>
                          <dd className="mt-1.5 text-[0.72rem] leading-snug text-mute">{m.label}</dd>
                        </div>
                      ))}
                    </dl>
                    <span className="mt-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-accent">
                      Read the case
                      <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faqs */}
      <section className="shell py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionHead
            eyebrow="Questions"
            title="What clients ask before the first project"
            lead="If yours is not here, ask us directly — we would rather answer properly than send a brochure."
          />
          <Reveal delay={120}>
            <FaqList faqs={HOME_FAQS} idPrefix="home-faq" />
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- cta band */}
      <section className="relative overflow-hidden border-t border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(ellipse_at_center,var(--tm-glow),transparent_70%)] opacity-25"
          aria-hidden="true"
        />
        <div className="shell relative py-24 sm:py-28">
          <div className="max-w-3xl">
            <Reveal>
              <p className="eyebrow">Next step</p>
              <h2 className="mt-5 text-[clamp(2rem,5vw,3.4rem)]">
                Send us the hardware list.
                <br />
                We will send back a plan.
              </h2>
              <p className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-mute">
                Tell us what needs building, where, and by when. You will get a scoped response within four business
                hours — including what we would do differently, if anything.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Magnetic>
                  <Btn href="/contact" size="lg" arrow>
                    Request a quote
                  </Btn>
                </Magnetic>
                <Btn href={`mailto:${COMPANY.leadsEmail}`} variant="outline" size="lg">
                  {COMPANY.leadsEmail}
                </Btn>
                <Btn href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} variant="ghost" size="lg">
                  {COMPANY.phone}
                </Btn>
              </div>
            </Reveal>
            <Reveal delay={260}>
              <p className="mt-8 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mute">
                {COMPANY.responsePromise}
              </p>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { k: "01", t: "Send the brief", d: "Hardware list, drawings if you have them, site and deadline." },
                { k: "02", t: "Scoped response", d: "Within four business hours, with assumptions stated." },
                { k: "03", t: "Survey & plan", d: "Site visit or remote survey, then a plan you approve line by line." },
                { k: "04", t: "Mobilise", d: "Named crew, inducted and briefed before first access." },
              ].map((s) => (
                <div key={s.k} className="card-surface p-5">
                  <p className="font-mono text-[0.62rem] tracking-[0.18em] text-accent">{s.k}</p>
                  <p className="mt-3 text-[0.98rem] text-mist">{s.t}</p>
                  <p className="mt-2 text-[0.82rem] leading-relaxed text-mute">{s.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}


