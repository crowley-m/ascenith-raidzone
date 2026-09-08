"use client";

import { useState } from "react";
import s from "./landing.module.css";

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

export function HowToJoinVideo({ url }: { url: string }) {
  const [play, setPlay] = useState(false);
  const id = ytId(url);
  if (!id) return null;

  return (
    <section className={`${s.joinVid} ${s.wrap}`} id="how-to-join">
      <span className={s.mark} data-reveal>
        Start here
      </span>
      <h2 data-split>How to join.</h2>
      <div className={s.joinVidFrame} data-reveal>
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title="How to join ASCENITH RAIDZONE"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button className={s.joinVidPlay} onClick={() => setPlay(true)} aria-label="Play video">
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
            <span className={s.joinVidTri}>▶</span>
          </button>
        )}
      </div>
    </section>
  );
}
