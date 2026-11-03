# Tech Maths

Next.js site for Tech Maths data center engineering, with a service catalogue, coverage pages,
insights, quote intake and an admin console.

## Local development

```sh
npm ci
npm run db:seed
npm run dev
```

The development server listens on `0.0.0.0:3000`. Copy `.env.example` to `.env.local` and set the
real environment values before production use. SQLite defaults to `data/techmaths.db`; override it
with `TECHMATHS_DB`.

## Checks

```sh
npm run typecheck
npm test
npm run build

# Browser tests start/reuse a local server. Install Chromium once if needed:
npx playwright install chromium
npm run test:browser

# Crawl a running production server:
npm start
npm run audit
```

Browser tests cover the cursor, navigation/search, coverage links, quote-form states and real-browser
accessibility checks. To test an already running server, set `PLAYWRIGHT_BASE_URL`. A custom Chromium
binary can be supplied with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Deployment

`netlify.toml` configures the Next.js runtime rather than a static-only export. The canonical origin
is `https://techmaths-dc.com`; the live `www` host redirects to the apex.

**Production quote intake needs durable storage.** The current SQLite implementation requires a
persistent, writable disk shared by the application processes. A Netlify Function's local filesystem
is not a production lead database. Either deploy to a Node host with a persistent volume or migrate
operational storage to a managed database before accepting quotes on serverless hosting. The site
still renders when storage is unavailable, and the quote API returns an explicit HTTP 503 rather
than claiming an unsaved request was sent.

See `docs/HANDOVER.md` for launch blockers and placeholder content, and
`docs/FIX-VERIFICATION.md` for the latest repair and verification record.
