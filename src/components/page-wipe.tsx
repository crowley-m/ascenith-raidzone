"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Status = "idle" | "covering" | "revealing";

const DESKTOP_QUERY = "(min-width: 1024px)";
const REVEAL_MS = 180;
const FAILSAFE_MS = 4000;

/**
 * Short chaser-wipe page transition: a crimson bar with a runner icon on its
 * leading edge sweeps across the screen the instant an internal link is
 * clicked, then sweeps the rest of the way off once the destination page's
 * data has actually landed, revealing it underneath.
 *
 * Second attempt at this after two prior versions caused real problems:
 *  - A fade that wrapped page content (PageTransition) forced remounts and
 *    raced with ScrollReveal.
 *  - An earlier full-screen curtain (also PageWipe) had a persistent glow
 *    bleed and, on back/forward, sat covering the screen for however long
 *    the real fetch took (force-dynamic pages aren't cached, so back-nav
 *    isn't instant) — which read as "stuck."
 * This version: deliberately short durations, a back/forward nav skips the
 * reveal-out animation entirely and snaps clear the instant data lands
 * (same real-latency caveat applies — a slow back-nav fetch is still a slow
 * fetch, no animation fixes that), no glow/box-shadow bleed risk since
 * there's nothing rendered at rest, and desktop-only (≥1024px, matching
 * PortalNav's own cutoff) since this got in the way on mobile before.
 */
export function PageWipe() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);
  const [status, setStatus] = useState<Status>("idle");
  const failsafe = useRef<number | undefined>(undefined);
  const elRef = useRef<HTMLDivElement>(null);
  const isBackNav = useRef(false);

  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (failsafe.current) window.clearTimeout(failsafe.current);
    setStatus((s) => {
      if (s !== "covering") return s;
      return isBackNav.current ? "idle" : "revealing";
    });
  }, [key]);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.classList.remove("wipe-cover", "wipe-reveal");
    if (status === "idle") return;
    void el.offsetWidth; // force a reflow so the animation restarts
    el.classList.add(status === "covering" ? "wipe-cover" : "wipe-reveal");
  }, [status]);

  useEffect(() => {
    if (status !== "revealing") return;
    const t = window.setTimeout(() => setStatus("idle"), REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const startCovering = () => {
      setStatus("covering");
      if (failsafe.current) window.clearTimeout(failsafe.current);
      failsafe.current = window.setTimeout(() => setStatus("idle"), FAILSAFE_MS);
    };

    function onClick(e: MouseEvent) {
      if (!window.matchMedia(DESKTOP_QUERY).matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest("a");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download"))
        return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      isBackNav.current = false;
      startCovering();
    }

    function onPopState() {
      if (!window.matchMedia(DESKTOP_QUERY).matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      isBackNav.current = true;
      startCovering();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <div ref={elRef} aria-hidden className="page-wipe">
      {status !== "idle" && (
        <svg
          className="page-wipe-runner"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9.6" cy="2.6" r="1.3" fill="currentColor" stroke="none" />
          <path d="M9.2 4.6 6.6 7l1 2.2-2 3.4M9.2 4.6l2.6 1.5-1 3 2 2.9M6.6 7l2.9 1" />
        </svg>
      )}
    </div>
  );
}
