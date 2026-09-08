export type GalleryItem = {
  key: string;
  src: string;
  alt: string;
  caption?: string | null;
};

/** Clean uniform grid — image tiles, optional caption under each. */
export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <figure key={it.key}>
          <div className="overflow-hidden border border-edge bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.src}
              alt={it.alt}
              loading="lazy"
              className="block aspect-video w-full object-cover transition duration-500 hover:scale-[1.03]"
            />
          </div>
          {it.caption && (
            <figcaption className="mt-3 text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-300">
              {it.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
