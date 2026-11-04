"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@/components/analytics";
import { ConsentBanner } from "@/components/consent";
import { Cursor } from "@/components/cursor";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SearchDialog } from "@/components/search-dialog";
import { COMPANY } from "@/lib/content/site";
import { SITE_URL } from "@/lib/seo";

type NavService = { slug: string; title: string; short: string };

export function SiteChrome({ children, services }: { children: ReactNode; services: NavService[] }) {
  const pathname = usePathname();
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");

  if (isPortal) {
    return <main id="main" className="min-h-dvh">{children}</main>;
  }

  return (
    <>
      <Header services={services} />
      <main id="main" className="pt-[72px]">{children}</main>
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
    </>
  );
}
