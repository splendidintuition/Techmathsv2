import type { MetadataRoute } from "next";
import { REGIONAL_COUNTRY_CODES, regionalSlug } from "@/lib/content/regional";
import { listCoverage, listInsights, listProjects, listServices } from "@/lib/queries";
import { SITE_URL } from "@/lib/seo";

/** Sitemap generated from the live content tables — new projects and articles appear automatically. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/coverage`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/how-we-work`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${SITE_URL}/industries`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/insights`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookie-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = listServices().map((s) => ({
    url: `${SITE_URL}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const regionalCodes = new Set<string>(REGIONAL_COUNTRY_CODES);
  const regionalCountries = listCoverage().filter((c) => regionalCodes.has(c.code));
  const regionalRoutes: MetadataRoute.Sitemap = listServices().flatMap((s) =>
    regionalCountries.map((c) => ({
      url: `${SITE_URL}/services/${s.slug}/${regionalSlug(c.code)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
  );

  const countryHubRoutes: MetadataRoute.Sitemap = regionalCountries.map((c) => ({
    url: `${SITE_URL}/coverage/${regionalSlug(c.code)}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = listProjects().map((p) => ({
    url: `${SITE_URL}/projects/${p.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const insightRoutes: MetadataRoute.Sitemap = listInsights().map((i) => ({
    url: `${SITE_URL}/insights/${i.slug}`,
    lastModified: new Date(i.publishedOn),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...countryHubRoutes,
    ...regionalRoutes,
    ...projectRoutes,
    ...insightRoutes,
  ];
}
