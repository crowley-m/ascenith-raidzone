import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; eventId?: string }>;
}) {
  await requirePermission("player:view");
  const { q, eventId } = await searchParams;

  const where: Prisma.TeamWhereInput = {};
  if (eventId) where.eventId = eventId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tag: { contains: q, mode: "insensitive" } },
      { leader: { characterName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [teams, events] = await Promise.all([
    db.team.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        leader: { select: { characterName: true } },
        event: { select: { title: true, mode: true } },
        _count: { select: { members: true, placements: true } },
      },
    }),
    db.event.findMany({ orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true } }),
  ]);

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-white">
        Teams <span className="text-slate-500">({teams.length})</span>
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Player-made squads for team events. Members and event history per team.
      </p>

      <form className="mt-4 flex flex-wrap gap-2" action="/portal/teams">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search team, tag, or leader…"
          className="input max-w-xs"
        />
        <select name="eventId" defaultValue={eventId ?? ""} className="input max-w-[16rem]">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <button className="btn-ghost" type="submit">Filter</button>
        {(q || eventId) && (
          <Link href="/portal/teams" className="btn-ghost">Clear</Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Team</th>
              <th className="py-2">For event</th>
              <th className="py-2">Leader</th>
              <th className="py-2">Members</th>
              <th className="py-2">Placements</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {teams.map((t) => {
              const tt = t as typeof t & { event: { title: string; mode: string | null } | null };
              const forEvent = tt.event
                ? tt.event.mode
                  ? `RAIDZONE ${tt.event.mode}`
                  : tt.event.title
                : "—";
              return (
              <tr key={t.id}>
                <td className="py-2">
                  <Link href={`/portal/teams/${t.id}`} className="text-slate-200 hover:text-teal">
                    {t.tag && <span className="text-teal">[{t.tag}] </span>}
                    {t.name}
                  </Link>
                </td>
                <td className="py-2 text-slate-400">{forEvent}</td>
                <td className="py-2 text-slate-400">{t.leader.characterName ?? "—"}</td>
                <td className="py-2 text-slate-400">{t._count.members}</td>
                <td className="py-2 text-slate-400">{t._count.placements}</td>
                <td className="py-2 text-slate-500">{fmtDate(t.createdAt)}</td>
              </tr>
              );
            })}
            {teams.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-slate-400">
                  {q || eventId ? "No teams match." : "No teams yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
