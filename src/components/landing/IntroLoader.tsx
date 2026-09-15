"use client";

import { useEffect, useRef, useState } from "react";
import s from "./landing.module.css";

// Module-level, not state — survives client-side nav away from and back to
// "/" within the same session, so the intro only ever plays on a genuine
// fresh load of the site, never on an in-app return to the homepage.
let introShown = false;

const FINAL_TEXT = "ASCENITH·RAIDZONE";
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#";
const SCRAMBLE_MS = 480;
const HOLD_MS = 1150;
const FADE_MS = 450;

/** Full-screen glitch-decode boot sequence, shown once, on the site's actual entry point. */
export function IntroLoader() {
  const [visible, setVisible] = useState(!introShown);
  const [leaving, setLeaving] = useState(false);
  const [statusIn, setStatusIn] = useState(false);
  const wordRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (introShown) return;
    introShown = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(false);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const scramble = (now: number) => {
      const el = wordRef.current;
      if (!el) return;
      const progress = Math.min(1, (now - start) / SCRAMBLE_MS);
      const revealCount = Math.floor(progress * FINAL_TEXT.length);
      let out = "";
      for (let i = 0; i < FINAL_TEXT.length; i++) {
        const c = FINAL_TEXT[i];
        out += i < revealCount || c === "·" ? c : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      el.textContent = out;
      if (progress < 1) raf = requestAnimationFrame(scramble);
      else el.textContent = FINAL_TEXT;
    };
    raf = requestAnimationFrame(scramble);

    const t1 = window.setTimeout(() => setStatusIn(true), SCRAMBLE_MS + 150);
    const t2 = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const t3 = window.setTimeout(() => setVisible(false), HOLD_MS + FADE_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`${s.introLoader} ${leaving ? s.introLoaderOut : ""}`} aria-hidden>
      <div className={s.introInner}>
        <div className={s.introScanband} />
        <div className={s.introGword} ref={wordRef}>
          {FINAL_TEXT}
        </div>
        <div className={`${s.introStatus} ${statusIn ? s.introStatusIn : ""}`}>Status: Online</div>
      </div>
    </div>
  );
}
