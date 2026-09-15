"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Status = "idle" | "loading" | "done";

/** Simple skull silhouette — rides the growing edge of the fill, "chasing" the target icon. */
function ChaserIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 1.4C4.9 1.4 2.4 3.8 2.4 7c0 2 1 3.6 2.1 4.6v1.7c0 .4.3.7.7.7h.9v-1.2h.6v1.2h.8v-1.2h.6v1.2h.8v-1.2h.6v1.2h.9c.4 0 .7-.3.7-.7v-1.7C12.6 10.6 13.6 9 13.6 7c0-3.2-2.5-5.6-5.6-5.6z" />
      <circle cx="5.7" cy="6.8" r="1" fill="#0a0a0b" />
      <circle cx="10.3" cy="6.8" r="1" fill="#0a0a0b" />
    </svg>
  );
}

/** Simple running figure — the fixed target near the end of the bar. */
function TargetIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9.6" cy="2.6" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9.2 4.6 6.6 7l1 2.2-2 3.4M9.2 4.6l2.6 1.5-1 3 2 2.9M6.6 7l2.9 1" />
    </svg>
  );
}

/**
 * Top progress bar for route navigation, styled after the "deadline" meme —
 * a crimson fill chases a fixed target icon across a cream track as it
 * grows, instead of a plain hairline. Same underlying mechanics as before:
 * App Router has no navigation-start event, so this starts growing the
 * moment an internal link is clicked, and snaps to 100%+fades once the
 * pathname/search actually change, meaning the new page's data has landed.
 * A failsafe clears it if a click never turns into a navigation.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);
  const [status, setStatus] = useState<Status>("idle");
  const failsafe = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (failsafe.current) window.clearTimeout(failsafe.current);
    setStatus("done");
    const t = window.setTimeout(() => setStatus("idle"), 260);
    return () => window.clearTimeout(t);
  }, [key]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
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
      setStatus("loading");
      if (failsafe.current) window.clearTimeout(failsafe.current);
      failsafe.current = window.setTimeout(() => setStatus("idle"), 5000);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (status === "idle") return null;
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[200] h-4 bg-cream shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
      <TargetIcon className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-void/70" />
      <div
        className={`relative h-full bg-teal ${status === "loading" ? "nav-progress-loading" : "nav-progress-done"}`}
      >
        <ChaserIcon className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 text-teal" />
      </div>
    </div>
  );
}
