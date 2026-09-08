export type FloatItem = {
  key: string;
  src: string;
  alt: string;
};

// staggered widths + vertical offsets — an editorial gallery wall you pan across
const SLOTS = [
  { w: "clamp(220px, 30vw, 380px)", y: "1.6rem" },
  { w: "clamp(280px, 42vw, 560px)", y: "0" },
  { w: "clamp(200px, 26vw, 320px)", y: "3rem" },
  { w: "clamp(240px, 34vw, 440px)", y: "0.8rem" },
  { w: "clamp(220px, 30vw, 380px)", y: "2.4rem" },
  { w: "clamp(260px, 38vw, 500px)", y: "0" },
];

/**
 * Images only — a horizontal, staggered gallery strip on a ghosted word.
 * Pans/scrolls sideways; no captions.
 */
export function FloatingGallery({
  items,
  watermark,
}: {
  items: FloatItem[];
  watermark?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="relative mt-6 overflow-hidden">
      {watermark && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap font-poster text-[16vw] uppercase leading-none text-white/[0.035]"
        >
          {watermark}
        </span>
      )}

      <div className="relative -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-5 pt-2 [scrollbar-width:thin] sm:gap-6">
        {items.map((it, i) => {
          const slot = SLOTS[i % SLOTS.length];
          return (
            <figure
              key={it.key}
              className="shrink-0 snap-center"
              style={{ width: slot.w, transform: `translateY(${slot.y})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.src}
                alt={it.alt}
                loading="lazy"
                className="block h-auto w-full border border-edge bg-black shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)]"
              />
            </figure>
          );
        })}
      </div>
    </div>
  );
}
