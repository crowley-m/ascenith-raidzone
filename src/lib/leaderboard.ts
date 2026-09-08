import { db } from "@/lib/db";

export type RaiderStat = {
  id: string;
  name: string;
  region: string | null;
  gold: number;
  silver: number;
  bronze: number;
  attended: number;
  score: number;
};

/** Top raiders by weighted placements + attendance. Team placements credit every member. */
export async function topRaiders(limit = 12): Promise<RaiderStat[]> {
  let placements: {
    rank: number;
    playerId: string | null;
    team: { members: { playerId: string }[] } | null;
  }[] = [];
  let attended: { playerId: string; _count: number }[] = [];
  try {
    [placements, attended] = await Promise.all([
      db.eventPlacement.findMany({
        select: {
          rank: true,
          playerId: true,
          team: { select: { members: { select: { playerId: true } } } },
        },
      }),
      db.eventAttendance
        .groupBy({ by: ["playerId"], where: { attended: true }, _count: true })
        .then((rows) =>
          rows.map((r) => ({ playerId: r.playerId, _count: typeof r._count === "number" ? r._count : 0 })),
        ),
    ]);
  } catch {
    return [];
  }

  type S = { gold: number; silver: number; bronze: number; attended: number };
  const stats = new Map<string, S>();
  const get = (pid: string) => {
    let s = stats.get(pid);
    if (!s) {
      s = { gold: 0, silver: 0, bronze: 0, attended: 0 };
      stats.set(pid, s);
    }
    return s;
  };
  const bump = (pid: string, rank: number) => {
    const s = get(pid);
    if (rank === 1) s.gold++;
    else if (rank === 2) s.silver++;
    else if (rank === 3) s.bronze++;
  };
  for (const p of placements) {
    if (p.playerId) bump(p.playerId, p.rank);
    for (const m of p.team?.members ?? []) bump(m.playerId, p.rank);
  }
  for (const a of attended) get(a.playerId).attended = a._count;

  const ids = [...stats.keys()];
  if (ids.length === 0) return [];
  const players = await db.player.findMany({
    where: { id: { in: ids }, status: { not: "BANNED" } },
    select: { id: true, characterName: true, region: true },
  });

  return players
    .map((pl) => {
      const s = stats.get(pl.id)!;
      return {
        id: pl.id,
        name: pl.characterName ?? "Unnamed",
        region: pl.region,
        ...s,
        score: s.gold * 5 + s.silver * 3 + s.bronze * 2 + s.attended,
      };
    })
    .sort((a, b) => b.score - a.score || b.gold - a.gold || b.silver - a.silver)
    .slice(0, limit);
}
