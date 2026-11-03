import { NextResponse, type NextRequest } from "next/server";
import { search } from "@/lib/queries";

export const runtime = "nodejs";

/** GET /api/search?q=… — site search across services, projects, insights and pages. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  if (q.trim().length < 2) {
    return NextResponse.json({ ok: true, hits: [] });
  }
  return NextResponse.json({ ok: true, hits: search(q, 12) });
}
