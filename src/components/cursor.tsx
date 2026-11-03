"use client";

import { useEffect } from "react";
import { useMotionOk } from "./motion";

/**
 * Custom cursor: a lerped ring that grows over interactive elements.
 * Never renders for touch devices or reduced-motion users.
 */
export function Cursor() {
  const motionOk = useMotionOk();

  useEffect(() => {
    if (!motionOk) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const dot = document.createElement("div");
    dot.className = "tm-cursor";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.body.style.cursor = "auto";

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest("a, button, input, textarea, select, [data-cursor='hover']");
      dot.classList.toggle("is-hover", Boolean(interactive));
    };

    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      dot.style.transform = `translate3d(${x - dot.offsetWidth / 2}px, ${y - dot.offsetHeight / 2}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      dot.remove();
    };
  }, [motionOk]);

  return null;
}
