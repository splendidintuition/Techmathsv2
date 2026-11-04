# Tech Maths — data center services website

Full-stack, dynamic marketing site for **Tech Maths**, a specialist data center engineering
partner headquartered in Lisbon with delivery coverage across Europe, the UK, the US and India.

Built to the *Data Center Services Website — Features & Page Specification*: 22+ pages,
nine-service catalogue, multi-step quote pipeline, interactive coverage map, filterable
projects and searchable Insights, GDPR consent, and an admin console for leads.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15.5 (App Router, React 19, TypeScript) | RSC gives static-speed pages with real server-side data; route handlers give a genuine backend without a separate API service. |
| Styling | Tailwind CSS 4 + design tokens in `globals.css` | Token-driven theming makes dark/light a variable swap, not a rewrite. |
| Database | SQLite via `better-sqlite3` 12.11.1 | Zero-ops, file-based, synchronous reads keep server components simple. Swappable for Postgres behind `src/lib/queries.ts`. |
| Validation | Zod 4 | One schema drives API validation, error messages and inferred types. |
| Testing | Vitest + `react-dom/server` + axe-core + jsdom | Real code paths: route handlers are called directly, components are rendered, accessibility is measured. |
| Fonts | Self-hosted variable woff2 (Space Grotesk, Inter, JetBrains Mono) | No third-party font requests; ~58 KB total. |
| Motion | Hand-written IntersectionObserver + canvas 2D | No animation library in the bundle; hero is ~250 lines of vector math, no WebGL. |

---

## Run it

```bash
npm install
cp .env.example .env.local      # then set ADMIN_TOKEN etc.
npm run dev                     # http://localhost:3000
```

Production:

```bash
npm run build
npm start                       # serves the build on 0.0.0.0:3000
```

The database is created and seeded automatically on first request (`data/techmaths.db`,
gitignored). Seeding is idempotent — rows are only inserted when the slug is absent, so
content edited through the database survives a redeploy.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm start` | Dev server / production server (both bind `0.0.0.0:3000`) |
| `npm run build` | Type-checks and produces the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | 69 unit/integration tests (validation, queries, API routes, Markdown, regional page generator) |
| `npm run audit` | SEO + security-header + link + axe-core accessibility audit against a running server; writes `docs/QA-REPORT.md` |
| `npm run db:seed` | Re-seed content tables |
| `node scripts/gen-map.mjs` | Regenerate the world map module from Natural Earth data |

### Environment

See `.env.example`. The important ones:

- `TECHMATHS_DB` — SQLite file path (default `./data/techmaths.db`)
- `NEXT_PUBLIC_SITE_URL` — canonical origin used for sitemap, canonicals, og:url and JSON-LD
- `ADMIN_TOKEN` — passcode for `/admin`; also the session cookie value. Generate a random one
  (`openssl rand -hex 12`) before the console is reachable from the public internet — the
  middleware only compares this string, so a guessable value means an open console.
- `LEAD_NOTIFY_EMAIL`, `LEAD_WEBHOOK_URL` — where quotes are forwarded (webhook is optional)
- `NEXT_PUBLIC_ANALYTICS_DOMAIN` — optional Plausible/Umami domain; empty means first-party counting only

---

## Architecture

```
src/
  app/
    page.tsx                     home (canvas hero, trust strip, services, process, coverage, cases, FAQ)
    services/                    hub + 9 detail pages + 135 country pages (SSG)
    coverage/[country]/          15 country hubs (SSG)
    coverage/                    interactive world map + per-country mobilisation
    how-we-work/                 8-stage process, standards, handover pack
    industries/                  5 sectors
    projects/                    filterable grid + 8 case studies
    insights/                    searchable index + 8 articles/checklists/guides
    about/                       story, team, offices, pre-launch checklist
    contact/                     5-step quote form
    privacy-policy|cookie-policy|terms-of-service
    not-found.tsx                branded 404
    sitemap.ts robots.ts         generated from live content tables
    api/
      leads/                     POST quote (Zod + spam scoring), GET queue (admin)
      subscribe/ search/ event/ health/
      download/[slug]/           Insight as a Markdown file
      admin/login/               passcode → httpOnly cookie
      admin/leads/[id]/          PATCH lead status
    admin/                       leads console, traffic, pre-launch checklist
  components/                    ~20 components; client components only where interaction exists
  lib/
    db.ts queries.ts seed.ts     schema, idempotent seeding, typed read/write layer
    content/                     versioned copy: services, projects, insights, site facts, world map
    validation.ts seo.tsx categories.ts types.ts fonts.ts
  middleware.ts                  protects /admin
docs/                            QA report, handover checklist, design system, IA, agent log
scripts/                         audit.mjs (QA), gen-map.mjs (map), seed.ts, smoke-db.ts
tests/                           55 tests
```

**Content flow:** copy lives in `src/lib/content/*.ts` (version-controlled) → seeded into SQLite
→ read by server components through `src/lib/queries.ts`. Pages never import the content files
directly, so the database stays the single source of truth at runtime.

**Lead flow:** multi-step form → `POST /api/leads` → Zod validation → spam scoring (honeypot,
timing, disposable-domain, link density) → SQLite with a `TM-<year>-<code>` reference →
optional CRM webhook → admin console queue with CSV export and status triage.

---

## Deployment

Works on any Node host (Fly, Render, Railway, a VPS, Docker). It is **not** deployable to a
static-only host or a serverless platform without a persistent disk, because the lead pipeline
needs a writable SQLite file.

- Move to Postgres for multi-instance deployments: replace `src/lib/db.ts` and keep
  `src/lib/queries.ts` signatures — nothing else imports the driver.
- `better-sqlite3` is a native module: `serverExternalPackages` is set in `next.config.ts`, and
  the Docker image needs build tools (`python3`, `make`, `g++`) available at install time.
- **Pin `better-sqlite3` at 12.11.1.** Version 13.0.3's binary segfaults on Node 20 in some
  sandboxed/container environments (verified: 13.0.3 crashes in the `Database` constructor,
  12.11.1 does not). Do not bump it without re-running `npx tsx scripts/smoke-db.ts`.

---

## Verification

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `npm run build` | 199 prerendered pages, First Load JS 103–136 kB |
| `npm test` | 55/55 passing |
| `npm run audit` | 188 pages, 0 SEO/header findings, 0 dead links, 0 axe-core violations |
| Live lead pipeline | quote → `TM-2026-RY0QG`; invalid payload → 422 with field errors |
| Admin gate | `/admin` → 307 to `/admin/login` without the cookie |

Colour contrast is **not** covered by the automated audit (jsdom has no layout engine) — verify
in a browser before launch. See `docs/HANDOVER.md`.
