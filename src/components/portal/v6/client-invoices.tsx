"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Landmark, ReceiptText } from "lucide-react";
import {
  clientApi,
  clientError,
  invoiceCsv,
  invoiceTone,
  money,
  settlementPct,
  shortDate,
  type ClientInvoice,
  type ClientInvoiceDetail,
} from "@/lib/portal-client";
import { Button, Empty, ErrorNote, Loading, Modal, Panel, Pill } from "@/components/portal/v2/ui";

const STATUS_COPY: Record<string, string> = {
  sent: "Awaiting payment",
  part_paid: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
};

function downloadCsv(name: string, body: string) {
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function InvoiceSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const [invoice, setInvoice] = useState<ClientInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setInvoice(await clientApi.invoice(id));
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Modal title={invoice ? `${invoice.number} · ${invoice.title}` : "Invoice"} onClose={onClose}>
      {loading && <Loading label="Loading invoice" />}
      {error && <ErrorNote message={error} onRetry={load} />}
      {invoice && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={invoiceTone(invoice)}>{STATUS_COPY[invoice.status] ?? invoice.status}</Pill>
            <span className="text-[11px] text-[#8A99AB]">
              Issued {shortDate(invoice.issued_at)} · Due {shortDate(invoice.due_at)}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-[#8A99AB]">
              <span>Settled</span>
              <span>
                {money(invoice.amount_paid, invoice.currency)} of {money(invoice.total, invoice.currency)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-[#3DDC97]"
                style={{ width: `${settlementPct(invoice)}%` }}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-white/[0.07]">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="bg-white/[0.02]">
                  {["Description", "Qty", "Price", "Total"].map((head, index) => (
                    <th
                      key={head}
                      className={`border-b border-white/[0.07] px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0] ${
                        index > 0 ? "text-right" : ""
                      }`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-[#DCE6F5]">{line.description}</td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#AEBBCC]">
                      {Number(line.quantity)} {line.unit}
                    </td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#AEBBCC]">
                      {money(line.unit_price, invoice.currency)}
                    </td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#E8EEF9]">
                      {money(line.line_total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="space-y-1.5 text-[12px]">
            <div className="flex justify-between text-[#8A99AB]">
              <dt>Subtotal</dt>
              <dd>{money(invoice.subtotal, invoice.currency)}</dd>
            </div>
            <div className="flex justify-between text-[#8A99AB]">
              <dt>VAT ({Number(invoice.vat_rate)}%)</dt>
              <dd>{money(invoice.vat_total, invoice.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/[0.08] pt-1.5 text-[14px] font-semibold text-[#E8EEF9]">
              <dt>Total</dt>
              <dd>{money(invoice.total, invoice.currency)}</dd>
            </div>
            <div className="flex justify-between text-[12px] text-[#FFD48A]">
              <dt>Balance due</dt>
              <dd>{money(invoice.balance, invoice.currency)}</dd>
            </div>
          </dl>

          {invoice.payments.length > 0 && (
            <div>
              <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">Payments received</div>
              <ul className="space-y-1">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between rounded-[8px] bg-white/[0.03] px-2.5 py-1.5 text-[11px]">
                    <span className="text-[#AEBBCC]">
                      {shortDate(payment.received_at)} · {payment.method.replace(/_/g, " ")}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                    <span className="text-[#3DDC97]">{money(payment.amount, invoice.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] text-[#8A99AB]">
            <Landmark size={13} className="text-[#29E6FF]" />
            <span className="flex-1">
              Pay by bank transfer quoting <span className="font-mono text-[#E8EEF9]">{invoice.reference || invoice.number}</span>.
              Card payment is not enabled on this portal yet.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadCsv(`${invoice.number}.csv`, invoiceCsv(invoice))}>
              <Download size={13} /> Download CSV
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ClientInvoices({ invoices, currency }: { invoices: ClientInvoice[]; currency: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Panel
        title="Invoices"
        subtitle="Everything we have issued, what is paid and what is still open."
      >
        {invoices.length === 0 ? (
          <Empty
            title="No invoices yet"
            body="Issued invoices appear here with their line detail, payments received and remaining balance."
          />
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => setOpenId(invoice.id)}
                className="flex w-full flex-wrap items-center gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.015] px-3 py-3 text-left transition hover:border-[#29E6FF]/30 hover:bg-[#29E6FF]/[0.04]"
              >
                <ReceiptText size={15} className="text-[#29E6FF]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-[#E8EEF9]">{invoice.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6E7A8F]">
                    {invoice.number} · due {shortDate(invoice.due_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-[#E8EEF9]">{money(invoice.total, invoice.currency)}</div>
                  <div className="mt-0.5 text-[10px] text-[#8A99AB]">
                    {invoice.status === "paid" ? "Settled" : `${money(invoice.balance, invoice.currency)} open`}
                  </div>
                </div>
                <Pill tone={invoiceTone(invoice)}>{STATUS_COPY[invoice.is_overdue ? "overdue" : invoice.status] ?? invoice.status}</Pill>
              </button>
            ))}
          </div>
        )}
      </Panel>
      <p className="px-1 text-[10px] text-[#6E7A8F]">
        Amounts are shown in {currency}. Online card payment and statements across entities are not part of
        this release.
      </p>

      {openId && <InvoiceSheet id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
