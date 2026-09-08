"use client";

import { useState } from "react";
import { parseVideo } from "@/lib/video";

type Video = { id: string; url: string; title: string | null };

function Facade({ url, title }: { url: string; title: string | null }) {
  const [play, setPlay] = useState(false);
  const v = parseVideo(url);

  if (v.kind === "youtube" && v.ytId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden border border-edge bg-black">
        {play ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${v.ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title ?? "Match video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlay(true)}
            aria-label={`Play${title ? `: ${title}` : ""}`}
            className="group absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.thumb ?? ""}
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

  // Twitch / TikTok / other — link out
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex aspect-video w-full items-center justify-center border border-edge bg-black text-center transition hover:border-teal"
    >
      <span>
        <span className="block font-display text-2xl uppercase text-white">Watch on {v.host}</span>
        <span className="mt-1 block font-mono text-xs uppercase tracking-widest text-slate-400">
          Opens {v.host} ↗
        </span>
      </span>
    </a>
  );
}

export function SeasonVideos({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;
  const [featured, ...rest] = videos;

  return (
    <div>
      <Facade url={featured.url} title={featured.title} />
      {featured.title && (
        <p className="mt-2 font-mono text-xs uppercase tracking-wide text-slate-400">
          {featured.title}
        </p>
      )}

      {rest.length > 0 && (
        <ul className="mt-6 divide-y divide-edge/60 border-t border-edge/60">
          {rest.map((vid) => {
            const v = parseVideo(vid.url);
            return (
              <li key={vid.id}>
                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 py-3 transition hover:text-teal"
                >
                  <span className="grid h-10 w-16 shrink-0 place-items-center border border-edge bg-black text-xs text-slate-500">
                    {v.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "▶"
                    )}
                  </span>
                  <span className="flex-1 text-sm text-slate-200">
                    {vid.title ?? `${v.host} clip`}
                  </span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-widest text-slate-500">
                    {v.host} ↗
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
