"use client";

import { useEffect, useState } from "react";
import s from "./landing.module.css";

// Module-level, not state — survives client-side nav away from and back to
// "/" within the same session, so the intro only ever plays on a genuine
// fresh load of the site, never on an in-app return to the homepage.
let introShown = false;

const HOLD_MS = 1100;
const FADE_MS = 450;

/** Full-screen boot sequence shown once, on the site's actual entry point. */
export function IntroLoader() {
  const [visible, setVisible] = useState(!introShown);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (introShown) return;
    introShown = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(false);
      return;
    }
    const t1 = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = window.setTimeout(() => setVisible(false), HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`${s.introLoader} ${leaving ? s.introLoaderOut : ""}`} aria-hidden>
      <div className={s.introInner}>
        <div className={s.introMark}>
          ASCENITH<span className={s.introDot}>·</span>RAIDZONE
        </div>
        <div className={s.introBar}>
          <div className={s.introBarFill} />
        </div>
        <div className={s.introLine}>
          BOOTING RAIDZONE
          <span className={s.introCursor} />
        </div>
      </div>
    </div>
  );
}
