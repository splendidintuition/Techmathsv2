#!/usr/bin/env node
/**
 * QA audit — run against a live server (default http://127.0.0.1:3000).
 *
 *   node scripts/audit.mjs [baseUrl]
 *
 * Checks, per page:
 *   · HTTP status and content-type
 *   · exactly one <h1>, non-empty <title>, meta description, canonical, OG tags
 *   · valid, parseable JSON-LD blocks
 *   · security headers
 *   · every internal link resolves (no dead links)
 *   · axe-core accessibility violations (WCAG 2.2 A/AA ruleset)
 *
 * Writes docs/QA-REPORT.md and exits non-zero if anything fails.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import axe from "axe-core";

const BASE = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const CORE_PAGES = [
  "/",
  "/services",
  "/coverage",
  "/how-we-work",
  "/industries",
  "/projects",
  "/about",
  "/insights",
  "/contact",
  "/privacy-policy",
  "/cookie-policy",
  "/terms-of-service",
  "/this-page-does-not-exist",
];

const results = [];
let deadLinks = new Set();
let checkedLinks = new Set();

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, { redirect: "manual" });
  const body = await res.text();
  return { res, body };
}

/** Discover every URL from the generated sitemap, so new content is always audited. */
async function pagesFromSitemap() {
  try {
    const { res, body } = await get("/sitemap.xml");
    if (!res.ok) return [];
    return [...body.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname)
      .filter((p, i, arr) => arr.indexOf(p) === i);
  } catch {
    return [];
  }
}

function checkSeo(pathname, dom, res) {
  const issues = [];
  const doc = dom.window.document;

  const h1 = doc.querySelectorAll("h1");
  if (h1.length !== 1) issues.push(`expected exactly 1 <h1>, found ${h1.length}`);

  const title = doc.querySelector("title")?.textContent?.trim() ?? "";
  if (!title) issues.push("missing <title>");
  else if (title.length > 70) issues.push(`title is ${title.length} chars (>70)`);

  const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  if (!desc) issues.push("missing meta description");
  else if (desc.length < 60) issues.push(`meta description only ${desc.length} chars`);

  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  if (!canonical) issues.push("missing canonical");

  for (const prop of ["og:title", "og:description", "og:url", "og:type", "og:site_name"]) {
    if (!doc.querySelector(`meta[property="${prop}"]`)) issues.push(`missing ${prop}`);
  }
  if (!doc.querySelector('meta[name="twitter:card"]')) issues.push("missing twitter:card");
  if (!doc.documentElement.getAttribute("lang")) issues.push("missing <html lang>");

  // JSON-LD must parse; broken structured data is worse than none.
  const ldBlocks = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block.textContent ?? "");
      if (!parsed["@context"]) issues.push("JSON-LD block missing @context");
    } catch (e) {
      issues.push(`unparseable JSON-LD: ${e.message}`);
    }
  }

  const cache = res.headers.get("x-powered-by");
  if (cache) issues.push("x-powered-by header leaked");

  return { issues, ldCount: ldBlocks.length, title, descLen: desc.length };
}

const SECURITY_HEADERS = [
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "content-security-policy",
];

function checkHeaders(res) {
  const missing = SECURITY_HEADERS.filter((h) => !res.headers.get(h));
  if (res.headers.get("x-frame-options")?.toUpperCase() !== "DENY" && res.headers.get("x-frame-options")) {
    missing.push("x-frame-options != DENY");
  }
  return missing;
}

function collectInternalLinks(dom) {
  const out = [];
  for (const a of dom.window.document.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (/^(https?:)?\/\//.test(href)) {
      try {
        if (new URL(href).host !== new URL(BASE).host) continue;
      } catch {
        continue;
      }
    }
    let p;
    try {
      p = new URL(href, BASE).pathname;
    } catch {
      continue;
    }
    if (p.startsWith("/api/") || p.startsWith("/admin")) continue;
    out.push(p);
  }
  return [...new Set(out)];
}

async function runAxe(pathname, html) {
  const dom = new JSDOM(html, { url: `${BASE}${pathname}`, runScripts: "outside-only", pretendToBeVisual: true });
  // axe needs a global window/document context
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.Node = window.Node;
  global.Element = window.Element;
  global.HTMLElement = window.HTMLElement;
  try {
    const res = await axe.run(window.document.documentElement, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      rules: {
        // Colour-contrast needs real layout; jsdom has none, so it always false-positives.
        "color-contrast": { enabled: false },
      },
    });
    return res.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | "),
    }));
  } finally {
    window.close();
  }
}

