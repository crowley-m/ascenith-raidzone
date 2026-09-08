import type { Metadata } from "next";
import { db } from "@/lib/db";
import { EventCard } from "@/components/event-card";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const now = new Date();
  let upcoming: Awaited<ReturnType<typeof db.event.findMany>> = [];
  let past: Awaited<ReturnType<typeof db.event.findMany>> = [];
  try {
    [upcoming, past] = await Promise.all([
      db.event.findMany({
        where: { status: "PUBLISHED", startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        include: { _count: { select: { signups: true } } },
      }),
      db.event.findMany({
        where: { status: { in: ["PUBLISHED", "COMPLETED"] }, startsAt: { lt: now } },
        orderBy: { startsAt: "desc" },
        take: 12,
        include: { _count: { select: { signups: true } } },
      }),
    ]);
  } catch {
    /* db unreachable — render empty */
  }

  return (
    <div className="container-x py-16">
      <h1 className="font-display text-3xl font-extrabold text-white">Events</h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        Raids, challenges, and community nights on our custom servers. Sign up to claim a slot.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-white">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Nothing scheduled yet. Watch the Discord.</p>
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
