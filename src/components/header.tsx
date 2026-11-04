"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconArrowUpRight, IconClose, IconMenu, IconSearch } from "./icons";
import { Wordmark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Btn } from "./ui";

type NavService = { slug: string; title: string; short: string };

const NAV = [
  { label: "Services", href: "/services", key: "services" },
  { label: "Coverage", href: "/coverage" },
  { label: "How we work", href: "/how-we-work" },
  { label: "Industries", href: "/industries" },
  { label: "Projects", href: "/projects" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
];

export function Header({ services }: { services: NavService[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const closeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close everything on route change or Escape.
  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMegaOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("tm:search-open"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  closeRef.current = () => {
    setMenuOpen(false);
    setMegaOpen(false);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-[70] transition-all duration-500 ${
          scrolled
            ? "border-b border-[color:var(--tm-line)] bg-[color:var(--tm-ink)]/85 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <div className="shell flex h-[72px] items-center justify-between gap-4">
          <Wordmark />

          <nav className="hidden shrink-0 items-center gap-0 xl:flex" aria-label="Main">
            {NAV.map((item) =>
              item.key === "services" ? (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setMegaOpen(true)}
                  onMouseLeave={() => setMegaOpen(false)}
                >
                  <Link
                    href={item.href}
                    onFocus={() => setMegaOpen(true)}
                    aria-expanded={megaOpen}
                    className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[0.86rem] transition-colors ${
                      isActive(item.href) ? "text-accent" : "text-mute hover:text-mist"
                    }`}
                  >
                    {item.label}
                  </Link>
                  <div
                    className={`fixed left-1/2 top-[72px] w-[min(52rem,92vw)] -translate-x-1/2 pt-3 transition-all duration-300 ${
                      megaOpen ? "visible opacity-100" : "invisible opacity-0"
                    }`}
                  >
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-[color:var(--tm-line-strong)] bg-[color:var(--tm-line)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] sm:grid-cols-3">
                      {services.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/services/${s.slug}`}
                          onClick={() => setMegaOpen(false)}
                          className="group bg-[color:var(--tm-ink-2)] p-4 transition-colors hover:bg-[color:var(--tm-panel)]"
                        >
                          <span className="flex items-center justify-between text-[0.9rem] text-mist">
                            {s.title}
                            <IconArrowUpRight className="h-3.5 w-3.5 text-mute transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                          </span>
                          <span className="mt-1.5 block text-[0.76rem] leading-relaxed text-mute">{s.short}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[0.86rem] transition-colors ${
                    isActive(item.href) ? "text-accent" : "text-mute hover:text-mist"
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("tm:search-open"))}
              className="hidden h-9 items-center gap-2 rounded-full border border-[color:var(--tm-line)] px-3 text-mute transition-colors hover:border-accent hover:text-accent sm:inline-flex"
              aria-label="Search the site"
            >
              <IconSearch className="h-4 w-4" />
              <span className="font-mono text-[0.62rem] tracking-[0.12em]">⌘K</span>
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <div className="hidden sm:block">
              <Btn href="/contact" size="sm" arrow>
                Request a quote
              </Btn>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--tm-line)] text-mist xl:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconClose className="h-4 w-4" /> : <IconMenu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[65] xl:hidden ${menuOpen ? "visible" : "invisible"}`}
        aria-hidden={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-ink/95 backdrop-blur-xl transition-opacity duration-400 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          className={`absolute inset-x-0 top-[72px] max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-[color:var(--tm-line)] px-5 pb-10 pt-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-y-0" : "-translate-y-4"
          }`}
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {NAV.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-baseline justify-between border-b border-[color:var(--tm-line)] py-3.5 font-display text-[1.5rem] text-mist"
                >
                  {item.label}
                  <span className="font-mono text-[0.6rem] text-mute">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-7 grid gap-2">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                onClick={() => setMenuOpen(false)}
                className="text-[0.86rem] text-mute transition-colors hover:text-accent"
              >
                {s.title}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn href="/contact" arrow onClick={() => setMenuOpen(false)}>
              Request a quote
            </Btn>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </>
  );
}
