"use client";

import { useEffect, useRef } from "react";
import { useMotionOk } from "./motion";

/**
 * Cinematic hero: a perspective data hall drawn on 2D canvas.
 *
 * Rows of racks recede toward a vanishing point, U-slots and status LEDs are
 * drawn per unit, and light pulses travel the cable trays overhead. Everything
 * is vector math on a 2D context — no WebGL, no libraries, ~250 lines.
 *
 * Behaviour: DPR-aware, pauses when off-screen or hidden, renders a single
 * static frame for reduced-motion users, and never blocks text (aria-hidden).
 */

type Rack = { x: number; z: number; w: number; h: number; side: 1 | -1; seed: number };

const ACCENT = { r: 41, g: 230, b: 255 };

function readAccent(): { r: number; g: number; b: number } {
  if (typeof window === "undefined") return ACCENT;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--tm-accent").trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return ACCENT;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function HeroCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const motionOk = useMotionOk();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let visible = true;
    let accent = readAccent();

    const FLOOR = 0;
    const RACK_H = 2.1;
    const AISLE = 2.6; // half-distance between rack rows
    const rows: Rack[] = [];

    const build = () => {
      rows.length = 0;
      for (let i = 0; i < 11; i++) {
        const z = 5.2 + i * 3.1;
        for (const side of [-1, 1] as const) {
          rows.push({
            x: side * AISLE,
            z,
            w: 1.15,
            h: RACK_H - (i % 3 === 0 ? 0.12 : 0),
            side,
            seed: (i * 7 + (side > 0 ? 3 : 0)) % 11,
          });
        }
      }
    };
    build();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Camera
    let vpX = 0;
    let vpY = 0;
    let f = 520;
    const drift = { x: 0, y: 0 };

    const project = (X: number, Y: number, Z: number) => {
      const z = Math.max(Z, 0.6);
      return { x: vpX + (f * X) / z + drift.x, y: vpY + (f * Y) / z + drift.y, s: f / z };
    };

    const rgba = (a: number, c = accent) => `rgba(${c.r},${c.g},${c.b},${a})`;

    const drawFloor = (t: number) => {
      const horizon = vpY;
      // Longitudinal lines converging to the vanishing point.
      ctx.lineWidth = 1;
      for (let i = -7; i <= 7; i++) {
        const X = i * 1.1;
        const near = project(X, FLOOR, 3.2);
        const far = project(X, FLOOR, 46);
        const g = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
        g.addColorStop(0, `rgba(255,255,255,0.10)`);
        g.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(near.x, near.y);
        ctx.lineTo(far.x, far.y);
        ctx.stroke();
      }
      // Transverse lines, spacing compresses with depth.
      for (let i = 0; i < 26; i++) {
        const z = 3.2 + Math.pow(i, 1.55) * 0.62;
        const l = project(-9, FLOOR, z);
        const r = project(9, FLOOR, z);
        const a = Math.max(0, 0.1 - i * 0.0035);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
      }
      // A cold-aisle light strip down the middle of the floor.
      const strip = ctx.createLinearGradient(0, project(0, FLOOR, 3).y, 0, horizon);
      strip.addColorStop(0, rgba(0.1));
      strip.addColorStop(1, rgba(0));
      ctx.fillStyle = strip;
      const a1 = project(-0.55, FLOOR, 3.2);
      const a2 = project(0.55, FLOOR, 3.2);
      const a3 = project(0.55, FLOOR, 46);
      const a4 = project(-0.55, FLOOR, 46);
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.lineTo(a3.x, a3.y);
      ctx.lineTo(a4.x, a4.y);
      ctx.closePath();
      ctx.fill();
      void t;
    };

    const drawRack = (rack: Rack, t: number) => {
      const X0 = rack.x;
      const X1 = rack.x + rack.side * rack.w;
      const Z0 = rack.z;
      const Z1 = rack.z + 1.05;

      const fBL = project(X0, FLOOR, Z0);
      const fBR = project(X1, FLOOR, Z0);
      const fTL = project(X0, -rack.h, Z0);
      const fTR = project(X1, -rack.h, Z0);
      const bBR = project(X1, FLOOR, Z1);
      const bTR = project(X1, -rack.h, Z1);

      if (fTR.y > vpY + 4 && fBL.y < vpY) return;

      // Side face (facing the aisle) — darker, gives volume.
      ctx.beginPath();
      ctx.moveTo(fBR.x, fBR.y);
      ctx.lineTo(bBR.x, bBR.y);
      ctx.lineTo(bTR.x, bTR.y);
      ctx.lineTo(fTR.x, fTR.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.028)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Front face
      ctx.beginPath();
      ctx.moveTo(fBL.x, fBL.y);
      ctx.lineTo(fBR.x, fBR.y);
      ctx.lineTo(fTR.x, fTR.y);
      ctx.lineTo(fTL.x, fTL.y);
      ctx.closePath();
      const depthFade = Math.min(1, 6 / rack.z);
      const g = ctx.createLinearGradient(fTL.x, fTL.y, fBL.x, fBL.y);
      g.addColorStop(0, `rgba(255,255,255,${0.07 * depthFade})`);
      g.addColorStop(1, `rgba(255,255,255,${0.015 * depthFade})`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.09 * depthFade})`;
      ctx.stroke();

      // U-slots
      const units = 12;
      for (let u = 1; u < units; u++) {
        const yF = FLOOR - (rack.h * u) / units;
        const l = project(X0, yF, Z0);
        const r = project(X1, yF, Z0);
        ctx.strokeStyle = `rgba(255,255,255,${0.05 * depthFade})`;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
      }

      // Status LEDs — deterministic per rack so it does not strobe randomly.
      const ledCount = 5;
      for (let l = 0; l < ledCount; l++) {
        const unitIdx = (rack.seed + l * 3) % units;
        const yF = FLOOR - (rack.h * (unitIdx + 0.5)) / units;
        const px = X0 + rack.side * rack.w * 0.22;
        const p = project(px, yF, Z0);
        const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0016 + rack.seed + l * 1.7));
        const r = Math.max(0.6, p.s * 0.012);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(0.28 + 0.55 * blink * depthFade);
        ctx.fill();
      }
    };

    const drawTrays = (t: number) => {
      const trayY = -2.9;
      for (const side of [-1, 1] as const) {
        const X = side * (AISLE - 0.35);
        const near = project(X, trayY, 3.4);
        const far = project(X, trayY, 44);
        const g = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
        g.addColorStop(0, "rgba(255,255,255,0.14)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(near.x, near.y);
        ctx.lineTo(far.x, far.y);
        ctx.stroke();

        // Light pulses travelling along the tray toward the vanishing point.
        for (let p = 0; p < 4; p++) {
          const phase = ((t * 0.00006 + p * 0.25 + (side > 0 ? 0.12 : 0)) % 1);
          const z = 3.4 + Math.pow(phase, 2.1) * 40;
          const pt = project(X, trayY, z);
          const alpha = Math.max(0, 0.9 - phase * 0.9);
          const radius = Math.max(0.8, pt.s * 0.02);
          const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius * 7);
          glow.addColorStop(0, rgba(alpha * 0.85));
          glow.addColorStop(1, rgba(0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius * 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = rgba(alpha);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawAtmosphere = () => {
      // Vignette + horizon glow, both cheap and both help text contrast.
      const glow = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, Math.max(w, h) * 0.5);
      glow.addColorStop(0, rgba(0.1));
      glow.addColorStop(0.45, rgba(0.03));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    };

    const render = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      accent = readAccent();
      vpX = w * 0.5;
      vpY = h * 0.44;
      f = Math.min(620, Math.max(360, w * 0.52));
      drift.x = Math.sin(t * 0.00007) * 14;
      drift.y = Math.cos(t * 0.00009) * 6;

      drawFloor(t);
      // Far to near so nearer racks overlap correctly.
      for (let i = rows.length - 1; i >= 0; i--) drawRack(rows[i], t);
      drawTrays(t);
      drawAtmosphere();
    };

    const loop = (t: number) => {
      if (!running) return;
      if (visible) render(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (!motionOk) render(0);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (motionOk) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Subtle pointer parallax.
    const onPointer = (e: PointerEvent) => {
      if (!motionOk) return;
      drift.x += (e.clientX / window.innerWidth - 0.5) * 0.6;
      drift.y += (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    if (motionOk) start();
    else render(0);

    // Re-render once if the theme flips, so the accent colour updates.
    const mo = new MutationObserver(() => {
      accent = readAccent();
      if (!motionOk) render(0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [motionOk]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
