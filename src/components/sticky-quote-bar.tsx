"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrow } from "./icons";

/** Appears once the reader is past the hero. Dismissible and keyboard reachable. */
export function StickyQuoteBar({ serviceTitle, href }: { serviceTitle: string; href: string }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || !show) return null;

  return (
    <div className="quote-bar fixed inset-x-0 bottom-0 z-[60]">
      <div className="shell flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.88rem] text-mist">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-accent">Quote</span>
          <span className="ml-3 text-mute">Get a scoped price for</span>{" "}
          <span className="text-mist">{serviceTitle}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:text-mist"
          >
            Dismiss
          </button>
          <Link
            href={href}
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[0.85rem] font-medium text-[color:var(--tm-accent-ink)] transition-opacity hover:opacity-90"
          >
            Get a quote
            <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
