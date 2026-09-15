"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Replays a brief fade on route change by retriggering a CSS animation class
 * on a stable (non-`key`-ed) wrapper — see the CLAUDE.md note on why it's not
 * keyed by pathname: that forced a full remount and raced with ScrollReveal.
 *
 * Uses `useLayoutEffect`, not `useEffect`: the class swap must happen before
 * the browser paints, or the freshly-navigated content briefly paints at
 * full opacity (its default, class-less state) before the animation class
 * gets reapplied a frame later — a visible "flash, then fade back in" that
 * read as janky/slow. `useLayoutEffect` runs synchronously pre-paint, so the
 * browser only ever paints the animated state.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("page-fade-in");
    void el.offsetWidth; // force a reflow so the animation restarts
    el.classList.add("page-fade-in");
  }, [pathname]);

  return (
    <div ref={ref} className="page-fade-in">
      {children}
    </div>
  );
}
