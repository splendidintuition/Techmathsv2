import type { Database } from "better-sqlite3";
import { COVERAGE, INDUSTRIES, TEAM, TESTIMONIALS } from "./content/site";
import { INSIGHTS } from "./content/insights";
import { PROJECTS } from "./content/projects";
import { SERVICES } from "./content/services";
import { stringifyJson } from "./db";
import type { Faq } from "./types";

/**
 * Idempotent seeding.
 *
 * Rows are inserted only when the primary key is absent, so an operator can
 * edit content in the database without a redeploy wiping the change. Use
 * `resetContent()` for a deliberate overwrite.
 */
export function seedContent(db: Database): { inserted: number; skipped: number } {
  let inserted = 0;
  let skipped = 0;

  const insertService = db.prepare(
    `INSERT OR IGNORE INTO services
      (slug, position, title, short, icon, summary, included, excluded, deliverables,
       method, tooling, standards, faqs, kpis, keywords)
     VALUES (@slug, @position, @title, @short, @icon, @summary, @included, @excluded,
             @deliverables, @method, @tooling, @standards, @faqs, @kpis, @keywords)`
  );
  const seedServices = db.transaction(() => {
    for (const s of SERVICES) {
      const r = insertService.run({
        slug: s.slug,
        position: s.position,
        title: s.title,
        short: s.short,
        icon: s.icon,
        summary: s.summary,
        included: stringifyJson(s.included),
        excluded: stringifyJson(s.excluded),
        deliverables: stringifyJson(s.deliverables),
        method: stringifyJson(s.method),
        tooling: stringifyJson(s.tooling),
        standards: stringifyJson(s.standards),
        faqs: stringifyJson(s.faqs),
        kpis: stringifyJson(s.kpis),
        keywords: stringifyJson(s.keywords),
      });
      r.changes ? inserted++ : skipped++;
    }
  });
  seedServices();

  const insertProject = db.prepare(
    `INSERT OR IGNORE INTO projects
      (slug, position, title, client, summary, services, industries, country, region,
       year, duration, team_size, challenge, scope, result, metrics, quote, is_placeholder)
     VALUES (@slug, @position, @title, @client, @summary, @services, @industries, @country,
             @region, @year, @duration, @teamSize, @challenge, @scope, @result, @metrics,
             @quote, @isPlaceholder)`
  );
  const seedProjects = db.transaction(() => {
    for (const p of PROJECTS) {
      const r = insertProject.run({
        slug: p.slug,
        position: p.position,
        title: p.title,
        client: p.client,
        summary: p.summary,
        services: stringifyJson(p.services),
        industries: stringifyJson(p.industries),
        country: p.country,
        region: p.region,
        year: p.year,
        duration: p.duration,
        teamSize: p.teamSize,
        challenge: p.challenge,
        scope: stringifyJson(p.scope),
        result: p.result,
        metrics: stringifyJson(p.metrics),
        quote: p.quote,
        isPlaceholder: p.isPlaceholder ? 1 : 0,
      });
      r.changes ? inserted++ : skipped++;
    }
  });
  seedProjects();

  const insertInsight = db.prepare(
    `INSERT OR IGNORE INTO insights
      (slug, position, title, seo_title, excerpt, body, kind, category, author,
       published_on, read_minutes, download, tags)
     VALUES (@slug, @position, @title, @seoTitle, @excerpt, @body, @kind, @category,
             @author, @publishedOn, @readMinutes, @download, @tags)`
  );
  const seedInsights = db.transaction(() => {
    for (const i of INSIGHTS) {
      const r = insertInsight.run({
        slug: i.slug,
        position: i.position,
        title: i.title,
        seoTitle: i.seoTitle ?? null,
        excerpt: i.excerpt,
        body: i.body,
        kind: i.kind,
        category: i.category,
        author: i.author,
        publishedOn: i.publishedOn,
        readMinutes: i.readMinutes,
        download: i.download ? 1 : 0,
        tags: stringifyJson(i.tags),
      });
      r.changes ? inserted++ : skipped++;
    }
  });
  seedInsights();

  const insertIndustry = db.prepare(
    `INSERT OR IGNORE INTO industries
      (slug, position, title, summary, pressures, services, proof_point)
     VALUES (@slug, @position, @title, @summary, @pressures, @services, @proofPoint)`
  );
  const seedIndustries = db.transaction(() => {
    for (const i of INDUSTRIES) {
      const r = insertIndustry.run({
        slug: i.slug,
        position: i.position,
        title: i.title,
        summary: i.summary,
        pressures: stringifyJson(i.pressures),
        services: stringifyJson(i.services),
        proofPoint: i.proofPoint,
      });
      r.changes ? inserted++ : skipped++;
    }
  });
  seedIndustries();

  const insertCoverage = db.prepare(
    `INSERT OR IGNORE INTO coverage
      (code, name, region, mobilise_hours, note, hubs, hq)
     VALUES (@code, @name, @region, @mobiliseHours, @note, @hubs, @hq)`
  );
  const seedCoverage = db.transaction(() => {
    for (const c of COVERAGE) {
      const r = insertCoverage.run({
        code: c.code,
        name: c.name,
        region: c.region,
        mobiliseHours: c.mobiliseHours,
        note: c.note,
        hubs: stringifyJson(c.hubs),
        hq: c.hq ? 1 : 0,
      });
      r.changes ? inserted++ : skipped++;
    }
  });
  seedCoverage();

  const teamCount = (db.prepare(`SELECT COUNT(*) AS n FROM team`).get() as { n: number }).n;
  if (teamCount === 0) {
    const insertTeam = db.prepare(
      `INSERT INTO team (name, role, bio, certifications, is_placeholder)
       VALUES (@name, @role, @bio, @certifications, @isPlaceholder)`
    );
    for (const t of TEAM) {
      insertTeam.run({
        name: t.name,
        role: t.role,
        bio: t.bio,
        certifications: stringifyJson(t.certifications),
        isPlaceholder: t.isPlaceholder ? 1 : 0,
      });
      inserted++;
    }
  } else {
    skipped += teamCount;
  }

  const tCount = (db.prepare(`SELECT COUNT(*) AS n FROM testimonials`).get() as { n: number }).n;
  if (tCount === 0) {
    const insertT = db.prepare(
      `INSERT INTO testimonials (quote, author, role, company, is_placeholder)
       VALUES (@quote, @author, @role, @company, @isPlaceholder)`
    );
    for (const t of TESTIMONIALS) {
      insertT.run({
        quote: t.quote,
        author: t.author,
        role: t.role,
        company: t.company,
        isPlaceholder: t.isPlaceholder ? 1 : 0,
      });
      inserted++;
    }
  } else {
    skipped += tCount;
  }

  return { inserted, skipped };
}

/** Deliberate overwrite of versioned content tables. Never touches leads. */
export function resetContent(db: Database): void {
  db.exec(`DELETE FROM services; DELETE FROM projects; DELETE FROM insights;
           DELETE FROM industries; DELETE FROM coverage; DELETE FROM team;
           DELETE FROM testimonials; DELETE FROM faqs;`);
  seedContent(db);
}

export const GLOBAL_FAQS: Faq[] = [];
