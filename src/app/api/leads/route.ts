import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createLead, listLeads } from "@/lib/queries";
import { quoteSchema, spamScore } from "@/lib/validation";

export const runtime = "nodejs";

/** Stable, non-reversible identifier for rate-limit triage. Never the raw IP. */
function hashIp(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return crypto.createHash("sha256").update(`${ip}:${process.env.ADMIN_COOKIE_SECRET ?? "tm"}`).digest("hex").slice(0, 16);
}

/** POST /api/leads — the multi-step quote form endpoint. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request body." }, { status: 400 });
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return NextResponse.json({ ok: false, message: "Please check the highlighted fields.", errors }, { status: 422 });
  }

  const data = parsed.data;
  const score = spamScore({
    website: data.website,
    formStartedAt: data.formStartedAt,
    email: data.email,
    message: data.message,
  });

  // Honeypot hit: return a plausible success and store nothing routable.
  if (score >= 100) {
    return NextResponse.json({
      ok: true,
      reference: "TM-0000-0000",
      message: "Thanks — your request is with the delivery desk.",
    });
  }

  let lead: ReturnType<typeof createLead>;
  try {
    lead = createLead({
      name: data.name,
      email: data.email,
      company: data.company,
      phone: data.phone,
      country: data.country,
      siteLocation: data.siteLocation,
      services: data.services,
      racks: data.racks,
      servers: data.servers,
      ports: data.ports,
      timeline: data.timeline,
      urgency: data.urgency,
      message: data.message,
      source: data.source,
      consentPrivacy: data.consentPrivacy,
      consentMarketing: Boolean(data.consentMarketing),
      spamScore: score,
      ipHash: hashIp(req),
    });
  } catch (err) {
    // A serverless deployment may not have a writable/persistent database.
    // Never turn a storage failure into a successful quote acknowledgement.
    console.error("[leads] could not persist quote request", err);
    return NextResponse.json(
      {
        ok: false,
        message: "The quote desk is temporarily unavailable. Your request has not been sent. Please try again shortly or use the email address shown beside the form.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Optional CRM/webhook hand-off. Failures are logged, never surfaced to the user.
  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: lead.reference, lead }),
      });
    } catch (err) {
      console.error("[leads] webhook delivery failed", err);
    }
  }

  const notify = process.env.LEAD_NOTIFY_EMAIL;
  console.info(
    `[leads] ${lead.reference} from ${lead.email} (${lead.country}) — services: ${lead.services.join(", ")}${
      notify ? ` — forward to ${notify}` : ""
    }`
  );

  return NextResponse.json(
    {
      ok: true,
      reference: lead.reference,
      message: `Thanks ${lead.name.split(" ")[0]} — your request is with the delivery desk. We reply within four business hours.`,
    },
    { status: 201 }
  );
}

/** GET /api/leads — admin only; returns the stored lead queue. */
export async function GET(req: NextRequest) {
  if (req.cookies.get("tm_admin")?.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, message: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, leads: listLeads(200) });
}
