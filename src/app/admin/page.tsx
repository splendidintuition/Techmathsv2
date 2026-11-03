import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LeadsTable } from "@/components/leads-table";
import { Logo } from "@/components/logo";
import { PlaceholderTag } from "@/components/ui";
import { PLACEHOLDER_REGISTER } from "@/lib/content/site";
import {
  leadStats,
  listInsights,
  listLeads,
  listProjects,
  listServices,
  serviceTitleMap,
  subscriberCount,
  trafficStats,
} from "@/lib/queries";

export const metadata: Metadata = {
  title: "Admin console",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Keep the admin gate in the Node-rendered page. This preserves the previous
  // middleware behaviour without requiring a Netlify Edge Function bundle.
  const token = (await cookies()).get("tm_admin")?.value;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    redirect("/admin/login?next=/admin");
  }

  const [leads, stats, traffic, services, projects, insights] = [
    listLeads(200),
    leadStats(),
    trafficStats(30),
    listServices(),
    listProjects(),
    listInsights(),
  ];
  const serviceTitles = serviceTitleMap();
  const subscribers = subscriberCount();
  const placeholders = projects.filter((p) => p.isPlaceholder).length;
  const maxViews = Math.max(1, ...traffic.views.map((v) => v.n));

  return (
    <section className="shell py-14">
      <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[color:var(--tm-line)] pb-7">
        <div className="flex items-center gap-4">
          <Logo className="h-9 w-9 text-mist" />
          <div>
            <h1 className="text-[1.5rem]">Admin console</h1>
            <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute">
              Leads · traffic · pre-launch checklist
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-[color:var(--tm-line)] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:border-accent hover:text-accent"
          >
            View site
          </Link>
          <form
            action="/api/admin/login"
            method="post"
            className="hidden"
            aria-hidden="true"
          />
          <LogoutButton />
        </div>
      </header>

      {/* KPIs */}
      <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total leads", value: String(stats.total) },
          { label: "Last 30 days", value: String(stats.last30) },
          { label: "New / untriaged", value: String(stats.byStatus.find((s) => s.status === "new")?.n ?? 0) },
          { label: "Newsletter", value: String(subscribers) },
          { label: "Pageviews (30d)", value: String(traffic.views.reduce((a, b) => a + b.n, 0)) },
        ].map((k) => (
          <div key={k.label} className="bg-ink p-6">
            <p className="font-display text-[1.9rem] leading-none text-accent">{k.value}</p>
            <p className="mt-2 text-[0.8rem] text-mute">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr]">
        {/* Leads */}
        <div>
          <h2 className="text-[1.3rem]">Lead queue</h2>
          <p className="mt-2 text-[0.86rem] text-mute">
            Every quote request lands here with a reference, consent flags and an abuse score. Export to CSV for
            your CRM, or set the status as it moves through the pipeline.
          </p>
          <div className="mt-6">
            <LeadsTable leads={leads} serviceTitles={serviceTitles} />
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-6">
          <div className="card-surface p-6">
            <h2 className="text-[1.05rem]">Traffic — last 30 days</h2>
            {traffic.views.length === 0 ? (
              <p className="mt-4 text-[0.84rem] leading-relaxed text-mute">
                No pageviews recorded. Views are only counted after a visitor accepts analytics in the consent
                banner.
              </p>
            ) : (
              <>
                <div className="mt-5 flex h-24 items-end gap-1">
                  {traffic.views.slice(-30).map((v) => (
                    <div
                      key={v.day}
                      title={`${v.day}: ${v.n} views`}
                      className="flex-1 rounded-t-sm bg-accent/70"
                      style={{ height: `${Math.max(4, (v.n / maxViews) * 100)}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-5 space-y-2 border-t border-[color:var(--tm-line)] pt-4">
                  {traffic.topPaths.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-3 text-[0.8rem]">
                      <span className="truncate font-mono text-[0.72rem] text-mute">{p.path}</span>
                      <span className="shrink-0 text-mist">{p.n}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="card-surface p-6">
            <h2 className="text-[1.05rem]">Content inventory</h2>
            <ul className="mt-4 space-y-2.5 text-[0.84rem]">
              {[
                ["Services", services.length],
                ["Projects", projects.length],
                ["Insights", insights.length],
                ["Placeholder projects", placeholders],
              ].map(([label, value]) => (
                <li key={label as string} className="flex items-center justify-between gap-3">
                  <span className="text-mute">{label}</span>
                  <span className="font-mono text-mist">{value as number}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.78rem] leading-relaxed text-mute">
              Content is seeded from versioned TypeScript and stored in SQLite. Rows are only inserted when
              missing, so edits made here survive a redeploy.
            </p>
          </div>

          <div className="card-surface p-6">
            <h2 className="flex items-center gap-2.5 text-[1.05rem]">
              Pre-launch checklist
              <PlaceholderTag label={`${PLACEHOLDER_REGISTER.length} items`} />
            </h2>
            <ul className="mt-4 space-y-3">
              {PLACEHOLDER_REGISTER.map((p) => (
                <li key={p.item} className="text-[0.82rem] leading-relaxed">
                  <span className="text-mist">{p.item}</span>
                  <span className="mt-1 block font-mono text-[0.6rem] tracking-[0.04em] text-mute">{p.where}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-surface p-6">
            <h2 className="text-[1.05rem]">Environment</h2>
            <ul className="mt-4 space-y-2 text-[0.8rem]">
              {[
                ["Site URL", process.env.NEXT_PUBLIC_SITE_URL ?? "(unset — defaults to techmaths.com)"],
                ["Lead notify email", process.env.LEAD_NOTIFY_EMAIL ?? "(unset)"],
                ["CRM webhook", process.env.LEAD_WEBHOOK_URL ? "configured" : "(unset)"],
                ["Analytics", process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN ?? "(unset — first-party only)"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start justify-between gap-4">
                  <span className="text-mute">{k}</span>
                  <span className="max-w-[60%] truncate text-right font-mono text-[0.72rem] text-mist">{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.78rem] leading-relaxed text-mute">
              Health endpoint: <a href="/api/health" className="link-underline text-accent">/api/health</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Small client-free logout: a form POST is not possible for DELETE, so use a link with a confirm-free flow. */
function LogoutButton() {
  return (
    <form action="/admin/logout" method="post">
      <button
        type="submit"
        className="rounded-full border border-[color:var(--tm-line)] px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:border-accent hover:text-accent"
      >
        Sign out
      </button>
    </form>
  );
}
