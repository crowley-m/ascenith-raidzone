"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Restrained scroll reveal for the public showcase pages. Any element with
 * `data-reveal` fades + rises 12px into place once, when it first enters the
 * viewport. Respects prefers-reduced-motion, and a failsafe un-hides anything
 * the observer never caught. No dependency — one IntersectionObserver.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (els.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      els.forEach((el) => el.classList.add("reveal-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));

    const failsafe = window.setTimeout(() => {
      els.forEach((el) => el.classList.add("reveal-in"));
    }, 2500);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [pathname]);

  return null;
}
