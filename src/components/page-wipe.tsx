"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Status = "idle" | "covering" | "revealing";

const REVEAL_MS = 300;
const FAILSAFE_MS = 4000;

/**
 * Curtain-wipe page transition: a panel slides in from the left to cover
 * the screen the instant an internal link is clicked, then slides on off to
 * the right once the destination page's data has actually landed
 * (pathname/search change), revealing it underneath.
 *
 * Deliberately a standalone overlay, always mounted — like <NavProgress> —
 * rather than something wrapping page content. The app's previous fade
 * transition wrapped content and got `key`-remounted / class-toggled, which
 * twice caused real bugs (a full-subtree remount raced with ScrollReveal).
 * This never touches page content at all, so it can't repeat that.
 */
export function PageWipe() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);
  const [status, setStatus] = useState<Status>("idle");
  const failsafe = useRef<number | undefined>(undefined);
  const elRef = useRef<HTMLDivElement>(null);

  // navigation landed — if we were covering, start the reveal
  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (failsafe.current) window.clearTimeout(failsafe.current);
    setStatus((s) => (s === "covering" ? "revealing" : s));
  }, [key]);

  // apply the right animation class pre-paint, restarting it reliably each time
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.classList.remove("wipe-cover", "wipe-reveal");
    if (status === "idle") return;
    void el.offsetWidth; // force a reflow so the animation restarts
    el.classList.add(status === "covering" ? "wipe-cover" : "wipe-reveal");
  }, [status]);

  // once the reveal finishes, go back to idle (resets off-screen, no transition)
  useEffect(() => {
    if (status !== "revealing") return;
    const t = window.setTimeout(() => setStatus("idle"), REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [status]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
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
      setStatus("covering");
      if (failsafe.current) window.clearTimeout(failsafe.current);
      failsafe.current = window.setTimeout(() => setStatus("idle"), FAILSAFE_MS);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={elRef} aria-hidden className="page-wipe">
      <div className="page-wipe-edge" />
    </div>
  );
}
