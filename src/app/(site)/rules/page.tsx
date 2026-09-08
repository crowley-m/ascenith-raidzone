import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Rules & how to join" };

const RULES = [
  "Be respectful. No harassment, hate speech, slurs, or targeted toxicity — in Discord or in game.",
  "No cheating, exploiting, or third-party tools that give an unfair advantage on our servers.",
  "Don't grief other members' bases or steal from teammates during community events.",
  "Use the right channels. Keep event talk in event channels and support requests in tickets.",
  "One account per person for events and rewards. Alt accounts used to farm rewards will be removed.",
  "Staff decisions on rewards and disputes are final, but you can always appeal politely in a ticket.",
];

const STEPS = [
  {
    title: "1. Register on this site",
    body: (
      <>
        Create your profile with <Link href="/register" className="link">Register</Link> — Discord or
        email works. Fill in your Once Human character name, platform, and region so staff can find
        you in game.
      </>
    ),
  },
  {
    title: "2. Join the Discord",
    body: (
      <>
        Hop into the{" "}
        <a href={site.discordInvite} target="_blank" rel="noreferrer" className="link">
          community Discord
        </a>{" "}
        and read the pinned server info. Announcements, rosters, and reminders all go there.
      </>
    ),
  },
  {
    title: "3. Get on a custom server",
    body: "Server addresses and passwords are posted in the Discord for active members. Follow the join steps in the how-to-join channel.",
  },
  {
    title: "4. Sign up for an event",
    body: (
      <>
        Browse <Link href="/events" className="link">Events</Link>, claim a slot, and show up on time.
        Attendance is tracked and rewards are logged to your profile afterwards.
      </>
    ),
  },
];

export default function RulesPage() {
  return (
    <div className="container-x py-16">
      <h1 className="font-display text-3xl font-extrabold text-white">Rules &amp; how to join</h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        ASCENITH RAIDZONE is run by {site.owner}. Keep it fair, keep it friendly, and everyone gets
        to enjoy the raids.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">Community rules</h2>
        <ol className="mt-5 space-y-3">
          {RULES.map((r, i) => (
            <li key={i} className="card flex gap-3 text-sm text-slate-300">
              <span className="font-display font-bold text-teal">{i + 1}</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-white">How to join</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title} className="card">
              <h3 className="font-display font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-white">FAQ</h2>
        <dl className="mt-5 space-y-4">
          <div className="card">
            <dt className="font-semibold text-white">Do I need to pay anything?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              No. Events and rewards are free for community members.
            </dd>
          </div>
          <div className="card">
            <dt className="font-semibold text-white">How do rewards get to me?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              Staff log rewards to your profile after an event. You&apos;ll see them under{" "}
              <Link href="/me/rewards" className="link">My rewards</Link>. In-game delivery details
              are coordinated in Discord.
            </dd>
          </div>
          <div className="card">
            <dt className="font-semibold text-white">Do I need approval before I can sign up?</dt>
            <dd className="mt-1 text-sm text-slate-400">
              No — you&apos;re on the roster the moment you register. Fill in your in-game details
              on your profile and you can sign up for the next event straight away.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
