"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, MapPin, RefreshCw, Timer, XCircle } from "lucide-react";
import {
  actionableOffers,
  dispatchApi,
  offerCountdown,
  offerHistory,
  offerTone,
  type OfferInboxItem,
} from "@/lib/portal-dispatch";
import { describeError } from "@/lib/portal-v2";
import { Button, Empty, ErrorNote, Loading, Modal, Panel, Pill, Stat, inputClass } from "@/components/portal/v2/ui";

function money(value: number | null, currency = "EUR"): string {
  if (value === null || value === undefined) return "rate TBC";
  return `${Number(value).toFixed(2)} ${currency}/h`;
}

/**
 * §5 Offers — the engineer's side of dispatch. Accept or decline inside the offer
 * window; the database guarantees only one engineer can win a ticket, and that an
 * expired offer cannot be accepted after the fact.
 */
export function OfferInbox({ email }: { email?: string }) {
  const [offers, setOffers] = useState<OfferInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState<OfferInboxItem | null>(null);
  const [reason, setReason] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOffers(await dispatchApi.myOffers(30));
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The countdown has to move without a reload, or the window looks frozen.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const actionable = useMemo(() => actionableOffers(offers, now), [offers, now]);
  const history = useMemo(() => offerHistory(offers, now), [offers, now]);

  const respond = async (offer: OfferInboxItem, accept: boolean, declineReason?: string) => {
    setBusy(offer.id);
    setNote("");
    try {
      const result = await dispatchApi.respond(offer.id, accept, declineReason ?? null);
      setNote(
        result === "accepted"
          ? `Accepted — you are now the assigned engineer on TM-${String(offer.ticket_number).padStart(5, "0")}. It is in your Tickets list.`
          : `Declined — dispatch has been notified and the job is back in the pool.`,
      );
      setDeclining(null);
      setReason("");
      await load();
    } catch (caught) {
      setNote(describeError(caught).message);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading && offers.length === 0) return <Loading label="Loading your offers" />;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} onRetry={() => void load()} />}
      {note && (
        <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-[#C7D3E3]">{note}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Open offers" value={String(actionable.length)} hint="Waiting for your answer" tone={actionable.length > 0 ? "accent" : "muted"} />
        <Stat
          label="Accepted"
          value={String(offers.filter((offer) => offer.status === "accepted").length)}
          hint="Jobs you took"
          tone="good"
        />
        <Stat
          label="Declined / expired"
          value={String(offers.filter((offer) => offer.status === "declined" || offer.status === "expired").length)}
          hint="Past offers"
          tone="muted"
        />
      </div>

      <Panel
        title="Your offers"
        subtitle={email ? `${email} · offers expire on a timer; the database refuses a late acceptance` : "Offers expire on a timer"}
        action={
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      >
        {actionable.length === 0 ? (
          <Empty
            title="No open offers"
            body="When dispatch offers you a job it appears here, in your notifications, and with the countdown already running."
          />
        ) : (
          <div className="space-y-3">
            {actionable.map((offer) => {
              const urgent = offerCountdown(offer.expires_at, now).includes("min");
              return (
                <div key={offer.id} className="rounded-[12px] border border-[#29E6FF]/25 bg-[#29E6FF]/[0.04] p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">
                          TM-{String(offer.ticket_number).padStart(5, "0")}
                        </span>
                        <Pill tone={offerTone(offer.status)}>{offer.status}</Pill>
                        <Pill tone={urgent ? "warn" : "muted"}>
                          <Timer size={10} /> {offerCountdown(offer.expires_at, now)}
                        </Pill>
                      </div>
                      <h3 className="mt-1 text-[14px] font-semibold text-[#E8EEF9]">{offer.title}</h3>
                      <p className="mt-0.5 text-[11.5px] text-[#8A99AB]">
                        {[offer.client_name, offer.site_name, offer.site_address].filter(Boolean).join(" · ")}
                      </p>
                      {offer.description && (
                        <p className="mt-1.5 max-w-[70ch] text-[11.5px] leading-relaxed text-[#AEBBCC]">{offer.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#9AA9BC]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={10} /> {offer.site_name ?? "site TBC"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={10} /> {offer.estimated_hours ? `${offer.estimated_hours} h estimate` : "estimate TBC"}
                        </span>
                        <span className="font-mono text-[11px] text-[#9DF3FF]">{money(offer.offered_rate)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="primary" onClick={() => void respond(offer, true)} disabled={busy === offer.id}>
                        <CheckCircle2 size={13} /> Accept
                      </Button>
                      <Button variant="danger" onClick={() => { setDeclining(offer); setReason(""); }} disabled={busy === offer.id}>
                        <XCircle size={13} /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {history.length > 0 && (
        <Panel title="Offer history" subtitle="Accepted, declined, taken by another engineer, or expired">
          <ul className="divide-y divide-white/[0.06]">
            {history.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">
                      TM-{String(offer.ticket_number).padStart(5, "0")}
                    </span>
                    <span className="truncate text-[12.5px] text-[#D7E1EF]">{offer.title}</span>
                  </div>
                  {offer.decline_reason && (
                    <p className="mt-0.5 text-[11px] text-[#FFB4B4]">declined: {offer.decline_reason}</p>
                  )}
                </div>
                <Pill tone={offerTone(offer.status)}>{offer.status}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {declining && (
        <Modal title={`Decline · TM-${String(declining.ticket_number).padStart(5, "0")}`} onClose={() => setDeclining(null)}>
          <div className="space-y-3">
            <p className="text-[12px] text-[#8A99AB]">
              Dispatch is notified immediately and the job goes back to the pool. A short reason helps them pick the
              next engineer.
            </p>
            <textarea
              className={`${inputClass} min-h-[90px]`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Not available on that date, travel too far, wrong certification…"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeclining(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => void respond(declining, false, reason)} disabled={busy === declining.id}>
                <XCircle size={13} /> Confirm decline
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
