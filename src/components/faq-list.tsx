import type { Faq } from "@/lib/types";
import { IconPlus } from "./icons";

/**
 * Accordion built on <details>/<summary>: accessible, keyboard operable and
 * zero client JavaScript. Structured data is emitted by the page via faqLd().
 */
export function FaqList({ faqs, idPrefix = "faq" }: { faqs: Faq[]; idPrefix?: string }) {
  return (
    <div className="divide-y divide-[color:var(--tm-line)] border-y border-[color:var(--tm-line)]">
      {faqs.map((f, i) => (
        <details key={f.q} className="group" id={`${idPrefix}-${i}`}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
            <span className="text-[1rem] font-medium leading-snug text-mist group-open:text-accent">{f.q}</span>
            <IconPlus className="mt-1 h-4 w-4 shrink-0 text-mute transition-transform duration-300 group-open:rotate-45 group-open:text-accent" />
          </summary>
          <p className="max-w-3xl pb-6 pr-8 text-[0.92rem] leading-relaxed text-mute">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
