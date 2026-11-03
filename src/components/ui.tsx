import Link from "next/link";
import type { ReactNode } from "react";
import { IconArrow, IconCheck, IconClose } from "./icons";

type Variant = "primary" | "outline" | "ghost" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-[color:var(--tm-accent-ink)] border border-transparent hover:brightness-110 shadow-[0_14px_40px_-18px_var(--tm-glow)]",
  outline: "border border-[color:var(--tm-line-strong)] text-mist hover:border-accent hover:text-accent",
  ghost: "border border-transparent text-mist hover:bg-[color:var(--tm-accent-soft)] hover:text-accent",
  quiet: "border border-[color:var(--tm-line)] text-mute hover:text-mist hover:border-[color:var(--tm-line-strong)]",
};

const SIZES = {
  sm: "text-[0.8rem] px-4 py-2",
  md: "text-[0.88rem] px-6 py-3",
  lg: "text-[0.95rem] px-7 py-3.5",
};

type BtnProps = {
  children: ReactNode;
  href?: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  arrow?: boolean;
  external?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
  "data-magnetic"?: boolean;
};

const baseBtn =
  "group relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Btn({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  arrow = false,
  external = false,
  onClick,
  type = "button",
  disabled,
  ariaLabel,
  ...rest
}: BtnProps) {
  const cls = `${baseBtn} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {arrow && (
        <IconArrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      )}
    </>
  );

  if (href) {
    const isExternal = external || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
    if (isExternal) {
      return (
        <a
          href={href}
          className={cls}
          onClick={onClick}
          aria-label={ariaLabel}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} onClick={onClick} aria-label={ariaLabel} {...rest}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...rest}>
      {inner}
    </button>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "warn" }) {
  const tones = {
    default: "border-[color:var(--tm-line)] text-mute",
    accent: "border-[color:var(--tm-accent)]/40 text-accent bg-[color:var(--tm-accent-soft)]",
    warn: "border-[color:var(--tm-warn)]/45 text-[color:var(--tm-warn)]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
  className = "",
  level = "h2",
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  level?: "h1" | "h2";
  children?: ReactNode;
}) {
  const Heading = level;
  return (
    <div className={`${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} ${className}`}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <Heading className="text-[clamp(1.85rem,4.2vw,3.1rem)]">{title}</Heading>
      {lead && <p className="mt-5 text-[1.02rem] leading-relaxed text-mute">{lead}</p>}
      {children}
    </div>
  );
}

/** Marks illustrative content so nothing on the site can be mistaken for a verified claim. */
export function PlaceholderTag({ label = "Illustrative reference" }: { label?: string }) {
  return (
    <span
      title="Placeholder content pending real client reference"
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[color:var(--tm-warn)]/50 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[color:var(--tm-warn)]"
    >
      <span className="h-1 w-1 rounded-full bg-[color:var(--tm-warn)]" />
      {label}
    </span>
  );
}

export function IncludeList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[0.92rem] leading-relaxed text-mist/90">
          <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExcludeList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[0.92rem] leading-relaxed text-mute">
          <IconClose className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-[color:var(--tm-line)] ${className}`} />;
}

export function StatBlock({
  value,
  suffix,
  label,
  note,
}: {
  value: string;
  suffix?: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="group relative">
      <p className="font-display text-[clamp(2rem,4.6vw,3.2rem)] leading-none tracking-[-0.04em]">
        {value}
        {suffix && <span className="text-accent">{suffix}</span>}
      </p>
      <p className="mt-2 text-[0.85rem] text-mute">{label}</p>
      {note && <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute">{note}</p>}
      <span className="absolute -bottom-4 left-0 h-px w-0 bg-accent transition-all duration-500 group-hover:w-full" />
    </div>
  );
}
