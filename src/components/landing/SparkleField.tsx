"use client";

import { useEffect, useRef } from "react";
import s from "./landing.module.css";

/**
 * Ambient sparkle field for everything below the hero.
 * Fixed canvas, fades in once the hero is scrolled past. Cheap 2D particles.
 * Reduced-motion: a single static frame, no animation.
 */
export function SparkleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let raf = 0;

    type P = { x: number; y: number; z: number; r: number; tw: number; ph: number; hot: boolean };
    let parts: P[] = [];

    const seed = () => {
      const count = Math.round((w * h) / 24000);
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.28 + Math.random() * 0.72,
        r: 0.4 + Math.random() * 1.35,
        tw: 0.5 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        hot: Math.random() < 0.11,
      }));
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const paint = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const a =
          (0.16 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.001 * p.tw + p.ph))) * p.z;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hot
          ? `rgba(213, 48, 63, ${a * 0.95})`
          : `rgba(233, 225, 209, ${a * 0.5})`;
        ctx.fill();
      }
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const p of parts) {
        p.y -= p.z * 6 * dt;
        p.x += Math.sin(now * 0.0002 + p.ph) * 0.12 * p.z;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
      }
      paint(now);
      raf = requestAnimationFrame(loop);
    };

    // fade the field in as the hero scrolls away
    let fadeRaf = 0;
    const onScroll = () => {
      if (fadeRaf) return;
      fadeRaf = requestAnimationFrame(() => {
        fadeRaf = 0;
        const start = window.innerHeight * 0.55;
        const end = window.innerHeight * 1.05;
        const t = (window.scrollY - start) / (end - start);
        cv.style.opacity = String(Math.max(0, Math.min(1, t)));
      });
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduce) {
      paint(performance.now());
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(fadeRaf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={ref} className={s.sparkle} aria-hidden />;
}
