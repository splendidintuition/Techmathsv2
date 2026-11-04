# Operations portal integration

The public marketing site and authorized operations portal now share this Next.js repository. The portal route is `/portal`; the marketing shell is hidden on that route to keep the operations interface focused.

## Included

- Client Login and Engineer Login entry points in the site header (both reach one role-aware sign-in; authorization comes from the Supabase profile role).
- Portal sign-in/session handling and live ticket list under Supabase RLS.
- Ticket create/status RPC integration, services catalogue reused from `src/lib/content/services.ts`, coverage reference, and link to the existing public quote form.
- Quote form success state links existing clients/engineers to the portal. Public leads remain in the existing lead pipeline and are not automatically converted into operational tickets.
- No demo users, sites, organizations, tickets, locations, or timesheets are added.
- Release consoles for internal roles: **Control** (see `V2-CONTROL-ROOM.md`) and **Money** (see
  `V3-MONEY.md`, flag-gated quotes → invoices → payments).

## Environment

Set in local `.env.local` and in the deployment provider:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Only the Supabase anon/publishable key belongs in `NEXT_PUBLIC_*`. Do not expose a service-role/secret key in browser code.

## Supabase setup

Applied migrations are kept in `supabase/migrations/` with versions matching the linked project. The project is configured for invitation-only access; public signup is disabled. Do not re-enable signup as a shortcut to create privileged users. Current role assignments are in `docs/` from the project owner’s four test accounts.

Supabase Auth Site URL is set to `https://portal.techmaths-dc.com`; the allow-list includes that production origin and `http://localhost:3000/**` for local development. The Next middleware rewrites the portal subdomain root `/` to the portal route while leaving the marketing apex homepage unchanged. Netlify must still add `portal.techmaths-dc.com` as a production domain alias and DNS must point it to the existing Netlify site before this host becomes live.

## Subdomain activation checklist

1. In the existing Netlify site dashboard, add `portal.techmaths-dc.com` as a production domain alias (**Site configuration** → **Domain management** → **Custom domains** → **Add domain alias**). With Netlify Managed DNS enabled, the DNS record and TLS certificate are automatically provisioned.
2. In Netlify's production environment, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are now configured, alongside `NEXT_PUBLIC_PORTAL_URL=https://portal.techmaths-dc.com`.
3. Content Security Policy headers in `next.config.ts` permit `connect-src` and `img-src` to `https://*.supabase.co` and `wss://*.supabase.co`.
4. Deploy the repo changes. The host middleware rewrites the portal subdomain's `/` to the `/portal` application route; the apex domain continues to serve the marketing homepage.
5. The Supabase Auth Site URL and allowed redirect list are configured for `https://portal.techmaths-dc.com` plus local development ports.

## Website-to-portal request handoff

- Public prospects continue using the existing multi-step `/contact` lead form and Netlify lead pipeline.
- Existing invited clients sign into `/portal` and create an authenticated service ticket, which requires their organization membership and a real site record.
- Marketing-side links have been added in this codebase. They will appear on `techmaths-dc.com` only after this change is merged/deployed through the website’s Git/Netlify deployment workflow.

The public site describes some selected case studies as illustrative. Those are intentionally not inserted as operational or customer records.

## Deployment note

This workspace has no authenticated GitHub connector or Netlify publishing connection. Changes are staged in this local repository clone and must be reviewed, committed, and pushed through an authenticated GitHub workflow before Netlify will publish them.
