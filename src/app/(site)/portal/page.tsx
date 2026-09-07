import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalOverview() {
  await requireStaff();

  const [pending, activePlayers, upcoming, recentAudit, rewardCount] = await Promise.all([
    db.player.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { email: true, discordUsername: true } } },
    }),
    db.player.count({ where: { status: "ACTIVE" } }),
    db.event.findMany({
      where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { _count: { select: { signups: true } } },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { actor: { select: { name: true, email: true } } },
    }),
    db.reward.count(),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-3 gap-4">
          {[
            { k: "Pending", v: pending.length, href: "/portal/players?status=PENDING" },
            { k: "Active players", v: activePlayers, href: "/portal/players" },
            { k: "Rewards logged", v: rewardCount, href: "/portal/rewards" },
          ].map((s) => (
            <Link key={s.k} href={s.href} className="card text-center hover:border-teal/50">
              <div className="font-display text-3xl font-bold text-white">{s.v}</div>
              <div className="text-xs text-slate-500">{s.k}</div>
            </Link>
          ))}
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-white">Pending registrations</h2>
          <ul className="mt-3 divide-y divide-edge/60">
            {pending.length === 0 && <li className="py-3 text-sm text-slate-400">All caught up.</li>}
            {pending.map((p) => (
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
                </Link>
                <span className="text-slate-500">
                  {fmtDateTime(e.startsAt)} · {e._count.signups} signed up
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-white">Activity</h2>
        <ul className="mt-3 space-y-2 text-xs text-slate-400">
          {recentAudit.map((a) => (
            <li key={a.id}>
              <span className="text-slate-300">{a.actor?.name ?? a.actor?.email ?? "system"}</span>{" "}
              {a.action}
              <span className="block text-slate-600">{fmtDateTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
