# Handover — what the company must supply before launch

The site is complete and deployable today. Everything listed here is currently **illustrative**
and is marked as such on the page where it appears, so nothing fabricated can reach a client
silently. The same list is rendered inside `/admin` and on `/about`.

## 1. Blocking (legal / trust risk)

| # | Item | Where to change |
| --- | --- | --- |
| 1 | Legal entity name, NIF and registered address | `src/lib/content/site.ts` → `COMPANY` |
| 2 | Real contact details: email, phone, WhatsApp, office addresses | `src/lib/content/site.ts` → `COMPANY` |
| 3 | Canonical domain (`techmaths.com` assumed) | `.env.local` → `NEXT_PUBLIC_SITE_URL` |
| 4 | Lead routing address and CRM webhook | `.env.local` → `LEAD_NOTIFY_EMAIL`, `LEAD_WEBHOOK_URL` |
| 5 | Admin passcode and cookie secret | `.env.local` → `ADMIN_TOKEN`, `ADMIN_COOKIE_SECRET` |
| 6 | Privacy, cookie and terms review by qualified counsel in PT/UK/US/IN | `src/app/privacy-policy`, `cookie-policy`, `terms-of-service` |

The legal pages are drafting templates written to be readable, not substitutes for legal advice.

## 2. Content that is currently illustrative

| # | Item | Status today |
| --- | --- | --- |
| 7 | 8 case studies | Written in full, flagged on-page with an "Illustrative reference" marker |
| 8 | 5 testimonials | Written, flagged as illustrative |
| 9 | Client logos | Neutral placeholders — no invented brand names |
| 10 | 6 team profiles | Written, flagged; initials shown instead of photographs |
| 11 | Headline figures (28 / 380+ / 60+ / 4h) | Labelled "illustrative" in the trust strip |
| 12 | Certifications & insurance documents | Referenced in copy; PDFs not supplied |

Replace via `src/lib/content/projects.ts`, `site.ts` (`TESTIMONIALS`, `CLIENT_LOGOS`, `TEAM`,
`STATS`) — or edit the rows in the database, which survives a redeploy. Set `isPlaceholder` to
false per record and the on-page marker disappears.

## 3. Recommended before go-live

- [ ] Replace team initial tiles with real photographs (add an `avatar` column and use `next/image`).
- [ ] Supply the service brochure / capability statement PDFs (spec §6 "Downloadable PDFs").
      Today, Insights offer a real `.md` download via `/api/download/[slug]`; a print-optimised
      brochure page is the natural next step.
- [ ] Run Lighthouse in a real browser and record Performance / Accessibility / Best Practices /
      SEO against the 95+ target. The audit script covers SEO, headers, links and axe; it cannot
      measure paint performance because jsdom has no layout engine.
- [ ] Verify colour contrast for both themes at 360 px and 1440 px.
- [ ] Configure analytics (`NEXT_PUBLIC_ANALYTICS_DOMAIN`) or rely on the first-party counter.
- [ ] Point DNS, add TLS, and set `NEXT_PUBLIC_SITE_URL` to the real origin before indexing.
- [ ] Submit `/sitemap.xml` to Search Console. It now lists 187 URLs, including 135 regional
      landing pages (`/services/rack-and-stack/germany`) and 15 country hubs (`/coverage/germany`).
- [ ] Review the 15 country profiles in `src/lib/content/regional.ts` with someone who has
      actually worked those markets. The standards, safety regimes and access rules are written
      from domain knowledge and are accurate as far as we can verify, but a Frankfurt or Ashburn
      site manager will spot local nuances faster than any review process.
- [ ] Decide on language versions. The URL structure is i18n-ready; EN is the only locale built.
      PT-PT is the obvious next step given the Lisbon HQ.

## 4. Decisions taken (spec had these open)

| Spec question | Decision |
| --- | --- |
| Static vs dynamic | **Dynamic full stack** (changed at the client's instruction): Next.js App Router + SQLite + API routes + admin console. The spec's "100% static" requirement is superseded; pages are still statically generated where they can be. |
| Company name / domain | Tech Maths; `techmaths.com` assumed pending confirmation. |
| Coverage | **Global**: Lisbon HQ, Europe as the core market, plus UK, US, India, UAE and Singapore — 28 countries. The spec's "Coverage — Europe" page became a world map with regional filters. |
| Languages at launch | English only, with i18n-ready routing. |
| Accent colour | Electric cyan `#29E6FF` on near-black `#0A0D12`, per spec §7. Light mode uses `#067D92` to hold WCAG AA contrast. |
| Case studies | Illustrative but clearly marked, rather than blank pages or unlabelled fiction. |
| Hosting | Any Node host with a writable disk. Not static-only hosting (see README). |

## 5. Known limitations

- Colour contrast is unverified by automation (see above).
- `better-sqlite3` is pinned at 12.11.1; 13.0.3 segfaults on Node 20 in sandboxed environments.
- The 404 page, legal pages and admin console are excluded from the sitemap and `robots.txt`.
- Analytics counts only visitors who accept in the consent banner, so totals understate traffic
  by design.
