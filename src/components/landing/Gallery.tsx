import s from "./landing.module.css";

export type GalleryImage = {
  id: string;
  caption: string | null;
  tag: string | null;
};

type Slot = {
  left: string;
  top: string;
  width: string;
  dur: string;
  rot: number;
  fallbackId: string;
  fallbackTag: string;
};

/**
 * Floating gallery of raid stills. Slots are art-directed; staff fill them from
 * /portal/media. Empty slots fall back to a "signal pending" placeholder.
 */
const SLOTS: Slot[] = [
  { left: "2%", top: "4%", width: "27%", dur: "7s", rot: -2.5, fallbackId: "PURGE 04", fallbackTag: "base hold" },
  { left: "37%", top: "0%", width: "31%", dur: "9s", rot: 1.5, fallbackId: "PRIME 02", fallbackTag: "war target" },
  { left: "73%", top: "9%", width: "25%", dur: "7.6s", rot: 3, fallbackId: "SWEEP 11", fallbackTag: "deviant run" },
  { left: "8%", top: "46%", width: "29%", dur: "10s", rot: 2, fallbackId: "PURGE 03", fallbackTag: "night ops" },
  { left: "42%", top: "42%", width: "27%", dur: "6.6s", rot: -1.5, fallbackId: "PRIME 01", fallbackTag: "first blood" },
  { left: "72%", top: "53%", width: "24%", dur: "8.8s", rot: -3, fallbackId: "SWEEP 08", fallbackTag: "extraction" },
];

export function Gallery({ images = [] }: { images?: GalleryImage[] }) {
  return (
    <section className={s.gallery} id="gallery">
      <div className={`${s.galleryHead} ${s.wrap}`}>
        <span className={s.mark} data-reveal>
          The field
        </span>
        <h2 data-split>Where it goes down.</h2>
        <p className={s.galleryNote} data-reveal>
          Custom RaidZone maps and objectives, built for high-stakes encounters.
        </p>
      </div>

      <div className={s.galleryField} data-parallax aria-hidden>
        {SLOTS.map((slot, i) => {
          const img = images[i];
          const id = img?.caption || slot.fallbackId;
          const tag = img?.tag || slot.fallbackTag;
          return (
            <div
              key={i}
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
                {img ? (
                  <div className={s.shotImg}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${img.id}`}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span className={s.shotCorner} />
                  </div>
                ) : (
                  <div className={s.shotImg}>
                    <span className={s.shotCorner} />
                    <span className={s.shotSig}>{"// signal pending"}</span>
                  </div>
                )}
                <figcaption>
                  <span className={s.shotId}>{id}</span>
                  <span className={s.shotTag}>{tag}</span>
                </figcaption>
              </figure>
            </div>
          );
        })}
      </div>
    </section>
  );
}
