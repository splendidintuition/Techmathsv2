# Release 6 — the client-facing portal

Until this release the portal was internal. A client account could raise a ticket and read its own
rows under RLS, and that was all: no quotes, no invoices, no site list, no way to approve anything.

R6 gives the client organisation its own workspace. It is the same Next.js app and the same
Supabase project; the difference is which RPCs the account can reach and what those RPCs return.

- Migration: `supabase/migrations/20261105120000_portal_v6_client_portal.sql`
- Data layer: `src/lib/portal-client.ts`
- UI: `src/components/portal/v6/` (`client-room.tsx`, `client-quotes.tsx`, `client-invoices.tsx`,
  `client-tickets.tsx`, `client-sites.tsx`)
- Tests: `tests/portal-v6.test.ts`
- Entry point: the **Workspace** item in the portal sidebar, shown only to `client` accounts, and the
  landing page for them on first sign-in.

## What the client can do

| Surface | Actions | Backed by |
| --- | --- | --- |
| Overview | open requests, next visit, quotes to approve, outstanding balance, paid this year, agreement card, attention list | `portal_client_home` |
| Quotes | read the full breakdown, **accept** or **decline** with a reason, see validity countdown | `portal_client_quotes`, `portal_client_quote`, `portal_client_respond_quote` |
| Invoices | issued invoices, line detail, payments received, balance and settlement bar, CSV download | `portal_client_invoices`, `portal_client_invoice` |
| Requests | list with live status in client language, per-ticket timeline, **approve** or **send back** completed work | `portal_client_tickets`, `portal_client_ticket`, `portal_client_sign_off` |
| Sites | site cards with open counts and next visit, **request a visit** with a preferred date | `portal_client_sites`, `portal_client_request_visit` |

Every decision notifies the internal team through the R5 notification outbox, so nothing lands
silently in a table.

## Security model

`portal_client_org()` resolves the caller's organisation from `organization_memberships`, and only
when the profile is active **and** has role `client`. Every RPC starts from that, so a client cannot
name an organisation id to read someone else's data — the id is never an argument.

- Drafts are invisible. A quote appears only once `sent`; an invoice only once issued.
- Access instructions, internal notes, offers, crew and rates are never in a client payload.
- `portal_client_respond_quote` reuses `money_respond_quote`, so the acceptance rules stay in one
  place, and it still requires `money.send_quotes` to be enabled — a client cannot answer what was
  never sent.
- Sign-off only works from `completed_pending_approval`. Approving moves the ticket to `approved`
  (an admin closes it); sending it back returns it to `in_progress` and records the client's note as
  a client-visible update.
- The organisation-scoped helpers (`portal_client_quote_list` and friends) take an org id, so they
  are revoked from `anon` **and** `authenticated`. This project's default privileges grant EXECUTE on
  new functions to both roles; revoking from `public` alone would not be enough.

## Demo data

`portal_client_seed_demo()` (admin only) attaches the demo client login to the demo organisation,
creates the Lisbon site, one quote waiting for a decision and two tickets — one in flight, one
waiting on sign-off. Everything it writes is `is_demo` and goes away with `portal_purge_demo()`.

## How to test

1. Sign in as `admin@techmaths-dc.com` → **Money** → run **Seed demo** if the demo set is missing.
   Then, in SQL or the console, call `portal_client_seed_demo()` once so the client login has a seat.
2. Sign in as `client@techmaths-dc.com`. You land on **Workspace**.
3. **Quotes** → open *DEMO — Quarterly smart-hands retainer top-up* → **Accept**. The bell on the
   admin account shows "Quote accepted" immediately.
4. **Requests** → open *DEMO — Cabling audit and labelling report* → write a note → **Send back**.
   The ticket returns to the engineer's queue and the team is notified.
5. **Sites** → **Request a visit** with a date. A `new` ticket appears in the internal ticket list
   with category `visit_request` and every admin/staff account gets a notification.
6. Confirm the isolation: sign in as `staff@` and open `/portal` — the Workspace entry is not there,
   and calling `portal_client_home()` as staff raises `not_a_client_account`.

## Files changed

| File | What it holds |
| --- | --- |
| `supabase/migrations/20261105120000_portal_v6_client_portal.sql` | table-free RPC layer, grants, demo seed, purge |
| `src/lib/portal-client.ts` | `clientApi`, payload types, client-facing copy, money helpers, invoice CSV |
| `src/components/portal/v6/client-room.tsx` | workspace shell, overview, agreement card |
| `src/components/portal/v6/client-quotes.tsx` | quote list, detail sheet, accept/decline |
| `src/components/portal/v6/client-invoices.tsx` | invoice list, detail sheet, payments, CSV |
| `src/components/portal/v6/client-tickets.tsx` | request list, timeline, sign-off |
| `src/components/portal/v6/client-sites.tsx` | site cards and the visit request form |
| `src/components/operations-portal.tsx` | `Workspace` page, client landing behaviour |
| `tests/portal-v6.test.ts` | 18 assertions over the read-model helpers |

## Not covered

- Online card payment and PDF rendering — both stay out of scope until the owner says otherwise.
- A client-side team screen (who approves, who sees invoices). Membership is still an admin action.
- Live ETA / arrival notice on the request tracker.
- Email or SMS delivery of the notifications this release creates.
