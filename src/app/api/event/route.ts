import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/queries";

export const runtime = "nodejs";

/**
 * POST /api/event — first-party, cookie-free analytics beacon.
 * Deliberately records as little as possible: event type, path, referrer host.
 */
export async function POST(req: Request) {
  let body: { type?: string; path?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = (body.type ?? "custom").slice(0, 40);
  const path = (body.path ?? "").slice(0, 200);

  let referrerHost: string | undefined;
  const referrer = req.headers.get("referer");
  if (referrer) {
    try {
      referrerHost = new URL(referrer).host.slice(0, 120);
    } catch {
      referrerHost = undefined;
    }
  }

  trackEvent(type, { path, referrer: referrerHost });
  return NextResponse.json({ ok: true });
}
