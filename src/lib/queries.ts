import { getDb, parseJson, stringifyJson } from "./db";
import { seedContent } from "./seed";
import type {
  CoverageCountry,
  Industry,
  Insight,
  Lead,
  LeadInput,
  Project,
  Service,
  TeamMember,
  Testimonial,
} from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __techmathsSeeded: boolean | undefined;
}

/** Seeds versioned content on first use in a process. Cheap: INSERT OR IGNORE. */
export function ensureSeeded(): void {
  if (globalThis.__techmathsSeeded) return;
  const db = getDb();
  seedContent(db);
  globalThis.__techmathsSeeded = true;
}

/* ------------------------------------------------------------------ services */

type ServiceRow = {
  slug: string;
  position: number;
  title: string;
  short: string;
  icon: string;
  summary: string;
  included: string;
  excluded: string;
  deliverables: string;
  method: string;
  tooling: string;
  standards: string;
  faqs: string;
  kpis: string;
  keywords: string;
};

function mapService(row: ServiceRow): Service {
  return {
    slug: row.slug,
    position: row.position,
    title: row.title,
    short: row.short,
    icon: row.icon,
    summary: row.summary,
    included: parseJson<string[]>(row.included, []),
    excluded: parseJson<string[]>(row.excluded, []),
    deliverables: parseJson<string[]>(row.deliverables, []),
    method: parseJson<Service["method"]>(row.method, []),
    tooling: parseJson<string[]>(row.tooling, []),
    standards: parseJson<string[]>(row.standards, []),
    faqs: parseJson<Service["faqs"]>(row.faqs, []),
    kpis: parseJson<Service["kpis"]>(row.kpis, []),
    keywords: parseJson<string[]>(row.keywords, []),
  };
}

export function listServices(): Service[] {
  ensureSeeded();
  const rows = getDb().prepare(`SELECT * FROM services ORDER BY position`).all() as ServiceRow[];
  return rows.map(mapService);
}

export function getService(slug: string): Service | null {
  ensureSeeded();
  const row = getDb().prepare(`SELECT * FROM services WHERE slug = ?`).get(slug) as ServiceRow | undefined;
  return row ? mapService(row) : null;
}

export function serviceTitleMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of listServices()) map[s.slug] = s.title;
  return map;
}

/* ------------------------------------------------------------------ projects */

type ProjectRow = {
  slug: string;
  position: number;
  title: string;
  client: string;
  summary: string;
  services: string;
  industries: string;
  country: string;
  region: string;
  year: number;
  duration: string;
  team_size: number;
  challenge: string;
  scope: string;
  result: string;
  metrics: string;
  quote: string;
  is_placeholder: number;
  published: number;
};

function mapProject(row: ProjectRow): Project {
  return {
    slug: row.slug,
    position: row.position,
    title: row.title,
    client: row.client,
    summary: row.summary,
    services: parseJson<string[]>(row.services, []),
    industries: parseJson<string[]>(row.industries, []),
    country: row.country,
    region: row.region,
    year: row.year,
    duration: row.duration,
    teamSize: row.team_size,
    challenge: row.challenge,
    scope: parseJson<string[]>(row.scope, []),
    result: row.result,
    metrics: parseJson<Project["metrics"]>(row.metrics, []),
    quote: row.quote,
    isPlaceholder: Boolean(row.is_placeholder),
  };
}

export function listProjects(opts: { service?: string; industry?: string; country?: string } = {}): Project[] {
  ensureSeeded();
  const rows = getDb().prepare(`SELECT * FROM projects WHERE published = 1 ORDER BY position`).all() as ProjectRow[];
  let out = rows.map(mapProject);
  if (opts.service) out = out.filter((p) => p.services.includes(opts.service as string));
  if (opts.industry) out = out.filter((p) => p.industries.includes(opts.industry as string));
  if (opts.country) out = out.filter((p) => p.country === opts.country);
  return out;
}

export function getProject(slug: string): Project | null {
  ensureSeeded();
  const row = getDb().prepare(`SELECT * FROM projects WHERE slug = ? AND published = 1`).get(slug) as
    | ProjectRow
    | undefined;
  return row ? mapProject(row) : null;
}

/* ------------------------------------------------------------------ insights */

type InsightRow = {
  slug: string;
  position: number;
  title: string;
  seo_title: string | null;
  excerpt: string;
  body: string;
  kind: string;
  category: string;
  author: string;
  published_on: string;
  read_minutes: number;
  download: number;
  tags: string;
};

