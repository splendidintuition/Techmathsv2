import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidAdminPasscode } from "@/lib/admin-auth";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().trim().min(1).max(200) });

/** POST /api/admin/login — exchanges the passcode for an httpOnly session cookie. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter the access passcode." }, { status: 422 });
  }

  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !isValidAdminPasscode(parsed.data.token)) {
    return NextResponse.json({ ok: false, error: "Incorrect passcode." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("tm_admin", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

/** POST /api/admin/login with an empty body is not supported; logout uses DELETE. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tm_admin", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
