import { NextRequest, NextResponse } from "next/server";

const PORTAL_HOST = "portal.techmaths-dc.com";

/** Serve the portal at the subdomain root while keeping the marketing homepage on the apex. */
export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const hostname = (forwardedHost || request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (hostname !== PORTAL_HOST) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/portal";
    return NextResponse.rewrite(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
