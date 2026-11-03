import { NextResponse } from "next/server";
import { addSubscriber } from "@/lib/queries";
import { subscribeSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** POST /api/subscribe — newsletter sign-up. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the email address." },
      { status: 422 }
    );
  }

  if (parsed.data.website) {
    // Honeypot: pretend success.
    return NextResponse.json({ ok: true, duplicate: false });
  }

  const result = addSubscriber(parsed.data.email);
  return NextResponse.json({ ok: result.ok, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
}
