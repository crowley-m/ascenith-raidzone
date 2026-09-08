"use client";

import { useEffect } from "react";

const CHUNK_RE =
  /Loading chunk|ChunkLoadError|dynamically imported module|Loading CSS chunk|'text\/html'|Failed to fetch/i;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // A redeploy rotates chunk hashes; a tab from the old build 404s a chunk.
    // Reload once to pick up the new build instead of showing an error.
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a08",
          color: "#e9e1d1",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div>
          <p style={{ letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "0.7rem", color: "#d5303f" }}>
            Something broke
          </p>
          <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 1rem" }}>Reload and try again</h1>
          <button
            onClick={() => (typeof reset === "function" ? reset() : window.location.reload())}
            style={{
              border: "1px solid #d5303f",
              background: "transparent",
              color: "#e9e1d1",
              padding: "0.6rem 1.4rem",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
