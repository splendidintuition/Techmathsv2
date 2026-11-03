import { NextResponse, type NextRequest } from "next/server";

/**
 * Protects the admin console. Runs on the edge runtime, so it only compares a
 * cookie value — all data access stays in the Node route handlers and pages.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get("tm_admin")?.value;
  const authorised = Boolean(token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN);

  if (!authorised && req.nextUrl.pathname.startsWith("/admin") && req.nextUrl.pathname !== "/admin/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
