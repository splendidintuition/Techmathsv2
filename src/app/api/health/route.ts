import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  leadStats,
  listInsights,
  listLeads,
  listProjects,
  listServices,
  subscriberCount,
  trafficStats,
} from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — dependency check used by the admin console and uptime monitors. */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, unknown> = {};

  try {
    const row = getDb().prepare(`SELECT COUNT(*) AS n FROM services`).get() as { n: number };
    checks.database = { ok: true, services: row.n };
  } catch (err) {
    checks.database = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  checks.content = {
    services: listServices().length,
    projects: listProjects().length,
    insights: listInsights().length,
  };

  const stats = leadStats();
  checks.leads = { total: stats.total, last30Days: stats.last30, subscribers: subscriberCount() };
  checks.recentLeads = listLeads(5).map((l) => ({
    reference: l.reference,
    createdAt: l.createdAt,
    status: l.status,
  }));
  checks.traffic = trafficStats(30);
  checks.env = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "(unset)",
    leadNotifyEmail: process.env.LEAD_NOTIFY_EMAIL ?? "(unset)",
    webhookConfigured: Boolean(process.env.LEAD_WEBHOOK_URL),
    analyticsConfigured: Boolean(process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN),
  };

  const dbOk = (checks.database as { ok?: boolean }).ok === true;
  return NextResponse.json(
    { ok: dbOk, uptimeMs: Date.now() - started, checkedAt: new Date().toISOString(), checks },
    { status: dbOk ? 200 : 503 }
  );
}
