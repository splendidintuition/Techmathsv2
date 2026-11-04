CREATE TABLE "events" (
	"id" serial PRIMARY KEY,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"path" text,
	"referrer" text,
	"country" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY,
	"reference" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"country" text NOT NULL,
	"site_location" text,
	"services" jsonb DEFAULT '[]' NOT NULL,
	"racks" integer,
	"servers" integer,
	"ports" integer,
	"timeline" text,
	"urgency" text,
	"message" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"consent_privacy" boolean DEFAULT false NOT NULL,
	"consent_marketing" boolean DEFAULT false NOT NULL,
	"spam_score" integer DEFAULT 0 NOT NULL,
	"ip_hash" text,
	"notified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"double_optin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_events_at" ON "events" ("at");--> statement-breakpoint
CREATE INDEX "idx_events_type_at" ON "events" ("type","at");--> statement-breakpoint
CREATE INDEX "idx_leads_created" ON "leads" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" ("status");