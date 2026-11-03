# Agent log — who built what, and how it was verified

The build was run as a sequence of specialised roles, each with its own artefact and its own
acceptance check. Nothing below is claimed without the command that proved it.

---

## Agent 01 — Strategy & positioning

**Brief:** make Tech Maths read as a specialist data center partner, not a general IT shop.

**Output:** positioning line ("Hands-on data center engineering, anywhere you build"), the four
audiences from the spec mapped to five sector pages, and the rule that every page states an
exclusion list as well as a capability list — the trust device that runs through the whole site.

**Decisions taken where the spec left them open:** dynamic full stack (client instruction),
global coverage with Lisbon HQ, English only at launch, cyan accent, illustrative-but-marked
references. All recorded in `docs/HANDOVER.md` §4.

---

## Agent 02 — Art direction & design system

**Output:** `docs/DESIGN-SYSTEM.md` + `src/app/globals.css` token layer.

Near-black `#0A0D12` base, one accent (`#29E6FF` dark / `#056B7D` light for AA contrast),
three self-hosted variable faces, fluid `clamp()` type, `gap-px` card grids that read as
engineering drawings, and one easing curve site-wide.

**Acceptance:** dark and light themes are a variable swap on `[data-theme]`; both ship in the
same stylesheet; no component hardcodes a colour.

---

## Agent 03 — Motion & creative engineering

**Output:** `src/components/motion.tsx`, `hero-canvas.tsx`, `process-story.tsx`, `cursor.tsx`.

The signature piece is a hand-written canvas 2D data hall — pinhole projection, two rack rows
receding to a vanishing point, per-unit U-slots, breathing status LEDs on deterministic phases,
and light pulses travelling the overhead cable trays. ~250 lines, no library, no WebGL.

**Discipline:** DPR capped at 2, paused when off-screen or tab-hidden, `aria-hidden` decoration,
and a genuine reduced-motion path — the hero renders one static frame, the cursor and marquee
are disabled, and a persistent footer switch does the same on request.

**Acceptance:** no animation library in the dependency tree (`npm ls` shows none); First Load JS
stays 103–136 kB per route.

---

## Agent 04 — Information architecture & copy

**Output:** `docs/INFORMATION-ARCHITECTURE.md` + `src/lib/content/*`.

38 URLs from a 22-page spec: the specified pages plus individually addressable case studies and
articles. Nine services written to be technically credible — inclusion *and* exclusion lists,
5–6 step methods, real standards (TIA-606-D, TIA-568.2-D, ISO/IEC 11801, EN 50600, ASHRAE,
NIST SP 800-88, ANSI/ESD S20.20, CIS), and 4 FAQs each. Eight case studies with metrics, eight
Insights with full Markdown bodies, five sectors, 28 coverage countries.

**Acceptance:** every service record hydrates typed arrays from JSON columns
(`tests/queries.test.ts`), and every published Insight renders with at least one `<h2>`
(`tests/markdown.test.tsx`).

---

## Agent 05 — Frontend engineering

**Output:** ~20 components, 38 pages, App Router with RSC.

Client components exist only where interaction does: nav, search overlay, filters, the quote
form, the coverage map, motion observers. Accordions are native `<details>` — zero JS. The
Markdown renderer is dependency-free and never uses `dangerouslySetInnerHTML` (proved by a test
that injects `<script>` and `<img onerror>` and asserts they are escaped).

**Acceptance:** `tsc --noEmit` clean; `npm run build` produces 49 routes.

---

## Agent 06 — Backend & data engineering

**Output:** `src/lib/db.ts`, `queries.ts`, `seed.ts`, 8 route handlers, middleware, admin console.

SQLite schema with content tables (idempotent seeding — `INSERT OR IGNORE`, so database edits
survive a redeploy) and operational tables (`leads`, `subscribers`, `events`). Zod drives
validation and inferred types. The lead pipeline scores abuse (honeypot, sub-4-second
completion, disposable domains, link density) and returns a plausible success for bots while
storing nothing. Admin is cookie-gated at the edge middleware and re-checked in the handler.

**Acceptance:** 33 tests across `queries.test.ts` and `api.test.ts` call the real handlers with
`NextRequest`, including 401/422/400 paths and honeypot behaviour.

