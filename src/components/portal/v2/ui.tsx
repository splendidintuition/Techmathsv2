"use client";

import type { ReactNode } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import type { Tone } from "@/lib/portal-v2";

/* Shared atoms for the R2 control console. Visual language follows the portal:
   dark navy surfaces, hairline borders, cyan accent, monospace micro-labels. */

const TONE_CLASS: Record<Tone, string> = {
  accent: "border-[#29E6FF]/30 bg-[#29E6FF]/10 text-[#9DF3FF]",
  warn: "border-[#FFB020]/30 bg-[#FFB020]/10 text-[#FFD48A]",
  danger: "border-[#FF6B6B]/30 bg-[#FF6B6B]/10 text-[#FFB4B4]",
  good: "border-[#3DDC97]/30 bg-[#3DDC97]/10 text-[#A8F0CB]",
  muted: "border-white/10 bg-white/[0.04] text-[#AEBBCC]",
};

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.14em] ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-[14px] border border-white/[0.07] bg-[#080D14]/80 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.9)] ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div>
            {title && <h2 className="text-[13px] font-semibold tracking-[0.01em] text-[#E8EEF9]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[11px] text-[#8A99AB]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.015] p-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7E8CA0]">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[24px] font-semibold leading-none text-[#F2F7FF]">{value}</span>
        <Pill tone={tone}>live</Pill>
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-[#8A99AB]">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-[7px] text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-45";
  const variants = {
    primary: "bg-[#29E6FF] text-[#04161A] hover:bg-[#5EEDFF]",
    ghost: "border border-white/12 bg-white/[0.03] text-[#DCE6F5] hover:border-white/25 hover:bg-white/[0.07]",
    danger: "border border-[#FF6B6B]/35 bg-[#FF6B6B]/10 text-[#FFB4B4] hover:bg-[#FF6B6B]/20",
  } as const;
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#8A99AB]">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[10px] border border-white/12 bg-[#0B1119] px-3 py-2 text-[13px] text-[#E8EEF9] outline-none transition placeholder:text-[#5F6F84] focus:border-[#29E6FF]/60 focus:ring-2 focus:ring-[#29E6FF]/15";

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-white/12 px-6 py-10 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7E8CA0]">empty state</div>
      <h3 className="text-[14px] font-semibold text-[#E8EEF9]">{title}</h3>
      <p className="max-w-[46ch] text-[12px] leading-relaxed text-[#8A99AB]">{body}</p>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-6 text-[12px] text-[#8A99AB]">
      <Loader2 size={14} className="animate-spin text-[#29E6FF]" />
      <span className="font-mono uppercase tracking-[0.14em]">{label}</span>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-[12px] text-[#FFB4B4]">
      <AlertCircle size={14} />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-mono text-[10px] uppercase tracking-[0.14em] underline">
          retry
        </button>
      )}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-[18px] border border-white/10 bg-[#0A1017] sm:rounded-[16px]">
        <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0A1017]/95 px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[#E8EEF9]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-[#8A99AB] hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </header>
        <div className="px-4 py-4">{children}</div>
        {footer && <footer className="sticky bottom-0 border-t border-white/[0.07] bg-[#0A1017]/95 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function TableShell({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                className="whitespace-nowrap border-b border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#7E8CA0]"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
