"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Banknote, Plus, RefreshCw, Send } from "lucide-react";
import {
  PAYMENT_METHODS,
  blankLine,
  cleanLines,
  documentTotals,
  formatMoney,
  invoiceSummaryOf,
  invoiceTone,
  moneyApi,
  moneyError,
  type ClientOrg,
  type DocumentLine,
  type InvoiceDetail,
  type InvoiceSummary,
  MONEY_FLAGS,
  type MoneyFlags,
  type PaymentMethod,
} from "@/lib/portal-money";
import { humanise } from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, Stat, TableShell, inputClass } from "@/components/portal/v2/ui";
import { LineEditor } from "@/components/portal/v3/line-editor";

type Site = { id: string; name: string; organization_id: string };
const METHODS: PaymentMethod[] = PAYMENT_METHODS;

const BLANK = {
  id: null as string | null,
  organization_id: "",
  site_id: "",
  title: "",
  vat_rate: 23,
  discount_pct: 0,
  reference: "",
  notes: "",
  lines: [blankLine()] as DocumentLine[],
};

/** R3 invoices: issue, chase, record payments, void. */
export function MoneyInvoices({
  canManage,
  canTakePayment,
  flags,
  clients,
  sites,
  onChanged,
}: {
  canManage: boolean;
  canTakePayment: boolean;
  flags: MoneyFlags;
  clients: ClientOrg[];
  sites: Site[];
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof BLANK | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [paying, setPaying] = useState<InvoiceSummary | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "bank_transfer" as PaymentMethod, reference: "", paid_on: "" });

  const sendEnabled = Boolean(flags[MONEY_FLAGS.sendInvoices]);
  const payEnabled = Boolean(flags[MONEY_FLAGS.recordPayments]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await moneyApi.listInvoices());
    } catch (caught) {
      setError(moneyError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => invoiceSummaryOf(rows), [rows]);
  const drafts = useMemo(() => rows.filter((row) => row.status === "draft").length, [rows]);

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNote("");
    try {
      await task();
      setNote(success);
      await load();
      onChanged();
      if (detail) setDetail(await moneyApi.getInvoice(detail.id));
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await moneyApi.getInvoice(id));
    } catch (caught) {
      setNote(moneyError(caught).message);
    }
  };

  const openEditor = (invoice?: InvoiceDetail) => {
    if (!invoice) {
      setForm({ ...BLANK, organization_id: clients[0]?.id ?? "", lines: [blankLine()] });
      return;
    }
    setForm({
      id: invoice.id,
      organization_id: invoice.organization_id,
      site_id: invoice.site_id ?? "",
      title: invoice.title,
      vat_rate: Number(invoice.vat_rate),
      discount_pct: Number(invoice.discount_pct),
      reference: invoice.reference,
      notes: invoice.notes,
      lines: invoice.lines.length > 0 ? invoice.lines : [blankLine()],
    });
  };

  const save = async () => {
    if (!form) return;
    const totals = documentTotals(form.lines, { vatRate: form.vat_rate, discountPct: form.discount_pct });
    if (cleanLines(form.lines).length === 0 || totals.total <= 0) {
      setNote("An invoice needs at least one line and a total above zero.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      await moneyApi.saveInvoice({
        p_id: form.id,
        p_organization_id: form.organization_id,
        p_site_id: form.site_id || null,
        p_title: form.title,
        p_vat_rate: form.vat_rate,
        p_discount_pct: form.discount_pct,
        p_reference: form.reference,
        p_notes: form.notes,
        p_lines: cleanLines(form.lines),
      });
      setNote(`Draft invoice saved for ${formatMoney(totals.total)}.`);
      setForm(null);
      await load();
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <Loading label="Loading invoices" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      {canManage && !sendEnabled && (
        <div className="rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#FFD48A]">
          Issuing is switched off. Invoices stay as drafts until an Admin enables <span className="font-mono">{MONEY_FLAGS.sendInvoices}</span> in
          Settings — no client ever receives an invoice by accident.
        </div>
      )}
      {canTakePayment && !payEnabled && (
        <div className="rounded-[10px] border border-[#FFB020]/25 bg-[#FFB020]/10 px-3 py-2 text-[11.5px] leading-relaxed text-[#FFD48A]">
          Recording payments is switched off (<span className="font-mono">{MONEY_FLAGS.recordPayments}</span>). Balances will show what was issued,
          not what was collected.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Outstanding" value={formatMoney(summary.outstanding)} hint={`${summary.openCount} open invoices`} tone="accent" />
        <Stat label="Overdue" value={formatMoney(summary.overdue)} hint="past due date" tone={summary.overdue > 0 ? "warn" : "muted"} />
        <Stat label="Collected" value={formatMoney(summary.paidThisSet)} hint="all payments recorded" tone="good" />
        <Stat label="Drafts" value={String(drafts)} hint="not yet issued" tone="muted" />
      </div>

      <Panel
        title="Invoices"
        subtitle="Issued documents are immutable — void instead of editing once a client has a copy"
        action={
          <div className="flex gap-2">
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => openEditor()} disabled={clients.length === 0}>
                <Plus size={13} /> New invoice
              </Button>
            )}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty
            title="No invoices yet"
            body="An accepted quote converts into an invoice here. Nothing is issued to a client while the invoice flag is off."
            action={
              canManage && clients.length > 0 ? (
                <Button variant="primary" onClick={() => openEditor()}>
                  <Plus size={13} /> Create a draft
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableShell head={["Number", "Client", "Total", "Balance", "Status", "Actions"]}>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <button type="button" onClick={() => void openDetail(row.id)} className="text-left">
                    <span className="block text-[12.5px] text-[#E8EEF9]">{row.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7E8CA0]">{row.number}</span>
                  </button>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top text-[12px] text-[#C7D3E3]">{row.client_name}</td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11.5px] text-[#E8EEF9]">
                  {formatMoney(row.total, row.currency)}
                  <div className="text-[9.5px] text-[#7E8CA0]">VAT {Number(row.vat_rate)}%</div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11.5px] text-[#E8EEF9]">
                  {formatMoney(row.balance, row.currency)}
                  <div className="text-[9.5px] text-[#7E8CA0]">paid {formatMoney(row.amount_paid, row.currency)}</div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <Pill tone={invoiceTone(row.status)}>{humanise(row.status)}</Pill>
                  {row.due_at && (
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5F6F84]">
                      due {new Date(row.due_at).toLocaleDateString("en-GB")}
                    </div>
                  )}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <div className="flex flex-wrap gap-1.5">
                    {canManage && row.status === "draft" && (
                      <Button onClick={() => void openDetail(row.id).then(() => undefined)}>Edit</Button>
                    )}
                    {canManage && row.status === "draft" && (
                      <Button
                        onClick={() => void run(() => moneyApi.sendInvoice(row.id), `${row.number} issued.`)}
                        disabled={busy || !sendEnabled}
                        title={sendEnabled ? "Issue this invoice" : "Enable money.send_invoices in Settings"}
                      >
                        <Send size={12} /> Issue
                      </Button>
                    )}
                    {canTakePayment && row.balance > 0 && row.status !== "draft" && row.status !== "void" && (
                      <Button
                        variant="primary"
                        disabled={!payEnabled}
                        title={payEnabled ? "Record a payment" : "Enable money.record_payments in Settings"}
                        onClick={() => {
                          setPayment({ amount: String(row.balance), method: "bank_transfer", reference: "", paid_on: "" });
                          setPaying(row);
                        }}
                      >
                        <Banknote size={12} /> Payment
                      </Button>
                    )}
                    {canManage && Number(row.amount_paid) === 0 && row.status !== "void" && (
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => void run(() => moneyApi.voidInvoice(row.id, "Voided in the portal"), `${row.number} voided.`)}
                      >
                        <Ban size={12} /> Void
                      </Button>
                    )}
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
          title={form.id ? "Edit draft invoice" : "New draft invoice"}
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
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Monthly retainer · November" />
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
            <Field label="Client reference" hint="PO number or cost centre">
              <input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} />
            </Field>
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
                {formatMoney(detail.total, detail.currency)} · paid {formatMoney(detail.amount_paid, detail.currency)} · balance{" "}
                {formatMoney(detail.balance, detail.currency)}
              </span>
              <div className="flex gap-2">
                {canManage && detail.status === "draft" && (
                  <Button variant="primary" onClick={() => { openEditor(detail); setDetail(null); }}>
                    Edit draft
                  </Button>
                )}
                {canTakePayment && detail.balance > 0 && detail.status !== "draft" && detail.status !== "void" && (
                  <Button
                    variant="primary"
                    disabled={!payEnabled}
                    onClick={() => {
                      setPayment({ amount: String(detail.balance), method: "bank_transfer", reference: "", paid_on: "" });
                      setPaying(detail);
                    }}
                  >
                    <Banknote size={12} /> Record payment
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={invoiceTone(detail.status)}>{humanise(detail.status)}</Pill>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#7E8CA0]">
                {detail.client_name} · issued {detail.issued_at ? new Date(detail.issued_at).toLocaleDateString("en-GB") : "—"} · due{" "}
                {detail.due_at ? new Date(detail.due_at).toLocaleDateString("en-GB") : "—"}
              </span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {detail.lines.map((line, index) => (
                <li key={line.id ?? index} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0">
                    <span className="block text-[12px] text-[#DCE6F5]">{line.description}</span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
                      {line.quantity} {line.unit} × {formatMoney(line.unit_price, detail.currency)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-[#E8EEF9]">{formatMoney(Number(line.line_total ?? 0), detail.currency)}</span>
                </li>
              ))}
            </ul>
            <div>
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">Payments</span>
              {detail.payments.length === 0 ? (
                <p className="text-[11.5px] text-[#8A99AB]">Nothing recorded against this invoice.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {detail.payments.map((entry) => (
                    <li key={entry.id} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span>
                        <span className="block font-mono text-[11.5px] text-[#DCE6F5]">{formatMoney(entry.amount, detail.currency)}</span>
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
                          {humanise(entry.method)} · {new Date(entry.received_at).toLocaleDateString("en-GB")}
                          {entry.reference ? ` · ${entry.reference}` : ""}
                        </span>
                      </span>
                      {canTakePayment && (
                        <button
                          type="button"
                          className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#7E8CA0] hover:text-[#FFB4B4]"
                          onClick={() => void run(() => moneyApi.deletePayment(entry.id), "Payment removed.")}
                          disabled={busy || !payEnabled}
                        >
                          remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {detail.notes && <p className="text-[11.5px] leading-relaxed text-[#8A99AB]">{detail.notes}</p>}
          </div>
        </Modal>
      )}

      {paying && (
        <Modal
          title={`Record payment · ${paying.number}`}
          onClose={() => setPaying(null)}
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">
                balance {formatMoney(paying.balance, paying.currency)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setPaying(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  disabled={busy || Number(payment.amount) <= 0}
                  onClick={() => {
                    void run(
                      () =>
                        moneyApi.recordPayment({
                          invoiceId: paying.id,
                          amount: Number(payment.amount),
                          method: payment.method,
                          reference: payment.reference,
                          receivedAt: payment.paid_on || undefined,
                        }),
                      `Recorded ${formatMoney(Number(payment.amount), paying.currency)} against ${paying.number}.`,
                    );
                    setPaying(null);
                  }}
                >
                  Record
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount" hint="Cannot exceed the outstanding balance">
              <input value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="Method">
              <select
                value={payment.method}
                onChange={(event) => setPayment({ ...payment, method: event.target.value as PaymentMethod })}
                className={inputClass}
              >
                {METHODS.map((method) => (
                  <option key={method} value={method}>
                    {humanise(method)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reference">
              <input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} className={inputClass} placeholder="Bank ref / cheque no." />
            </Field>
            <Field label="Paid on" hint="Leave blank for today">
              <input type="date" value={payment.paid_on} onChange={(event) => setPayment({ ...payment, paid_on: event.target.value })} className={inputClass} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
