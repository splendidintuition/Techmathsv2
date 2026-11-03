import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/faq-list";
import { IconArrow, IconCheck, IconPin, IconShield, ServiceIcon } from "@/components/icons";
import { Magnetic, Reveal } from "@/components/motion";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { REGIONAL_COUNTRY_CODES, regionalSlug } from "@/lib/content/regional";
import { buildRegionalPage } from "@/lib/content/regional-page";
import { categoryOf } from "@/lib/categories";
import { listCoverage, listProjects, listServices, getService } from "@/lib/queries";
import { breadcrumbLd, buildMetadata, faqLd, jsonLd, serviceLd } from "@/lib/seo";

type Params = { slug: string; country: string };

function regionalCoverage() {
  const codes = new Set<string>(REGIONAL_COUNTRY_CODES);
  return listCoverage().filter((c) => codes.has(c.code));
}

function resolve(params: Params) {
  const service = getService(params.slug);
  if (!service) return null;
  const coverage = regionalCoverage().find(
    (c) => regionalSlug(c.code).toLowerCase() === params.country.toLowerCase()
  );
  if (!coverage) return null;
  return buildRegionalPage(service, coverage);
}

export function generateStaticParams() {
  const countries = regionalCoverage();
  return listServices().flatMap((s) => countries.map((c) => ({ slug: s.slug, country: regionalSlug(c.code) })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = resolve(await params);
  if (!p) return { title: "Service not found" };
  return buildMetadata({
    title: p.title,
    description: p.description,
    path: p.path,
    keywords: [
      ...p.service.keywords.slice(0, 4),
      `${p.service.title.toLowerCase()} ${p.country.name.toLowerCase()}`,
      `data centre services ${p.country.name.toLowerCase()}`,
    ],
  });
}

export default async function RegionalServicePage({ params }: { params: Promise<Params> }) {
  const p = resolve(await params);
  if (!p) notFound();

  const quoteHref = `/contact?service=${p.service.slug}&country=${p.coverage.code}`;
  const projects = listProjects({ service: p.service.slug }).slice(0, 3);
  const countries = regionalCoverage();

  return (
    <>
      {jsonLd(serviceLd(p.service))}
      {jsonLd(faqLd(p.faqSchema))}
      {jsonLd(
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: p.service.title, path: p.servicePath },
          { name: p.country.name, path: p.path },
        ])
      )}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--tm-glow),transparent_65%)] opacity-20"
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
              <li>
                <Link href={p.servicePath} className="hover:text-accent">
                  {p.service.title}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-accent">{p.country.name}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Reveal>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-[color:var(--tm-accent-soft)] text-accent">
                    <ServiceIcon name={p.service.icon} className="h-6 w-6" />
                  </span>
                  <Pill tone="accent">{p.country.name}</Pill>
                  <Pill>{categoryOf(p.service.slug).label}</Pill>
                </div>
              </Reveal>
              <h1 className="mt-7 text-[clamp(2.1rem,5vw,3.6rem)]">{p.headline}</h1>
              <Reveal delay={140}>
                <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-mute">{p.lede}</p>
              </Reveal>
              <Reveal delay={240}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Magnetic>
                    <Btn href={quoteHref} size="lg" arrow>
                      Quote {p.service.title.toLowerCase()} in {p.country.name}
                    </Btn>
                  </Magnetic>
                  <Btn href={p.servicePath} variant="outline" size="lg">
                    Service overview
                  </Btn>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <dl className="grid w-full gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:w-[19rem]">
                {p.facts.map((f) => (
                  <div key={f.label} className="bg-ink p-5">
                    <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-mute">{f.label}</dt>
                    <dd className="mt-2 font-display text-[1.05rem] leading-snug text-mist">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Market */}
      <section className="shell py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <h2 className="text-[1.6rem]">{p.market.heading}</h2>
            {p.market.paragraphs.map((para) => (
              <p key={para.slice(0, 40)} className="mt-5 text-[0.98rem] leading-relaxed text-mute">
                {para}
              </p>
            ))}
          </div>
          <div className="card-surface p-7">
            <h3 className="flex items-center gap-2.5 text-[1.05rem]">
              <IconPin className="h-4 w-4 text-accent" />
              Our {p.country.name} footprint
            </h3>
            <ul className="mt-5 space-y-3">
              {p.coverage.hubs.map((h) => (
                <li key={h} className="flex items-center gap-3 text-[0.9rem] text-mist/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {h}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] p-4 text-[0.83rem] leading-relaxed text-mute">
              {p.coverage.note}
            </p>
            <Link
              href="/coverage"
              className="mt-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent hover:underline"
            >
              All 28 covered countries
              <IconArrow className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20 sm:py-24">
        <div className="shell">
          <SectionHead
            eyebrow="Local delivery"
            title={p.delivery.heading}
            lead={p.delivery.paragraphs[0]}
          />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2">
            {p.delivery.bullets?.map((b, i) => (
              <Reveal as="li" key={b} delay={i * 60} className="bg-ink p-6">
                <span className="flex gap-3 text-[0.9rem] leading-relaxed text-mist/90">
                  <IconCheck className="mt-1 h-4 w-4 shrink-0 text-accent" />
                  {b}
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Standards */}
      <section className="shell py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="flex items-center gap-2.5 text-[1.5rem]">
              <IconShield className="h-5 w-5 text-accent" />
              {p.standards.heading}
            </h2>
            {p.standards.paragraphs.map((para) => (
              <p key={para.slice(0, 40)} className="mt-5 text-[0.95rem] leading-relaxed text-mute">
                {para}
              </p>
            ))}
          </div>
          <div className="grid gap-6">
            <div className="card-surface p-7">
              <h3 className="text-[1.02rem]">Standards applied on site</h3>
              <ul className="mt-5 space-y-3">
                {p.standards.bullets?.map((s) => (
                  <li key={s} className="flex gap-3 text-[0.87rem] leading-relaxed text-mute">
                    <span className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-surface p-7">
              <h3 className="text-[1.02rem]">Site access and safety</h3>
              <p className="mt-3 text-[0.87rem] leading-relaxed text-mute">{p.country.accessNote}</p>
              <ul className="mt-5 space-y-3">
                {p.country.safety.map((s) => (
                  <li key={s} className="flex gap-3 text-[0.87rem] leading-relaxed text-mute">
                    <span className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Related work */}
      {projects.length > 0 && (
        <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
          <div className="shell">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <SectionHead eyebrow="Related work" title={`${p.service.title} delivery cases`} />
              <Btn href="/projects" variant="outline" size="sm" arrow>
                All projects
              </Btn>
            </div>
            <ul className="mt-10 grid gap-4 lg:grid-cols-3">
              {projects.map((pr) => (
                <li key={pr.slug}>
                  <Link
                    href={`/projects/${pr.slug}`}
                    className="card-surface group flex h-full flex-col gap-4 p-6 transition-colors hover:border-accent/45"
                  >
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-mute">
                      {pr.region} · {pr.year}
                    </p>
                    <h3 className="text-[1.05rem] leading-snug">{pr.title}</h3>
                    <p className="text-[0.84rem] leading-relaxed text-mute">{pr.summary}</p>
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
          <SectionHead eyebrow="Local questions" title={`Working in ${p.country.name}`} />
          <FaqList faqs={p.localFaqs} idPrefix={`rg-${p.service.slug}-${regionalSlug(p.coverage.code)}`} />
        </div>
      </section>

      {/* Other countries */}
      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead
            eyebrow="Elsewhere"
            title={`${p.service.title} in other markets`}
            lead="Same service, different standards. Pick the market you are building in."
          />
          <ul className="mt-10 flex flex-wrap gap-2">
            {countries.map((c) => {
              const active = c.code === p.coverage.code;
              const item = (
                <>
                  {c.name}
                  <span className="ml-2 font-mono text-[0.58rem] text-mute">{c.mobiliseHours}h</span>
                </>
              );
              return (
                <li key={c.code}>
                  {active ? (
                    <span
                      aria-current="page"
                      className="inline-flex items-center rounded-full border border-accent/50 bg-[color:var(--tm-accent-soft)] px-4 py-2 text-[0.84rem] text-accent"
                    >
                      {item}
                    </span>
                  ) : (
                    <Link
                      href={`/services/${p.service.slug}/${regionalSlug(c.code)}`}
                      className="inline-flex items-center rounded-full border border-[color:var(--tm-line)] px-4 py-2 text-[0.84rem] text-mist transition-colors hover:border-accent/45 hover:text-accent"
                    >
                      {item}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-14 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Btn href={quoteHref} size="lg" arrow>
                Start a quote
              </Btn>
            </Magnetic>
            <Btn href="/coverage" variant="ghost" size="lg">
              See full coverage
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
