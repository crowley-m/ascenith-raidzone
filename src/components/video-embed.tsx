"use client";

import { useState } from "react";

function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/);
    return m?.[2] ?? null;
  } catch {
    return null;
  }
}

/** Click-to-play YouTube facade — no network until the viewer hits play. */
export function VideoEmbed({ url, title = "Video" }: { url: string; title?: string }) {
  const [play, setPlay] = useState(false);
  const id = ytId(url);
  if (!id) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden border border-edge bg-black">
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label={`Play: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center border border-white/70 bg-black/50 text-xl text-white transition group-hover:border-teal group-hover:text-teal">
              ▶
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
