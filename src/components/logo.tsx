import Link from "next/link";

/**
 * Tech Maths mark: a rack elevation (three units) inside an engineered bracket,
 * with a rising axis for the "maths". Pure SVG, no image request.
 */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7" stroke="currentColor" strokeOpacity="0.22" />
      <path d="M7 9h18M7 16h18M7 23h18" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <rect x="9" y="6.5" width="5" height="5" rx="1" fill="var(--tm-accent)" />
      <rect x="9" y="13.5" width="9" height="5" rx="1" fill="currentColor" fillOpacity="0.75" />
      <rect x="9" y="20.5" width="3" height="5" rx="1" fill="currentColor" fillOpacity="0.35" />
      <path d="M20 24l4.5-7" stroke="var(--tm-accent)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="25.4" cy="15.4" r="1.6" fill="var(--tm-accent)" />
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2.5" aria-label="Tech Maths — home">
      <Logo className="h-10 w-10 text-mist transition-transform duration-500 group-hover:rotate-[-6deg]" />
      <span className="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-mist">
        Tech<span className="text-accent">Maths</span>
      </span>
    </Link>
  );
}