---

## Agent 07 — SEO engineering

**Output:** `src/lib/seo.tsx`, `sitemap.ts`, `robots.ts`, per-page metadata, eight JSON-LD types.

Canonicals, OG and Twitter cards from one builder; sitemap generated from the live content
tables so new projects and articles appear automatically; `/admin` and `/api/` disallowed and
`noindex`.

**Acceptance:** `scripts/audit.mjs` verifies per page — exactly one `<h1>`, title ≤70 chars,
meta description ≥60 chars, canonical, all OG/Twitter tags, `<html lang>`, every JSON-LD block
parses and carries `@context`, and no `x-powered-by` leak.

---

## Agent 08 — QA & accessibility

**Output:** `tests/` (55 tests), `scripts/audit.mjs`, `docs/QA-REPORT.md`.

Tests exercise real code paths, not stand-ins: Zod schemas, the seeded query layer against a
throwaway database, the Markdown component rendered through `react-dom/server`, and the route
handlers invoked directly. The audit crawls every sitemap URL, checks headers and links, and
runs axe-core (WCAG 2.2 A/AA + best practice) on each page.

### Findings found and fixed

| Finding | Severity | Fix |
| --- | --- | --- |
| `better-sqlite3` 13.0.3 segfaults in the `Database` constructor on Node 20 here — crashed the build worker with SIGSEGV | blocking | Isolated by cross-loading both installs from each other's cwd; pinned to 12.11.1, which verifies clean. Documented in README. |
| Interactive SVG countries nested inside `role="img"` | serious | `role="group"` with a descriptive label |
| Heading-order skips on 4 pages (`h1 → h3`) | moderate | Added real section `h2`s; `SectionHead` gained a `level` prop |
| `/services` had no `<h1>` at all | moderate | Hero now renders `level="h1"` |
| 3 document titles over 70 chars | minor | Shortened; added an `seo_title` column so display and SEO titles can differ |
| Honeypot returned 422 instead of a plausible success — which tells a bot it was detected | minor | Relaxed the field to pass schema, letting the spam gate respond with 200 and store nothing |

### Pass 2 — regional landing pages (SEO agent + frontend agent)

Added `/services/[slug]/[country]` (135 pages) and `/coverage/[country]` (15 hubs) for 15
priority markets. Pages are composed, not templated: each combines the service record, a
country standards/compliance/safety profile (`src/lib/content/regional.ts`) and the live
coverage row, so a German page cites DIN EN 50173 and DGUV V3 while a US page cites
ANSI/TIA-568.2-D, TIA-1152 and NFPA 70E.

| Finding | Severity | Resolution |
| --- | --- | --- |
| `buildRegionalPage` built its canonical path from the country **slug** while `generateStaticParams` and every link used the ISO **code** — 135 pages of cross-links pointing at routes that did not exist | blocking | Standardised on the readable slug; added `regionalSlug`/`regionalCode` helpers and a regression test that asserts the route param, the path and the back-lookup all agree |
| Page titles carried a manual `\| Tech Maths` suffix on top of `SITE_METADATA`'s `%s — Tech Maths` template, producing double branding and 79-char titles | serious | Dropped the manual suffix; the unit test now measures the **rendered** title including the template suffix, which is what the earlier assertion missed |

### Final state

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Build | `npm run build` | 199 prerendered pages, First Load JS 103–136 kB |
| Tests | `npx vitest run` | 69/69 |
| Audit | `node scripts/audit.mjs` | 188 pages · 0 findings · 0 dead links (187 checked) · 0 axe violations |
| Lead pipeline (live) | `curl -X POST /api/leads` | `TM-2026-RY0QG`; invalid payload → 422 with three field errors |
| Admin gate (live) | `curl /admin` | 307 → `/admin/login?next=%2Fadmin` |
| Headers (live) | `curl -I /` | CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy; no `x-powered-by` |

### Not covered

Colour contrast — jsdom has no layout engine, so axe's contrast rules are disabled in the
automated run. Lighthouse performance likewise needs a real browser. Both are on the
pre-launch checklist in `docs/HANDOVER.md`.
