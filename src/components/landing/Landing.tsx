"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import s from "./landing.module.css";
import { rzState } from "./state";
import { useImmersive } from "./useImmersive";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const DISCORD = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "https://discord.gg/a4k3KTfE7";
const REGISTER = "/register";

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [gl, setGl] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hasWebGL = false;
    try {
      hasWebGL = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      hasWebGL = false;
    }
    if (hasWebGL && !reduce) setGl(true);

    // pointer + click feed the 3D scene; scroll is handled by useImmersive
    const onMove = (e: PointerEvent) => {
      rzState.mx = (e.clientX / window.innerWidth) * 2 - 1;
      rzState.my = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onDown = () => {
      rzState.down = 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  useImmersive(rootRef, mounted);

  return (
    <div className={s.root} ref={rootRef}>
      <div className={s.bg} aria-hidden />
      {mounted && gl && <Scene />}
      <div className={s.grain} aria-hidden />
      <div id="rz-prog" className={s.prog} aria-hidden />

      <header className={s.nav}>
        <span className={s.brand}>
          ASCENITH<b>·</b>RAIDZONE
        </span>
        <div className={s.navRight}>
          <a className={s.navLink} href="#raids">
            Raids
          </a>
          <a className={s.navLink} href={DISCORD}>
            Discord
          </a>
          <a className={s.cta} href={REGISTER}>
            Enlist
          </a>
        </div>
      </header>

      <div id="rz-wrapper">
        <div id="rz-content">
          <section className={`${s.hero} ${s.wrap}`} id="top">
            <h1 className={s.kin} aria-label="RAIDZONE" data-kin>
              <span className={s.kinLine}>
                <i>RAID</i>
              </span>
              <span className={s.kinLine}>
                <i>ZONE</i>
              </span>
            </h1>
            <div className={s.under} data-hero-under>
              <p className={s.say}>
                Our server. Your loot. <b>Every week.</b>
              </p>
              <div className={s.acts}>
                <a className={`${s.cta} ${s.ctaBig}`} href={REGISTER}>
                  Enlist your raider
                </a>
                <a className={`${s.cta} ${s.ctaBig} ${s.ctaLine}`} href={DISCORD}>
                  Join Discord
                </a>
              </div>
              <div className={`${s.corner} ${s.micro}`}>
                <span className={s.dot} /> Server&apos;s up · run by NOT POTATOZIE
              </div>
            </div>
            <div className={`${s.scrollCue} ${s.micro}`}>
              Scroll <i />
            </div>
          </section>

          <section className={s.panel} id="raids" data-panel>
            <div className={s.panelInner}>
              <span className={s.idx} data-meta>
                01 — The server
              </span>
              <h2 data-split>Our server.</h2>
              <p className={s.say2} data-meta>
                One custom world, always up. Tuned rulesets, boosted rates on op nights,
                admin-run scenarios. Not an official server.
              </p>
            </div>
          </section>

          <section className={`${s.panel} ${s.panelRight}`} data-panel>
            <div className={s.panelInner}>
              <span className={s.idx} data-meta>
                02 — The operations
              </span>
              <h2 data-split>Weekly raids.</h2>
              <p className={s.say2} data-meta>
                Purge nights, Prime raids, Deviant sweeps. Home base is our server — big ops
                sometimes run elsewhere, and we&apos;ll say where. Slots and rosters in Discord.
              </p>
            </div>
          </section>

          <section className={s.panel} id="rewards" data-panel>
            <div className={s.panelInner}>
              <span className={s.idx} data-meta>
                03 — The split
              </span>
              <h2 data-split>In-game rewards.</h2>
              <p className={s.say2} data-meta>
                Crystgen, Energy Link, mats, blueprints — split to every raider who shows. No
                real money, no cash prizes.
              </p>
            </div>
          </section>

          <section className={s.finale} id="enlist">
            <h2 className={s.finaleHead}>
              <span data-fin>Enlist. Raid.</span>
              <br />
              <span data-fin className={s.c2}>
                Keep the drop.
              </span>
            </h2>
            <p data-meta>Sign in, link Discord, and you&apos;re on the roster for the next one.</p>
            <div className={s.finaleActs} data-meta>
              <a className={`${s.cta} ${s.ctaBig}`} href={REGISTER}>
                Enlist your raider
              </a>
              <a className={`${s.cta} ${s.ctaBig} ${s.ctaLine}`} href={DISCORD}>
                Come to the Discord
              </a>
            </div>
          </section>

          <footer className={s.footer}>
            <span className={s.footerBrand}>
              ASCENITH<b>·</b>RAIDZONE
            </span>
            <nav className={s.footerNav}>
              <a href={REGISTER}>Enlist</a>
              <a href={DISCORD}>Discord</a>
              <a href="/rules">Rules</a>
            </nav>
            <span className={s.footerCo}>
              Run by NOT POTATOZIE · not affiliated with the developers of Once Human.
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
