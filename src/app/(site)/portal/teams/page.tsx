import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalTeamsPage() {
  await requirePermission("player:view");

  const teams = await db.team.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      leader: { select: { characterName: true } },
      _count: { select: { members: true, placements: true } },
    },
  });

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-white">
        Teams <span className="text-slate-500">({teams.length})</span>
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Player-made squads for team events. Members and event history per team.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Team</th>
              <th className="py-2">Leader</th>
              <th className="py-2">Members</th>
              <th className="py-2">Placements</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {teams.map((t) => (
              <tr key={t.id}>
                <td className="py-2">
                  <Link href={`/portal/teams/${t.id}`} className="text-slate-200 hover:text-teal">
                    {t.tag && <span className="text-teal">[{t.tag}] </span>}
                    {t.name}
                  </Link>
                </td>
                <td className="py-2 text-slate-400">{t.leader.characterName ?? "—"}</td>
                <td className="py-2 text-slate-400">{t._count.members}</td>
                <td className="py-2 text-slate-400">{t._count.placements}</td>
                <td className="py-2 text-slate-500">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-slate-400">
                  No teams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
