import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

/** POST /admin/logout — clears the session cookie and returns to the sign-in page. */
export async function POST(req: NextRequest) {
  // Redirect against the incoming origin so this works behind any proxy host.
  const target = new URL("/admin/login", req.nextUrl.origin);
  const res = NextResponse.redirect(target, { status: 303 });
  res.cookies.set("tm_admin", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