function mapInsight(row: InsightRow): Insight {
  return {
    slug: row.slug,
    position: row.position,
    title: row.title,
    seoTitle: row.seo_title ?? undefined,
    excerpt: row.excerpt,
    body: row.body,
    kind: row.kind as Insight["kind"],
    category: row.category,
    author: row.author,
    publishedOn: row.published_on,
    readMinutes: row.read_minutes,
    download: Boolean(row.download),
    tags: parseJson<string[]>(row.tags, []),
  };
}

export function listInsights(opts: { category?: string; kind?: string; q?: string; limit?: number } = {}): Insight[] {
  ensureSeeded();
  const rows = getDb()
    .prepare(`SELECT * FROM insights ORDER BY published_on DESC, position`)
    .all() as InsightRow[];
  let out = rows.map(mapInsight);
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
  ensureSeeded();
  const row = getDb().prepare(`SELECT * FROM insights WHERE slug = ?`).get(slug) as InsightRow | undefined;
  return row ? mapInsight(row) : null;
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
  ensureSeeded();
  const rows = getDb()
    .prepare(`SELECT slug, position, title, summary, pressures, services, proof_point AS proofPoint
              FROM industries ORDER BY position`)
    .all() as Array<Omit<Industry, "pressures" | "services"> & { pressures: string; services: string }>;
  return rows.map((r) => ({
    slug: r.slug,
    position: r.position,
    title: r.title,
    summary: r.summary,
    pressures: parseJson<string[]>(r.pressures, []),
    services: parseJson<string[]>(r.services, []),
    proofPoint: r.proofPoint,
  }));
}

export function getIndustry(slug: string): Industry | null {
  return listIndustries().find((i) => i.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ coverage */

export function listCoverage(): CoverageCountry[] {
  ensureSeeded();
  const rows = getDb()
    .prepare(`SELECT code, name, region, mobilise_hours AS mobiliseHours, note, hubs, hq
              FROM coverage ORDER BY mobilise_hours, name`)
    .all() as Array<Omit<CoverageCountry, "hubs" | "hq"> & { hubs: string; hq: number }>;
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    region: r.region,
    mobiliseHours: r.mobiliseHours,
    note: r.note,
    hubs: parseJson<string[]>(r.hubs, []),
    hq: Boolean(r.hq),
  }));
}

/* ------------------------------------------------------- team / testimonials */

export function listTeam(): TeamMember[] {
  ensureSeeded();
  const rows = getDb()
    .prepare(`SELECT name, role, bio, certifications, is_placeholder AS isPlaceholder FROM team ORDER BY id`)
    .all() as Array<Omit<TeamMember, "certifications" | "isPlaceholder"> & { certifications: string; isPlaceholder: number }>;
  return rows.map((r) => ({
    name: r.name,
    role: r.role,
    bio: r.bio,
    certifications: parseJson<string[]>(r.certifications, []),
    isPlaceholder: Boolean(r.isPlaceholder),
  }));
}

