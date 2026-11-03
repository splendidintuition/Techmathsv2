import type { Metadata } from "next";
import { QuoteForm } from "@/components/quote-form";
import { IconClock, IconMail, IconPhone, IconPin, IconShield, IconWhatsapp } from "@/components/icons";
import { Reveal } from "@/components/motion";
import { Pill, SectionHead } from "@/components/ui";
import { COMPANY, COVERAGE } from "@/lib/content/site";
import { SERVICES } from "@/lib/content/services";
import { breadcrumbLd, buildMetadata, faqLd, jsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact & request a quote",
  description:
    "Request a data center delivery quote: services, site, volumes, timeline and contact details in five short steps. Quoted within four business hours, emergency remote hands mobilised from the nearest hub.",
  path: "/contact",
  keywords: ["data center quote", "request data center engineers", "remote hands quote", "rack and stack quote"],
});

const CONTACT_FAQS = [
  {
    q: "What information makes a quote accurate?",
    a: "A hardware list or rack elevations, the site and country, access constraints, your standards (rack, labelling, change control) and the deadline. If you only have a rough idea, send that — we will ask the questions.",
  },
  {
    q: "Do you charge for surveys?",
    a: "Remote surveys are free. On-site surveys are quoted at cost and usually credited against the project if we are awarded the work.",
  },
  {
    q: "How is pricing structured?",
    a: "Fixed price for defined scopes, day rates for support and remote hands, and a mobilisation figure quoted separately so travel is never a surprise at invoice time.",
  },
  {
    q: "Can you start inside 48 hours?",
    a: "For hub sites, often yes — emergency remote hands is designed for exactly that. Larger scopes need the plan stage first; we will tell you honestly what is achievable.",
  },
  {
    q: "What happens to the details I send?",
    a: "They are stored in our own database and used only to prepare your quote. No third-party marketing, no data sharing. See the privacy policy for the detail and your rights.",
  },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[]; country?: string | string[] }>;
}) {
  const params = await searchParams;
  // Repeated query parameters arrive as arrays. Never pass one into form state.
  const service = typeof params.service === "string" ? params.service : undefined;
  const country = typeof params.country === "string" ? params.country : undefined;
  // The quote form only needs the published catalogue, not a writable database.
  // Keep rendering it even when the lead-storage service is unavailable; the
  // submit endpoint reports storage failures separately and never claims success.
  const services = SERVICES;
  const countries = [...COVERAGE]
    .sort((a, b) => a.mobiliseHours - b.mobiliseHours || a.name.localeCompare(b.name))
    .map((c) => c.name);

  return (
    <>
      {jsonLd(breadcrumbLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]))}
      {jsonLd(faqLd(CONTACT_FAQS))}
      {jsonLd({
        "@type": "ContactPage",
        name: "Contact Tech Maths",
        url: "/contact",
        mainEntity: {
          "@type": "Organization",
          name: COMPANY.name,
          email: COMPANY.email,
          telephone: COMPANY.phone,
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "sales",
            email: COMPANY.leadsEmail,
            availableLanguage: COMPANY.languages,
            areaServed: ["Europe", "United Kingdom", "United States", "India"],
          },
        },
      })}

      <section className="relative overflow-hidden border-b border-[color:var(--tm-line)]">
        <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="shell relative py-16 sm:py-20">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill tone="accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
                Delivery desk open
              </Pill>
              <Pill>
                <IconClock className="h-3 w-3" />
                Reply within 4 business hours
              </Pill>
            </div>
          </Reveal>
          <h1 className="mt-8 max-w-4xl text-[clamp(2.2rem,5.6vw,3.8rem)]">
            Tell us what needs building.
          </h1>
          <Reveal delay={150}>
            <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-mute">
              Five short steps. You will get a scoped response — including what we would do differently, if
              anything — rather than a brochure and a callback promise.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="shell py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <QuoteForm
            services={services.map((s) => ({ slug: s.slug, title: s.title, short: s.short, icon: s.icon }))}
            countries={countries}
            presetService={service}
            presetCountry={country}
          />

          <aside className="space-y-6">
            <div className="card-surface p-7">
              <h2 className="text-[1.15rem]">Direct contact</h2>
              <ul className="mt-5 space-y-4">
                <li>
                  <a
                    href={`mailto:${COMPANY.leadsEmail}`}
                    className="group flex items-start gap-3 text-[0.9rem] text-mist transition-colors hover:text-accent"
                  >
                    <IconMail className="mt-0.5 h-4 w-4 text-accent" />
                    <span>
                      {COMPANY.leadsEmail}
                      <span className="mt-1 block text-[0.78rem] text-mute">Quotes and tender requests</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="group flex items-start gap-3 text-[0.9rem] text-mist transition-colors hover:text-accent"
                  >
                    <IconMail className="mt-0.5 h-4 w-4 text-accent" />
                    <span>
                      {COMPANY.email}
                      <span className="mt-1 block text-[0.78rem] text-mute">General enquiries</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                    className="flex items-start gap-3 text-[0.9rem] text-mist transition-colors hover:text-accent"
                  >
                    <IconPhone className="mt-0.5 h-4 w-4 text-accent" />
                    <span>
                      {COMPANY.phone}
                      <span className="mt-1 block text-[0.78rem] text-mute">Mon–Fri, 08:00–19:00 WET</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-start gap-3 text-[0.9rem] text-mist transition-colors hover:text-accent"
                  >
                    <IconWhatsapp className="mt-0.5 h-4 w-4 text-accent" />
                    <span>
                      WhatsApp the duty engineer
                      <span className="mt-1 block text-[0.78rem] text-mute">
                        Fastest route for emergency remote hands
                      </span>
                    </span>
                  </a>
                </li>
              </ul>
              <p className="mt-5 rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] p-3.5 text-[0.78rem] leading-relaxed text-mute">
                Contact details above are placeholders pending confirmation from the company.
              </p>
            </div>

            <div className="card-surface p-7">
              <h2 className="flex items-center gap-2.5 text-[1.15rem]">
                <IconPin className="h-4 w-4 text-accent" />
                Headquarters
              </h2>
              <p className="mt-4 text-[0.9rem] leading-relaxed text-mute">
                {COMPANY.headquarters.address}
              </p>
              <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-mute">
                Timezone {COMPANY.headquarters.timezone} · CET/CET−1 for European hubs
              </p>
              <ul className="mt-5 grid gap-2">
                {COMPANY.offices.slice(1).map((o) => (
                  <li key={o.city} className="flex items-center justify-between gap-3 text-[0.82rem]">
                    <span className="text-mist">{o.city}</span>
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-mute">{o.role}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-surface p-7">
              <h2 className="flex items-center gap-2.5 text-[1.15rem]">
                <IconShield className="h-4 w-4 text-accent" />
                What happens next
              </h2>
              <ol className="mt-5 space-y-4">
                {[
                  { t: "Acknowledgement", d: "An automated confirmation with your reference number, immediately." },
                  { t: "Scoped response", d: "Within four business hours: approach, assumptions, indicative pricing and questions." },
                  { t: "Survey", d: "Remote or on-site, to confirm constraints before a firm price is issued." },
                  { t: "Plan & mobilise", d: "A programme you approve line by line, then a named crew inducted for your site." },
                ].map((s, i) => (
                  <li key={s.t} className="flex gap-4">
                    <span className="font-mono text-[0.62rem] tracking-[0.16em] text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[0.92rem] text-mist">{s.t}</p>
                      <p className="mt-1 text-[0.82rem] leading-relaxed text-mute">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)] py-20">
        <div className="shell grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionHead eyebrow="Before you send" title="Questions about the process" />
          <ul className="space-y-4">
            {CONTACT_FAQS.map((f) => (
              <li key={f.q} className="rounded-xl border border-[color:var(--tm-line)] bg-[color:var(--tm-panel)] p-5">
                <p className="text-[0.98rem] text-mist">{f.q}</p>
                <p className="mt-2 text-[0.86rem] leading-relaxed text-mute">{f.a}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
