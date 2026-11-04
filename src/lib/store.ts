import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db";
import { events, leads, subscribers } from "../../db/schema";
import type { Lead, LeadInput } from "./types";

/**
 * Operational data — leads, newsletter subscribers and analytics events —
 * stored durably in Netlify Database (managed Postgres).
 */

/* --------------------------------------------------------------------- leads */

export function makeReference(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, "0");
  return `TM-${year}-${rand}`;
}

type LeadRow = typeof leads.$inferSelect;

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    phone: row.phone ?? undefined,
    country: row.country,
    siteLocation: row.siteLocation ?? undefined,
    services: Array.isArray(row.services) ? row.services : [],
    racks: row.racks ?? undefined,
    servers: row.servers ?? undefined,
    ports: row.ports ?? undefined,
    timeline: row.timeline ?? undefined,
    urgency: row.urgency ?? undefined,
    message: row.message ?? undefined,
    source: row.source ?? undefined,
    status: row.status,
    consentPrivacy: row.consentPrivacy,
    consentMarketing: row.consentMarketing,
    notified: row.notified,
  };
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const [row] = await db
    .insert(leads)
    .values({
      reference: makeReference(),
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      phone: input.phone ?? null,
      country: input.country,
      siteLocation: input.siteLocation ?? null,
      services: input.services,
      racks: input.racks ?? null,
      servers: input.servers ?? null,
      ports: input.ports ?? null,
      timeline: input.timeline ?? null,
      urgency: input.urgency ?? null,
      message: input.message ?? null,
      source: input.source ?? null,
      consentPrivacy: input.consentPrivacy,
      consentMarketing: input.consentMarketing,
      spamScore: input.spamScore ?? 0,
      ipHash: input.ipHash ?? null,
    })
    .returning();
  return mapLead(row);
}

export async function listLeads(limit = 100): Promise<Lead[]> {
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit);
  return rows.map(mapLead);
}

export async function leadStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [[{ total }], byStatus, [{ last30 }]] = await Promise.all([
    db.select({ total: count() }).from(leads),
    db.select({ status: leads.status, n: count() }).from(leads).groupBy(leads.status),
    db.select({ last30: count() }).from(leads).where(gte(leads.createdAt, since)),
  ]);
  return { total, byStatus, last30 };
}

export async function setLeadStatus(id: number, status: string): Promise<boolean> {
  const updated = await db.update(leads).set({ status }).where(eq(leads.id, id)).returning({ id: leads.id });
  return updated.length > 0;
}

export async function markLeadNotified(id: number): Promise<void> {
  await db.update(leads).set({ notified: true }).where(eq(leads.id, id));
}

/* --------------------------------------------------------------- subscribers */

export async function addSubscriber(email: string): Promise<{ ok: boolean; duplicate: boolean }> {
  const inserted = await db
    .insert(subscribers)
    .values({ email: email.toLowerCase() })
    .onConflictDoNothing({ target: subscribers.email })
    .returning({ id: subscribers.id });
  return { ok: true, duplicate: inserted.length === 0 };
}

export async function subscriberCount(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(subscribers);
  return n;
}

/* -------------------------------------------------------------------- events */

export async function trackEvent(
  type: string,
  data: { path?: string; referrer?: string; country?: string; meta?: unknown } = {}
): Promise<void> {
  await db.insert(events).values({
    type,
    path: data.path ?? null,
    referrer: data.referrer ?? null,
    country: data.country ?? null,
    meta: data.meta ?? null,
  });
}

export async function trafficStats(days = 30) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);
  const day = sql<string>`to_char(${events.at} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
  const where = and(eq(events.type, "pageview"), gte(events.at, since));

  const [views, topPaths] = await Promise.all([
    db.select({ day, n: count() }).from(events).where(where).groupBy(day).orderBy(day),
    db
      .select({ path: sql<string>`coalesce(${events.path}, '')`, n: count() })
      .from(events)
      .where(where)
      .groupBy(events.path)
      .orderBy(desc(count()))
      .limit(10),
  ]);
  return { views, topPaths };
}

/** Cheap connectivity probe used by /api/health. */
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}
