import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/faq-list";
import { IconArrow, IconCheck, IconDoc, IconShield, ServiceIcon } from "@/components/icons";
import { Magnetic, Reveal } from "@/components/motion";
import { StickyQuoteBar } from "@/components/sticky-quote-bar";
import { Btn, ExcludeList, IncludeList, Pill, SectionHead } from "@/components/ui";
import { categoryOf, relatedSlugs } from "@/lib/categories";
import { REGIONAL_COUNTRY_CODES, regionalSlug } from "@/lib/content/regional";
import { listCoverage, listProjects, listServices, getService } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, faqLd, jsonLd, serviceLd } from "@/lib/seo";

export function generateStaticParams() {
  return listServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return { title: "Service not found" };
  return buildMetadata({
    title: s.title,
    description: `${s.short} Delivered across Europe, the UK, the US and India from our Lisbon headquarters.`,
    path: `/services/${s.slug}`,
    keywords: s.keywords,
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const services = listServices();
  const related = relatedSlugs(service.slug)
    .map((slug) => services.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const projects = listProjects({ service: service.slug }).slice(0, 3);
  const regionalCodes = new Set<string>(REGIONAL_COUNTRY_CODES);
  const regionalCountries = listCoverage().filter((c) => regionalCodes.has(c.code));
  const quoteHref = `/contact?service=${service.slug}`;
  const paragraphs = service.summary.split("\n\n");

  return (
    <>
      {jsonLd(serviceLd(service))}
      {jsonLd(faqLd(service.faqs))}
      {jsonLd(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ])
      )}
      <StickyQuoteBar serviceTitle={service.title} href={quoteHref} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--tm-glow),transparent_65%)] opacity-20"
          aria-hidden="true"
        />
        <div className="shell relative py-20 sm:py-24">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
              <li>
                <Link href="/" className="hover:text-accent">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/services" className="hover:text-accent">
                  Services
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-accent">{service.title}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Reveal>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-[color:var(--tm-accent-soft)] text-accent">
                    <ServiceIcon name={service.icon} className="h-6 w-6" />
                  </span>
                  <Pill tone="accent">{categoryOf(service.slug).label}</Pill>
                </div>
              </Reveal>
              <h1 className="mt-7 text-[clamp(2.2rem,5.4vw,3.8rem)]">{service.title}</h1>
              <Reveal delay={140}>
                <p className="mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-mute">{service.short}</p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Magnetic>
                    <Btn href={quoteHref} size="lg" arrow>
                      Get a quote for this service
                    </Btn>
                  </Magnetic>
                  <Btn href="#method" variant="outline" size="lg">
                    Our method
                  </Btn>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <dl className="grid w-full gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-3 lg:w-auto">
                {service.kpis.map((k) => (
                  <div key={k.label} className="bg-ink p-5 lg:w-40">
                    <dt className="sr-only">{k.label}</dt>
                    <dd className="font-display text-[1.5rem] leading-none text-accent">{k.value}</dd>
                    <dd className="mt-2 text-[0.76rem] leading-snug text-mute">{k.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Summary + scope */}
      <section className="shell py-20">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <h2 className="text-[1.6rem]">What this service is</h2>
            {paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-5 text-[0.98rem] leading-relaxed text-mute">
                {p}
              </p>
            ))}

            <h3 className="mt-12 flex items-center gap-2.5 text-[1.05rem]">
              <IconDoc className="h-4 w-4 text-accent" />
              Deliverables you receive
            </h3>
            <ul className="mt-5 space-y-3">
              {service.deliverables.map((d) => (
                <li key={d} className="flex gap-3 text-[0.92rem] leading-relaxed text-mist/90">
                  <span className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-6">
            <div className="card-surface p-7">
              <h3 className="flex items-center gap-2.5 text-[1.05rem]">
                <IconCheck className="h-4 w-4 text-accent" />
                What is included
              </h3>
              <div className="mt-5">
                <IncludeList items={service.included} />
              </div>
            </div>
            <div className="card-surface p-7">
              <h3 className="text-[1.05rem] text-mute">What is not included</h3>
              <p className="mt-2 text-[0.82rem] text-mute">
                Stated up front so the scope boundary is never a surprise. Most of these are available as add-ons.
              </p>
              <div className="mt-5">
                <ExcludeList items={service.excluded} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Method */}
      <section id="method" className="scroll-mt-24 border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20 sm:py-24">
        <div className="shell">
          <SectionHead
            eyebrow="Method"
            title={`How we deliver ${service.title.toLowerCase()}`}
            lead="The same sequence every time, so progress is predictable and deviations are visible the day they happen."
          />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-3">
            {service.method.map((m, i) => (
              <Reveal as="li" key={m.title} delay={i * 70} className="bg-ink p-7">
                <p className="font-mono text-[0.62rem] tracking-[0.18em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-[1.1rem]">{m.title}</h3>
                <p className="mt-3 text-[0.87rem] leading-relaxed text-mute">{m.detail}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Tools & standards */}
      <section className="shell py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-[1.5rem]">Tools we use</h2>
            <ul className="mt-6 grid gap-3">
              {service.tooling.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] px-4 py-3 text-[0.88rem] text-mist/90"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2.5 text-[1.5rem]">
              <IconShield className="h-5 w-5 text-accent" />
              Standards we work to
            </h2>
            <ul className="mt-6 space-y-3">
              {service.standards.map((s) => (
                <li key={s} className="flex gap-3 text-[0.9rem] leading-relaxed text-mute">
                  <span className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] p-4 text-[0.84rem] leading-relaxed text-mute">
              Where you already run a documented standard, that becomes our method for the duration of the project.
              We work to your rack standard, label scheme and change-control process by default.
            </p>
          </div>
        </div>
      </section>

      {/* Related projects */}
      {projects.length > 0 && (
        <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
          <div className="shell">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionHead eyebrow="Related work" title="Where this service has been delivered" />
              <Btn href="/projects" variant="outline" size="sm" arrow>
                All projects
              </Btn>
            </div>
            <ul className="mt-10 grid gap-4 lg:grid-cols-3">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="card-surface group flex h-full flex-col gap-4 p-6 transition-colors hover:border-accent/45"
                  >
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute">
                      {p.region} · {p.year}
                    </p>
                    <h3 className="text-[1.05rem] leading-snug">{p.title}</h3>
                    <p className="text-[0.84rem] leading-relaxed text-mute">{p.summary}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute transition-colors group-hover:text-accent">
                      Read case
                      <IconArrow className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="shell py-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHead eyebrow="Questions" title={`${service.title} — the usual questions`} />
          <FaqList faqs={service.faqs} idPrefix={`svc-${service.slug}`} />
        </div>
      </section>

      {/* Regional variants */}
      <section className="shell py-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHead
            eyebrow="By market"
            title={`${service.title} by country`}
            lead="Standards, safety regimes and test methods differ by market. Open the one you are building in."
          />
          <Btn href="/coverage" variant="outline" size="sm" arrow>
            Full coverage
          </Btn>
        </div>
        <ul className="mt-10 flex flex-wrap gap-2">
          {regionalCountries.map((c) => (
            <li key={c.code}>
              <Link
                href={`/services/${service.slug}/${regionalSlug(c.code)}`}
                className="inline-flex items-center rounded-full border border-[color:var(--tm-line)] px-4 py-2 text-[0.84rem] text-mist transition-colors hover:border-accent/45 hover:text-accent"
              >
                {c.name}
                <span className="ml-2 font-mono text-[0.58rem] text-mute">{c.mobiliseHours}h</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Related services */}
      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead eyebrow="Also delivered" title="Services that usually sit alongside this one" />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/services/${r.slug}`}
                className="card-surface group p-6 transition-colors hover:border-accent/45"
              >
                <span className="flex items-center gap-3">
                  <ServiceIcon name={r.icon} className="h-5 w-5 text-mute transition-colors group-hover:text-accent" />
                  <span className="text-[1rem] text-mist">{r.title}</span>
                </span>
                <span className="mt-3 block text-[0.84rem] leading-relaxed text-mute">{r.short}</span>
              </Link>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Btn href={quoteHref} size="lg" arrow>
                Get a quote for {service.title}
              </Btn>
            </Magnetic>
            <Btn href={`tel:+351210000000`} variant="ghost" size="lg">
              Or call the delivery desk
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
