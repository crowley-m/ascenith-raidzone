import type { Metadata } from "next";
import { db } from "@/lib/db";
import { EventCard } from "@/components/event-card";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const now = new Date();
  let events: Awaited<ReturnType<typeof db.event.findMany>> = [];
  try {
    events = await db.event.findMany({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
      orderBy: { startsAt: "desc" },
      include: { _count: { select: { signups: true } } },
    });
  } catch {
    /* db unreachable — render empty */
  }

  const ended = (e: (typeof events)[number]) =>
    e.status === "COMPLETED" || (e.endsAt ? e.endsAt < now : e.startsAt < now);

  const live = events
    .filter((e) => e.status === "PUBLISHED" && e.startsAt <= now && !ended(e))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const upcoming = events
    .filter((e) => e.status === "PUBLISHED" && e.startsAt > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = events.filter(ended).slice(0, 12);

  return (
    <div className="container-x py-16">
      <h1 className="font-display text-3xl font-extrabold text-white">Events</h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        Raids, wipes, and community nights on our custom servers. Sign up to claim a slot.
      </p>

      {live.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-white">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal align-middle" />
            Running now
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {live.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Nothing scheduled yet — the next one is announced in Discord first.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-white">Past events</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