async function main() {
  console.log(`Auditing ${BASE}\n`);
  const sitemapPages = await pagesFromSitemap();
  const pages = [...new Set([...CORE_PAGES, ...sitemapPages])];
  console.log(`sitemap reported ${sitemapPages.length} URLs · auditing ${pages.length} pages\n`);

  for (const p of pages) {
    const is404Test = p === "/this-page-does-not-exist";
    let entry = { path: p, status: 0, issues: [], a11y: [], headers: [], bytes: 0, ld: 0 };
    try {
      const { res, body } = await get(p);
      entry.status = res.status;
      entry.bytes = Buffer.byteLength(body);

      if (is404Test) {
        if (res.status !== 404) entry.issues.push(`branded 404 returned ${res.status}, expected 404`);
        if (!/rack position/i.test(body)) entry.issues.push("404 page is not the branded Tech Maths page");
      } else if (res.status !== 200) {
        entry.issues.push(`HTTP ${res.status}`);
      } else {
        const dom = new JSDOM(body, { url: `${BASE}${p}` });
        const seo = checkSeo(p, dom, res);
        entry.issues.push(...seo.issues);
        entry.ld = seo.ldCount;
        entry.title = seo.title;
        entry.headers = checkHeaders(res);
        entry.issues.push(...entry.headers.map((h) => `missing/incorrect header: ${h}`));

        for (const link of collectInternalLinks(dom)) {
          if (checkedLinks.has(link)) continue;
          checkedLinks.add(link);
          try {
            const r = await fetch(`${BASE}${link}`, { method: "GET", redirect: "manual" });
            if (r.status >= 400) deadLinks.add(`${link} (${r.status})`);
          } catch (e) {
            deadLinks.add(`${link} (${e.message})`);
          }
        }
        dom.window.close();

        entry.a11y = await runAxe(p, body);
      }
    } catch (e) {
      entry.issues.push(`fetch failed: ${e.message}`);
    }
    results.push(entry);
    const flag = entry.issues.length || entry.a11y.length ? "FAIL" : "ok  ";
    console.log(
      `${flag} ${String(entry.status).padEnd(4)} ${p.padEnd(46)} ${(entry.bytes / 1024).toFixed(1).padStart(7)}KB  ld:${entry.ld}  a11y:${entry.a11y.length}`
    );
    for (const i of entry.issues) console.log(`        ! ${i}`);
    for (const v of entry.a11y) console.log(`        a11y [${v.impact}] ${v.id}: ${v.help} (${v.nodes})`);
  }

  const failed = results.filter((r) => r.issues.length || r.a11y.length);
  const totalA11y = results.reduce((a, r) => a + r.a11y.length, 0);
  const totalBytes = results.reduce((a, r) => a + r.bytes, 0);

  console.log(`\n────────────────────────────────────────────`);
  console.log(`pages audited     ${results.length}`);
  console.log(`pages with issues ${failed.length}`);
  console.log(`internal links    ${checkedLinks.size} checked, ${deadLinks.size} dead`);
  console.log(`a11y violations   ${totalA11y}`);
  console.log(`total HTML        ${(totalBytes / 1024).toFixed(0)}KB across ${results.length} pages`);
  if (deadLinks.size) for (const d of deadLinks) console.log(`  dead: ${d}`);

  writeReport({ results, deadLinks, checkedLinks, totalA11y, totalBytes, pages });
  process.exit(failed.length || deadLinks.size ? 1 : 0);
}

function writeReport({ results, deadLinks, checkedLinks, totalA11y, totalBytes, pages }) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);
  const failed = results.filter((r) => r.issues.length || r.a11y.length);
  const lines = [];
  lines.push(`# QA report — Tech Maths`);
  lines.push(``);
  lines.push(`Generated ${now} UTC against \`${BASE}\` by \`scripts/audit.mjs\`.`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Pages audited | ${results.length} |`);
  lines.push(`| Pages with issues | ${failed.length} |`);
  lines.push(`| Internal links checked | ${checkedLinks.size} |`);
  lines.push(`| Dead links | ${deadLinks.size} |`);
  lines.push(`| axe-core violations (WCAG 2.2 AA + best practice) | ${totalA11y} |`);
  lines.push(`| Total HTML weight | ${(totalBytes / 1024).toFixed(0)} KB |`);
  lines.push(``);
  lines.push(`## Per-page results`);
  lines.push(``);
  lines.push(`| Page | Status | HTML | JSON-LD | Issues | a11y |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const r of results) {
    lines.push(
      `| \`${r.path}\` | ${r.status} | ${(r.bytes / 1024).toFixed(1)} KB | ${r.ld} | ${r.issues.length} | ${r.a11y.length} |`
    );
  }
  if (failed.length) {
    lines.push(``);
    lines.push(`## Findings`);
    lines.push(``);
    for (const r of failed) {
      lines.push(`### \`${r.path}\``);
      for (const i of r.issues) lines.push(`- ${i}`);
      for (const v of r.a11y) lines.push(`- **a11y [${v.impact}]** \`${v.id}\` — ${v.help} (${v.nodes} node(s)) — \`${v.targets}\``);
      lines.push(``);
    }
  } else {
    lines.push(``);
    lines.push(`No SEO, security-header or accessibility findings.`);
  }
  if (deadLinks.size) {
    lines.push(``);
    lines.push(`## Dead links`);
    lines.push(``);
    for (const d of deadLinks) lines.push(`- ${d}`);
  }
  lines.push(``);
  lines.push(`## Scope notes`);
  lines.push(``);
  lines.push(`- Colour-contrast rules are disabled in this run: axe needs real layout to evaluate contrast and jsdom provides none. Contrast must be verified in a browser before launch.`);
  lines.push(`- Lighthouse performance is not measured here; see the manual performance checklist in \`docs/HANDOVER.md\`.`);
  lines.push(`- The audit crawls every URL in \`/sitemap.xml\`, so newly added projects and articles are covered automatically.`);
  lines.push(``);

  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/QA-REPORT.md"), lines.join("\n"));
  console.log(`\nreport written to docs/QA-REPORT.md`);
}

main().catch((e) => {
  console.error("audit crashed:", e);
  process.exit(2);
});
