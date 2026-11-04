"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Clock3,
  Lock,
  MessageSquare,
  Send,
  Shield,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

export type MessageItem = {
  id: string;
  ticket_id: string;
  channel: "client" | "internal" | "direct";
  sender_id: string;
  body: string;
  attachment_paths: string[];
  read_at: string | null;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
};

interface TicketChatProps {
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  currentUserId: string;
  currentUserRole: "admin" | "staff" | "freelancer" | "client";
  onClose: () => void;
}

const QUICK_UPDATES = [
  "En route to data center site.",
  "Arrived on site. Checking in with facility security.",
  "Commencing scheduled hardware rack & cabling work.",
  "Diagnostics completed. Requesting client verification.",
  "Scope of work completed. Awaiting sign-off.",
];

export function TicketChat({
  ticketId,
  ticketNumber,
  ticketTitle,
  currentUserId,
  currentUserRole,
  onClose,
}: TicketChatProps) {
  const [channel, setChannel] = useState<"client" | "internal">("client");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canAccessInternal = currentUserRole !== "client";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchErr } = await supabase
        .from("messages")
        .select("id, ticket_id, channel, sender_id, body, attachment_paths, read_at, created_at")
        .eq("ticket_id", ticketId)
        .eq("channel", channel)
        .order("created_at", { ascending: true });

      if (fetchErr) {
        setError("Could not load message history for this ticket.");
        setMessages([]);
        setLoading(false);
        return;
      }

      const raw = (data || []) as MessageItem[];
      const senderIds = [...new Set(raw.map((m) => m.sender_id))];

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", senderIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        setMessages(
          raw.map((m) => {
            const p = profileMap.get(m.sender_id);
            return {
              ...m,
              sender_name: p?.full_name || (m.sender_id === currentUserId ? "You" : "User"),
              sender_role: p?.role,
            };
          })
        );
      } else {
        setMessages(raw);
      }
    } catch {
      setError("An unexpected error occurred while loading messages.");
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [ticketId, channel, currentUserId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // Set up real-time postgres changes subscription
  useEffect(() => {
    if (!supabase) return;

    const subChannel = supabase
      .channel(`ticket-chat-${ticketId}-${channel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageItem;
          if (newMsg.channel === channel) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [
                ...prev,
                {
                  ...newMsg,
                  sender_name: newMsg.sender_id === currentUserId ? "You" : "Team Member",
                },
              ];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        void supabase.removeChannel(subChannel);
      }
    };
  }, [ticketId, channel, currentUserId]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || !supabase || sending) return;

    setSending(true);
    setError("");

    try {
      // Try atomic RPC first, fallback to table insert
      const { error: rpcErr } = await supabase.rpc("send_ticket_message", {
        p_ticket_id: ticketId,
        p_channel: channel,
        p_body: text,
      });

      if (rpcErr) {
        // Fallback to direct table insert
        const { error: insertErr } = await supabase.from("messages").insert({
          ticket_id: ticketId,
          channel,
          sender_id: currentUserId,
          body: text,
        });

        if (insertErr) {
          setError("Failed to deliver message. Please verify connection and retry.");
          setSending(false);
          return;
        }
      }

      if (!textToSend) setInput("");
      await loadMessages();
    } catch {
      setError("Failed to deliver message.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ticket chat window"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="flex h-[90vh] max-h-[720px] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0B1018] shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/[0.08] bg-[#0E1522] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#38E1FF]">
                TM-{ticketNumber}
              </span>
              <span className="text-[#4E5C70]">/</span>
              <span className="mono-label text-[8px] text-[#8190A5]">
                REAL-TIME THREAD
              </span>
            </div>
            <h2 className="mt-1 truncate text-[14px] font-medium text-[#E8EEF9]">
              {ticketTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-lg p-1.5 text-[#8592A6] hover:bg-white/[0.05] hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        {/* Channel Navigation Tabs */}
        <div className="flex border-b border-white/[0.06] bg-[#080D14] px-4">
          <button
            onClick={() => setChannel("client")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] font-medium transition ${
              channel === "client"
                ? "border-[#38E1FF] text-[#38E1FF]"
                : "border-transparent text-[#7F8D9F] hover:text-white"
            }`}
          >
            <MessageSquare size={13} />
            Client & Team Thread
          </button>

          {canAccessInternal && (
            <button
              onClick={() => setChannel("internal")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] font-medium transition ${
                channel === "internal"
                  ? "border-[#FFB84D] text-[#FFB84D]"
                  : "border-transparent text-[#7F8D9F] hover:text-white"
              }`}
            >
              <Lock size={13} />
              Internal Notes (Staff & Engineer Only)
            </button>
          )}
        </div>

        {/* Channel Status Banner */}
        <div className="flex items-center gap-2 border-b border-white/[0.04] bg-white/[0.015] px-5 py-2 text-[10px] text-[#718096]">
          {channel === "client" ? (
            <>
              <Shield size={12} className="text-[#3DDC97]" />
              <span>Visible to authorized client contacts and assigned engineers.</span>
            </>
          ) : (
            <>
              <Lock size={12} className="text-[#FFB84D]" />
              <span className="text-[#E0B164]">
                Confidential staff notes. Hidden from client organizations.
              </span>
            </>
          )}
        </div>

        {/* Message History */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#FF5C70]/20 bg-[#FF5C70]/[0.06] p-3 text-[10px] text-[#FF9AA7]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-full items-center justify-center text-[11px] text-[#6F7D91]">
              <Clock3 size={15} className="mr-2 animate-spin text-[#38E1FF]" />
              Loading real-time chat messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#68768B]">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <MessageSquare size={18} className="text-[#38E1FF]" />
              </div>
              <p className="text-[12px] font-medium text-[#C8D3E2]">
                No messages in this thread yet.
              </p>
              <p className="mt-1 max-w-[320px] text-[10px] leading-relaxed">
                Send updates, progress notes, or coordination instructions directly below.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[9px] text-[#69778D]">
                    <User size={10} />
                    <span className="font-medium text-[#9BA8BA]">
                      {msg.sender_name || "Team Member"}
                    </span>
                    {msg.sender_role && (
                      <span className="rounded bg-white/[0.06] px-1 py-0.2 capitalize text-[8px] text-[#8492A4]">
                        {msg.sender_role}
                      </span>
                    )}
                    <span>•</span>
                    <span className="font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[11px] leading-relaxed ${
                      isOwn
                        ? "border border-[#38E1FF]/30 bg-[#38E1FF]/[0.12] text-[#E8EEF9]"
                        : channel === "internal"
                        ? "border border-[#FFB84D]/25 bg-[#FFB84D]/[0.08] text-[#E8EEF9]"
                        : "border border-white/[0.08] bg-[#101724] text-[#DCE4F0]"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Update Prompts for Field Engineers */}
        {currentUserRole !== "client" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/[0.05] bg-[#070B11] px-4 py-2">
            <span className="mono-label shrink-0 self-center text-[8px] text-[#556378]">
              QUICK DISPATCH:
            </span>
            {QUICK_UPDATES.map((update) => (
              <button
                key={update}
                type="button"
                onClick={() => void sendMessage(update)}
                className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[9px] text-[#A6B3C4] transition hover:border-[#38E1FF]/40 hover:text-white"
              >
                {update}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-white/[0.08] bg-[#0A0F18] p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              channel === "client"
                ? "Send message to client and assigned engineer…"
                : "Add internal staff-only note…"
            }
            className="h-10 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3.5 text-[11px] text-white outline-none placeholder:text-[#556378] focus:border-[#38E1FF]/45"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#38E1FF] px-4 text-[11px] font-semibold text-[#04141A] transition hover:bg-[#6CE9FF] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
