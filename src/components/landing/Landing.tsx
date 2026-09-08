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

const SOCIALS = [
  { label: "TikTok", href: "https://www.tiktok.com/@potatoziee1" },
  { label: "Twitch", href: "https://www.twitch.tv/potatozie1" },
  { label: "X", href: "https://x.com/potatoziee" },
  { label: "Facebook", href: "https://www.facebook.com/people/Potatozie-Gaming/100063656476567/" },
];

const NAV_PAGES = [
  { href: "/events", label: "Events" },
  { href: "/teams", label: "Teams" },
  { href: "/seasons", label: "Seasons" },
  { href: "/winners", label: "Winners" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
  { href: DISCORD, label: "Discord", external: true },
];
const NAV_SECTIONS = [
  { href: "#prereg", label: "Next event" },
  { href: "#event", label: "Current event" },
  { href: "#how", label: "How it works" },
  { href: "#seasons", label: "Seasons" },
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

function fmtWhen(iso: string) {
  try {
    return new Date(iso)
      .toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      .toUpperCase();
  } catch {
    return "";
  }
}

function PreRegister({ next }: { next: UpcomingOp }) {
  return (
    <section className={`${s.prereg} ${s.wrap}`} id="prereg">
      <div className={s.preregInner} data-reveal>
        <div className={s.preregLead}>
          <span className={s.mark}>Pre-register — next event</span>
          <h3 className={s.preregTitle}>
            {next.mode ? `RAIDZONE ${next.mode}` : next.title}
          </h3>
          <p className={s.preregWhen}>{fmtWhen(next.startsAt)} GMT+8</p>
        </div>
        <a className={`${s.box} ${s.solid}`} href={`/events/${next.id}`}>
          <span className={s.t}>Pre-register</span>
          <span className={s.arw}>{"→"}</span>
        </a>
      </div>
    </section>
  );
}

function SeasonHistory({
  seasons,
}: {
  seasons: { series: string; count: number; latestSlug: string; champion: string | null }[];
}) {
  return (
    <section className={`${s.seasons} ${s.wrap}`} id="seasons">
      <div className={s.seasonsHead}>
        <span className={s.mark} data-reveal>
          The record
        </span>
        <h2 data-split>Every season.</h2>
      </div>
      <ul className={s.seasonsList}>
        {seasons.map((sr) => (
          <li key={sr.series} data-reveal>
            <Link href={`/seasons/${sr.latestSlug}`} className={s.seasonRow}>
              <span className={s.seasonName}>{sr.series}</span>
              <span className={s.seasonMeta}>
                {sr.count} season{sr.count === 1 ? "" : "s"}
                {sr.champion ? ` · latest champ ${sr.champion}` : ""}
              </span>
              <span className={s.arw}>{"→"}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/seasons" className={s.seasonsAll}>
        Full history {"→"}
      </Link>
    </section>
  );
}

function About() {
  return (
    <section className={s.about} id="about">
      <div className={`${s.aboutInner} ${s.wrap}`}>
        <div className={s.aboutHead}>
          <span className={s.mark} data-reveal>
            Who we are
          </span>
          <h2 data-split>Competitive survival, run properly.</h2>
        </div>
        <div className={s.aboutBody} data-reveal>
          <p>
            A community server built for serious competitive play in <em>Once Human</em> &mdash;
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
  gallery = [],
  howToJoinVideo = "",
  seasonLabel = "",
  seasons = [],
}: {
  event?: OpEvent | null;
  upcoming?: UpcomingOp[];
  videos?: YtVideo[];
  gallery?: GalleryImage[];
  howToJoinVideo?: string;
  seasonLabel?: string;
  seasons?: { series: string; count: number; latestSlug: string; champion: string | null }[];
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
            Run by POTATOZIE &mdash;{" "}
            {event?.mode
              ? `${event.seasonNumber ? `Season ${event.seasonNumber} · ` : ""}RAIDZONE ${event.mode}`
              : `Season ${season.replace(/^S/, "")} roster open`}
          </p>
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
        {upcoming.length > 0 && <PreRegister next={upcoming[0]} />}

        <EventBrief event={event} upcoming={upcoming} />

        {howToJoinVideo ? <HowToJoinVideo url={howToJoinVideo} /> : null}

        <HowItWorks />

        <About />

        {seasons.length > 0 && <SeasonHistory seasons={seasons} />}

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
          <div className={s.closeInner}>
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
                  New here &mdash; register your raider. Already on the roster &mdash; sign in.
                  Either way, you&apos;re in for the next one.
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
          </div>
        </section>

        <footer className={s.footer}>
          <span>ASCENITH&middot;RAIDZONE</span>
          <nav>
            <Link href="/about">About</Link>
            <Link href="/events">Events</Link>
            <Link href="/seasons">Seasons</Link>
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
          <nav>
            {SOCIALS.map((sm) => (
              <a key={sm.href} href={sm.href} target="_blank" rel="noreferrer">
                {sm.label}
              </a>
            ))}
          </nav>
          <span>Made by Crowley</span>
        </footer>
      </div>
    </div>
  );
}
