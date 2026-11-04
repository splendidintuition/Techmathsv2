"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, RefreshCw, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  blankLine,
  cleanLines,
  documentTotals,
  formatMoney,
  moneyApi,
  moneyError,
  quoteSummaryOf,
  quoteTone,
  type ClientOrg,
  type DocumentLine,
  type MoneyFlags,
  type QuoteDetail,
  type QuoteSummary,
} from "@/lib/portal-money";
import { MONEY_FLAGS } from "@/lib/portal-money";
import { humanise } from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, Stat, TableShell, inputClass } from "@/components/portal/v2/ui";
import { LineEditor } from "@/components/portal/v3/line-editor";

type Site = { id: string; name: string; organization_id: string };

const BLANK = {
  id: null as string | null,
  organization_id: "",
  site_id: "",
  title: "",
  vat_rate: 23,
  discount_pct: 0,
  valid_until: "",
  notes: "",
  terms: "",
  lines: [blankLine()] as DocumentLine[],
};

/** R3 quotes: draft → send → client decision → invoice. */
export function MoneyQuotes({
  canManage,
  flags,
  clients,
  sites,
  onChanged,
}: {
  canManage: boolean;
  flags: MoneyFlags;
  clients: ClientOrg[];
  sites: Site[];
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof BLANK | null>(null);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [declining, setDeclining] = useState<QuoteSummary | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [accepting, setAccepting] = useState<QuoteSummary | null>(null);
  const [acceptName, setAcceptName] = useState("");

  const sendEnabled = Boolean(flags[MONEY_FLAGS.sendQuotes]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await moneyApi.listQuotes());
    } catch (caught) {
      setError(moneyError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => quoteSummaryOf(rows), [rows]);

  const openEditor = (quote?: QuoteDetail) => {
    if (!quote) {
      setForm({ ...BLANK, organization_id: clients[0]?.id ?? "", lines: [blankLine()] });
      return;
    }
    setForm({
      id: quote.id,
      organization_id: quote.organization_id,
      site_id: quote.site_id ?? "",
      title: quote.title,
      vat_rate: Number(quote.vat_rate),
      discount_pct: Number(quote.discount_pct),
      valid_until: quote.valid_until ?? "",
      notes: quote.notes,
      terms: quote.terms,
      lines: quote.lines.length > 0 ? quote.lines : [blankLine()],
    });
  };

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNote("");
    try {
      await task();
      setNote(success);
      await load();
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!form) return;
    const totals = documentTotals(form.lines, { vatRate: form.vat_rate, discountPct: form.discount_pct });
    if (cleanLines(form.lines).length === 0) {
      setNote("Add at least one line before saving.");
      return;
    }
    if (totals.total <= 0) {
      setNote("The quote total must be greater than zero.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      await moneyApi.saveQuote({
        p_id: form.id,
        p_organization_id: form.organization_id,
        p_site_id: form.site_id || null,
        p_title: form.title,
        p_vat_rate: form.vat_rate,
        p_discount_pct: form.discount_pct,
        p_valid_until: form.valid_until || null,
        p_notes: form.notes,
        p_terms: form.terms,
        p_lines: cleanLines(form.lines),
      });
      setNote(`Saved ${formatMoney(totals.total)} quote.`);
      setForm(null);
      await load();
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await moneyApi.getQuote(id));
    } catch (caught) {
      setNote(moneyError(caught).message);
    }
  };

  if (loading && rows.length === 0) return <Loading label="Loading quotes" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      {!sendEnabled && canManage && (
        <div className="rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#FFD48A]">
          Sending is switched off. Drafts can be built and reviewed; nothing leaves the building until an Admin enables{" "}
          <span className="font-mono">money.send_quotes</span> under Settings.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Awaiting client" value={String(summary.open)} hint="quotes sent, no answer yet" tone="accent" />
        <Stat label="Accepted" value={String(summary.accepted)} hint="ready to invoice" tone="good" />
        <Stat label="Pipeline" value={formatMoney(summary.pipeline)} hint="value of quotes out with clients" tone="muted" />
        <Stat label="Win rate" value={`${summary.winRate}%`} hint="decided quotes" tone={summary.winRate >= 50 ? "good" : "warn"} />
      </div>

      <Panel
        title="Quotes"
        subtitle="Every quote carries the VAT rate, discount and line detail the client agreed to"
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => openEditor()} disabled={clients.length === 0}>
                <Plus size={13} /> New quote
              </Button>
            )}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty
            title="No quotes yet"
            body="A quote is the first money document: it fixes the scope, the rate and the VAT treatment before anybody is dispatched."
            action={
              canManage && clients.length > 0 ? (
                <Button variant="primary" onClick={() => openEditor()}>
                  <Plus size={13} /> Raise the first quote
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableShell head={["Number", "Client", "Total", "Status", "Valid until", "Actions"]}>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <button type="button" onClick={() => void openDetail(row.id)} className="text-left">
                    <span className="block text-[12.5px] text-[#E8EEF9]">{row.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7E8CA0]">{row.number}</span>
                  </button>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <div className="text-[12px] text-[#C7D3E3]">{row.client_name}</div>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">{row.site_name ?? "no site"}</div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11.5px] text-[#E8EEF9]">
                  {formatMoney(row.total, row.currency)}
                  <div className="text-[9.5px] text-[#7E8CA0]">incl. {Number(row.vat_rate)}% VAT</div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <Pill tone={quoteTone(row.status)}>{humanise(row.status)}</Pill>
                  {row.accepted_by_name && (
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5F6F84]">{row.accepted_by_name}</div>
                  )}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[10px] uppercase tracking-[0.1em] text-[#9AA9BC]">
                  {row.valid_until ? new Date(row.valid_until).toLocaleDateString("en-GB") : "—"}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <div className="flex flex-wrap gap-1.5">
                    {canManage && row.status === "draft" && (
                      <Button
                        title="Edit draft"
                        onClick={() =>
                          void moneyApi
                            .getQuote(row.id)
                            .then(openEditor)
                            .catch((caught) => setNote(moneyError(caught).message))
                        }
                      >
                        Edit
                      </Button>
                    )}
                    {canManage && row.status === "draft" && (
                      <Button
                        onClick={() => void run(() => moneyApi.sendQuote(row.id), `${row.number} marked as sent.`)}
                        disabled={busy || !sendEnabled}
                        title={sendEnabled ? "Mark as sent to the client" : "Enable money.send_quotes in Settings"}
                      >
                        <Send size={12} /> Send
                      </Button>
                    )}
                    {row.status === "sent" && (
                      <>
                        <Button
                          onClick={() => {
                            setAcceptName("");
                            setAccepting(row);
                          }}
                          disabled={busy}
                        >
                          <ThumbsUp size={12} /> Accept
                        </Button>
                        <Button variant="danger" onClick={() => setDeclining(row)} disabled={busy}>
                          <ThumbsDown size={12} /> Decline
                        </Button>
                      </>
                    )}
                    {canManage && row.status === "accepted" && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          void run(() => moneyApi.quoteToInvoice(row.id), `${row.number} converted to a draft invoice.`)
                        }
                        disabled={busy}
                      >
                        <FileText size={12} /> To invoice
                      </Button>
                    )}
                    {row.status === "converted" && <Pill tone="good">invoiced</Pill>}
                  </div>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
      </Panel>

      {form && (
        <Modal
          title={form.id ? "Edit draft quote" : "New quote"}
          onClose={() => setForm(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">
                total {formatMoney(documentTotals(form.lines, { vatRate: form.vat_rate, discountPct: form.discount_pct }).total)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setForm(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => void save()} disabled={busy || !form.title.trim()}>
                  {form.id ? "Save changes" : "Create draft"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title">
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Rack and stack 10U with cabling" />
              </Field>
            </div>
            <Field label="Client">
              <select
                value={form.organization_id}
                onChange={(event) => setForm({ ...form, organization_id: event.target.value, site_id: "" })}
                className={inputClass}
                disabled={Boolean(form.id)}
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Site">
              <select value={form.site_id} onChange={(event) => setForm({ ...form, site_id: event.target.value })} className={inputClass}>
                <option value="">No site</option>
                {sites
                  .filter((site) => !form.organization_id || site.organization_id === form.organization_id)
                  .map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="VAT %">
              <input value={form.vat_rate} onChange={(event) => setForm({ ...form, vat_rate: Number(event.target.value) })} inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="Discount %">
              <input value={form.discount_pct} onChange={(event) => setForm({ ...form, discount_pct: Number(event.target.value) })} inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="Valid until">
              <input type="date" value={form.valid_until} onChange={(event) => setForm({ ...form, valid_until: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Terms">
                <textarea value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} rows={2} className={inputClass} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Lines</span>
              <LineEditor lines={form.lines} currency="EUR" onChange={(lines) => setForm({ ...form, lines })} />
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <Modal
          title={`${detail.number} · ${detail.title}`}
          onClose={() => setDetail(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">
                {formatMoney(detail.subtotal, detail.currency)} + {formatMoney(detail.vat_total, detail.currency)} VAT ={" "}
                {formatMoney(detail.total, detail.currency)}
              </span>
              {canManage && detail.status === "draft" && (
                <Button variant="primary" onClick={() => { openEditor(detail); setDetail(null); }}>
                  Edit draft
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={quoteTone(detail.status)}>{humanise(detail.status)}</Pill>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7E8CA0]">
                {detail.client_name} · VAT {Number(detail.vat_rate)}% · valid{" "}
                {detail.valid_until ? new Date(detail.valid_until).toLocaleDateString("en-GB") : "—"}
              </span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {detail.lines.map((line, index) => (
                <li key={line.id ?? index} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0">
                    <span className="block text-[12px] text-[#DCE6F5]">{line.description}</span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
                      {line.quantity} {line.unit} × {formatMoney(line.unit_price, detail.currency)} · {line.category}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-[#E8EEF9]">
                    {formatMoney(Number(line.line_total ?? 0), detail.currency)}
                  </span>
                </li>
              ))}
            </ul>
            {Number(detail.discount_pct) > 0 && (
              <p className="text-[11px] text-[#FFD48A]">Discount {Number(detail.discount_pct)}% applied to the subtotal.</p>
            )}
            {detail.notes && <p className="text-[11.5px] leading-relaxed text-[#8A99AB]">{detail.notes}</p>}
            {detail.terms && <p className="text-[11px] leading-relaxed text-[#5F6F84]">{detail.terms}</p>}
            {detail.declined_reason && <p className="text-[11px] text-[#FFB4B4]">Declined: {detail.declined_reason}</p>}
          </div>
        </Modal>
      )}

      {accepting && (
        <Modal
          title={`Accept ${accepting.number}`}
          onClose={() => setAccepting(null)}
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">
                {formatMoney(accepting.total, accepting.currency)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setAccepting(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => {
                    void run(
                      () => moneyApi.respondQuote(accepting.id, true, acceptName || undefined),
                      `${accepting.number} accepted. You can invoice it now.`,
                    );
                    setAccepting(null);
                  }}
                >
                  Record acceptance
                </Button>
              </div>
            </div>
          }
        >
          <Field label="Who accepted it" hint="The client contact who gave the go-ahead. Leave blank to record your own name.">
            <input value={acceptName} onChange={(event) => setAcceptName(event.target.value)} className={inputClass} placeholder="Ana Ferreira, Northwind" />
          </Field>
        </Modal>
      )}

      {declining && (
        <Modal
          title={`Decline ${declining.number}`}
          onClose={() => setDeclining(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeclining(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  void run(() => moneyApi.respondQuote(declining.id, false, undefined, declineReason), `${declining.number} declined.`);
                  setDeclining(null);
                  setDeclineReason("");
                }}
              >
                Record decline
              </Button>
            </div>
          }
        >
          <Field label="Reason" hint="Stored on the quote and in the audit log">
            <input value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} className={inputClass} placeholder="Budget deferred to Q1" />
          </Field>
        </Modal>
      )}
    </div>
  );
}
