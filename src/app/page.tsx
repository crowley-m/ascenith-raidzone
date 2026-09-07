import Link from "next/link";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { EventCard } from "@/components/event-card";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Register a profile",
    body: "Sign up with Discord or email, then add your Once Human character name, platform, and region. Takes a minute.",
  },
  {
    n: "02",
    title: "Join events",
    body: "Browse upcoming raids and community events, claim a slot, and get reminders in Discord.",
  },
  {
    n: "03",
    title: "Earn rewards",
    body: "Show up, play, and our staff log your rewards to your profile. Winners get featured in the proof gallery.",
  },
];

export default async function HomePage() {
  const events = await db.event.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 3,
    include: { _count: { select: { signups: true } } },
  });

  const [playerCount, eventCount, rewardCount] = await Promise.all([
    db.player.count({ where: { status: "ACTIVE" } }),
    db.event.count({ where: { status: { in: ["PUBLISHED", "COMPLETED"] } } }),
    db.reward.count(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-edge/60">
        <div className="container-x py-24 md:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal">
            {site.game} community
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
            Custom servers. Real events. <span className="text-teal">Real rewards.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            ASCENITH RAIDZONE runs custom {site.game} servers and community events, and hands out
            real rewards to the players who show up. Register once and you&apos;re in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">Register now</Link>
            <a href={site.discordInvite} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3 text-base">
              Join the Discord
            </a>
          </div>

          <dl className="mt-14 flex flex-wrap gap-x-12 gap-y-4">
            {[
              { k: "Active players", v: playerCount },
              { k: "Events run", v: eventCount },
              { k: "Rewards handed out", v: rewardCount },
            ].map((s) => (
              <div key={s.k}>
                <dd className="font-display text-3xl font-bold text-white">{s.v}</dd>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{s.k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section className="container-x py-20">
        <h2 className="font-display text-2xl font-bold text-white">How it works</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <div className="font-display text-sm font-bold text-teal">{s.n}</div>
              <h3 className="mt-2 font-display text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming events */}
      <section className="container-x py-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-white">Upcoming events</h2>
          <Link href="/events" className="link text-sm">All events →</Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">
              No events scheduled right now — check the Discord for announcements.
            </p>
          ) : (
            events.map((e) => <EventCard key={e.id} event={e} />)
          )}
        </div>
      </section>

      {/* Rules / join CTA */}
      <section className="container-x py-20">
        <div className="card flex flex-col items-start justify-between gap-6 border-teal/30 bg-gradient-to-br from-teal/5 to-transparent md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">New here?</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Read the server rules and the step-by-step guide to joining a custom server and your
              first event.
            </p>
          </div>
          <Link href="/rules" className="btn-primary px-6 py-3 text-base">Rules &amp; how to join</Link>
        </div>
      </section>
    </>
  );
}
