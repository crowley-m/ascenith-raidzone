"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Status = "idle" | "loading" | "done";

/**
 * Thin top progress bar for route navigation. The App Router has no
 * navigation-start event to hook into, so this starts growing the moment an
 * internal link is clicked (the same trick NProgress-style bars use — it
 * reads as "responded instantly" even before any fetch begins) and snaps to
 * 100%+fades once the pathname/search actually change, meaning the new
 * page's data has landed. A failsafe clears it if a click never turns into
 * a navigation (e.g. it was intercepted, or prevented).
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
    <div aria-hidden className="fixed inset-x-0 top-0 z-[200] h-[2px]">
      <div className={`h-full bg-teal ${status === "loading" ? "nav-progress-loading" : "nav-progress-done"}`} />
    </div>
  );
}
