"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { isStaff } from "@/lib/rbac";
import { NavOverlay } from "@/components/nav-overlay";
import s from "./landing.module.css";
import { useImmersive } from "./useImmersive";
import { SparkleField } from "./SparkleField";
import { Wordmark } from "./Wordmark";
import { Watch } from "./Watch";
import { Gallery, type GalleryImage } from "./Gallery";
import { EventBrief, type OpEvent, type UpcomingOp } from "./EventBrief";
import { HowItWorks } from "./HowItWorks";
import { HowToJoinVideo } from "./HowToJoinVideo";
import type { YtVideo } from "@/lib/youtube";

const DISCORD = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "https://discord.gg/a4k3KTfE7";
const REGISTER = "/register";
const LOGIN = "/login";

const NAV_PAGES = [
  { href: "/events", label: "Events" },
  { href: "/teams", label: "Teams" },
  { href: "/winners", label: "Winners" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
  { href: DISCORD, label: "Discord", external: true },
];
const NAV_SECTIONS = [
  { href: "#event", label: "Current event" },
  { href: "#how", label: "How it works" },
  { href: "#watch", label: "Watch" },
  { href: "#gallery", label: "The field" },
  { href: "#run", label: "Field manual" },
  { href: "#register", label: "Register" },
];

function Box({
  href,
  k,
  children,
  variant,
}: {
  href: string;
  k?: string;
  children: React.ReactNode;
  variant?: "solid" | "plain";
}) {
  return (
    <a
      className={`${s.box} ${variant === "solid" ? s.solid : ""} ${variant === "plain" ? s.plain : ""}`}
      href={href}
    >
      {k ? <span className={s.k}>{k}</span> : null}
      <span className={s.t}>{children}</span>
      <span className={s.arw}>{"→"}</span>
    </a>
  );
}

function About() {
  return (
    <section className={`${s.about} ${s.wrap}`} id="about">
      <div className={s.aboutInner}>
        <div className={s.aboutHead}>
          <span className={s.mark} data-reveal>
            Who we are
          </span>
          <h2 data-split>Competitive survival, run properly.</h2>
        </div>
        <div className={s.aboutBody} data-reveal>
          <p>
            A community server that treats <em>Once Human</em> like a competitive sport &mdash;
            custom RaidZone scenarios where skill decides the outcome.
          </p>
          <p>Fair play, real stakes. Seasoned raider or first drop, there&apos;s a spot on the roster.</p>
        </div>
      </div>
    </section>
  );
}

const RUN: [string, string, string][] = [
  ["Register", "Once. Link your Discord.", "One time"],
  ["Get the call", "Op drops in Discord — time, target, slots.", "In Discord"],
  ["Claim a slot", "First in fills the roster.", "Roster + waitlist"],
  ["Work the op", "Show up, run it with the squad.", "On comms"],
  ["Take the win", "Winners take the prizes.", "Logged"],
];

export function Landing({
  event = null,
  upcoming = [],
  videos = [],
  discordOnline = null,
  gallery = [],
  howToJoinVideo = "",
  seasonLabel = "",
}: {
  event?: OpEvent | null;
  upcoming?: UpcomingOp[];
  videos?: YtVideo[];
  discordOnline?: number | null;
  gallery?: GalleryImage[];
  howToJoinVideo?: string;
  seasonLabel?: string;
}) {
  const season = seasonLabel || "S1";
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const staff = isStaff(user?.role);
  const dashHref = staff ? "/portal" : "/me";

  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [heroVideo, setHeroVideo] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bigEnough = window.matchMedia("(min-width: 820px)").matches;
    if (!reduce && bigEnough) setHeroVideo(true);

    // custom cursor
    const fine = window.matchMedia("(pointer: fine)").matches;
    let raf = 0;
    let cx = 0;
    let cy = 0;
    let tx = 0;
    let ty = 0;
    const cur = cursorRef.current;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      if (cur) cur.style.transform = `translate(${cx}px, ${cy}px)`;
      raf = requestAnimationFrame(loop);
    };
    if (fine && !reduce && cur) {
      window.addEventListener("pointermove", move, { passive: true });
      raf = requestAnimationFrame(loop);
      const hot = () => cur.classList.add(s.hot);
      const cold = () => cur.classList.remove(s.hot);
      const targets = rootRef.current?.querySelectorAll("a, button, [data-wm]") ?? [];
      targets.forEach((t) => {
        t.addEventListener("pointerenter", hot);
        t.addEventListener("pointerleave", cold);
      });
      return () => {
        window.removeEventListener("pointermove", move);
        cancelAnimationFrame(raf);
        targets.forEach((t) => {
          t.removeEventListener("pointerenter", hot);
          t.removeEventListener("pointerleave", cold);
        });
      };
    }
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (heroVideo) videoRef.current?.play().catch(() => {});
  }, [heroVideo]);

  useImmersive(rootRef, mounted);

  return (
    <div className={s.root} ref={rootRef}>
      <div className={s.grain} aria-hidden />
      <div className={s.vignette} aria-hidden />
      <div className={s.cursor} ref={cursorRef} aria-hidden />
      {mounted && <SparkleField />}

      <nav className={s.nav}>
        <span className={s.brand}>
          <span className={s.dot} />
          ASCENITH&middot;RAIDZONE
        </span>
        <div className={s.navMid}>
          <Link href="/events">Events</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/winners">Winners</Link>
          <Link href="/rules">Rules</Link>
          <Link href="/about">About</Link>
        </div>
        <span className={s.navStatus}>
          <span className={s.liveDot} />
          {typeof discordOnline === "number"
            ? `${discordOnline.toLocaleString()} online`
            : "Server live"}{" "}
          &mdash; {season} {new Date().getFullYear()}
        </span>
        <NavOverlay
          pages={NAV_PAGES}
          sections={NAV_SECTIONS}
          account={
            user
              ? { name: user.name ?? user.email ?? "Account", isStaff: staff }
              : null
          }
          triggerClassName={s.navMenu}
        />
        {user ? (
          <>
            {staff && (
              <a className={s.navSignin} href="/portal">
                Portal
              </a>
            )}
            <Box href="/me" variant="solid">
              My profile
            </Box>
          </>
        ) : (
          <>
            <a className={s.navSignin} href={LOGIN}>
              Sign in
            </a>
            <Box href={REGISTER} variant="solid">
              Register
            </Box>
          </>
        )}
      </nav>

      {/* HERO */}
      <section className={`${s.hero} ${s.wrap}`} id="top">
        <div className={s.heroMedia} aria-hidden>
          {heroVideo ? (
            <video
              ref={videoRef}
              className={s.heroVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              tabIndex={-1}
              poster="/media/hero-poster.jpg"
            >
              <source src="/media/hero.mp4" type="video/mp4" />
            </video>
          ) : (
            <div
              className={s.heroPoster}
              style={{ backgroundImage: "url(/media/hero-poster.jpg)" }}
            />
          )}
          <div className={s.heroTint} />
        </div>

        <div className={s.kinWrap}>
          <Wordmark />
        </div>

        <div className={s.heroUnder}>
          <p className={s.heroTag} data-reveal>
            One custom Once Human server. Weekly RaidZone tournaments.{" "}
            <span className={s.x}>Sponsored prizes for the squads that take it.</span>
          </p>
          <p className={s.heroSub} data-reveal>
            Run by POTATOZIE &mdash; Season {season.replace(/^S/, "")} roster open
          </p>
          {typeof discordOnline === "number" && (
            <p className={s.heroLive} data-reveal>
              <span className={s.liveDot} />
              {discordOnline.toLocaleString()} raiders online right now
            </p>
          )}
          <div className={s.heroActs} data-reveal>
            {user ? (
              <Box href={dashHref} k={staff ? "Staff" : "Roster"}>
                {staff ? "Open the portal" : "My raider"}
              </Box>
            ) : (
              <Box href={REGISTER} k="New here?">
                Register your raider
              </Box>
            )}
            <Box href={DISCORD} k="·" variant="plain">
              Join Discord
            </Box>
          </div>
        </div>

        <div className={s.scrollCue}>
          Scroll <i />
        </div>
      </section>

      <div className={s.after}>
        <EventBrief event={event} upcoming={upcoming} discordOnline={discordOnline} />

        {howToJoinVideo ? <HowToJoinVideo url={howToJoinVideo} /> : null}

        <HowItWorks />

        <About />

        <Watch videos={videos} />

        <Gallery images={gallery} />

        {/* RUNBOOK */}
        <section className={`${s.runbook} ${s.wrap}`} id="run">
          <div className={s.runbookHead}>
            <span className={s.mark} data-reveal>
              Field manual
            </span>
            <h2 data-split>How a night runs.</h2>
          </div>
          <ol className={s.steps}>
            {RUN.map(([k, t, m], i) => (
              <li className={s.step} key={k} data-reveal>
                <span className={s.stepN}>{String(i + 1).padStart(2, "0")}</span>
                <span className={s.stepBody}>
                  <span className={s.stepK}>{k}</span>
                  <span className={s.stepT}>{t}</span>
                </span>
                <span className={s.stepMeta}>{m}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* CLOSE */}
        <section className={s.close} id="register">
          {user ? (
            <>
              <h2 data-reveal>
                You&apos;re in<span className={s.x}>.</span>
              </h2>
              <p className={s.sub} data-reveal>
                Roster&apos;s set. Keep your raider details current and watch the current op for
                the next drop.
              </p>
              <div className={s.acts} data-reveal>
                <Box href={dashHref} k="Go" variant="solid">
                  {staff ? "Open the portal" : "My raider"}
                </Box>
                <Box href="#event" k="·" variant="plain">
                  Current op
                </Box>
              </div>
            </>
          ) : (
            <>
              <h2 data-split>
                Register<span className={s.x}>.</span>
              </h2>
              <p className={s.sub} data-reveal>
                New here &mdash; register your raider. Already on the roster &mdash; sign in. Either
                way, you&apos;re in for the next one.
              </p>
              <div className={s.acts} data-reveal>
                <Box href={REGISTER} k="New" variant="solid">
                  Register your raider
                </Box>
                <Box href={LOGIN} k="·" variant="plain">
                  Sign in
                </Box>
              </div>
            </>
          )}
        </section>

        <footer className={s.footer}>
          <span>ASCENITH&middot;RAIDZONE</span>
          <nav>
            <Link href="/about">About</Link>
            <Link href="/events">Events</Link>
            <Link href="/winners">Winners</Link>
            <Link href="/rules">Rules</Link>
            {user ? (
              <>
                <Link href="/me">My profile</Link>
                {staff && <Link href="/portal">Portal</Link>}
              </>
            ) : (
              <>
                <Link href={REGISTER}>Register</Link>
                <Link href={LOGIN}>Sign in</Link>
              </>
            )}
            <a href={DISCORD}>Discord</a>
          </nav>
          <span>Made by Crowley</span>
        </footer>
      </div>
    </div>
  );
}
