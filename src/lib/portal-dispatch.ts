/**
 * R5 — dispatch offers and in-app notifications.
 *
 * Every call goes through a security-definer RPC in
 * `supabase/migrations/20261105090000_portal_v5_dispatch.sql`. The offer rules
 * (one pending offer per engineer per ticket, expiry, single acceptance) live in
 * Postgres, so a second browser tab cannot accept what the first one took.
 */
import { callRpc, describeError, type Tone } from "@/lib/portal-v2";

export { describeError };
export type { Tone };

export type OfferStatus = "pending" | "accepted" | "declined" | "expired" | "taken";

export interface OfferInboxItem {
  id: string;
  ticket_id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  priority: string;
  status: OfferStatus;
  offered_rate: number | null;
  expires_at: string;
  responded_at: string | null;
  decline_reason: string | null;
  scheduled_for: string | null;
  sla_due_at: string | null;
  estimated_hours: number | null;
  site_name: string | null;
  site_address: string | null;
  client_name: string | null;
}

export interface TicketOffer {
  id: string;
  engineer_id: string;
  engineer_name: string;
  status: OfferStatus;
  offered_rate: number | null;
  expires_at: string;
  responded_at: string | null;
  decline_reason: string | null;
}

export interface PortalNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  entity: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const dispatchApi = {
  myOffers: (limit = 20) =>
    callRpc<{ offers: OfferInboxItem[] }>("portal_my_offers", { p_limit: limit }).then((payload) => payload.offers ?? []),
  respond: (offerId: string, accept: boolean, reason?: string | null) =>
    callRpc<string>("portal_respond_offer", {
      p_offer_id: offerId,
      p_accept: accept,
      p_reason: reason ?? null,
    }),
  sendOffer: (args: { ticketId: string; engineerId: string; minutes?: number; rate?: number | null }) =>
    callRpc<string>("portal_send_offer", {
      p_ticket_id: args.ticketId,
      p_engineer_id: args.engineerId,
      p_minutes: args.minutes ?? 60,
      p_rate: args.rate ?? null,
    }),
  ticketOffers: (ticketId: string) =>
    callRpc<{ offers: TicketOffer[] }>("portal_list_ticket_offers", { p_ticket_id: ticketId }).then(
      (payload) => payload.offers ?? [],
    ),
  notifications: (limit = 30, unreadOnly = false) =>
    callRpc<{ notifications: PortalNotification[]; unread: number }>("portal_notifications_list", {
      p_limit: limit,
      p_unread_only: unreadOnly,
    }).then((payload) => ({ items: payload.notifications ?? [], unread: Number(payload.unread ?? 0) })),
  markRead: (ids?: string[] | null) =>
    callRpc<number>("portal_notifications_mark", { p_ids: ids ?? null }),
  expireOffers: () => callRpc<number>("portal_expire_offers"),
};

/* ------------------------------------------------------------ pure helpers */

/** Colour for an offer status, matching the rest of the portal. */
export function offerTone(status: string): Tone {
  switch (status) {
    case "accepted":
      return "good";
    case "pending":
      return "accent";
    case "declined":
      return "danger";
    case "taken":
      return "muted";
    default:
      return "muted";
  }
}

/** Whole minutes left before an offer expires; zero once it has. */
export function minutesLeft(expiresAt: string, now: number = Date.now()): number {
  const at = new Date(expiresAt).getTime();
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.ceil((at - now) / 60_000));
}

/** "expires in 43 min" / "expired" — the only countdown format the screens use. */
export function offerCountdown(expiresAt: string, now: number = Date.now()): string {
  const left = minutesLeft(expiresAt, now);
  if (left <= 0) return "expired";
  if (left < 60) return `expires in ${left} min`;
  const hours = Math.floor(left / 60);
  const minutes = left % 60;
  return minutes === 0 ? `expires in ${hours} h` : `expires in ${hours} h ${minutes} min`;
}

/** Offers an engineer can still act on, soonest deadline first. */
export function actionableOffers(offers: OfferInboxItem[], now: number = Date.now()): OfferInboxItem[] {
  return offers
    .filter((offer) => offer.status === "pending" && minutesLeft(offer.expires_at, now) > 0)
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
}

/** Everything else, newest first — the engineer's own history. */
export function offerHistory(offers: OfferInboxItem[], now: number = Date.now()): OfferInboxItem[] {
  return offers
    .filter((offer) => offer.status !== "pending" || minutesLeft(offer.expires_at, now) <= 0)
    .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime());
}

/** Short relative time for the notification list. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return "";
  const diff = Math.max(0, now - at);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} d ago`;
}

/** Notification icon bucket: offers, money, tickets, everything else. */
export function notificationTone(kind: string): Tone {
  switch (kind) {
    case "offer":
      return "accent";
    case "money":
      return "warn";
    case "ticket":
      return "good";
    default:
      return "muted";
  }
}
