import { NextResponse } from "next/server";
import { listInsights, listProjects, listServices } from "@/lib/queries";
import { leadStats, listLeads, pingDatabase, subscriberCount, trafficStats } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/health — dependency check used by the admin console and uptime monitors. */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, unknown> = {};

  checks.content = {
    services: listServices().length,
    projects: listProjects().length,
    insights: listInsights().length,
  };

  try {
    await pingDatabase();
    checks.database = { ok: true };
    const [stats, subscribers, recent, traffic] = await Promise.all([
      leadStats(),
      subscriberCount(),
      listLeads(5),
      trafficStats(30),
    ]);
    checks.leads = { total: stats.total, last30Days: stats.last30, subscribers };
    checks.recentLeads = recent.map((l) => ({ reference: l.reference, createdAt: l.createdAt, status: l.status }));
    checks.traffic = traffic;
  } catch (err) {
    checks.database = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  checks.env = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "(unset)",
    leadNotifyEmail: process.env.LEAD_NOTIFY_EMAIL ?? "(unset)",
    hubspotConfigured: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
    webhookConfigured: Boolean(process.env.LEAD_WEBHOOK_URL),
    analyticsConfigured: Boolean(process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN),
  };

  const ok = (checks.database as { ok?: boolean }).ok === true;
  return NextResponse.json(
    { ok, uptimeMs: Date.now() - started, checkedAt: new Date().toISOString(), checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
