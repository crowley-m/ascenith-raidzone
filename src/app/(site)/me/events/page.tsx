import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtInZone, DEFAULT_EVENT_TZ } from "@/lib/tz";
import { WithdrawButton } from "@/components/withdraw-button";

export default async function MyEventsPage() {
  const user = await requireUser();
  if (!user.playerId) {
    return <p className="text-sm text-slate-400">Complete your profile to sign up for events.</p>;
  }

  const signups = await db.eventSignup.findMany({
    where: { playerId: user.playerId, state: { in: ["SIGNED_UP", "WAITLIST"] } },
    include: { event: true },
    orderBy: { event: { startsAt: "asc" } },
  });

  const now = Date.now();
  const upcoming = signups.filter((s) => s.event.startsAt.getTime() >= now);
  const past = signups.filter((s) => s.event.startsAt.getTime() < now);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-lg font-bold text-white">Upcoming</h2>
        <ul className="mt-3 space-y-2">
          {upcoming.length === 0 && <li className="text-sm text-slate-400">Nothing yet.</li>}
          {upcoming.map((s) => (
            <li key={s.id} className="card flex items-center justify-between">
              <div>
                <Link href={`/events/${s.eventId}`} className="font-medium text-slate-100 hover:text-teal">
                  {s.event.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {fmtInZone(s.event.startsAt, s.event.timezone ?? DEFAULT_EVENT_TZ)}
                  {s.state === "WAITLIST" && <span className="ml-2 text-ember">waitlist</span>}
                  {s.nickname && <span className="ml-2 text-teal">as {s.nickname}</span>}
                </p>
              </div>
              {s.teamId ? (
                <Link href="/me/team" className="btn-ghost text-xs">
                  Manage in team
                </Link>
              ) : (
                <WithdrawButton eventId={s.eventId} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-white">Past</h2>
          <ul className="mt-3 space-y-2">
            {past.map((s) => (
              <li key={s.id} className="card flex items-center justify-between text-sm">
                <Link href={`/events/${s.eventId}`} className="text-slate-300 hover:text-teal">
                  {s.event.title}
                </Link>
                <span className="text-slate-500">{fmtInZone(s.event.startsAt, s.event.timezone ?? DEFAULT_EVENT_TZ)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
