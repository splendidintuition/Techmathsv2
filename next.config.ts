import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
      } catch {
        return "";
      }
    })()
  : "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The Arena development preview is embedded cross-origin. Production keeps
  // the stricter framing policy below.
  ...(isDev ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "0" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next's development refresh runtime uses eval; never allow it in prod.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${supabaseHost}${isDev ? " ws: wss:" : ""}`.trim(),
      isDev ? "frame-ancestors 'self' https://arena.ai https://*.arena.ai https://*.e2b.app" : "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Keep the live development preview separate from production QA builds.
  distDir: isDev ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: ["*.e2b.app", "127.0.0.1", "localhost"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
