import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteChrome } from "@/components/site-chrome";
import { fontVariables } from "@/lib/fonts";
import { SERVICES } from "@/lib/content/services";
import { SITE_METADATA } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = SITE_METADATA;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0D12" },
    { media: "(prefers-color-scheme: light)", color: "#F2F5F8" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
};

const themeInit = `(function(){try{var t=localStorage.getItem('tm-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.setAttribute('data-theme','dark');if(localStorage.getItem('tm-motion')==='off')document.documentElement.setAttribute('data-motion','off');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const services = SERVICES.map((s) => ({ slug: s.slug, title: s.title, short: s.short }));

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={`${fontVariables} min-h-dvh bg-ink text-mist antialiased`}>
        <SiteChrome services={services}>{children}</SiteChrome>
      </body>
    </html>
  );
}
