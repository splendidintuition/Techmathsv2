# Information architecture — Tech Maths

Spec required 22 pages. The build delivers **187 URLs**: the 22 specified pages plus
individually addressable case studies and articles, which the spec implies ("Projects — case
studies", "Insights — articles") and which carry the SEO value.

## Sitemap

| # | URL | Type | Purpose |
| --- | --- | --- | --- |
| 1 | `/` | static | Hero, trust strip, 9 services, pinned process, coverage teaser, cases, FAQ, CTA |
| 2 | `/services` | static | Catalogue hub with category + text filter |
| 3–11 | `/services/[slug]` | SSG ×9 | Service detail (shared template) |
| — | `/services/[slug]/[country]` | SSG ×135 | Service × market landing page (9 services × 15 countries) |
| — | `/coverage/[country]` | SSG ×15 | Country hub: local standards, hubs, mobilisation, FAQ |
| 12 | `/coverage` | static | Interactive world map, mobilisation times, travel promise, full country table |
| 13 | `/how-we-work` | static | 8-stage process, standards, handover pack, commitments |
| 14 | `/industries` | static | 5 sectors with pressures and matched services |
| 15 | `/projects` | static | Filterable case grid (service / industry / country) |
| 15b | `/projects/[slug]` | SSG ×8 | Case detail: challenge, scope, result, metrics, quote |
| 16 | `/about` | static | Story, values, team, offices, testimonials, pre-launch checklist |
| 17 | `/insights` | static | Searchable index with category and format filters |
| 17b | `/insights/[slug]` | SSG ×8 | Article with TOC, reading time, `.md` download |
| 18 | `/contact` | static | 5-step quote form, direct contacts, offices, process FAQ |
| 19 | `/privacy-policy` | static | GDPR policy |
| 20 | `/cookie-policy` | static | Exactly what is stored, and how to control it |
| 21 | `/terms-of-service` | static | Site terms; delivery work is governed by contract |
| 22 | `not-found` | static | Branded 404 ("This rack position is empty") |
| — | `/sitemap.xml`, `/robots.txt` | generated | Built from live content tables |
| — | `/admin`, `/admin/login` | dynamic | Lead console — `noindex`, robots-disallowed, cookie-gated |

## Service URLs

`/services/rack-and-stack` · `structured-cabling` · `server-installation` ·
`os-application-installation` · `network-connection` · `commissioning-testing` ·
`remote-smart-hands` · `decommissioning-migration` · `maintenance-field-support`

Slugs are the catalogue's primary keys — they appear in the database, the quote payload, the
project cross-references and the URLs, so nothing needs re-mapping when copy changes.

## Service detail template (×9)

1. Hero — icon, category pill, title, one-line promise, KPIs, two CTAs
2. What this service is (2 paragraphs) + deliverables
3. What is included / what is **not** included (the exclusion list is the trust device)
4. Method in 5–6 numbered steps
5. Tools and standards (TIA, ISO/IEC, EN, ASHRAE, NIST, ESD S20.20, CIS)
6. Related projects (filtered by service)
7. FAQ (with `FAQPage` JSON-LD)
8. Related services + CTA
9. Sticky "Get a quote for this service" bar, dismissible

## Content model

| Table | Key | Notes |
| --- | --- | --- |
| `services` | slug | included/excluded/deliverables/method/tooling/standards/faqs/kpis/keywords as JSON |
| `projects` | slug | services[], industries[], metrics[], `is_placeholder` flag drives the on-page marker |
| `insights` | slug | Markdown body, kind (article/checklist/guide), `seo_title` for long titles |
| `industries` | slug | pressures[], matched services |
| `coverage` | ISO code | region, mobilise_hours, hubs[], hq flag |
| `team`, `testimonials`, `faqs` | id | `is_placeholder` flags |
| `leads` | reference | full quote payload, consent flags, spam score, status |
| `subscribers`, `events`, `settings` | — | newsletter, first-party analytics, KV |

## Cross-linking

- Service → related services (`src/lib/categories.ts`), related projects, FAQ
- Project → services used, sector, other projects
- Insight → TOC, tags, related articles, quote CTA
- Coverage → per-country quote deep link (`/contact?country=…`)
- Service CTA → quote deep link (`/contact?service=…`) which preselects step 1

## Structured data

`Organization` (site-wide, `@id`-referenced) · `WebSite` · `Service` per service page ·
`FAQPage` on home, service and contact pages · `BreadcrumbList` everywhere · `Article` on
projects and insights · `Blog` + `BlogPosting` on the Insights index · `ItemList` on services,
projects, industries and coverage · `ContactPage` with a `ContactPoint`.

Every JSON-LD block is generated from typed server-side data and validated by the audit script
(it must parse, and must carry `@context`).

## SEO / keyword structure

Clean URLs, per-page canonicals, Open Graph and Twitter cards, `metadataBase` from
`NEXT_PUBLIC_SITE_URL`. Service `keywords[]` already carry regional variants
("rack and stack Germany", "remote hands Portugal") so regional landing pages can be added as
`/services/[slug]/[country]` — now built: 135 pages across 15 markets, each composed from the
service record, a country standards/compliance profile and the live coverage row, so the
standards cited on a German page (DIN EN 50173) differ from a US page (ANSI/TIA-568.2-D).
