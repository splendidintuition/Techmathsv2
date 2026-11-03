"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn } from "./ui";

const KEY = "tm-consent-v1";

export type ConsentState = { necessary: true; analytics: boolean; ts: number };

export function readConsent(): ConsentState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

/** GDPR consent banner. No cookies are set until a choice is made. */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readConsent()) {
      const t = window.setTimeout(() => setVisible(true), 900);
      return () => window.clearTimeout(t);
    }
  }, []);

  const decide = (analytics: boolean) => {
    const state: ConsentState = { necessary: true, analytics, ts: Date.now() };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
    window.dispatchEvent(new CustomEvent("tm:consent", { detail: state }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and analytics consent"
      className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-5"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl border border-[color:var(--tm-line-strong)] bg-[color:var(--tm-ink-2)]/95 p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex-1">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-accent">Privacy</p>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-mute">
            We use no advertising trackers. With your consent we measure page views with a first-party,
            cookie-free counter so we can see which pages are useful. Nothing is shared with third parties.{" "}
            <Link href="/cookie-policy" className="link-underline text-mist">
              Cookie policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Btn variant="quiet" size="sm" onClick={() => decide(false)}>
            Necessary only
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => decide(true)}>
            Allow analytics
          </Btn>
        </div>
      </div>
    </div>
  );
}
