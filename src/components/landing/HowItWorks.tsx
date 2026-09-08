import s from "./landing.module.css";

const IS: { text: string; hot?: boolean }[] = [
  { text: "A custom server, built for serious competitive play" },
  { text: "Weekly RaidZone tournaments — purge nights, prime raids, sweeps" },
  { text: "Real sponsored prizes for the squads that win", hot: true },
  { text: "Roster-tracked slots managed via Discord" },
  { text: "Fair play — admins actively ban cheats and exploiters" },
];

const ISNT = [
  "An official Once Human world",
  "Casual co-op PvE",
  "Pay-to-win",
  "Tolerant of cheaters or bug exploiters",
];

/** Permanent "how RAIDZONE works" — an is / isn't face-off. */
export function HowItWorks() {
  return (
    <section className={`${s.vs} ${s.wrap}`} id="how">
      <span className={s.mark} data-reveal>
        01 &middot; How it works
      </span>

      <div className={s.vsGrid}>
        <div className={`${s.vsCol} ${s.vsIs}`} data-reveal>
          <h3>
            RAIDZONE <span className={s.vsWord}>is</span>
          </h3>
          <ul className={s.vsList}>
            {IS.map((it) => (
              <li key={it.text} className={it.hot ? s.vsHot : undefined}>
                <span className={s.vsMark}>{it.hot ? "▸" : "+"}</span>
                {it.text}
              </li>
            ))}
          </ul>
        </div>

        <div className={`${s.vsCol} ${s.vsIsnt}`} data-reveal>
          <h3>
            RAIDZONE <span className={s.vsWord}>isn&rsquo;t</span>
          </h3>
          <ul className={s.vsList}>
            {ISNT.map((t) => (
              <li key={t}>
                <span className={s.vsMark}>&times;</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
