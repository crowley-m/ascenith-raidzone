"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Replays a brief fade+rise on route change by retriggering a CSS animation
 * class on a stable wrapper — deliberately NOT `key`-ing the wrapper by
 * pathname. Keying it forced a full unmount/remount of the entire page
 * subtree on every navigation, which raced with <ScrollReveal>'s own
 * pathname-driven effect (querying `[data-reveal]` for fresh elements to
 * observe) and could leave whole sections permanently stuck at opacity: 0.
 * This way the content updates through React's normal reconciliation, same
 * as before this component existed — only the animation class is replayed.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
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
