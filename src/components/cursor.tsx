"use client";

import { useEffect } from "react";
import { useMotionOk } from "./motion";

/**
 * A mouse-only cursor enhancement. It must never appear before the first real
 * mouse movement, or remain at an old screen position after scrolling or leaving
 * the window. The native cursor is always left intact.
 */
export function Cursor() {
  const motionOk = useMotionOk();

  useEffect(() => {
    if (!motionOk) return;

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let dispose: (() => void) | undefined;

    const syncCapability = () => {
      dispose?.();
      dispose = undefined;
      if (!hoverQuery.matches) return;

      const dot = document.createElement("div");
      dot.className = "tm-cursor";
      dot.setAttribute("aria-hidden", "true");
      document.body.appendChild(dot);

      let x = 0;
      let y = 0;
      let tx = 0;
      let ty = 0;
      let raf = 0;
      let visible = false;

      const hide = () => {
        visible = false;
        dot.classList.remove("is-visible", "is-hover");
        cancelAnimationFrame(raf);
        raf = 0;
      };

      const loop = () => {
        x += (tx - x) * 0.18;
        y += (ty - y) * 0.18;
        const settled = Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1;
        if (settled) {
          x = tx;
          y = ty;
        }
        // Percentage centering keeps the growing hover ring centered without
        // reading layout (offsetWidth) on every animation frame.
        dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        raf = settled ? 0 : requestAnimationFrame(loop);
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") {
          hide();
          return;
        }
        tx = event.clientX;
        ty = event.clientY;
        if (!visible) {
          // Do not animate a phantom ring from the middle of the page.
          x = tx;
          y = ty;
          visible = true;
          dot.classList.add("is-visible");
        }
        const target = event.target instanceof Element ? event.target : null;
        const interactive = target?.closest(
          "a, button, input, textarea, select, [data-cursor='hover']",
        );
        dot.classList.toggle("is-hover", Boolean(interactive));
        if (!raf) raf = requestAnimationFrame(loop);
      };

      const onOut = (event: PointerEvent) => {
        if (event.relatedTarget === null) hide();
      };
      const onVisibility = () => {
        if (document.hidden) hide();
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerout", onOut, { passive: true });
      window.addEventListener("blur", hide);
      // A scroll moves the content under a stationary pointer. Hide until the
      // next movement rather than leaving a stale hover ring over the hero.
      window.addEventListener("scroll", hide, { passive: true, capture: true });
      document.addEventListener("visibilitychange", onVisibility);

      dispose = () => {
        hide();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerout", onOut);
        window.removeEventListener("blur", hide);
        window.removeEventListener("scroll", hide, true);
        document.removeEventListener("visibilitychange", onVisibility);
        dot.remove();
      };
    };

    syncCapability();
    hoverQuery.addEventListener("change", syncCapability);
    return () => {
      hoverQuery.removeEventListener("change", syncCapability);
      dispose?.();
    };
  }, [motionOk]);

  return null;
}
