import Link from "next/link";
import { Btn } from "@/components/ui";
import { IconArrow } from "@/components/icons";

/** Branded 404: on-theme, useful, and never a dead end. */
export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div className="grid-field grid-fade pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--tm-glow),transparent_65%)] opacity-20"
        aria-hidden="true"
      />
      <div className="shell relative py-20">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.24em] text-accent">Error 404</p>
        <h1 className="mt-6 max-w-3xl text-[clamp(2.4rem,7vw,5rem)] leading-[0.98]">
          This rack position
          <br />
          is empty.
        </h1>
        <p className="mt-7 max-w-xl text-[1.02rem] leading-relaxed text-mute">
          The page you asked for is not provisioned. It may have been decommissioned, or the link was patched to
          the wrong port. Either way, here is where the useful things live.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Btn href="/" size="lg" arrow>
            Back to home
          </Btn>
          <Btn href="/services" variant="outline" size="lg">
            Service catalogue
          </Btn>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line)] bg-[color:var(--tm-line)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/services", t: "Services", d: "All nine delivery services" },
            { href: "/coverage", t: "Coverage", d: "28 countries and mobilisation times" },
            { href: "/projects", t: "Projects", d: "Case studies with measured results" },
            { href: "/contact", t: "Request a quote", d: "Reply within four business hours" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group bg-ink p-6 transition-colors hover:bg-[color:var(--tm-panel)]"
            >
              <p className="text-[1rem] text-mist">{l.t}</p>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-mute">{l.d}</p>
              <span className="mt-4 inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute transition-colors group-hover:text-accent">
                Open
                <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
