import { NextResponse } from "next/server";
import { z } from "zod";
import { setLeadStatus } from "@/lib/queries";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["new", "qualified", "quoted", "won", "lost", "spam"]),
});

/** PATCH /api/admin/leads/[id] — update lead status. Admin cookie required. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const cookie = req.headers.get("cookie") ?? "";
  const rawToken = /(?:^|;\s*)tm_admin=([^;]+)/.exec(cookie)?.[1];
  let token: string | undefined;
  try {
    // Next.js URL-encodes cookie values, so decode before comparing.
    token = rawToken ? decodeURIComponent(rawToken) : undefined;
  } catch {
    token = undefined;
  }
  if (!token || !process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  }

  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid lead id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Unknown status value." }, { status: 422 });
  }

  setLeadStatus(id, parsed.data.status);
  return NextResponse.json({ ok: true, id, status: parsed.data.status });
}
