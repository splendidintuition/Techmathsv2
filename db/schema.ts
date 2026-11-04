import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Quote requests submitted through the contact form. */
export const leads = pgTable(
  "leads",
  {
    id: serial().primaryKey(),
    reference: text().notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text().notNull(),
    email: text().notNull(),
    company: text(),
    phone: text(),
    country: text().notNull(),
    siteLocation: text("site_location"),
    services: jsonb().$type<string[]>().notNull().default([]),
    racks: integer(),
    servers: integer(),
    ports: integer(),
    timeline: text(),
    urgency: text(),
    message: text(),
    source: text(),
    status: text().notNull().default("new"),
    consentPrivacy: boolean("consent_privacy").notNull().default(false),
    consentMarketing: boolean("consent_marketing").notNull().default(false),
    spamScore: integer("spam_score").notNull().default(0),
    ipHash: text("ip_hash"),
    notified: boolean().notNull().default(false),
  },
  (t) => [index("idx_leads_created").on(t.createdAt), index("idx_leads_status").on(t.status)],
);

/** Newsletter sign-ups. */
export const subscribers = pgTable("subscribers", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  doubleOptin: boolean("double_optin").notNull().default(false),
});

/** First-party, consent-gated analytics events. */
export const events = pgTable(
  "events",
  {
    id: serial().primaryKey(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    type: text().notNull(),
    path: text(),
    referrer: text(),
    country: text(),
    meta: jsonb(),
  },
  (t) => [index("idx_events_at").on(t.at), index("idx_events_type_at").on(t.type, t.at)],
);
