import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; eventId?: string; page?: string }>;
}) {
  await requirePermission("player:view");
  const { q, eventId, page } = await searchParams;
  const pageN = Math.max(1, Number(page) || 1);
  const take = 100;

  const where: Prisma.TeamWhereInput = {};
  if (eventId) where.eventId = eventId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tag: { contains: q, mode: "insensitive" } },
      { leader: { characterName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [teams, matched, events] = await Promise.all([
    db.team.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (pageN - 1) * take,
      take,
      include: {
        leader: { select: { characterName: true } },
        event: { select: { title: true, mode: true } },
        _count: { select: { members: true, placements: true } },
      },
    }),
    db.team.count({ where }),
    db.event.findMany({ orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true } }),
  ]);
  const pages = Math.ceil(matched / take);
  const pageHref = (n: number) =>
    `/portal/teams?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(eventId ? { eventId } : {}),
      page: String(n),
    })}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-white">Teams</h2>
        <span className="text-sm text-slate-500">
          {matched > take
            ? `${(pageN - 1) * take + 1}–${(pageN - 1) * take + teams.length} of ${matched}`
            : `${teams.length} shown`}
        </span>
      </div>
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

      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {pageN > 1 && (
            <Link href={pageHref(pageN - 1)} className="link">← Newer</Link>
          )}
          <span className="text-slate-500">Page {pageN} / {pages}</span>
          {pageN < pages && (
            <Link href={pageHref(pageN + 1)} className="link">Older →</Link>
          )}
        </div>
      )}
    </div>
  );
}
