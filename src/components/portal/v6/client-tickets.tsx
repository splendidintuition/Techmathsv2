"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, MapPin, ThumbsDown, Wrench } from "lucide-react";
import {
  clientApi,
  clientError,
  clientStatusLabel,
  clientStatusTone,
  dateTime,
  type ClientTicket,
  type ClientTicketDetail,
} from "@/lib/portal-client";
import { Button, Empty, ErrorNote, Loading, Modal, Panel, Pill } from "@/components/portal/v2/ui";

function TicketSheet({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [ticket, setTicket] = useState<ClientTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTicket(await clientApi.ticket(id));
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const signOff = async (approve: boolean) => {
    setSaving(true);
    setError("");
    try {
      await clientApi.signOff(id, approve, note);
      setNote("");
      await load();
      await onChanged();
    } catch (caught) {
      setError(clientError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={ticket ? `#${ticket.ticket_number} · ${ticket.title}` : "Request"} onClose={onClose}>
      {loading && <Loading label="Loading request" />}
      {error && <ErrorNote message={error} onRetry={load} />}
      {ticket && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={clientStatusTone(ticket.status)}>{clientStatusLabel(ticket.status)}</Pill>
            <Pill tone="muted">{ticket.priority}</Pill>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6E7A8F]">{ticket.category}</span>
          </div>

          {ticket.description && (
            <p className="rounded-[10px] bg-white/[0.03] px-3 py-2 text-[12px] leading-relaxed text-[#AEBBCC]">
              {ticket.description}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-[10px] border border-white/[0.07] px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">Site</div>
              <div className="mt-1 flex items-start gap-1.5 text-[11.5px] text-[#DCE6F5]">
                <MapPin size={12} className="mt-0.5 shrink-0 text-[#29E6FF]" />
                <span>
                  {ticket.site_name}
                  {ticket.site_address ? <span className="block text-[10.5px] text-[#8A99AB]">{ticket.site_address}</span> : null}
                </span>
              </div>
            </div>
            <div className="rounded-[10px] border border-white/[0.07] px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">Engineer</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#DCE6F5]">
                <Wrench size={12} className="text-[#29E6FF]" />
                {ticket.engineer_name || "Being matched"}
              </div>
            </div>
            <div className="rounded-[10px] border border-white/[0.07] px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">Scheduled</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#DCE6F5]">
                <CalendarClock size={12} className="text-[#29E6FF]" />
                {ticket.scheduled_for ? dateTime(ticket.scheduled_for) : "Not scheduled"}
              </div>
            </div>
            <div className="rounded-[10px] border border-white/[0.07] px-3 py-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">Raised</div>
              <div className="mt-1 text-[11.5px] text-[#DCE6F5]">{dateTime(ticket.created_at)}</div>
            </div>
          </div>

          {ticket.status === "completed_pending_approval" && (
            <div className="space-y-2 rounded-[10px] border border-[#29E6FF]/25 bg-[#29E6FF]/[0.06] p-3">
              <p className="text-[12px] text-[#DCE6F5]">
                The engineer has finished. Confirm the work so we can close this request — or send it back
                with what still needs doing.
              </p>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Optional note for the team"
                className="w-full rounded-[8px] border border-white/12 bg-[#0B1119] px-2.5 py-2 text-[12px] text-[#E8EEF9] outline-none focus:border-[#29E6FF]/60"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={saving} onClick={() => void signOff(true)}>
                  <CheckCircle2 size={13} /> {saving ? "Sending…" : "Approve the work"}
                </Button>
                <Button variant="danger" disabled={saving} onClick={() => void signOff(false)}>
                  <ThumbsDown size={13} /> Send back
                </Button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7E8CA0]">Activity</div>
            <ol className="space-y-2 border-l border-white/[0.09] pl-3">
              {ticket.timeline.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative">
                  <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-[#29E6FF]" />
                  <div className="text-[11.5px] text-[#DCE6F5]">
                    {entry.kind === "status" ? clientStatusLabel(entry.label) : entry.label}
                  </div>
                  {entry.note && <p className="mt-0.5 text-[11px] leading-relaxed text-[#8A99AB]">{entry.note}</p>}
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#5F6F84]">
                    {dateTime(entry.at)}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ClientTickets({
  tickets,
  onChanged,
}: {
  tickets: ClientTicket[];
  onChanged: () => Promise<void> | void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const closed = new Set(["closed", "cancelled", "rejected"]);
  const rows = filter === "open" ? tickets.filter((ticket) => !closed.has(ticket.status)) : tickets;

  return (
    <div className="space-y-3">
      <Panel
        title="Requests"
        subtitle="Every job we have raised for you, with live status."
        action={
          <div className="flex gap-1 rounded-full border border-white/10 p-0.5">
            {(["open", "all"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition ${
                  filter === option ? "bg-[#29E6FF]/15 text-[#9DF3FF]" : "text-[#7E8CA0] hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty
            title={filter === "open" ? "Nothing open right now" : "No requests yet"}
            body="Raise a request from the Sites tab, or reply to the last email thread with your account manager."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setOpenId(ticket.id)}
                className="flex w-full flex-wrap items-center gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.015] px-3 py-3 text-left transition hover:border-[#29E6FF]/30 hover:bg-[#29E6FF]/[0.04]"
              >
                <span className="font-mono text-[10px] text-[#6E7A8F]">#{ticket.ticket_number}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] text-[#E8EEF9]">{ticket.title}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6E7A8F]">
                    {ticket.site_name ?? "Site"} · {ticket.engineer_name ?? "unassigned"}
                    {ticket.scheduled_for ? ` · ${dateTime(ticket.scheduled_for)}` : ""}
                  </div>
                </div>
                {ticket.awaiting_client && <Pill tone="warn">Your sign-off</Pill>}
                <Pill tone={clientStatusTone(ticket.status)}>{clientStatusLabel(ticket.status)}</Pill>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {openId && (
        <TicketSheet id={openId} onClose={() => setOpenId(null)} onChanged={onChanged} />
      )}
    </div>
  );
}
