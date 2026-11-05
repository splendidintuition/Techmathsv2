# R5 — Dispatch offers and notifications

Branch `arena/988ca7a7-techmathsv2` · Migration `20261105090000_portal_v5_dispatch` (applied)
Base: `main` at `4a01857` (R4)

## Why this release

`ticket_offers` and `accept_offer()` have existed since the first migration, and nothing ever created
an offer — so the plan's own R1 core loop ("an engineer accepts it") was unreachable. At the same
time no event pushed anything to a person: an assignment, an accepted quote or a submitted expense
died silently in a table.

R5 makes offers real and gives every person an inbox. It adds no feature flag and no external
provider.

## Dispatch offers (§3.2, §5)

| RPC | Permission | Behaviour |
| --- | --- | --- |
| `portal_send_offer(ticket, engineer, minutes, rate)` | `dispatch.offer` | Creates or re-opens the offer row, moves the ticket to `offered`, writes a `offer.sent` event and audit row, and notifies the engineer. Window is clamped to 5–2880 minutes. Refuses closed tickets, non-dispatchable accounts and a duplicate live offer. |
| `portal_respond_offer(offer, accept, reason)` | offer owner only | Accept assigns the engineer, marks every other pending offer `taken`, writes `offer.accepted`. Decline stores the reason, returns the ticket to `new` when nothing else is live, writes `offer.declined`, and notifies admin and staff. |
| `portal_my_offers(limit)` | any signed-in user | The engineer's own offers with ticket, site, client, priority, estimate, rate and deadline. |
| `portal_list_ticket_offers(ticket)` | tickets in scope | Every offer on a ticket with status, deadline and decline reason — the dispatch view. |
| `portal_expire_offers()` | any signed-in user | Housekeeping: pending offers past their deadline become `expired`; a ticket left in `offered` with nothing live returns to `new`. Called by the read RPCs, so the list can never show a dead offer as actionable. |

`accept_offer(uuid)` from the original schema is untouched and still works; the new RPC is a superset
with the decline path and the notifications.

Screens: **Offers** in the left nav (every role except client) with a live countdown, accept/decline,
decline reason and history; **Control → Bulk actions → Offer** per ticket, with engineer picker,
window and optional rate.

## Notifications (§8)

`portal_notifications` is a per-person inbox written by the database, never by the browser:

| Source | Who is notified |
| --- | --- |
| Offer sent | the offered engineer |
| Offer accepted / declined | every active admin and staff account |
| Ticket assigned (trigger on `tickets.assigned_to`) | the assignee |
| Quote accepted or declined (trigger on `quotes.status`) | every active admin and staff account |
| Expense submitted (trigger on `expenses.status`) | every active admin and staff account |

| RPC | Behaviour |
| --- | --- |
| `portal_notifications_list(limit, unread_only)` | Own rows, newest first, plus the unread count. RLS also restricts direct reads to the owner. |
| `portal_notifications_mark(ids)` | Marks the given ids, or everything unread when `ids` is null. |

UI: the bell in the portal header, with an unread badge, a live Supabase realtime subscription on the
person's own rows, a 60-second poll fallback, relative timestamps and "mark all read".

**No email leaves the system in this release.** The table is the outbox an email worker will drain;
choosing a provider (Resend, Postmark, SES) is a credentials decision, not a schema decision, and the
portal says "written by the database" rather than pretending mail was sent.

## Verification performed

Exercised as real accounts against the live database by setting the JWT claim in-session:

| Check | Result |
| --- | --- |
| Admin sends an offer to the freelancer (45 min, €35/h) | Offer id returned, ticket moved to `offered` |
| Freelancer's `portal_my_offers` | One pending offer with title, client, site, rate and deadline |
| Freelancer's unread notifications | 1 — "New job offer · QA — R5 offer smoke" |
| Freelancer accepts | `accepted`; ticket `assigned` to that engineer |
| Notifications afterwards | admin 1 (offer accepted), engineer 2 (offer + assignment trigger) |
| Audit | `offer.sent` and `offer.accepted` rows with ticket and engineer ids |
| Cleanup | ticket, offer, events, notifications, audit rows and QA site deleted — tickets 0, sites 0, offers 0, notifications 0 |

A defect was found and fixed during that run: the notification titles carried a literal `\u00b7`
because a JSON-escaped separator was pasted into SQL, where `\u` escapes are not interpreted. The
functions were recreated with the real character and the migration now matches production.

## How to test in the product

1. As admin, **Control → Bulk actions**, press **Offer** on a ticket, pick the freelancer, 60 minutes,
   35.00, send.
2. The ticket shows `Offered`. As `freelancer@techmaths-dc.com`, **Offers** shows the card with a
   countdown; the bell shows one unread.
3. Accept — the ticket becomes `Assigned`, the card disappears from Offers, and the admin's bell
   shows "Offer accepted".
4. Repeat and decline with a reason: the admin sees "Offer declined — <reason>" and the ticket
   returns to the pool.
5. Leave an offer to run out (set 5 minutes) and refresh: the card moves to history as `expired` and
   the ticket is back to `new`.

## Files changed

```
supabase/migrations/20261105090000_portal_v5_dispatch.sql   notifications table + 8 RPCs + 3 triggers
src/lib/portal-dispatch.ts                                  api surface + 7 pure helpers
src/components/portal/offer-inbox.tsx                       engineer Offers page
src/components/portal/notification-bell.tsx                 header bell, realtime + poll
src/components/portal/v2/control-tickets.tsx                per-ticket Offer modal
src/components/operations-portal.tsx                        Offers page, nav entry, bell
tests/portal-v5.test.ts                                     8 assertions on timing and tones
docs/V5-DISPATCH.md                                         this file
docs/FEATURE-MATRIX.md                                      §3.2, §5, §8, §11 and the scoreboard
docs/AGENT-LOG.md                                           Agents 22–24
```

## Not covered

Email/push/SMS delivery, quiet hours and per-user channel rules, broadcast to a shortlist,
auto-escalation when an offer lapses, smart engineer ranking, and offers that require a specific
certificate. All remain in the matrix as missing or partial.
