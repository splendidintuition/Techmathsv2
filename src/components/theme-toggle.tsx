"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

const KEY = "tm-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const current = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(current);
    document.documentElement.setAttribute("data-theme", current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* private mode — theme still applies for this session */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--tm-line)] text-mute transition-colors hover:border-accent hover:text-accent ${className}`}
    >
      {theme === "dark" ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
    </button>
  );
}

/** Companion control for the motion-reduced mode required by the brief. */
export function MotionToggle({ className = "" }: { className?: string }) {
  const [off, setOff] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("tm-motion") === "off";
    setOff(stored);
    if (stored) document.documentElement.setAttribute("data-motion", "off");
  }, []);

  const toggle = () => {
    const next = !off;
    setOff(next);
    if (next) {
      document.documentElement.setAttribute("data-motion", "off");
      window.localStorage.setItem("tm-motion", "off");
    } else {
      document.documentElement.removeAttribute("data-motion");
      window.localStorage.removeItem("tm-motion");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={off}
      className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--tm-line)] px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-mute transition-colors hover:border-accent hover:text-accent ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${off ? "bg-mute" : "bg-accent pulse-dot"}`} />
      Motion {off ? "off" : "on"}
    </button>
  );
}
