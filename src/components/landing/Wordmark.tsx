"use client";

import { useEffect, useRef } from "react";
import s from "./landing.module.css";

const FONT =
  'var(--font-anton), "Arial Narrow", "Oswald", "Impact", system-ui, sans-serif';

/**
 * RAIDZONE hero wordmark — an SVG halftone dot-screen render of the word.
 * Calm treatment: wipes in on load, the dot field drifts slowly (SMIL),
 * and it leans away from the cursor. Pure SVG + CSS + one tiny rAF; no WebGL.
 */
export function Wordmark() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const near = Math.max(0, 1 - Math.hypot(dx, dy) * 0.85);
      tx = -dx * 16 * near;
      ty = -dy * 11 * near;
    };
    const loop = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.setProperty("--wmx", `${cx.toFixed(2)}px`);
      el.style.setProperty("--wmy", `${cy.toFixed(2)}px`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={s.wm} ref={ref} data-wm>
      <svg
        className={s.wmSvg}
        viewBox="0 0 1440 460"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="RAIDZONE"
      >
        <defs>
          <pattern
            id="rzHalftone"
            width="9"
            height="9"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="4.5" cy="4.5" r="2.5" fill="#ffffff" />
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              values="0 0; 2.4 -3; -2 1.6; 1 2; 0 0"
              keyTimes="0; 0.25; 0.55; 0.8; 1"
              dur="11s"
              calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
              repeatCount="indefinite"
            />
          </pattern>
        </defs>
        <text
          x="720"
          y="372"
          textAnchor="middle"
          textLength="1400"
          lengthAdjust="spacingAndGlyphs"
          fontFamily={FONT}
          fontSize="392"
          fontWeight={400}
          fill="url(#rzHalftone)"
        >
          RAIDZONE
        </text>
      </svg>
    </div>
  );
}
