import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Schema for Tech Maths.
 *
 * Two families of tables:
 *  1. Content tables — seeded from versioned TypeScript (src/lib/content),
 *     editable at runtime through the admin console. Seeding is idempotent:
 *     rows are only inserted when the slug/key is absent, so admin edits
 *     survive a redeploy or a re-seed.
 *  2. Operational tables — leads, subscribers, first-party analytics events.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS services (
  slug            TEXT PRIMARY KEY,
  position        INTEGER NOT NULL,
  title           TEXT NOT NULL,
  short           TEXT NOT NULL,
  icon            TEXT NOT NULL,
  summary         TEXT NOT NULL,
  included        TEXT NOT NULL,
  excluded        TEXT NOT NULL,
  deliverables    TEXT NOT NULL,
  method          TEXT NOT NULL,
  tooling         TEXT NOT NULL,
  standards       TEXT NOT NULL,
  faqs            TEXT NOT NULL,
  kpis            TEXT NOT NULL,
  keywords        TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  slug            TEXT PRIMARY KEY,
  position        INTEGER NOT NULL,
  title           TEXT NOT NULL,
  client          TEXT NOT NULL,
  summary         TEXT NOT NULL,
  services        TEXT NOT NULL,
  industries      TEXT NOT NULL,
  country         TEXT NOT NULL,
  region          TEXT NOT NULL,
  year            INTEGER NOT NULL,
  duration        TEXT NOT NULL,
  team_size       INTEGER NOT NULL,
  challenge       TEXT NOT NULL,
  scope           TEXT NOT NULL,
  result          TEXT NOT NULL,
  metrics         TEXT NOT NULL,
  quote           TEXT NOT NULL,
  is_placeholder  INTEGER NOT NULL DEFAULT 1,
  published       INTEGER NOT NULL DEFAULT 1,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS insights (
  slug            TEXT PRIMARY KEY,
  position        INTEGER NOT NULL,
  title           TEXT NOT NULL,
  seo_title       TEXT,
  excerpt         TEXT NOT NULL,
  body            TEXT NOT NULL,
  kind            TEXT NOT NULL,
  category        TEXT NOT NULL,
  author          TEXT NOT NULL,
  published_on    TEXT NOT NULL,
  read_minutes    INTEGER NOT NULL,
  download        INTEGER NOT NULL DEFAULT 0,
  tags            TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS industries (
  slug            TEXT PRIMARY KEY,
  position        INTEGER NOT NULL,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  pressures       TEXT NOT NULL,
  services        TEXT NOT NULL,
  proof_point     TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coverage (
  code            TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  region          TEXT NOT NULL,
  mobilise_hours  INTEGER NOT NULL,
  note            TEXT NOT NULL,
  hubs            TEXT NOT NULL,
  hq              INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL,
  bio             TEXT NOT NULL,
  certifications  TEXT NOT NULL,
  is_placeholder  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS testimonials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  quote           TEXT NOT NULL,
  author          TEXT NOT NULL,
  role            TEXT NOT NULL,
  company         TEXT NOT NULL,
  is_placeholder  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faqs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  scope           TEXT NOT NULL,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  reference         TEXT NOT NULL UNIQUE,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  company           TEXT,
  phone             TEXT,
  country           TEXT NOT NULL,
  site_location     TEXT,
  services          TEXT NOT NULL,
  racks             INTEGER,
  servers           INTEGER,
  ports             INTEGER,
  timeline          TEXT,
  urgency           TEXT,
  message           TEXT,
  source            TEXT,
  status            TEXT NOT NULL DEFAULT 'new',
  consent_privacy   INTEGER NOT NULL DEFAULT 0,
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  spam_score        INTEGER NOT NULL DEFAULT 0,
  ip_hash           TEXT,
  notified          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads (status);

CREATE TABLE IF NOT EXISTS subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  double_optin  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  type        TEXT NOT NULL,
  path        TEXT,
  referrer    TEXT,
  country     TEXT,
  meta        TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_at ON events (at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __techmathsDb: Database.Database | undefined;
}

export function dbPath(): string {
  const raw = process.env.TECHMATHS_DB || "./data/techmaths.db";
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

/** Single shared connection per process; migrations are applied on first open. */
export function getDb(): Database.Database {
  if (globalThis.__techmathsDb) return globalThis.__techmathsDb;

  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 4000");
  db.exec(SCHEMA);

  globalThis.__techmathsDb = db;
  return db;
}

export function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}
