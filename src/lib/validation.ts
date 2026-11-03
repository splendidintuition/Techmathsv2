import { z } from "zod";

/** Trim + collapse whitespace; caps absurd lengths that would only ever be abuse. */
export const shortText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((v) => v.replace(/\s+/g, " "));

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, " ") : undefined));

export const SERVICE_SLUGS = [
  "rack-and-stack",
  "structured-cabling",
  "server-installation",
  "os-application-installation",
  "network-connection",
  "commissioning-testing",
  "remote-smart-hands",
  "decommissioning-migration",
  "maintenance-field-support",
] as const;

export const TIMELINES = ["Emergency (< 48h)", "2–4 weeks", "1–3 months", "3–6 months", "Planning only"] as const;
export const URGENCIES = ["Critical path", "High", "Normal", "Low"] as const;

/** Consolidated payload from the multi-step quote form (all steps at once). */
export const quoteSchema = z.object({
  // Step 1 — services
  services: z.array(z.enum(SERVICE_SLUGS)).min(1, "Select at least one service."),
  // Step 2 — site
  country: shortText(64),
  siteLocation: optionalText(120),
  // Step 3 — volumes
  racks: z.coerce.number().int().min(0).max(100000).optional(),
  servers: z.coerce.number().int().min(0).max(1000000).optional(),
  ports: z.coerce.number().int().min(0).max(1000000).optional(),
  // Step 4 — timing
  timeline: z.enum(TIMELINES).optional(),
  urgency: z.enum(URGENCIES).optional(),
  // Step 5 — contact
  name: shortText(120),
  email: z.string().trim().toLowerCase().email("Enter a valid work email address."),
  company: optionalText(160),
  phone: optionalText(40),
  message: optionalText(4000),
  consentPrivacy: z.literal(true, { message: "You must accept the privacy notice." }),
  consentMarketing: z.boolean().optional().default(false),
  source: optionalText(120),
  // Anti-abuse
  // Honeypot: people never fill this. Any value is accepted by the schema so the
  // request reaches the spam gate and gets a plausible success instead of a 422.
  website: z.string().max(500).optional(),
  formStartedAt: z.coerce.number().int().optional(),
});

export type QuotePayload = z.infer<typeof quoteSchema>;

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  consent: z.literal(true, { message: "Please confirm you want to subscribe." }),
  website: z.string().max(500).optional(),
});

/**
 * Lightweight, dependency-free abuse scoring.
 *  0 = clean, higher = more suspicious. Nothing here blocks a real request on
 *  its own; the route records the score so a human can triage.
 */
export function spamScore(input: {
  website?: string;
  formStartedAt?: number;
  email: string;
  message?: string;
}): number {
  let score = 0;
  if (input.website) score += 100; // honeypot filled — always a bot
  if (input.formStartedAt) {
    const elapsed = Date.now() - input.formStartedAt;
    if (elapsed < 4000) score += 40; // five-step form completed in under 4s
    if (elapsed > 1000 * 60 * 60 * 24) score += 10; // replayed session
  }
  const disposable = /(mailinator|tempmail|10minutemail|guerrillamail|yopmail|trashmail)\./i;
  if (disposable.test(input.email)) score += 30;
  const free = /(gmail|yahoo|hotmail|outlook|icloud|proton)\./i;
  if (free.test(input.email)) score += 5; // not disqualifying, just a signal
  const urlCount = (input.message ?? "").match(/https?:\/\//g)?.length ?? 0;
  if (urlCount > 3) score += 20;
  return Math.min(score, 100);
}
