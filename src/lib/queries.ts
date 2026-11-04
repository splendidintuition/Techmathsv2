import { COVERAGE, INDUSTRIES, TEAM, TESTIMONIALS } from "./content/site";
import { INSIGHTS } from "./content/insights";
import { PROJECTS } from "./content/projects";
import { SERVICES } from "./content/services";
import type { CoverageCountry, Industry, Insight, Project, Service, TeamMember, Testimonial } from "./types";

/**
 * Published catalogue content (services, projects, insights, industries,
 * coverage, team, testimonials) is versioned in TypeScript under
 * src/lib/content and read directly here. It needs no database, so public
 * pages can be prerendered and never fail on storage.
 *
 * Operational data (leads, subscribers, analytics events) lives in Netlify
 * Database — see src/lib/store.ts.
 */

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/* ------------------------------------------------------------------ services */

export function listServices(): Service[] {
  return [...SERVICES].sort(byPosition);
}

export function getService(slug: string): Service | null {
  return SERVICES.find((s) => s.slug === slug) ?? null;
}

export function serviceTitleMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of listServices()) map[s.slug] = s.title;
  return map;
}

/* ------------------------------------------------------------------ projects */

export function listProjects(opts: { service?: string; industry?: string; country?: string } = {}): Project[] {
  let out = [...PROJECTS].sort(byPosition);
  if (opts.service) out = out.filter((p) => p.services.includes(opts.service as string));
  if (opts.industry) out = out.filter((p) => p.industries.includes(opts.industry as string));
  if (opts.country) out = out.filter((p) => p.country === opts.country);
  return out;
}

export function getProject(slug: string): Project | null {
  return PROJECTS.find((p) => p.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ insights */

export function listInsights(opts: { category?: string; kind?: string; q?: string; limit?: number } = {}): Insight[] {
  let out = [...INSIGHTS].sort(
    (a, b) => (a.publishedOn < b.publishedOn ? 1 : a.publishedOn > b.publishedOn ? -1 : a.position - b.position)
  );
  if (opts.category) out = out.filter((i) => i.category === opts.category);
  if (opts.kind) out = out.filter((i) => i.kind === opts.kind);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    out = out.filter((i) =>
      [i.title, i.excerpt, i.body, i.category, ...i.tags].join(" ").toLowerCase().includes(q)
    );
  }
  return opts.limit ? out.slice(0, opts.limit) : out;
}

export function getInsight(slug: string): Insight | null {
  return INSIGHTS.find((i) => i.slug === slug) ?? null;
}

export function insightCategories(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of listInsights()) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* ---------------------------------------------------------------- industries */

export function listIndustries(): Industry[] {
  return [...INDUSTRIES].sort(byPosition);
}

export function getIndustry(slug: string): Industry | null {
  return INDUSTRIES.find((i) => i.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ coverage */

export function listCoverage(): CoverageCountry[] {
  return [...COVERAGE]
    .map((c) => ({ ...c, hq: Boolean(c.hq) }))
    .sort((a, b) => a.mobiliseHours - b.mobiliseHours || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/* ------------------------------------------------------- team / testimonials */

export function listTeam(): TeamMember[] {
  return [...TEAM];
}

export function listTestimonials(): Testimonial[] {
  return [...TESTIMONIALS];
}

/* -------------------------------------------------------------------- search */

export type SearchHit = { kind: "service" | "project" | "insight" | "page"; title: string; href: string; blurb: string };

const STATIC_PAGES: SearchHit[] = [
  { kind: "page", title: "Coverage", href: "/coverage", blurb: "Countries covered, hubs and typical mobilisation times." },
  { kind: "page", title: "How we work", href: "/how-we-work", blurb: "Brief to handover, with the quality gate at each stage." },
  { kind: "page", title: "Industries", href: "/industries", blurb: "Colocation, hyperscale, enterprise, telecom and edge." },
  { kind: "page", title: "Projects", href: "/projects", blurb: "Case studies with scope, method and measured results." },
  { kind: "page", title: "About and team", href: "/about", blurb: "Who we are, how we work and what we are certified to do." },
  { kind: "page", title: "Request a quote", href: "/contact", blurb: "Multi-step quote request with a four-hour response commitment." },
];

export function search(term: string, limit = 12): SearchHit[] {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const s of listServices()) {
    const hay = [s.title, s.short, s.summary, ...s.keywords, ...s.included].join(" ").toLowerCase();
    if (hay.includes(q)) hits.push({ kind: "service", title: s.title, href: `/services/${s.slug}`, blurb: s.short });
  }
  for (const p of listProjects()) {
    const hay = [p.title, p.summary, p.client, p.challenge, p.result, p.country].join(" ").toLowerCase();
    if (hay.includes(q)) hits.push({ kind: "project", title: p.title, href: `/projects/${p.slug}`, blurb: p.summary });
  }
  for (const i of listInsights()) {
    const hay = [i.title, i.excerpt, i.body, i.category].join(" ").toLowerCase();
    if (hay.includes(q)) hits.push({ kind: "insight", title: i.title, href: `/insights/${i.slug}`, blurb: i.excerpt });
  }
  for (const p of STATIC_PAGES) {
    if ((p.title + " " + p.blurb).toLowerCase().includes(q)) hits.push(p);
  }
  return hits.slice(0, limit);
}
