"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Ticking "Dd HH:MM:SS" clock counting down to `target`. Renders `fallback`
 * (the static relative-time string) until mounted, so SSR/first paint never
 * shows a clock that's already stale, and again once the target has passed.
 */
export function LiveCountdown({ target, fallback }: { target: string; fallback: string }) {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <>{fallback}</>;
  const diff = targetMs - now;
  if (diff <= 0) return <>{fallback}</>;

  const { d, h, m, s } = parts(diff);
  return (
    <span className="tabular-nums">{d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`}</span>
  );
}
