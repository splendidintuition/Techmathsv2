"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, Receipt, RefreshCw, Send, Trash2, X } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  expenseGross,
  expenseSummaryOf,
  expenseTone,
  expenseVat,
  formatMoney,
  moneyApi,
  moneyError,
  type ClientOrg,
  type ExpenseCategory,
  type ExpenseMetrics,
  type ExpenseRow,
  type ExpenseStatus,
} from "@/lib/portal-money";
import { controlReads, humanise } from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Field, Loading, Modal, Panel, Pill, Stat, TableShell, inputClass } from "@/components/portal/v2/ui";

type Site = { id: string; name: string; organization_id: string };
type TicketOption = { id: string; ticket_number: number; title: string; client_org_id: string };

const BLANK = {
  id: null as string | null,
  organization_id: "",
  site_id: "",
  ticket_id: "",
  spent_on: new Date().toISOString().slice(0, 10),
  category: "travel" as ExpenseCategory,
  vendor: "",
  description: "",
  currency: "EUR",
  amount_net: 0,
  vat_rate: 23,
  reimbursable: false,
  receipt_url: "",
  notes: "",
  status: "draft" as ExpenseStatus,
};

/** R3.1 expenses: log a cost, submit it, have it approved. No payouts. */
export function MoneyExpenses({
  canLog,
  canApprove,
  clients,
  sites,
  onChanged,
}: {
  canLog: boolean;
  canApprove: boolean;
  clients: ClientOrg[];
  sites: Site[];
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [metrics, setMetrics] = useState<ExpenseMetrics | null>(null);
  const [tickets, setTickets] = useState<TicketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"" | ExpenseStatus>("");
  const [form, setForm] = useState<typeof BLANK | null>(null);
  const [reviewing, setReviewing] = useState<{ row: ExpenseRow; approve: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await moneyApi.listExpenses());
      setMetrics(await moneyApi.expenseMetrics());
    } catch (caught) {
      setError(moneyError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    controlReads
      .tickets()
      .then((list) => {
        if (!cancelled) {
          setTickets(
            list.map((ticket) => ({
              id: ticket.id,
              ticket_number: ticket.ticket_number,
              title: ticket.title,
              client_org_id: ticket.client_org_id,
            })),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => (filter ? rows.filter((row) => row.status === filter) : rows), [rows, filter]);
  const summary = useMemo(() => expenseSummaryOf(rows), [rows]);

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

  const openEditor = (row?: ExpenseRow) => {
    if (!row) {
      setForm({ ...BLANK, organization_id: clients[0]?.id ?? "" });
      return;
    }
    setForm({
      id: row.id,
      organization_id: row.organization_id ?? "",
      site_id: row.site_id ?? "",
      ticket_id: row.ticket_id ?? "",
      spent_on: row.spent_on,
      category: row.category,
      vendor: row.vendor,
      description: row.description,
      currency: row.currency,
      amount_net: Number(row.amount_net),
      vat_rate: Number(row.vat_rate),
      reimbursable: row.reimbursable,
      receipt_url: row.receipt_url,
      notes: row.notes,
      status: row.status,
    });
  };

  const save = async () => {
    if (!form) return;
    if (Number(form.amount_net) <= 0) {
      setNote("Enter the amount before saving.");
      return;
    }
    if (!form.description.trim() && !form.vendor.trim()) {
      setNote("Say what the money was spent on.");
      return;
    }
    if (form.reimbursable && !form.receipt_url.trim()) {
      setNote("A reimbursable claim needs a receipt link before it can be saved.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      await moneyApi.saveExpense({
        p_id: form.id,
        p_organization_id: form.organization_id || null,
        p_site_id: form.site_id || null,
        p_ticket_id: form.ticket_id || null,
        p_spent_on: form.spent_on || null,
        p_category: form.category,
        p_vendor: form.vendor,
        p_description: form.description,
        p_currency: form.currency || "EUR",
        p_amount_net: Number(form.amount_net),
        p_vat_rate: Number(form.vat_rate),
        p_reimbursable: form.reimbursable,
        p_receipt_url: form.receipt_url,
        p_notes: form.notes,
      });
      setNote("Expense saved as a draft.");
      setForm(null);
      await load();
      onChanged();
    } catch (caught) {
      setNote(moneyError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows.length === 0) return <Loading label="Loading expenses" />;

  const totals = form ? { vat: expenseVat(form.amount_net, form.vat_rate), gross: expenseGross(form.amount_net, form.vat_rate) } : null;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Awaiting approval"
          value={formatMoney(summary.awaiting)}
          hint={`${summary.awaitingCount} claim${summary.awaitingCount === 1 ? "" : "s"} submitted`}
          tone={summary.awaitingCount > 0 ? "warn" : "muted"}
        />
        <Stat label="Approved this month" value={formatMoney(summary.month)} hint="gross, by spend date" tone="accent" />
        <Stat label="Approved overall" value={formatMoney(summary.approved)} hint="every approved cost" tone="good" />
        <Stat
          label="Owed to people"
          value={formatMoney(summary.reimbursable)}
          hint="approved claims paid personally"
          tone={summary.reimbursable > 0 ? "warn" : "muted"}
        />
      </div>

      {metrics && (metrics.approved_ytd > 0 || metrics.vat_reclaimable > 0) && (
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11.5px] leading-relaxed text-[#8A99AB]">
          Year to date: {formatMoney(metrics.approved_ytd)} of approved expenses, of which{" "}
          {formatMoney(metrics.vat_reclaimable)} is VAT. That number is a bookkeeping aid, not a VAT return — your accountant still decides what is
          recoverable.
        </div>
      )}

      <Panel
        title="Expenses"
        subtitle="Costs against a client, site or ticket. Nothing here pays anybody — it records what was spent."
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as "" | ExpenseStatus)}
              className={`${inputClass} w-auto py-[6px] text-[12px]`}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {EXPENSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {humanise(status)}
                </option>
              ))}
            </select>
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {canLog && (
              <Button variant="primary" onClick={() => openEditor()}>
                <Plus size={13} /> Log expense
              </Button>
            )}
          </div>
        }
      >
        {visible.length === 0 ? (
          <Empty
            title={rows.length === 0 ? "No expenses yet" : "Nothing in that status"}
            body={
              rows.length === 0
                ? "Log travel, parts and subcontract costs as they happen. Submit the claim, then an admin approves or rejects it."
                : "Switch the status filter to see the rest of the ledger."
            }
            action={
              canLog && rows.length === 0 ? (
                <Button variant="primary" onClick={() => openEditor()}>
                  <Plus size={13} /> Log the first expense
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableShell head={["Spent on", "What", "Against", "Net", "VAT", "Gross", "Status", "Actions"]}>
            {visible.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#9AA9BC]">
                  {new Date(`${row.spent_on}T00:00:00`).toLocaleDateString("en-GB")}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <span className="block text-[12.5px] text-[#E8EEF9]">{row.description || row.vendor || "—"}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
                    {humanise(row.category)}
                    {row.vendor && row.description ? ` · ${row.vendor}` : ""}
                    {row.reimbursable ? " · reimbursable" : ""}
                    {row.is_demo ? " · demo" : ""}
                  </span>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <span className="block text-[12px] text-[#C7D3E3]">{row.client_name ?? "internal"}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#5F6F84]">
                    {row.site_name ?? "no site"}
                    {row.ticket_number ? ` · T-${row.ticket_number}` : ""}
                  </span>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11px] text-[#C7D3E3]">
                  {formatMoney(row.amount_net, row.currency)}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11px] text-[#8A99AB]">
                  {formatMoney(row.vat_amount, row.currency)}
                  <div className="text-[9.5px] text-[#5F6F84]">{Number(row.vat_rate)}%</div>
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top font-mono text-[11.5px] text-[#E8EEF9]">
                  {formatMoney(row.amount_gross, row.currency)}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <Pill tone={expenseTone(row.status)}>{humanise(row.status)}</Pill>
                  {row.reviewed_by_name && !row.is_demo && (
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5F6F84]">{row.reviewed_by_name}</div>
                  )}
                  {row.review_note && <div className="mt-1 max-w-[22ch] truncate text-[10px] text-[#8A99AB]" title={row.review_note}>{row.review_note}</div>}
                </td>
                <td className="border-b border-white/[0.06] px-3 py-2.5 align-top">
                  <div className="flex flex-wrap gap-1.5">
                    {(row.status === "draft" || row.status === "rejected") && canLog && (
                      <Button onClick={() => openEditor(row)} title="Edit this expense">
                        Edit
                      </Button>
                    )}
                    {row.status === "draft" && canLog && (
                      <>
                        <Button
                          disabled={busy}
                          onClick={() => void run(() => moneyApi.submitExpense(row.id), "Submitted for approval.")}
                          title="Submit for approval"
                        >
                          <Send size={12} /> Submit
                        </Button>
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => void run(() => moneyApi.deleteExpense(row.id), "Draft deleted.")}
                          title="Delete this draft"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </>
                    )}
                    {row.status === "submitted" && canApprove && (
                      <>
                        <Button
                          disabled={busy}
                          onClick={() => {
                            setReviewNote("");
                            setReviewing({ row, approve: true });
                          }}
                        >
                          <Check size={12} /> Approve
                        </Button>
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => {
                            setReviewNote("");
                            setReviewing({ row, approve: false });
                          }}
                        >
                          <X size={12} /> Reject
                        </Button>
                      </>
                    )}
                    {row.receipt_url && (
                      <a
                        href={row.receipt_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-[6px] text-[11px] text-[#9AA9BC] hover:border-white/25"
                        title="Open the receipt"
                      >
                        <Receipt size={12} /> Receipt
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </TableShell>
        )}
        {note && <div className="mt-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
      </Panel>

      {form && totals && (
        <Modal
          title={form.id ? "Edit expense" : "Log expense"}
          onClose={() => setForm(null)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">
                net {formatMoney(form.amount_net, form.currency)} + VAT {formatMoney(totals.vat, form.currency)} ={" "}
                {formatMoney(totals.gross, form.currency)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setForm(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => void save()} disabled={busy}>
                  Save draft
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Spent on">
              <input type="date" value={form.spent_on} onChange={(event) => setForm({ ...form, spent_on: event.target.value })} className={inputClass} />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}
                className={inputClass}
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {humanise(category)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="What was it for">
                <input
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className={inputClass}
                  placeholder="Return train Lisbon → Porto for the rack build"
                />
              </Field>
            </div>
            <Field label="Vendor">
              <input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} className={inputClass} placeholder="CP Comboios" />
            </Field>
            <Field label="Currency">
              <input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} className={inputClass} />
            </Field>
            <Field label="Net amount" hint="Before VAT">
              <input
                value={form.amount_net}
                onChange={(event) => setForm({ ...form, amount_net: Number(event.target.value) })}
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
            <Field label="VAT %" hint="0 for out-of-scope receipts">
              <input
                value={form.vat_rate}
                onChange={(event) => setForm({ ...form, vat_rate: Number(event.target.value) })}
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
            <Field label="Client" hint="Optional — leave blank for internal spend">
              <select
                value={form.organization_id}
                onChange={(event) => setForm({ ...form, organization_id: event.target.value, site_id: "", ticket_id: "" })}
                className={inputClass}
              >
                <option value="">Internal</option>
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
            <Field label="Ticket" hint="Optional link to the job it belongs to">
              <select value={form.ticket_id} onChange={(event) => setForm({ ...form, ticket_id: event.target.value })} className={inputClass}>
                <option value="">No ticket</option>
                {tickets
                  .filter((ticket) => !form.organization_id || ticket.client_org_id === form.organization_id)
                  .slice(0, 40)
                  .map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      T-{ticket.ticket_number} · {ticket.title}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Receipt link" hint={form.reimbursable ? "Required for reimbursable claims" : "Optional"}>
              <input
                value={form.receipt_url}
                onChange={(event) => setForm({ ...form, receipt_url: event.target.value })}
                className={inputClass}
                placeholder="https://…"
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-[12px] text-[#C7D3E3]">
              <input
                type="checkbox"
                checked={form.reimbursable}
                onChange={(event) => setForm({ ...form, reimbursable: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-[#0B1119]"
              />
              Somebody paid this personally
            </label>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={inputClass} />
              </Field>
            </div>
            {form.id && form.status === "rejected" && (
              <p className="sm:col-span-2 text-[11px] leading-relaxed text-[#FFD48A]">
                This claim was rejected. Saving it puts it back to draft so it can be submitted again.
              </p>
            )}
          </div>
        </Modal>
      )}

      {reviewing && (
        <Modal
          title={`${reviewing.approve ? "Approve" : "Reject"} expense`}
          onClose={() => setReviewing(null)}
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A99AB]">
                {formatMoney(reviewing.row.amount_gross, reviewing.row.currency)} · {humanise(reviewing.row.category)}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setReviewing(null)}>Cancel</Button>
                <Button
                  variant={reviewing.approve ? "primary" : "danger"}
                  disabled={busy}
                  onClick={() => {
                    void run(
                      () => moneyApi.reviewExpense(reviewing.row.id, reviewing.approve, reviewNote),
                      reviewing.approve ? "Expense approved." : "Expense rejected.",
                    );
                    setReviewing(null);
                  }}
                >
                  {reviewing.approve ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-[#C7D3E3]">
              {reviewing.row.description || reviewing.row.vendor}
              {reviewing.row.client_name ? ` · ${reviewing.row.client_name}` : " · internal"}
            </p>
            <Field label="Note" hint="Stored on the expense and in the audit log">
              <input
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                className={inputClass}
                placeholder={reviewing.approve ? "Receipt checked." : "Missing the VAT receipt."}
              />
            </Field>
            {reviewing.approve && reviewing.row.reimbursable && (
              <p className="text-[11px] leading-relaxed text-[#FFD48A]">
                Approving marks this as owed to the person who paid. It does not move any money — payouts stay out of this release.
              </p>
            )}
          </div>
        </Modal>
      )}

      {note && <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>}
    </div>
  );
}
