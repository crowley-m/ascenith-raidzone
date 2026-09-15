"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Status = "idle" | "loading" | "done";

const LOADING_WORDS = ["LINKING…", "SYNCING…"];
const CYCLE_MS = 700;
const DONE_MS = 260;

/**
 * HUD-style corner readout for route navigation, replacing the earlier plain
 * top hairline. App Router has no navigation-start event, so this starts the
 * instant an internal link is clicked and shows "READY" briefly once the
 * pathname/search actually change — i.e. the new page's data has landed —
 * before fading out. A failsafe clears it if a click never turns into a
 * navigation.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);
  const [status, setStatus] = useState<Status>("idle");
  const [wordIndex, setWordIndex] = useState(0);
  const failsafe = useRef<number | undefined>(undefined);
  const cycle = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (failsafe.current) window.clearTimeout(failsafe.current);
    if (cycle.current) window.clearInterval(cycle.current);
    setStatus("done");
    const t = window.setTimeout(() => setStatus("idle"), DONE_MS);
    return () => window.clearTimeout(t);
  }, [key]);

  useEffect(() => {
    if (status !== "loading") return;
    setWordIndex(0);
    cycle.current = window.setInterval(() => {
      setWordIndex((i) => (i + 1) % LOADING_WORDS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(cycle.current);
  }, [status]);

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
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-3.5 right-3.5 z-[200] border border-teal bg-void/85 px-2.5 py-1.5"
    >
      <span className="whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.1em] text-teal">
        {status === "loading" ? LOADING_WORDS[wordIndex] : "READY"}
      </span>
    </div>
  );
}
