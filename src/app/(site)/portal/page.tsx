import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { hiddenActorIds, maskName } from "@/lib/staff-mask";
import { topRaiders } from "@/lib/leaderboard";
import { TopRaiders } from "@/components/top-raiders";

export const dynamic = "force-dynamic";

export default async function PortalOverview() {
  const me = await requireStaff();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    recentPlayers,
    newThisWeek,
    activePlayers,
    teamCount,
    teamMemberCount,
    upcoming,
    recentAudit,
    rewardCount,
    lastCompleted,
    hidden,
  ] = await Promise.all([
    db.player.findMany({
      orderBy: { joinedAt: "desc" },
      take: 8,
      include: { user: { select: { email: true, discordUsername: true } } },
    }),
    db.player.count({ where: { joinedAt: { gte: weekAgo } } }),
    db.player.count({ where: { status: "ACTIVE" } }),
    db.team.count(),
    db.teamMember.count(),
    db.event.findMany({
      where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        _count: { select: { signups: { where: { state: "SIGNED_UP" } } } },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { name: true, email: true } } },
    }),
    db.reward.count(),
    db.event.findFirst({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] }, endsAt: { lt: new Date() } },
      orderBy: { startsAt: "desc" },
      include: {
        signups: { where: { state: "SIGNED_UP" }, select: { playerId: true } },
        attendance: { where: { attended: true }, select: { playerId: true } },
      },
    }),
    hiddenActorIds(me.role),
  ]);

  const raiders = await topRaiders(8);

  const avgTeamSize = teamCount ? (teamMemberCount / teamCount).toFixed(1) : "0";
  const lastRate =
    lastCompleted && lastCompleted.signups.length
      ? Math.round((lastCompleted.attendance.length / lastCompleted.signups.length) * 100)
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { k: "Active players", v: activePlayers, href: "/portal/players" },
            { k: "New this week", v: newThisWeek, href: "/portal/players" },
            { k: "Teams", v: teamCount, href: "/teams" },
            { k: "Avg team size", v: avgTeamSize, href: "/teams" },
            { k: "Rewards logged", v: rewardCount, href: "/portal/rewards" },
            {
              k: "Last event turnout",
              v: lastRate === null ? "—" : `${lastRate}%`,
              href: lastCompleted ? `/portal/events/${lastCompleted.id}` : "/portal/events",
            },
          ].map((s) => (
            <Link key={s.k} href={s.href} className="card text-center hover:border-teal/50">
              <div className="font-display text-2xl font-bold text-white">{s.v}</div>
              <div className="text-xs text-slate-500">{s.k}</div>
            </Link>
          ))}
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-white">Recent registrations</h2>
          <ul className="mt-3 divide-y divide-edge/60">
            {recentPlayers.length === 0 && (
              <li className="py-3 text-sm text-slate-400">No players yet.</li>
            )}
            {recentPlayers.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <Link href={`/portal/players/${p.id}`} className="text-slate-200 hover:text-teal">
                  {p.characterName ?? "Unnamed"}
                </Link>
                <span className="text-slate-500">
                  {p.user.discordUsername ?? p.user.email ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-white">Upcoming events</h2>
          <ul className="mt-3 divide-y divide-edge/60">
            {upcoming.length === 0 && <li className="py-3 text-sm text-slate-400">None scheduled.</li>}
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-3 text-sm">
                <Link href={`/portal/events/${e.id}`} className="text-slate-200 hover:text-teal">
                  {e.title}
                  <span className="ml-2 text-[0.6rem] uppercase tracking-wide text-slate-500">
                    {e.format === "TEAM" ? "team" : "solo"}
                  </span>
                </Link>
                <span className="text-slate-500">
                  {fmtDateTime(e.startsAt)} · {e._count.signups} in
                  {e.maxSlots ? ` / ${e.maxSlots}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        {raiders.length > 0 && (
          <div className="card">
            <h2 className="font-display font-bold text-white">Top raiders</h2>
            <div className="mt-2">
              <TopRaiders raiders={raiders} compact />
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="font-display font-bold text-white">Activity</h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-400">
            {recentAudit.map((a) => (
              <li key={a.id}>
                <span className="text-slate-300">
                  {maskName(a.actor?.name ?? a.actor?.email, a.actorId, hidden, "system")}
                </span>{" "}
                {a.action}
                <span className="block text-slate-600">{fmtDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
