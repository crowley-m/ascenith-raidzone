import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "ASCENITH RAIDZONE runs a custom Once Human server and weekly RaidZone tournaments with sponsored prizes for the squads that win.",
};

const IS = [
  "A custom Once Human server, run like a competitive sport",
  "Weekly RaidZone tournaments — purge nights, prime raids, sweeps",
  "Real sponsored prizes for the squads that win",
  "Slot-limited, roster-tracked, called in Discord",
  "Fair play — admins actively ban cheats and exploiters",
];

const ISNT = [
  "An official Once Human world",
  "Casual co-op PvE",
  "Pay-to-win",
  "Forgiving to cheats or bug abusers",
];

const STEPS = [
  {
    n: "01",
    title: "Register your raider",
    body: (
      <>
        Create a profile with <Link href="/register" className="link">Register</Link> — Discord or
        email. Add your Once Human character name and in-game UID so staff can find you and send
        rewards.
      </>
    ),
  },
  {
    n: "02",
    title: "Join the Discord",
    body: (
      <>
        Every wipe, its rules, schedule and reward pool are posted in{" "}
        <a href={site.discordInvite} target="_blank" rel="noreferrer" className="link">
          the Discord
        </a>{" "}
        first. That&apos;s where the community coordinates.
      </>
    ),
  },
  {
    n: "03",
    title: "Sign up and play",
    body: (
      <>
        Claim a slot on the <Link href="/events" className="link">current event</Link>, show up in
        the raid window, and climb the leaderboard. Winners are logged to{" "}
        <Link href="/winners" className="link">Winners</Link>.
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="container-x py-16">
      <p className="eyebrow">{"// about"}</p>
      <h1 className="mt-2 font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
        Competitive survival,
        <br />
        run properly<span className="text-teal">.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-300">
        {site.name} is a {site.game} community that treats the game like a competitive sport —
        custom RaidZone scenarios where skill decides the outcome, on a server run by {site.owner}.
      </p>
      <p className="mt-3 max-w-2xl text-slate-400">
        Fair play, real stakes. Seasoned raider or first drop, there&apos;s a spot on the roster.
      </p>

      <section className="mt-14 grid gap-8 md:grid-cols-2">
        <div className="card">
          <h2 className="font-display text-lg font-bold text-teal">RAIDZONE is</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {IS.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-teal">+</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="font-display text-lg font-bold text-slate-500">RAIDZONE isn&rsquo;t</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            {ISNT.map((t) => (
              <li key={t} className="flex gap-2">
                <span>&times;</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-xl font-bold text-white">How to get in</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card">
              <span className="font-mono text-xs tracking-widest text-slate-500">{s.n}</span>
              <h3 className="mt-2 font-display font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 flex flex-wrap gap-3">
        <Link href="/register" className="btn-primary">
          Register your raider
        </Link>
        <a href={site.discordInvite} target="_blank" rel="noreferrer" className="btn-ghost">
          Join the Discord
        </a>
        <Link href="/rules" className="btn-ghost">
          Read the rules
        </Link>
      </section>
    </div>
  );
}
