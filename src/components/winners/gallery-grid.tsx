"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type GalleryItem = {
  key: string;
  src: string;
  alt: string;
  caption?: string | null;
};

/**
 * Uniform image grid with a click-to-expand lightbox. Pass `limit` + `moreHref`
 * to cap the grid and show a "View more" tile linking to the full listing.
 */
export function GalleryGrid({
  items,
  limit,
  moreHref,
  moreCount,
}: {
  items: GalleryItem[];
  limit?: number;
  moreHref?: string;
  moreCount?: number;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const total = moreCount ?? items.length;
  const hasMore = !!moreHref && total > shown.length;

  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)),
    [shown.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((it, i) => (
          <figure key={it.key}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full overflow-hidden border border-edge bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              aria-label={`Expand ${it.alt || "image"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.src}
                alt={it.alt}
                loading="lazy"
                className="block aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </button>
            {it.caption && (
              <figcaption className="mt-3 text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-300">
                {it.caption}
              </figcaption>
            )}
          </figure>
        ))}

        {hasMore && (
          <Link
            href={moreHref}
            className="flex aspect-video items-center justify-center border border-dashed border-edge bg-black/40 text-center font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-teal hover:text-teal"
          >
            View all {total} →
          </Link>
        )}
      </div>

      {open !== null && shown[open] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 font-mono text-xs uppercase tracking-widest text-slate-300 hover:text-white"
          >
            Close ✕
          </button>
          {shown.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-slate-400 hover:text-white sm:left-6"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-slate-400 hover:text-white sm:right-6"
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shown[open].src}
              alt={shown[open].alt}
              className="mx-auto max-h-[82vh] w-auto border border-edge object-contain"
            />
            {shown[open].caption && (
              <figcaption className="mt-4 text-center font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-300">
                {shown[open].caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
