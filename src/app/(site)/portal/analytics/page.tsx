import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { topRaiders } from "@/lib/leaderboard";
import { TopRaiders } from "@/components/top-raiders";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requirePermission("player:view");
  const now = new Date();

  const [raiders, completed, teams, noShows, monthly, signupTotals] = await Promise.all([
    topRaiders(15),
    db.event.findMany({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] }, startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 12,
      include: {
        signups: { where: { state: "SIGNED_UP" }, select: { playerId: true } },
        attendance: { where: { attended: true }, select: { playerId: true } },
      },
    }),
    db.team.findMany({
      include: {
        leader: { select: { characterName: true } },
        _count: { select: { members: true, placements: true } },
      },
    }),
    db.eventAttendance.groupBy({
      by: ["playerId"],
      where: { attended: false },
      _count: true,
      orderBy: { _count: { playerId: "desc" } },
      take: 10,
    }),
    db.event.findMany({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { startsAt: true },
      orderBy: { startsAt: "asc" },
    }),
    db.eventSignup.count({ where: { state: "SIGNED_UP" } }),
  ]);

  // attendance rate across the last dozen finished events
  const rated = completed.filter((e) => e.signups.length > 0);
  const avgRate = rated.length
    ? Math.round(
        (rated.reduce((n, e) => n + e.attendance.length / e.signups.length, 0) / rated.length) * 100,
      )
    : null;

  // events per month
  const byMonth = new Map<string, number>();
  for (const e of monthly) {
    const k = e.startsAt.toISOString().slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  }
  const months = [...byMonth.entries()].slice(-8);
  const maxMonth = Math.max(1, ...months.map(([, n]) => n));

  const noShowPlayers = noShows.length
    ? await db.player.findMany({
        where: { id: { in: noShows.map((n) => n.playerId) } },
        select: { id: true, characterName: true },
      })
    : [];
  const noShowName = (id: string) =>
    noShowPlayers.find((p) => p.id === id)?.characterName ?? "Unknown";

  const teamBoard = teams
    .map((t) => ({
      id: t.id,
      name: `${t.tag ? `[${t.tag}] ` : ""}${t.name}`,
      leader: t.leader.characterName ?? "—",
      members: t._count.members,
      placements: t._count.placements,
    }))
    .sort((a, b) => b.placements - a.placements || b.members - a.members)
    .slice(0, 10);

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Analytics</h2>
        <p className="mt-1 text-sm text-slate-400">Participation, attendance and standings.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Events run", v: monthly.filter((e) => e.startsAt < now).length },
          { k: "Signups (live)", v: signupTotals },
          { k: "Teams", v: teams.length },
          { k: "Avg turnout", v: avgRate === null ? "—" : `${avgRate}%` },
        ].map((s) => (
          <div key={s.k} className="border border-edge bg-panel/40 py-3 text-center">
            <div className="font-display text-2xl font-bold text-white">{s.v}</div>
            <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">{s.k}</div>
          </div>
        ))}
      </div>

      <section>
        <h3 className="font-display font-bold text-white">Events per month</h3>
        <ul className="mt-3 space-y-1.5">
          {months.map(([m, n]) => (
            <li key={m} className="flex items-center gap-3 text-xs">
              <span className="w-16 font-mono text-slate-500">{m}</span>
              <span
                className="h-3 bg-teal/60"
                style={{ width: `${(n / maxMonth) * 100}%`, minWidth: "6px" }}
              />
              <span className="text-slate-400">{n}</span>
            </li>
          ))}
          {months.length === 0 && <li className="text-sm text-slate-400">No events yet.</li>}
        </ul>
      </section>

      <section>
        <h3 className="font-display font-bold text-white">Attendance — last events</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Event</th>
                <th className="py-2">Signed up</th>
                <th className="py-2">Attended</th>
                <th className="py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60">
              {completed.map((e) => {
                const rate = e.signups.length
                  ? Math.round((e.attendance.length / e.signups.length) * 100)
                  : null;
                return (
                  <tr key={e.id}>
                    <td className="py-2">
                      <Link
                        href={`/portal/events/${e.id}`}
                        className="text-slate-200 hover:text-teal"
                      >
                        {e.title}
                      </Link>
                      <span className="block text-xs text-slate-600">{fmtDate(e.startsAt)}</span>
                    </td>
                    <td className="py-2 text-slate-400">{e.signups.length}</td>
                    <td className="py-2 text-slate-400">{e.attendance.length}</td>
                    <td className="py-2 text-slate-400">{rate === null ? "—" : `${rate}%`}</td>
                  </tr>
                );
              })}
              {completed.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-slate-400">
                    No finished events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div>
          <h3 className="font-display font-bold text-white">Top raiders</h3>
          <div className="mt-3">
            <TopRaiders raiders={raiders} compact />
          </div>
        </div>
        <div>
          <h3 className="font-display font-bold text-white">Team standings</h3>
          {teamBoard.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No teams yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-edge/60 text-sm">
              {teamBoard.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-right font-mono text-xs text-slate-500">{i + 1}</span>
                  <Link href={`/portal/teams/${t.id}`} className="flex-1 text-slate-100 hover:text-teal">
                    {t.name}
                  </Link>
                  <span className="font-mono text-xs text-slate-400">
                    {t.placements} podium · {t.members}p
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-display font-bold text-white">No-shows</h3>
        <p className="mt-1 text-xs text-slate-500">Players marked absent after signing up.</p>
        {noShows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">None recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-edge/60 text-sm">
            {noShows.map((n) => (
              <li key={n.playerId} className="flex items-center justify-between py-2">
                <Link
                  href={`/portal/players/${n.playerId}`}
                  className="text-slate-200 hover:text-teal"
                >
                  {noShowName(n.playerId)}
                </Link>
                <span className="font-mono text-xs text-ember">
                  {typeof n._count === "number" ? n._count : 0} no-show
                  {(typeof n._count === "number" ? n._count : 0) === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
