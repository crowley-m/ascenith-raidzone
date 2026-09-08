import s from "./landing.module.css";

type Shot = {
  id: string;
  tag: string;
  left: string;
  top: string;
  width: string;
  dur: string;
  rot: number;
};

/**
 * Floating gallery of raid stills. Frames are placeholders — drop real
 * screenshots into /public/gallery and swap `shotImg` for an <img>.
 */
const SHOTS: Shot[] = [
  { id: "PURGE 04", tag: "base hold", left: "2%", top: "4%", width: "27%", dur: "7s", rot: -2.5 },
  { id: "PRIME 02", tag: "war target", left: "37%", top: "0%", width: "31%", dur: "9s", rot: 1.5 },
  { id: "SWEEP 11", tag: "deviant run", left: "73%", top: "9%", width: "25%", dur: "7.6s", rot: 3 },
  { id: "PURGE 03", tag: "night ops", left: "8%", top: "46%", width: "29%", dur: "10s", rot: 2 },
  { id: "PRIME 01", tag: "first blood", left: "42%", top: "42%", width: "27%", dur: "6.6s", rot: -1.5 },
  { id: "SWEEP 08", tag: "extraction", left: "72%", top: "53%", width: "24%", dur: "8.8s", rot: -3 },
];

export function Gallery() {
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
        {SHOTS.map((sh, i) => (
          <figure
            key={sh.id}
            className={s.shot}
            data-float
            style={
              {
                left: sh.left,
                top: sh.top,
                width: sh.width,
                "--d": sh.dur,
                "--r": `${sh.rot}deg`,
                animationDelay: `${i * -1.4}s`,
              } as React.CSSProperties
            }
          >
            <div className={s.shotImg}>
              <span className={s.shotCorner} />
              <span className={s.shotSig}>{"// signal pending"}</span>
            </div>
            <figcaption>
              <span className={s.shotId}>{sh.id}</span>
              <span className={s.shotTag}>{sh.tag}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
