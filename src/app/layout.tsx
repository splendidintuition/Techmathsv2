import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@/components/analytics";
import { ConsentBanner } from "@/components/consent";
import { Cursor } from "@/components/cursor";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SearchDialog } from "@/components/search-dialog";
import { COMPANY } from "@/lib/content/site";
import { fontVariables } from "@/lib/fonts";
import { SERVICES } from "@/lib/content/services";
import { SITE_METADATA, SITE_URL } from "@/lib/seo";
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

/**
 * Applies the stored theme and motion preference before first paint so there is
 * no flash of the wrong palette. Deliberately tiny and dependency-free.
 */
const themeInit = `(function(){try{var t=localStorage.getItem('tm-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.setAttribute('data-theme','dark');if(localStorage.getItem('tm-motion')==='off')document.documentElement.setAttribute('data-motion','off');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  // Navigation is published catalogue content. Do not make every dynamic page
  // depend on opening/seeding SQLite just to render the shared shell.
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
        <Header services={services} />
        <main id="main" className="pt-[72px]">
          {children}
        </main>
        <Footer />
        <ConsentBanner />
        <SearchDialog />
        <Cursor />
        <Analytics domain={process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN} />
        <noscript>
          <div className="shell py-4 text-center font-mono text-[0.7rem] uppercase tracking-[0.14em] text-mute">
            {COMPANY.name} · {COMPANY.email} · {COMPANY.phone} · {SITE_URL}
          </div>
        </noscript>
      </body>
    </html>
  );
}
