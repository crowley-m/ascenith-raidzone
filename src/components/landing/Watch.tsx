"use client";

import { useState } from "react";
import s from "./landing.module.css";
import type { YtVideo } from "@/lib/youtube";

const CHANNEL = "https://www.youtube.com/@Potatozie";

const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export function Watch({ videos = [] }: { videos?: YtVideo[] }) {
  const featured = videos[0] ?? null;
  const rest = videos.slice(1, 9);
  const [active, setActive] = useState<YtVideo | null>(null);
  const showing = active ?? featured;

  return (
    <section className={`${s.watch} ${s.wrap}`} id="watch">
      <div className={s.watchHead}>
        <span className={s.mark} data-reveal>
          On the channel
        </span>
        <h2 data-split>Watch the ops.</h2>
        <p className={s.watchNote} data-reveal>
          Latest from POTATOZIE &mdash; raids, recaps and callouts.
        </p>
      </div>

      <div className={s.watchGrid}>
        <div className={s.watchFeature} data-reveal>
          <div className={s.watchThumb}>
            {active ? (
              <iframe
                key={active.id}
                className={s.watchIframe}
                src={embedUrl(active.id)}
                title={active.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : featured ? (
              <button
                type="button"
                className={s.watchPlay}
                style={{ backgroundImage: `url(${thumbUrl(featured.id)})` }}
                onClick={() => setActive(featured)}
                aria-label={`Play: ${featured.title}`}
              >
                <span className={s.playBtn} aria-hidden />
                <span className={s.watchWm}>@POTATOZIE</span>
              </button>
            ) : (
              <a
                className={s.watchPlay}
                href={CHANNEL}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the channel"
              >
                <span className={s.playBtn} aria-hidden />
                <span className={s.watchWm}>@POTATOZIE</span>
              </a>
            )}
          </div>
          <div className={s.watchCap}>
            <span className={s.watchCapId}>
              {showing ? showing.title : "YOUTUBE // @POTATOZIE"}
            </span>
            <a className={s.watchCapTag} href={CHANNEL} target="_blank" rel="noreferrer">
              full channel &rarr;
            </a>
          </div>
        </div>

        <div className={s.watchSide} data-reveal>
          <a className={s.subBtn} href={CHANNEL} target="_blank" rel="noreferrer">
            <span className={s.subIco} aria-hidden />
            <span>Subscribe</span>
          </a>
          <p className={s.subMeta}>New op footage most weeks.</p>
          {rest.length > 0 ? (
            <ul className={s.clipList}>
              {rest.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setActive(v)}
                    className={active?.id === v.id ? s.clipActive : undefined}
                  >
                    <span className={s.clipPlay} aria-hidden />
                    <span className={s.clipTitle}>{v.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={s.clipList}>
              <li>
                <a href={CHANNEL} target="_blank" rel="noreferrer">
                  <span className={s.clipPlay} aria-hidden />
                  <span className={s.clipTitle}>See every op on the channel</span>
                </a>
              </li>
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