export function listTestimonials(): Testimonial[] {
  ensureSeeded();
  const rows = getDb()
    .prepare(`SELECT quote, author, role, company, is_placeholder AS isPlaceholder FROM testimonials ORDER BY id`)
    .all() as Array<Omit<Testimonial, "isPlaceholder"> & { isPlaceholder: number }>;
  return rows.map((r) => ({ ...r, isPlaceholder: Boolean(r.isPlaceholder) }));
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

/* --------------------------------------------------------------------- leads */

export function makeReference(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TM-${year}-${rand}`;
}

export function createLead(input: LeadInput): Lead {
  const db = getDb();
  const reference = makeReference();
  const info = db
    .prepare(
      `INSERT INTO leads
        (reference, name, email, company, phone, country, site_location, services, racks,
         servers, ports, timeline, urgency, message, source, consent_privacy,
         consent_marketing, spam_score, ip_hash)
       VALUES (@reference, @name, @email, @company, @phone, @country, @siteLocation, @services,
               @racks, @servers, @ports, @timeline, @urgency, @message, @source,
               @consentPrivacy, @consentMarketing, @spamScore, @ipHash)`
    )
    .run({
      reference,
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      phone: input.phone ?? null,
      country: input.country,
      siteLocation: input.siteLocation ?? null,
      services: stringifyJson(input.services),
      racks: input.racks ?? null,
      servers: input.servers ?? null,
      ports: input.ports ?? null,
      timeline: input.timeline ?? null,
      urgency: input.urgency ?? null,
      message: input.message ?? null,
      source: input.source ?? null,
      consentPrivacy: input.consentPrivacy ? 1 : 0,
      consentMarketing: input.consentMarketing ? 1 : 0,
      spamScore: input.spamScore ?? 0,
      ipHash: input.ipHash ?? null,
    });

  const row = db.prepare(`SELECT * FROM leads WHERE id = ?`).get(info.lastInsertRowid) as LeadDbRow;
  return mapLead(row);
}

type LeadDbRow = {
  id: number;
  reference: string;
  created_at: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  country: string;
  site_location: string | null;
  services: string;
  racks: number | null;
  servers: number | null;
  ports: number | null;
  timeline: string | null;
  urgency: string | null;
  message: string | null;
  source: string | null;
  status: string;
  consent_privacy: number;
  consent_marketing: number;
  notified: number;
};

function mapLead(row: LeadDbRow): Lead {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    phone: row.phone ?? undefined,
    country: row.country,
    siteLocation: row.site_location ?? undefined,
    services: parseJson<string[]>(row.services, []),
    racks: row.racks ?? undefined,
    servers: row.servers ?? undefined,
    ports: row.ports ?? undefined,
    timeline: row.timeline ?? undefined,
    urgency: row.urgency ?? undefined,
    message: row.message ?? undefined,
    source: row.source ?? undefined,
    status: row.status,
    consentPrivacy: Boolean(row.consent_privacy),
    consentMarketing: Boolean(row.consent_marketing),
    notified: Boolean(row.notified),
  };
}

export function listLeads(limit = 100): Lead[] {
  const rows = getDb().prepare(`SELECT * FROM leads ORDER BY datetime(created_at) DESC LIMIT ?`).all(limit) as LeadDbRow[];
  return rows.map(mapLead);
}

export function leadStats() {
  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM leads`).get() as { n: number }).n;
  const byStatus = db.prepare(`SELECT status, COUNT(*) AS n FROM leads GROUP BY status`).all() as Array<{
    status: string;
    n: number;
  }>;
  const last30 = (
    db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE datetime(created_at) >= datetime('now', '-30 days')`).get() as {
      n: number;
    }
  ).n;
  return { total, byStatus, last30 };
}

export function setLeadStatus(id: number, status: string): void {
  getDb().prepare(`UPDATE leads SET status = ? WHERE id = ?`).run(status, id);
}

export function markLeadNotified(id: number): void {
  getDb().prepare(`UPDATE leads SET notified = 1 WHERE id = ?`).run(id);
}

export function addSubscriber(email: string): { ok: boolean; duplicate: boolean } {
  const db = getDb();
  const existing = db.prepare(`SELECT id FROM subscribers WHERE email = ?`).get(email.toLowerCase());
  if (existing) return { ok: true, duplicate: true };
  db.prepare(`INSERT INTO subscribers (email) VALUES (?)`).run(email.toLowerCase());
  return { ok: true, duplicate: false };
}

export function subscriberCount(): number {
  return (getDb().prepare(`SELECT COUNT(*) AS n FROM subscribers`).get() as { n: number }).n;
}

export function trackEvent(type: string, data: { path?: string; referrer?: string; country?: string; meta?: unknown } = {}): void {
  getDb()
    .prepare(`INSERT INTO events (type, path, referrer, country, meta) VALUES (?, ?, ?, ?, ?)`)
    .run(type, data.path ?? null, data.referrer ?? null, data.country ?? null, data.meta ? stringifyJson(data.meta) : null);
}

export function trafficStats(days = 30) {
  const db = getDb();
  const views = db
    .prepare(`SELECT date(at) AS day, COUNT(*) AS n FROM events WHERE type = 'pageview'
              AND date(at) >= date('now', ?) GROUP BY day ORDER BY day`)
    .all(`-${days} days`) as Array<{ day: string; n: number }>;
  const topPaths = db
    .prepare(`SELECT path, COUNT(*) AS n FROM events WHERE type = 'pageview'
              AND date(at) >= date('now', ?) GROUP BY path ORDER BY n DESC LIMIT 10`)
    .all(`-${days} days`) as Array<{ path: string; n: number }>;
  return { views, topPaths };
}
