import localFont from "next/font/local";

/**
 * Self-hosted variable fonts — no third-party requests at build or runtime.
 * Space Grotesk (display grotesk) + Inter (text) + JetBrains Mono (technical detail).
 */
export const display = localFont({
  src: "../../public/fonts/space-grotesk-var.woff2",
  variable: "--tm-font-display",
  display: "swap",
  weight: "300 700",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const sans = localFont({
  src: "../../public/fonts/inter-var.woff2",
  variable: "--tm-font-sans",
  display: "swap",
  weight: "300 700",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const mono = localFont({
  src: "../../public/fonts/jetbrains-var.woff2",
  variable: "--tm-font-mono",
  display: "swap",
  weight: "400 700",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  adjustFontFallback: "Arial",
});

export const fontVariables = `${display.variable} ${sans.variable} ${mono.variable}`;
