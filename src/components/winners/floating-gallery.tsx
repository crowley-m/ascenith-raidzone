export type FloatItem = {
  key: string;
  src: string;
  alt: string;
  eyebrow?: string | null;
  badge?: string | null;
  title?: string | null;
  sub?: string | null;
};

// gentle scatter — rotation + float timing per slot, wraps for any count
const SCATTER = [
  { rot: -2.5, dur: "7s", lift: "0" },
  { rot: 2, dur: "9s", lift: "2.5rem" },
  { rot: -1.5, dur: "8.2s", lift: "1rem" },
  { rot: 3, dur: "7.6s", lift: "0" },
  { rot: -3, dur: "10s", lift: "2rem" },
  { rot: 1.5, dur: "8.6s", lift: "1.4rem" },
];

export function FloatingGallery({
  items,
  fit = "cover",
}: {
  items: FloatItem[];
  fit?: "cover" | "contain";
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
      {items.map((it, i) => {
        const s = SCATTER[i % SCATTER.length];
        const hasCaption = it.eyebrow || it.badge || it.title || it.sub;
        return (
          <figure
            key={it.key}
            className="float-tile mb-6 break-inside-avoid border border-edge bg-black shadow-[0_22px_55px_-22px_rgba(0,0,0,0.75)]"
            style={
              {
                "--rot": `${s.rot}deg`,
                marginTop: i < 3 ? s.lift : undefined,
                animationDuration: s.dur,
                animationDelay: `${i * -1.3}s`,
              } as React.CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.src}
              alt={it.alt}
              loading="lazy"
              className={
                fit === "contain"
                  ? "block aspect-video w-full object-contain"
                  : "block w-full"
              }
            />
            {hasCaption && (
              <figcaption className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-3">
                {it.eyebrow && (
                  <span className="font-mono text-xs uppercase tracking-wide text-teal">
                    {it.eyebrow}
                  </span>
                )}
                {it.badge && (
                  <span className="border border-teal/40 px-1.5 py-0.5 text-[0.62rem] uppercase tracking-wide text-teal">
                    {it.badge}
                  </span>
                )}
                {it.title && (
                  <span className="w-full font-display font-bold text-white">{it.title}</span>
                )}
                {it.sub && <span className="text-sm text-slate-400">{it.sub}</span>}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
