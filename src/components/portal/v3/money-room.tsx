"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, BarChart3, FileText, Lock, Radio, ReceiptText, RefreshCw, Settings2, Table2 } from "lucide-react";
import { controlApi, describeError, humanise } from "@/lib/portal-v2";
import { supabase } from "@/lib/supabase-browser";
import {
  MONEY_FLAGS,
  agingBucket,
  formatMoney,
  moneyApi,
  moneyError,
  type ClientOrg,
  type MoneyMetrics,
} from "@/lib/portal-money";
import { Button, Empty, ErrorNote, Loading, Panel, Pill, Stat } from "@/components/portal/v2/ui";
import { MoneyQuotes } from "@/components/portal/v3/money-quotes";
import { MoneyInvoices } from "@/components/portal/v3/money-invoices";
import { MoneyRateCards } from "@/components/portal/v3/money-rate-cards";
import { MoneySettings } from "@/components/portal/v3/money-settings";

type Site = { id: string; name: string; organization_id: string };

const TAB_META: Record<string, { label: string; icon: typeof BarChart3 }> = {
  overview: { label: "Money", icon: BarChart3 },
  quotes: { label: "Quotes", icon: FileText },
  invoices: { label: "Invoices", icon: ReceiptText },
  rates: { label: "Rate cards", icon: Table2 },
  settings: { label: "Settings", icon: Settings2 },
};

const FLAG_LABELS: Array<{ key: string; label: string; body: string }> = [
  { key: MONEY_FLAGS.sendQuotes, label: "Send quotes", body: "Lets a quote leave draft and go to the client." },
  { key: MONEY_FLAGS.sendInvoices, label: "Issue invoices", body: "Lets a draft invoice be issued to a client." },
  { key: MONEY_FLAGS.recordPayments, label: "Record payments", body: "Lets money received be booked against an invoice." },
];

/**
 * R3 "Money" console: rate cards → quotes → client decision → invoice → payment.
 * Nothing client-facing moves until an admin flips the matching feature flag.
 */
