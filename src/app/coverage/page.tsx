import type { Metadata } from "next";
import Link from "next/link";
import { CoverageMap } from "@/components/coverage-map";
import { IconArrow, IconClock, IconPin } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Btn, Pill, SectionHead } from "@/components/ui";
import { getCountryProfile } from "@/lib/content/regional";
import { listCoverage } from "@/lib/queries";
import { absoluteUrl, breadcrumbLd, buildMetadata, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Coverage — local engineers, global delivery",
  description:
    "Explore Tech Maths coverage across 28 countries. Find engineering hubs, typical mobilisation times and local standards for data center builds, remote hands and field support.",
  path: "/coverage",
  keywords: ["data center engineers Europe", "global remote hands", "data center field support coverage"],
});

export default function CoveragePage() {
  const countries = listCoverage();

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Coverage", path: "/coverage" }]))}
      {jsonLd({
        "@type": "ItemList",
        name: "Tech Maths engineering coverage",
        numberOfItems: countries.length,
        itemListElement: countries.map((country, index) => {
          const profile = getCountryProfile(country.code);
          return {
            "@type": "ListItem",
            position: index + 1,
            name: country.name,
            url: absoluteUrl(profile ? `/coverage/${profile.slug}` : `/coverage#country-${country.code.toLowerCase()}`),
          };
        }),
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-20 sm:py-24">
          <Pill tone="accent">Lisbon HQ · {countries.length} countries covered</Pill>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,4rem)]">
            On the ground,
            <br />
            wherever you build.
          </h1>
          <Reveal delay={120}>
            <p className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              Local access, familiar standards and one accountable delivery team. Explore our hubs and see
              how quickly we can typically mobilise to your site.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Btn href="/contact" arrow>Request engineers</Btn>
              <Btn href="/how-we-work" variant="outline">How we work</Btn>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20" aria-labelledby="coverage-map-heading">
        <SectionHead
          eyebrow="Interactive coverage map"
          title={<span id="coverage-map-heading">Local knowledge. One delivery standard.</span>}
          lead="Select a country on the map or filter by region to see its hubs and typical mobilisation time."
          className="mb-10"
        />
        <CoverageMap countries={countries} />
        <p className="mt-6 max-w-3xl text-[0.82rem] leading-relaxed text-mute">
          Mobilisation times are planning estimates, not a guaranteed SLA. Site access, inductions, travel and
          the agreed scope affect arrival times. We confirm the response commitment in writing before work starts.
        </p>
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell">
          <SectionHead eyebrow="Country directory" title="Find your next deployment." lead="Hubs, coverage notes and a direct route to the delivery desk." />
          <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => {
              const profile = getCountryProfile(country.code);
              return (
                <li key={country.code} id={`country-${country.code.toLowerCase()}`} className="card-surface flex scroll-mt-24 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{country.region}</p>
                      <h2 className="mt-2 text-[1.35rem]">{country.name}</h2>
                    </div>
                    {country.hq && <Pill tone="accent">HQ</Pill>}
                  </div>
                  <p className="mt-4 flex items-center gap-2 font-mono text-[0.72rem] text-accent">
                    <IconClock className="h-4 w-4" />{country.mobiliseHours}h typical mobilisation
                  </p>
                  <p className="mt-4 text-[0.88rem] leading-relaxed text-mute">{country.note}</p>
                  <p className="mt-4 flex items-start gap-2 text-[0.8rem] leading-relaxed text-mist">
                    <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{country.hubs.join(" · ")}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-x-5 gap-y-3 pt-6">
                    {profile && (
                      <Link href={`/coverage/${profile.slug}`} className="inline-flex items-center gap-2 text-[0.82rem] text-accent hover:underline">
                        Country details <IconArrow className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    <Link href={`/contact?country=${encodeURIComponent(country.name)}`} className="text-[0.82rem] text-mist hover:text-accent hover:underline">
                      Request a quote
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
