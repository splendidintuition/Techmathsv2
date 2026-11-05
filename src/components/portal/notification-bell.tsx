"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { dispatchApi, relativeTime, type PortalNotification } from "@/lib/portal-dispatch";
import { supabase } from "@/lib/supabase-browser";
import { describeError } from "@/lib/portal-v2";
import { Pill } from "@/components/portal/v2/ui";

/**
 * §8 Notifications — the in-app channel. Rows are written by the database (offer
 * sent, offer answered, ticket assigned, quote answered, expense submitted), so a
 * notification exists even if the person was offline when it happened.
 *
 * Live updates use a Supabase realtime subscription on the person's own rows; the
 * 60-second poll is the fallback for environments where realtime is disabled.
 */
export function NotificationBell() {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const payload = await dispatchApi.notifications(30, false);
      setItems(payload.items);
      setUnread(payload.unread);
      setError("");
    } catch (caught) {
      setError(describeError(caught).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!supabase) return;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      const id = data?.user?.id ?? null;
      setUserId(id);
      if (!id || !supabase) return;
      channel = supabase
        .channel(`notifications-${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "portal_notifications", filter: `user_id=eq.${id}` },
          () => void load(),
        )
        .subscribe();
    });

    return () => {
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markAll = async () => {
    try {
      await dispatchApi.markRead(null);
      await load();
    } catch (caught) {
      setError(describeError(caught).message);
    }
  };

  const openOne = async (item: PortalNotification) => {
    if (!item.read_at) {
      try {
        await dispatchApi.markRead([item.id]);
        await load();
      } catch {
        /* reading is best-effort; the list refreshes on the next poll */
      }
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-[#8B97AB] hover:text-white"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#FF6B6B] px-1 font-mono text-[9px] font-semibold text-[#1A0505]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[330px] overflow-hidden rounded-[14px] border border-white/10 bg-[#0A1017] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.95)]">
          <header className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Inbox size={13} className="text-[#29E6FF]" />
              <span className="text-[12px] font-semibold text-[#E8EEF9]">Notifications</span>
              {unread > 0 && <Pill tone="danger">{unread} new</Pill>}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#7E8CA0] hover:text-[#BDF6FF]"
              >
                <CheckCheck size={11} /> mark all
              </button>
            )}
          </header>

          {error && <p className="px-3 py-2 text-[11px] text-[#FFB4B4]">{error}</p>}

          <div className="max-h-[320px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11.5px] text-[#7E8CA0]">
                Nothing yet. Assignments, offers, quote decisions and expense claims land here.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openOne(item)}
                      className={`block w-full px-3 py-2.5 text-left transition hover:bg-white/[0.03] ${
                        item.read_at ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                            item.kind === "offer"
                              ? "bg-[#29E6FF]"
                              : item.kind === "money"
                                ? "bg-[#FFB020]"
                                : item.kind === "ticket"
                                  ? "bg-[#3DDC97]"
                                  : "bg-[#8B97AB]"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] text-[#E8EEF9]">{item.title}</div>
                          {item.body && <div className="mt-0.5 line-clamp-2 text-[11px] text-[#8A99AB]">{item.body}</div>}
                          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5F6F84]">
                            {relativeTime(item.created_at)}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-white/[0.07] px-3 py-2 text-[10px] text-[#5F6F84]">
            {userId ? "Live" : "Polling"} · written by the database, not the browser
          </footer>
        </div>
      )}
    </div>
  );
}
