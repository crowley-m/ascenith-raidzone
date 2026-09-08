import s from "./landing.module.css";

type Poster = {
  src: string;
  alt: string;
  tag: string;
};

const POSTERS: Poster[] = [
  {
    src: "/media/key-art-ascenith.webp",
    alt: "ASCENITH — RaidZone custom-server tournament key art: gold and crystal trophy with the club mascot.",
    tag: "ASCENITH",
  },
  {
    src: "/media/promo-solo-duo.webp",
    alt: "Solo / Duo RaidZone promo — two raiders in the wastes: fight to win, loot everything, survive to the end.",
    tag: "Solo / Duo",
  },
  {
    src: "/media/poster-boxing-event.webp",
    alt: "Boxing Event poster — Fight for Glory, pre-champ registration open.",
    tag: "Boxing Event",
  },
  {
    src: "/media/promo-solo-season-1.webp",
    alt: "Solo Mode Season 1 — raider outside an enemy base, 10,000 Crystgin reward pool.",
    tag: "Solo Mode · S1",
  },
  {
    src: "/media/winner-season-2.webp",
    alt: "Season 2 winner: BT, 46,260 Crystgin prize pool.",
    tag: "S2 Winner",
  },
  {
    src: "/media/trophy-ascenith.webp",
    alt: "The ASCENITH RaidZone tournament trophy and a pile of Crystgin.",
    tag: "The prize",
  },
];

export function Posters() {
  return (
    <section className={`${s.posters} ${s.wrap}`} id="seasons">
      <div className={s.postersHead}>
        <span className={s.mark} data-reveal>
          The campaign so far
        </span>
        <h2 data-split>Seasons &amp; events.</h2>
        <p className={s.postersNote} data-reveal>
          Every season is its own bracket, its own prize pool. Past posters and results below.
        </p>
      </div>
      <div className={s.posterWall}>
        {POSTERS.map((p) => (
          <figure className={s.poster} key={p.src} data-reveal>
            <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
            <span className={s.posterCorner} aria-hidden />
            <figcaption className={s.posterTag}>{p.tag}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
