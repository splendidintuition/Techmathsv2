"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  FileText,
  ReceiptText,
  RefreshCw,
  Wrench,
} from "lucide-react";
import {
  agreementCopy,
  attentionItems,
  billingTotals,
  contractKindCopy,
  clientApi,
  clientError,
  clientStatusLabel,
  clientStatusTone,
  money,
  shortDate,
  visitCopy,
  type ClientContract,
  type ClientHome,
  type ClientInvoice,
  type ClientQuote,
  type ClientSite,
  type ClientTicket,
} from "@/lib/portal-client";
import { Button, Empty, ErrorNote, Loading, Panel, Pill, Stat } from "@/components/portal/v2/ui";
import { ClientQuotes } from "@/components/portal/v6/client-quotes";
import { ClientInvoices } from "@/components/portal/v6/client-invoices";
import { ClientTickets } from "@/components/portal/v6/client-tickets";
import { ClientSites } from "@/components/portal/v6/client-sites";

type Tab = "overview" | "quotes" | "invoices" | "requests" | "sites";

const TAB_LABELS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "quotes", label: "Quotes" },
  { key: "invoices", label: "Invoices" },
  { key: "requests", label: "Requests" },
  { key: "sites", label: "Sites" },
];

/**
 * R6 client workspace. Everything here is scoped to the signed-in client's own organisation by the
 * database — the UI cannot widen it, and there is no internal vocabulary or internal note on screen.
 */
