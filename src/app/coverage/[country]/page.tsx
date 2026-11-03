import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList } from "@/components/faq-list";
import { IconArrow, IconCheck, IconClock, IconPin, ServiceIcon } from "@/components/icons";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { getCountryProfile, regionalCode, regionalCountrySlugs } from "@/lib/content/regional";
import { listCoverage, listServices } from "@/lib/queries";
import { absoluteUrl, breadcrumbLd, buildMetadata, faqLd, jsonLd } from "@/lib/seo";

type Params = { country: string };

function resolve(slug: string) {
  const code = regionalCode(slug);
  const profile = code ? getCountryProfile(code) : null;
  const coverage = code ? listCoverage().find((country) => country.code === code) : undefined;
  return profile && coverage ? { profile, coverage, path: `/coverage/${profile.slug}` } : null;
}

export function generateStaticParams() {
  return regionalCountrySlugs().map(({ slug }) => ({ country: slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = resolve((await params).country);
  if (!page) return { title: "Country not found" };
  const { profile, coverage, path } = page;
  return buildMetadata({
    title: `Data center engineering in ${profile.name}`,
    description: `Data center delivery in ${profile.name}: rack and stack, cabling, installation and remote hands. ${coverage.mobiliseHours}-hour typical mobilisation from ${coverage.hubs.join(" and ")}, with local standards and documented handover.`,
    path,
    keywords: [`data center engineers ${profile.name}`, `remote hands ${profile.name}`, `rack and stack ${profile.name}`],
  });
}

export default async function CountryPage({ params }: { params: Promise<Params> }) {
  const page = resolve((await params).country);
  if (!page) notFound();
  const { profile, coverage, path } = page;
  const services = listServices();
  const otherCountries = regionalCountrySlugs().filter((country) => country.code !== profile.code).slice(0, 6);
  const quoteHref = `/contact?country=${encodeURIComponent(coverage.name)}`;

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Coverage", path: "/coverage" }, { name: profile.name, path }]))}
      {jsonLd(faqLd(profile.faqs))}
      {jsonLd({
        "@type": "Service",
        name: `Data center engineering in ${profile.name}`,
        url: absoluteUrl(path),
        serviceType: "Data center engineering and field support",
        provider: { "@id": absoluteUrl("/#organization") },
        areaServed: { "@type": "Country", name: profile.name },
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-mute">
            <Link href="/coverage" className="hover:text-accent">Coverage</Link>
            <span aria-hidden="true">/</span>
            <span className="text-accent">{profile.name}</span>
          </nav>
          <div className="flex flex-wrap gap-2.5">
            <Pill tone="accent"><IconClock className="h-3 w-3" />{coverage.mobiliseHours}h typical mobilisation</Pill>
            <Pill>{coverage.region}</Pill>
          </div>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">Data center engineering in {profile.name}.</h1>
          <p className="mt-7 max-w-3xl text-[1.05rem] leading-relaxed text-mute">{profile.marketNote}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Btn href={quoteHref} arrow>Request engineers in {profile.name}</Btn>
            <Btn href="/services" variant="outline">Explore services</Btn>
          </div>
          <p className="mt-5 flex items-center gap-2 text-[0.82rem] text-mute"><IconPin className="h-4 w-4 text-accent" />{coverage.hubs.join(" · ")}</p>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <SectionHead eyebrow="Local delivery context" title="The details that matter on site." />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            { title: "Standards & evidence", items: profile.standards },
            { title: "Regulatory context", items: profile.compliance },
            { title: "Safety & site access", items: profile.safety },
          ].map((group) => (
            <article key={group.title} className="card-surface p-6">
              <h2 className="text-[1.2rem]">{group.title}</h2>
              <ul className="mt-5 space-y-4">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-3 text-[0.88rem] leading-relaxed text-mute">
                    <IconCheck className="mt-1 h-4 w-4 shrink-0 text-accent" />{item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-6 text-[0.8rem] leading-relaxed text-mute">The customer’s site rules and contract take precedence. Standards, access requirements and response times are confirmed for your specific facility during scoping.</p>
      </section>

      <section className="border-y border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead eyebrow={`Services in ${profile.name}`} title="From the first rack to signed handover." lead="Choose a service for the local delivery method, applicable standards and scope." />
          <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}/${profile.slug}`} className="card-surface group flex h-full flex-col p-6 transition-colors hover:border-accent/45">
                  <ServiceIcon name={service.icon} className="h-6 w-6 text-accent" />
                  <h2 className="mt-5 text-[1.2rem]">{service.title}</h2>
                  <p className="mt-3 text-[0.88rem] leading-relaxed text-mute">{service.short}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[0.82rem] text-accent">Local service details <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell grid gap-12 py-20 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Access & working windows" title="Plan around the facility." />
          <div className="mt-7 space-y-5 text-[0.92rem] leading-relaxed text-mute">
            <p>{profile.accessNote}</p><p>{profile.shiftNote}</p>
            <p><strong className="font-medium text-mist">Working languages: </strong>{profile.languages.join(", ")}.</p>
          </div>
        </div>
        <div>
          <SectionHead eyebrow="Power & testing" title="Verify, then hand over." />
          <div className="mt-7 space-y-5 text-[0.92rem] leading-relaxed text-mute"><p>{profile.power}</p><p>{profile.testing}</p></div>
        </div>
      </section>

      <section className="shell pb-20">
        <SectionHead eyebrow="Local questions" title={`Before you build in ${profile.name}.`} className="mb-10" />
        <FaqList faqs={profile.faqs} idPrefix={`country-${profile.slug}`} />
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Btn href={quoteHref} arrow>Discuss your deployment</Btn>
          <Btn href="/coverage" variant="outline">All coverage</Btn>
        </div>
        <nav aria-label="Other countries" className="mt-12 border-t border-[color:var(--tm-line)] pt-6">
          <p className="eyebrow mb-4">Also exploring</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {otherCountries.map((country) => <li key={country.code}><Link href={`/coverage/${country.slug}`} className="text-[0.85rem] text-mute hover:text-accent">{country.name}</Link></li>)}
          </ul>
        </nav>
      </section>
    </>
  );
}
