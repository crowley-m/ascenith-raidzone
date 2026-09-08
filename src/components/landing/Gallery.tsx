import s from "./landing.module.css";

export type GalleryImage = {
  id: string;
  caption: string | null;
  tag: string | null;
};

type Slot = { left: string; top: string; width: string; dur: string; rot: number };

// Art-directed positions; staff fill them from /portal/media.
const SLOTS: Slot[] = [
  { left: "2%", top: "4%", width: "27%", dur: "7s", rot: -2.5 },
  { left: "37%", top: "0%", width: "31%", dur: "9s", rot: 1.5 },
  { left: "73%", top: "9%", width: "25%", dur: "7.6s", rot: 3 },
  { left: "8%", top: "46%", width: "29%", dur: "10s", rot: 2 },
  { left: "42%", top: "42%", width: "27%", dur: "6.6s", rot: -1.5 },
  { left: "72%", top: "53%", width: "24%", dur: "8.8s", rot: -3 },
];

// Once Human atmosphere — shown until staff upload their own stills at /portal/media.
const STILLS = [
  "/media/still-lampman.webp",
  "/media/still-raid.webp",
  "/media/still-monolith.webp",
  "/media/still-horde.webp",
  "/media/still-vista.webp",
];

type Frame = { key: string; src: string; caption: string | null; tag: string | null };

export function Gallery({ images = [] }: { images?: GalleryImage[] }) {
  const shown: Frame[] = images.length
    ? images.slice(0, SLOTS.length).map((img) => ({
        key: img.id,
        src: `/api/media/${img.id}`,
        caption: img.caption,
        tag: img.tag,
      }))
    : STILLS.slice(0, SLOTS.length).map((src) => ({ key: src, src, caption: null, tag: null }));
  if (shown.length === 0) return null;

  return (
    <section className={s.gallery} id="gallery">
      <div className={`${s.galleryHead} ${s.wrap}`}>
        <span className={s.mark} data-reveal>
          05 &middot; The field
        </span>
        <h2 data-split>Where it goes down.</h2>
        <p className={s.galleryNote} data-reveal>
          Custom RaidZone maps and objectives, built for high-stakes encounters.
        </p>
      </div>

      <div className={s.galleryField} data-parallax aria-hidden>
        {shown.map((img, i) => {
          const slot = SLOTS[i];
          return (
            <div
              key={img.key}
              className={s.shotPop}
              data-pop
              style={{ left: slot.left, top: slot.top, width: slot.width }}
            >
              <figure
                className={s.shot}
                style={
                  {
                    "--d": slot.dur,
                    "--r": `${slot.rot}deg`,
                    animationDelay: `${i * -1.4}s`,
                  } as React.CSSProperties
                }
              >
                <div className={s.shotImg}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span className={s.shotCorner} />
                </div>
                {(img.caption || img.tag) && (
                  <figcaption>
                    {img.caption && <span className={s.shotId}>{img.caption}</span>}
                    {img.tag && <span className={s.shotTag}>{img.tag}</span>}
                  </figcaption>
                )}
              </figure>
            </div>
          );
        })}
      </div>
    </section>
  );
}
