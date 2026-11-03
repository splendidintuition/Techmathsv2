"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** True when the user has asked for reduced motion, in the OS or via our toggle. */
export function useMotionOk(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => {
      const manual = document.documentElement.getAttribute("data-motion") === "off";
      setOk(!mq.matches && !manual);
    };
    read();
    mq.addEventListener("change", read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      mq.removeEventListener("change", read);
      mo.disconnect();
    };
  }, []);
  return ok;
}

/** Adds `.is-in` once the element enters the viewport. Pure CSS does the animating. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header" | "figure";
  once?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            if (once) io.unobserve(e.target);
          } else if (!once) {
            e.target.classList.remove("is-in");
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    // @ts-expect-error — polymorphic ref across a small tag union
    <Tag ref={ref} className={`reveal ${className}`} style={{ ["--reveal-delay" as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Line-mask heading reveal: each line slides up from behind its own mask. */
export function MaskLines({
  lines,
  className = "",
  delayStep = 90,
  as: Tag = "h1",
}: {
  lines: string[];
  className?: string;
  delayStep?: number;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add("is-in");
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // @ts-expect-error — polymorphic ref across a small tag union
    <Tag ref={ref} className={`${className}`}>
      {lines.map((line, i) => (
        <span key={line + i} className="line-mask">
          <span style={{ ["--reveal-delay" as string]: `${i * delayStep}ms` }}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/** Pointer-following translate on hover. Disabled for reduced motion and touch. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionOk = useMotionOk();

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOk) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      el.style.transform = "translate3d(0,0,0)";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      cancelAnimationFrame(raf);
    };
  }, [motionOk, strength]);

  return (
    <span ref={ref} className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
      {children}
    </span>
  );
}

/** Subtle scroll parallax. Reads scroll position on rAF, never on every event. */
export function Parallax({ children, speed = 0.12, className = "" }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const motionOk = useMotionOk();

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOk) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [motionOk, speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: motionOk ? "transform" : undefined }}>
      {children}
    </div>
  );
}

/** Counts up to `value` when scrolled into view. Falls back to the static number. */
export function CountUp({ value, suffix = "", duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const motionOk = useMotionOk();

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOk) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(Math.round(value * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration, motionOk]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
