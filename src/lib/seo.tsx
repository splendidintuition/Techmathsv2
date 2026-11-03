import type { Metadata } from "next";
import { COMPANY } from "./content/site";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://techmaths.com").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type MetaInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
};

/** Central metadata builder: title template, canonical, Open Graph and Twitter. */
export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  type = "website",
  publishedTime,
  noIndex = false,
}: MetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: COMPANY.name,
      title: `${title} — ${COMPANY.name}`,
      description,
      locale: "en_GB",
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${COMPANY.name}`,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export const SITE_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${COMPANY.name} — ${COMPANY.tagline}`,
    template: `%s — ${COMPANY.name}`,
  },
  description:
    "Tech Maths is a specialist data center services partner: rack and stack, structured cabling, server and network installation, commissioning, remote hands and decommissioning. Lisbon headquarters, engineers across Europe, the UK, US and India.",
  applicationName: COMPANY.name,
  authors: [{ name: COMPANY.name, url: SITE_URL }],
  creator: COMPANY.name,
  publisher: COMPANY.name,
  category: "technology",
  keywords: [
    "data center services",
    "rack and stack",
    "structured cabling",
    "server installation",
    "remote hands",
    "data center decommissioning",
    "commissioning and testing",
    "data center engineer Europe",
    "data center services Portugal",
    "data center services Lisbon",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: COMPANY.name,
    url: SITE_URL,
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description:
      "Hands-on data center engineering: build, cable, install, commission and support. Lisbon headquarters with delivery teams across Europe, the UK, the US and India.",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description:
      "Hands-on data center engineering: build, cable, install, commission and support across Europe, the UK, the US and India.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  formatDetection: { telephone: true, address: false, email: true },
};

/* ------------------------------------------------------------- JSON-LD */

export function jsonLd(data: Record<string, unknown>) {
  return (
    <script
      type="application/ld+json"
      // Content is generated from typed, server-side data — never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }) }}
    />
  );
}

export const organizationLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: COMPANY.name,
  legalName: COMPANY.legalName,
  url: SITE_URL,
  email: COMPANY.email,
  telephone: COMPANY.phone,
  foundingDate: String(COMPANY.founded),
  description:
    "Specialist data center services partner delivering rack and stack, structured cabling, server and network installation, commissioning, remote hands and decommissioning.",
  address: {
    "@type": "PostalAddress",
    addressLocality: COMPANY.headquarters.city,
    addressCountry: "PT",
    streetAddress: COMPANY.headquarters.address,
  },
  areaServed: [
    { "@type": "Place", name: "Europe" },
    { "@type": "Country", name: "United Kingdom" },
    { "@type": "Country", name: "United States" },
    { "@type": "Country", name: "India" },
  ],
  knowsLanguage: COMPANY.languages,
};

export function breadcrumbLd(crumbs: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function serviceLd(service: { title: string; slug: string; short: string; summary: string }) {
  return {
    "@type": "Service",
    name: service.title,
    url: absoluteUrl(`/services/${service.slug}`),
    description: service.summary.split("\n")[0],
    serviceType: service.title,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Place", name: "Europe, United Kingdom, United States, India" },
  };
}

export function faqLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