export function ClientRoom() {
  const [home, setHome] = useState<ClientHome | null>(null);
  const [quotes, setQuotes] = useState<ClientQuote[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [homePayload, quoteRows, invoiceRows, ticketRows, siteRows, contractRows] = await Promise.all([
        clientApi.home(),
        clientApi.quotes(),
        clientApi.invoices(),
        clientApi.tickets(),
        clientApi.sites(),
        clientApi.contracts(),
      ]);
      setHome(homePayload);
      setQuotes(quoteRows ?? []);
      setInvoices(invoiceRows ?? []);
      setTickets(ticketRows ?? []);
      setSites(siteRows ?? []);
      setContracts(contractRows ?? []);
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = home?.organization.currency ?? "EUR";
  const stats = home?.stats;
  const totals = useMemo(() => billingTotals(invoices), [invoices]);
  const attention = useMemo(() => (stats ? attentionItems(stats) : []), [stats]);
  const openTickets = tickets.filter((ticket) => !["closed", "cancelled", "rejected"].includes(ticket.status));

  if (loading) {
    return (
      <Panel title="Your workspace">
        <Loading label="Loading your account" />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Your workspace">
        <ErrorNote message={error} onRetry={load} />
        <p className="mt-2 text-[11px] text-[#8A99AB]">
          If this keeps happening, your login may not be attached to a client account yet. Ask your TechMaths
          contact to check the organisation membership.
        </p>
      </Panel>
    );
  }

  if (!home || !stats) return null;

  const counts: Record<Tab, number> = {
    overview: 0,
    quotes: stats.quotes_awaiting,
    invoices: stats.invoices_open,
    requests: openTickets.length,
    sites: sites.length,
  };

  return (
    <div className="space-y-4">
      {/* Account banner */}
      <div className="rounded-[16px] border border-white/[0.08] bg-[#080D14]/85 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[#6E7A8F]">
              <Building2 size={12} className="text-[#29E6FF]" /> client workspace
            </div>
            <h2 className="mt-1.5 font-display text-[22px] font-light tracking-[-0.02em] text-[#E8EEF9]">
              {home.organization.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8A99AB]">
              <span>{home.organization.country_code?.toUpperCase() ?? "—"}</span>
              {home.organization.vat_number && <span>VAT {home.organization.vat_number}</span>}
              {home.organization.billing_email && <span>{home.organization.billing_email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={stats.overdue > 0 ? "danger" : "good"}>
              {stats.overdue > 0 ? "invoice overdue" : "account in good standing"}
            </Pill>
            <Button onClick={() => void load()}>
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open requests" value={String(stats.open_tickets)} hint={visitCopy(stats.next_visit_at)} tone="accent" />
          <Stat
            label="Quotes to approve"
            value={String(stats.quotes_awaiting)}
            hint={stats.quotes_awaiting > 0 ? "Waiting on your decision" : "Nothing pending"}
            tone={stats.quotes_awaiting > 0 ? "warn" : "muted"}
          />
          <Stat
            label="Outstanding"
            value={money(totals.outstanding || stats.outstanding, currency)}
            hint={`${stats.invoices_open} open invoice${stats.invoices_open === 1 ? "" : "s"}`}
            tone={stats.overdue > 0 ? "danger" : "muted"}
          />
          <Stat label="Paid this year" value={money(stats.paid_this_year, currency)} hint="Settled receipts" tone="good" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
              tab === key
                ? "border-[#29E6FF]/30 bg-[#29E6FF]/[0.09] text-[#9DF3FF]"
                : "border-white/10 bg-white/[0.02] text-[#8A99AB] hover:text-white"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className="rounded-full bg-white/[0.09] px-1.5 py-[1px] font-mono text-[9px] text-[#DCE6F5]">
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          <Panel title="Needs your attention" subtitle="Decisions and sign-offs that unblock us.">
            {attention.length === 0 ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-[#3DDC97]/20 bg-[#3DDC97]/[0.06] px-3 py-3 text-[12px] text-[#A8F0CB]">
                <Wrench size={14} /> Nothing is waiting on you. We will email you when something needs a decision.
              </div>
            ) : (
              <div className="space-y-2">
                {attention.map((item) => (
                  <button
                    key={item.key}
                    onClick={() =>
                      setTab(item.key === "quotes" ? "quotes" : item.key === "overdue" ? "invoices" : "requests")
                    }
                    className="flex w-full items-center gap-3 rounded-[10px] border border-white/[0.07] bg-white/[0.015] px-3 py-2.5 text-left transition hover:border-[#29E6FF]/30 hover:bg-[#29E6FF]/[0.04]"
                  >
                    <CircleAlert
                      size={15}
                      className={item.tone === "danger" ? "text-[#FF6B6B]" : item.tone === "warn" ? "text-[#FFB020]" : "text-[#29E6FF]"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-[#E8EEF9]">{item.label}</div>
                      <div className="text-[10.5px] text-[#8A99AB]">{item.hint}</div>
                    </div>
                    <span className="font-mono text-[13px] text-[#E8EEF9]">{item.count}</span>
                    <ArrowUpRight size={13} className="text-[#6E7A8F]" />
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent activity" subtitle="The last few things that moved.">
            {tickets.length === 0 && quotes.length === 0 ? (
              <Empty title="Nothing yet" body="Requests, quotes and invoices all show up here as soon as they exist." />
            ) : (
              <ul className="space-y-2">
                {tickets.slice(0, 3).map((ticket) => (
                  <li key={ticket.id} className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] text-[#6E7A8F]">#{ticket.ticket_number}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-[#DCE6F5]">{ticket.title}</span>
                    <Pill tone={clientStatusTone(ticket.status)}>{clientStatusLabel(ticket.status)}</Pill>
                  </li>
                ))}
                {quotes.slice(0, 2).map((quote) => (
                  <li key={quote.id} className="flex items-center gap-2.5">
                    <FileText size={13} className="text-[#29E6FF]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-[#DCE6F5]">{quote.title}</span>
                    <span className="text-[11px] text-[#8A99AB]">{money(quote.total, quote.currency)}</span>
                  </li>
                ))}
                {invoices.slice(0, 2).map((invoice) => (
                  <li key={invoice.id} className="flex items-center gap-2.5">
                    <ReceiptText size={13} className="text-[#29E6FF]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-[#DCE6F5]">{invoice.number}</span>
                    <span className="text-[11px] text-[#8A99AB]">
                      {invoice.status === "paid" ? "paid" : `${money(invoice.balance, invoice.currency)} open`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {contracts.length > 0 && (
            <div className="lg:col-span-2">
              <Panel title="Your agreement" subtitle="What we have promised you, and how much of it is left.">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {contracts.map((contract) => {
                    const remaining = Number(contract.usage.bundle_remaining || 0);
                    const includedRemaining = Number(contract.usage.included_remaining || 0);
                    const compliance = contract.usage.sla_compliance_pct;
                    return (
                      <div key={contract.id} className="rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone="accent">{contractKindCopy(contract.kind)}</Pill>
                          <Pill tone={contract.status === "active" ? "good" : "warn"}>{contract.status}</Pill>
                          {compliance !== null && compliance !== undefined && (
                            <Pill tone={Number(compliance) >= 95 ? "good" : Number(compliance) >= 85 ? "warn" : "danger"}>
                              {Number(compliance)}% on time
                            </Pill>
                          )}
                        </div>
                        <div className="mt-1.5 text-[12.5px] font-medium text-[#E8EEF9]">{contract.name}</div>
                        <div className="mt-0.5 text-[11px] text-[#8A99AB]">{agreementCopy(contract)}</div>
                        <div className="mt-2 grid gap-1 text-[10.5px] text-[#8A99AB]">
                          {contract.kind === "retainer" && (
                            <span>
                              {includedRemaining.toFixed(1)} h included left this month · {contract.ends_on ? `renews until ${shortDate(contract.ends_on)}` : "open ended"}
                            </span>
                          )}
                          {contract.kind === "prepaid_bundle" && (
                            <span>
                              {remaining.toFixed(1)} h left of {Number(contract.bundle_hours)} h prepaid
                            </span>
                          )}
                          {contract.kind !== "retainer" && contract.kind !== "prepaid_bundle" && (
                            <span>{contract.ends_on ? `In force until ${shortDate(contract.ends_on)}` : "Open ended"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}

      {tab === "quotes" && <ClientQuotes quotes={quotes} currency={currency} onChanged={load} />}
      {tab === "invoices" && <ClientInvoices invoices={invoices} currency={currency} />}
      {tab === "requests" && (
        <ClientTickets tickets={tickets} onChanged={load} />
      )}
      {tab === "sites" && <ClientSites sites={sites} />}
    </div>
  );
}