export function MoneyRoom() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<MoneyMetrics | null>(null);
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) {
        setError("The portal is not connected to its database. Check the deployment environment.");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? "");
      if (!user) return;
      const keys = await controlApi.currentPermissions();
      setPermissions(new Set(Array.isArray(keys) ? keys : []));
      setMetrics(await moneyApi.metrics());
      setClients(await moneyApi.clients());
      const { data: siteRows } = await supabase.from("sites").select("id, name, organization_id").order("name");
      setSites((siteRows ?? []) as Site[]);
    } catch (caught) {
      setError(moneyError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canManageMoney = permissions.has("finance.invoices");
  const canTakePayment = permissions.has("finance.payments");
  const canEditRates = permissions.has("clients.contracts");
  const canSettings = permissions.has("settings.users");

  const tabs = useMemo(() => {
    const next: string[] = [];
    if (canManageMoney) next.push("overview", "quotes", "invoices");
    if (canEditRates) next.push("rates");
    if (canSettings) next.push("settings");
    return next;
  }, [canManageMoney, canEditRates, canSettings]);

  const activeTab = tabs.includes(tab) ? tab : tabs[0] ?? "";

  if (loading) {
    return (
      <Panel title="Money" subtitle="Checking your session and finance permissions">
        <Loading label="Authorising" />
      </Panel>
    );
  }

  if (!userId) {
    return (
      <Panel title="Money" subtitle="Sign-in required">
        <Empty
          title="You are signed out"
          body="The money console needs an active portal session. Sign in on the main portal, then open Money again."
          action={
            <a href="/portal" className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#29E6FF] px-3.5 py-[7px] text-[12px] font-medium text-[#04161A]">
              <Lock size={13} /> Go to sign in
            </a>
          }
        />
      </Panel>
    );
  }

  if (tabs.length === 0) {
    return (
      <Panel title="Money" subtitle="Not available on this account">
        <Empty
          title="No finance permissions"
          body="Quotes, invoices and rate cards are limited to internal roles holding the finance permissions. Ask an admin if you need access."
        />
      </Panel>
    );
  }

  const flags = metrics?.flags ?? {};
  const offFlags = FLAG_LABELS.filter((entry) => !flags[entry.key]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#29E6FF]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7E8CA0]">release 3 · money</span>
          </div>
          <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-[#F2F7FF]">{TAB_META[activeTab]?.label ?? "Money"}</h1>
          <p className="text-[12px] text-[#8A99AB]">
            {email} · {permissions.size} permissions active · every money write is a database function
          </p>
        </div>
        <Button onClick={() => void load()} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((key) => {
          const meta = TAB_META[key];
          if (!meta) return null;
          const Icon = meta.icon;
          const active = key === activeTab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-[6px] text-[12px] transition ${
                active ? "border-[#29E6FF]/45 bg-[#29E6FF]/12 text-[#BDF6FF]" : "border-white/10 bg-white/[0.02] text-[#9AA9BC] hover:border-white/25"
              }`}
            >
              <Icon size={13} /> {meta.label}
            </button>
          );
        })}
      </nav>

      {offFlags.length > 0 && canManageMoney && activeTab !== "settings" && (
        <div className="rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#FFD48A]">
          Money guard active — {offFlags.map((flag) => flag.label.toLowerCase()).join(", ")} {offFlags.length === 1 ? "is" : "are"} switched off.
          You can prepare and review documents, but nothing reaches a client and no payment is booked until an Admin enables the flag
          {canSettings ? " under Settings." : "."}
        </div>
      )}

      {activeTab === "overview" && metrics && <MoneyOverview metrics={metrics} flags={flags} />}
      {activeTab === "overview" && !metrics && <Loading label="Loading money metrics" />}

      {activeTab === "quotes" && (
        <MoneyQuotes canManage={canManageMoney} flags={flags} clients={clients} sites={sites} onChanged={() => void load()} />
      )}

      {activeTab === "invoices" && (
        <MoneyInvoices
          canManage={canManageMoney}
          canTakePayment={canTakePayment}
          flags={flags}
          clients={clients}
          sites={sites}
          onChanged={() => void load()}
        />
      )}

      {activeTab === "rates" && (
        <MoneyRateCards
          canManage={canEditRates}
          showCost={permissions.has("finance.margins")}
          clients={clients}
          onChanged={() => void load()}
        />
      )}

      {activeTab === "settings" && <MoneySettings flags={flags} onChanged={() => void load()} />}

      <p className="pt-1 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#3F4C5D]">
        techmaths operations portal · money · quotes, invoices and payments only
      </p>
    </div>
  );
}

function MoneyOverview({ metrics, flags }: { metrics: MoneyMetrics; flags: Record<string, boolean> }) {
  const buckets: Array<{ key: keyof MoneyMetrics["receivables"]; label: string }> = [
    { key: "current", label: "Current" },
    { key: "d1_30", label: "1–30 days" },
    { key: "d31_60", label: "31–60 days" },
    { key: "d61_90", label: "61–90 days" },
    { key: "d90_plus", label: "90+ days" },
  ];
  const total = metrics.receivables.outstanding || 1;
  const openInvoices = metrics.invoices.sent + metrics.invoices.part_paid + metrics.invoices.overdue;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invoiced this month" value={formatMoney(metrics.revenue.invoiced_this_month)} hint={`${formatMoney(metrics.revenue.invoiced_this_year)} this year`} tone="accent" />
        <Stat label="Outstanding" value={formatMoney(metrics.receivables.outstanding)} hint={`${openInvoices} open invoices`} tone={openInvoices > 0 ? "warn" : "muted"} />
        <Stat label="Overdue" value={formatMoney(metrics.receivables.overdue)} hint="past the agreed due date" tone={metrics.receivables.overdue > 0 ? "danger" : "muted"} />
        <Stat label="Collected this month" value={formatMoney(metrics.revenue.collected_this_month)} hint="payments recorded" tone="good" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Receivables aging" subtitle="Outstanding balance by how long it has been due">
          <div className="space-y-2.5">
            {buckets.map((bucket) => {
              const value = Number(metrics.receivables[bucket.key] ?? 0);
              const share = Math.round((value / total) * 100);
              return (
                <div key={bucket.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">{bucket.label}</span>
                    <span className="font-mono text-[11.5px] text-[#E8EEF9]">{formatMoney(value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${bucket.key === "current" ? "bg-[#3DDC97]" : bucket.key === "d1_30" ? "bg-[#29E6FF]" : bucket.key === "d31_60" ? "bg-[#FFB020]" : "bg-[#FF6B6B]"}`}
                      style={{ width: `${Math.max(2, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#5F6F84]">
            Buckets follow the invoice due date: {humanise("d90_plus")} is anything past 90 days. Nothing here is a tax filing — VAT is
            recorded per document, not calculated for a return.
          </p>
        </Panel>

        <div className="space-y-3">
          <Panel title="Pipeline" subtitle="Quotes that have not converted yet">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Sent" value={String(metrics.quotes.sent)} hint={formatMoney(metrics.quotes.pipeline_value)} tone="accent" />
              <Stat label="Accepted" value={String(metrics.quotes.accepted)} hint={formatMoney(metrics.quotes.accepted_value)} tone="good" />
              <Stat label="Drafts" value={String(metrics.quotes.draft)} hint="internal only" tone="muted" />
              <Stat label="Win rate" value={`${metrics.quotes.win_rate}%`} hint={`${metrics.quotes.declined} declined`} tone={metrics.quotes.win_rate >= 50 ? "good" : "warn"} />
            </div>
          </Panel>

          <Panel title="Money guard" subtitle="What this console is allowed to do right now">
            <ul className="space-y-1.5">
              {FLAG_LABELS.map((entry) => {
                const enabled = Boolean(flags[entry.key]);
                return (
                  <li key={entry.key} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[12px] text-[#DCE6F5]">{entry.label}</span>
                      <span className="block text-[11px] text-[#8A99AB]">{entry.body}</span>
                    </span>
                    <Pill tone={enabled ? "good" : "warn"}>{enabled ? "on" : "off"}</Pill>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#5F6F84]">
              <Banknote size={12} className="mt-[2px] shrink-0" /> Payouts, VAT returns and card processing are deliberately out of scope for this
              release.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Exported for tests: the bucket a due date lands in. */
export { agingBucket };
