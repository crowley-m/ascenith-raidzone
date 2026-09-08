"use client";

import { useEffect } from "react";

const CHUNK_RE =
  /Loading chunk|ChunkLoadError|dynamically imported module|Loading CSS chunk|Failed to fetch/i;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (CHUNK_RE.test(error.message)) {
      const key = "rz-chunk-reload";
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    }
    console.error(error);
  }, [error]);

  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow text-teal">Something broke</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">Reload and try again</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        If this keeps happening, hard-refresh the page (Ctrl/Cmd + Shift + R).
      </p>
      <button onClick={() => reset()} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
