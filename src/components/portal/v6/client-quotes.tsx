"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, FileText, X } from "lucide-react";
import {
  clientApi,
  clientError,
  money,
  quoteTone,
  shortDate,
  validityCopy,
  type ClientQuote,
  type ClientQuoteDetail,
} from "@/lib/portal-client";
import { Button, Empty, ErrorNote, Loading, Modal, Panel, Pill } from "@/components/portal/v2/ui";

const STATUS_COPY: Record<string, string> = {
  sent: "Awaiting your decision",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  converted: "Invoiced",
};

function QuoteSheet({
  id,
  currency,
  onClose,
  onChanged,
}: {
  id: string;
  currency: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [quote, setQuote] = useState<ClientQuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuote(await clientApi.quote(id));
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (accept: boolean) => {
    setSaving(true);
    setError("");
    try {
      await clientApi.respondQuote(id, accept, accept ? undefined : reason);
      await load();
      await onChanged();
      setMode("idle");
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={quote ? `${quote.number} · ${quote.title}` : "Quote"} onClose={onClose}>
      {loading && <Loading label="Loading quote" />}
      {error && <ErrorNote message={error} onRetry={load} />}
      {quote && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={quoteTone(quote.status)}>{STATUS_COPY[quote.status] ?? quote.status}</Pill>
            {quote.status === "sent" && <Pill tone="muted">{validityCopy(quote)}</Pill>}
            <span className="text-[11px] text-[#8A99AB]">{quote.site_name ?? quote.organization_name}</span>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-white/[0.07]">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="bg-white/[0.02]">
                  {["Description", "Qty", "Unit", "Price", "Total"].map((head, index) => (
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
                {quote.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-[#DCE6F5]">{line.description}</td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#AEBBCC]">
                      {Number(line.quantity)}
                    </td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#AEBBCC]">{line.unit}</td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#AEBBCC]">
                      {money(line.unit_price, quote.currency)}
                    </td>
                    <td className="border-b border-white/[0.05] px-2.5 py-2 text-right text-[#E8EEF9]">
                      {money(line.line_total, quote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="space-y-1.5 text-[12px]">
            <div className="flex justify-between text-[#8A99AB]">
              <dt>Subtotal</dt>
              <dd>{money(quote.subtotal, quote.currency)}</dd>
            </div>
            {Number(quote.discount_pct) > 0 && (
              <div className="flex justify-between text-[#8A99AB]">
                <dt>Discount</dt>
                <dd>−{Number(quote.discount_pct)}%</dd>
              </div>
            )}
            <div className="flex justify-between text-[#8A99AB]">
              <dt>VAT ({Number(quote.vat_rate)}%)</dt>
              <dd>{money(quote.vat_total, quote.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/[0.08] pt-1.5 text-[14px] font-semibold text-[#E8EEF9]">
              <dt>Total</dt>
              <dd>{money(quote.total, quote.currency)}</dd>
            </div>
          </dl>

          {quote.notes && <p className="rounded-[10px] bg-white/[0.03] px-3 py-2 text-[11px] text-[#AEBBCC]">{quote.notes}</p>}
          {quote.terms && (
            <div className="text-[11px] text-[#7E8CA0]">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Terms</span>
              <p className="mt-1 leading-relaxed text-[#8A99AB]">{quote.terms}</p>
            </div>
          )}
          <div className="text-[11px] text-[#7E8CA0]">
            Sent {shortDate(quote.sent_at)} · Valid until {shortDate(quote.valid_until)}
            {quote.responded_at && <> · Answered {shortDate(quote.responded_at)}</>}
          </div>

          {quote.can_respond && mode === "idle" && (
            <div className="space-y-2 border-t border-white/[0.07] pt-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => setMode("accept")}>
                  <Check size={13} /> Accept quote
                </Button>
                <Button variant="danger" onClick={() => setMode("decline")}>
                  <X size={13} /> Decline
                </Button>
              </div>
              <p className="text-[10px] text-[#6E7A8F]">
                Accepting confirms the scope and price above. The operations team is notified and your
                invoice follows.
              </p>
            </div>
          )}

          {mode === "accept" && (
            <div className="space-y-2 rounded-[10px] border border-[#29E6FF]/25 bg-[#29E6FF]/[0.06] p-3">
              <p className="text-[12px] text-[#DCE6F5]">
                Accept <span className="font-semibold">{quote.number}</span> for{" "}
                <span className="font-semibold">{money(quote.total, quote.currency)}</span>?
              </p>
              <div className="flex gap-2">
                <Button variant="primary" disabled={saving} onClick={() => void decide(true)}>
                  {saving ? "Sending…" : "Yes, accept"}
                </Button>
                <Button onClick={() => setMode("idle")}>Cancel</Button>
              </div>
            </div>
          )}

          {mode === "decline" && (
            <div className="space-y-2 rounded-[10px] border border-[#FF6B6B]/30 bg-[#FF6B6B]/[0.07] p-3">
              <label className="block text-[11px] text-[#FFB4B4]">
                What should we change? (optional)
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-[8px] border border-white/12 bg-[#0B1119] px-2.5 py-2 text-[12px] text-[#E8EEF9] outline-none focus:border-[#FF6B6B]/50"
                  placeholder="Price, scope, timing…"
                />
              </label>
              <div className="flex gap-2">
                <Button variant="danger" disabled={saving} onClick={() => void decide(false)}>
                  {saving ? "Sending…" : "Decline quote"}
                </Button>
                <Button onClick={() => setMode("idle")}>Keep it open</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ClientQuotes({
  quotes,
  currency,
  onChanged,
}: {
  quotes: ClientQuote[];
  currency: string;
  onChanged: () => Promise<void> | void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => {
    await onChanged();
  };

  return (
    <div className="space-y-3">
      <Panel title="Quotes" subtitle="Prices we have sent you. Accept or decline in one click.">
        {quotes.length === 0 ? (
          <Empty
            title="No quotes yet"
            body="When we price a piece of work you will see it here with the full breakdown, and you can approve it without email."
          />
        ) : (
          <div className="space-y-2">
            {quotes.map((quote) => (
              <button
                key={quote.id}
                onClick={() => setOpenId(quote.id)}
                className="flex w-full flex-wrap items-center gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.015] px-3 py-3 text-left transition hover:border-[#29E6FF]/30 hover:bg-[#29E6FF]/[0.04]"
              >
                <FileText size={15} className="text-[#29E6FF]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-[#E8EEF9]">{quote.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6E7A8F]">
                    {quote.number} · {quote.site_name ?? "No site"} · {shortDate(quote.sent_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-semibold text-[#E8EEF9]">{money(quote.total, quote.currency)}</div>
                  <div className="mt-0.5 text-[10px] text-[#8A99AB]">{validityCopy(quote)}</div>
                </div>
                <Pill tone={quoteTone(quote.status)}>{STATUS_COPY[quote.status] ?? quote.status}</Pill>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {openId && (
        <QuoteSheet
          id={openId}
          currency={currency}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
