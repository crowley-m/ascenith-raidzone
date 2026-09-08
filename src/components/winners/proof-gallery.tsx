type ProofImage = { id: string; caption: string | null; tag: string | null };

// gentle scatter — rotation + float timing per slot, wraps for any count
const SCATTER = [
  { rot: -2.5, dur: "7s", lift: "0" },
  { rot: 2, dur: "9s", lift: "2.5rem" },
  { rot: -1.5, dur: "8.2s", lift: "1rem" },
  { rot: 3, dur: "7.6s", lift: "0" },
  { rot: -3, dur: "10s", lift: "2rem" },
  { rot: 1.5, dur: "8.6s", lift: "1.4rem" },
];

export function ProofGallery({ images }: { images: ProofImage[] }) {
  if (images.length === 0) return null;

  return (
    <section className="mt-12 border-t border-edge pt-8">
      <h2 className="font-display text-xl font-bold text-white">Proof</h2>
      <p className="mt-1 text-sm text-slate-500">Payout screenshots, straight from the winners.</p>

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {images.map((img, i) => {
          const s = SCATTER[i % SCATTER.length];
          return (
            <figure
              key={img.id}
              className="proof-tile mb-6 break-inside-avoid border border-edge bg-panel/40 shadow-[0_22px_55px_-22px_rgba(0,0,0,0.75)]"
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
                src={`/api/media/${img.id}`}
                alt={img.caption ?? ""}
                loading="lazy"
                className="block w-full"
              />
              {(img.caption || img.tag) && (
                <figcaption className="flex items-center justify-between gap-2 border-t border-edge/60 px-3 py-2 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em]">
                  {img.caption && <span className="text-teal">{img.caption}</span>}
                  {img.tag && <span className="text-slate-500">{img.tag}</span>}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
