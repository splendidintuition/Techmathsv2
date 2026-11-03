import Link from "next/link";
import { COMPANY } from "@/lib/content/site";
import { SERVICES } from "@/lib/content/services";
import { IconLinkedIn, IconMail, IconPhone, IconWhatsapp } from "./icons";
import { Wordmark } from "./logo";
import { MotionToggle } from "./theme-toggle";
import { NewsletterForm } from "./newsletter-form";

export function Footer() {
  const services = SERVICES;
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-[color:var(--tm-line)] bg-[color:var(--tm-ink-2)]">
      <div className="grid-field pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="shell relative py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Wordmark />
            <p className="mt-6 max-w-xs text-[0.88rem] leading-relaxed text-mute">
              {COMPANY.positioning}
            </p>
            <div className="mt-6 space-y-2 text-[0.85rem]">
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2.5 text-mute transition-colors hover:text-accent">
                <IconMail className="h-4 w-4" /> {COMPANY.email}
              </a>
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="flex items-center gap-2.5 text-mute transition-colors hover:text-accent">
                <IconPhone className="h-4 w-4" /> {COMPANY.phone}
              </a>
              <a
                href={`https://wa.me/${COMPANY.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2.5 text-mute transition-colors hover:text-accent"
              >
                <IconWhatsapp className="h-4 w-4" /> WhatsApp
              </a>
            </div>
            <p className="mt-6 text-[0.78rem] leading-relaxed text-mute">
              {COMPANY.headquarters.address}
              <br />
              {COMPANY.legalName} · {COMPANY.registration}
            </p>
          </div>

          <nav aria-label="Services">
            <p className="eyebrow mb-5">Services</p>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="link-underline text-[0.86rem] text-mute hover:text-mist">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="eyebrow mb-5">Company</p>
            <ul className="space-y-2.5">
              {[
                { href: "/coverage", label: "Coverage" },
                { href: "/how-we-work", label: "How we work" },
                { href: "/industries", label: "Industries" },
                { href: "/projects", label: "Projects" },
                { href: "/insights", label: "Insights" },
                { href: "/about", label: "About and team" },
                { href: "/contact", label: "Request a quote" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-underline text-[0.86rem] text-mute hover:text-mist">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow mt-8 mb-4">Coverage hubs</p>
            <p className="text-[0.82rem] leading-relaxed text-mute">
              Lisbon (HQ) · Frankfurt · London · Amsterdam · Warsaw · Ashburn · Mumbai
            </p>
          </nav>

          <div>
            <p className="eyebrow mb-5">Field notes</p>
            <p className="text-[0.86rem] leading-relaxed text-mute">
              Checklists, commissioning notes and practical guidance from our engineers. No marketing.
            </p>
            <NewsletterForm />
            <div className="mt-8 flex items-center gap-3">
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Tech Maths on LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--tm-line)] text-mute transition-colors hover:border-accent hover:text-accent"
              >
                <IconLinkedIn className="h-4 w-4" />
              </a>
              <MotionToggle />
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[color:var(--tm-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mute">
            © {year} {COMPANY.legalName} — Lisbon · Europe · UK · US · India
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy-policy" className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mute hover:text-accent">
              Privacy
            </Link>
            <Link href="/cookie-policy" className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mute hover:text-accent">
              Cookies
            </Link>
            <Link href="/terms-of-service" className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mute hover:text-accent">
              Terms
            </Link>
            <a href="#main" className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-mute hover:text-accent">
              Back to top
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
