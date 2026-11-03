# Fix verification — 2026-11-03

## Reported symptom

The supplied homepage screenshot showed a stray cyan ring near the top-left of the hero. The custom
cursor was being made visible before any mouse movement and retained its old position/hover state
after scrolling or leaving the window.

## Fixes

- The cursor is now hidden until a real mouse `pointermove`, follows only fine-pointer devices,
  disappears on scroll/window exit/visibility loss, and cleans up when motion is disabled. Its hover
  ring is centered without per-frame layout reads.
- Restored the missing `/coverage` and `/coverage/[country]` routes. The generated-report ignore rule
  was changed from `coverage/` to `/coverage/` so it no longer hides application routes.
- Made the shared shell and contact page render from the published service/coverage catalogue instead
  of opening and seeding SQLite during every dynamic request. This fixes the reproduced read-only
  filesystem crash on the quote page.
- Quote submission now returns an explicit, uncached HTTP 503 when storage fails. It never reports a
  successful reference for an unsaved lead. `/api/health` likewise reports database failure without
  throwing a secondary exception.
- Restored `scripts/seed.ts`, corrected regional quote deep links to use country names, normalized
  repeated query parameters, and corrected the canonical origin to `https://techmaths-dc.com`.
- Added Netlify Next.js runtime configuration and browser regression tests. Improved muted-text and
  light-theme accent contrast; key templates pass real-browser axe checks in both themes.

## Local verification

| Check | Result |
| --- | --- |
| TypeScript | Pass |
| Unit/API tests | 71 passed |
| Production build | Pass, 199 routes generated |
| Browser regression suite | 37 passed, 1 platform-appropriate skip |
| Real-browser accessibility/contrast | Home, contact, coverage and country page pass in dark/light at 360 px and 1440 px |
| Full crawl (`scripts/audit.mjs`) | 188 pages, 0 page issues; 187 internal links, 0 dead links |
| Read-only database simulation | `/`, `/contact`, `/coverage`, `/coverage/portugal` return 200 |
| Read-only quote API | Returns 503 and “Your request has not been sent”; no false success |
| Read-only health API | Returns 503 with a database failure check rather than crashing |

The browser quote-flow test mocks the transport response; the API tests exercise the real handler
against an isolated SQLite database. No live customer lead was submitted during verification.

## Production observations (before deployment)

`https://www.techmaths-dc.com` redirects to `https://techmaths-dc.com`. At the time of the check,
production was still serving the older deployment:

- `/contact` returned the Next.js application-error page (digest `2910088864`).
- `/coverage` returned the site's 404 page.
- `/robots.txt` still advertised `https://techmaths.com` as Host/Sitemap.

Those observations confirm that the local repairs have **not** yet reached production. A passing
local build is not a claim that the live domain is fixed.

## Required deployment follow-up

1. Deploy this branch through the site's hosting pipeline and confirm the new build is live.
2. Set `NEXT_PUBLIC_SITE_URL=https://techmaths-dc.com` in the hosting environment.
3. Provide durable quote storage: a persistent writable volume for the existing SQLite implementation,
   or a managed-database migration for serverless hosting. Do not use `/tmp` for production leads.
4. Configure the real admin, notification and webhook secrets. Contact details in the content layer
   remain explicitly marked placeholders until the company supplies replacements.
5. Recheck the live apex and `www` URLs, especially `/contact`, `/coverage`, `/api/health`, robots and
   sitemap. Test quote intake only with an agreed test submission and verify it reaches the durable
   queue/notification destination.

## Netlify deploy-preview status

PR #1 triggered a Netlify deploy preview for commit `83bb4b0`, but Netlify reported **Deploy failed**.
GitHub's check output contains no build-log detail, and the Netlify deploy log requires hosting
authentication that is not available in this session.

A local `netlify build --offline` run initially completed the Next.js production build and Node
function bundling, then failed while bundling the admin middleware as an Edge Function. The admin
sign-in check was moved into the server-rendered admin page, preserving the redirect behaviour while
removing the Edge Function requirement. A subsequent local `netlify build --offline` completed
successfully. The hosted preview result for that adjustment is recorded in PR #1.

No claim is made that the site works “perfectly”: the Netlify preview must be repaired, Lighthouse
performance and exhaustive cross-browser coverage remain outstanding, and real notification delivery
plus post-deployment production verification still need to be checked.
