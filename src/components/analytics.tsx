"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { readConsent } from "./consent";

/**
 * First-party, cookie-free pageview beacon.
 * Fires only after analytics consent, and re-checks on every consent change.
 */
export function Analytics({ domain }: { domain?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    let allowed = readConsent()?.analytics ?? false;

    const send = () => {
      if (!allowed) return;
      // keepalive so the request survives navigation
      fetch("/api/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "pageview", path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    };

    const onConsent = (e: Event) => {
      allowed = Boolean((e as CustomEvent<{ analytics: boolean }>).detail?.analytics);
      if (allowed) send();
    };

    send();
    window.addEventListener("tm:consent", onConsent);
    return () => window.removeEventListener("tm:consent", onConsent);
  }, [pathname]);

  if (!domain) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src={process.env.NEXT_PUBLIC_ANALYTICS_SRC || "https://plausible.io/js/script.js"}
      strategy="afterInteractive"
    />
  );
}
