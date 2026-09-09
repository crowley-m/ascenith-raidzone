import { db } from "@/lib/db";

export type FactionMember = {
  id: string;
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  attended: number;
};

export type FactionRow = {
  id: string;
  name: string;
  tag: string | null;
  color: string | null;
  description: string | null;
  memberCount: number;
  gold: number;
  silver: number;
  bronze: number;
  attended: number;
  score: number;
  members: FactionMember[];
};

/**
 * Every faction with its roster and a standings total — podiums (solo + team
 * placements credit every member) and attendance across all events, weighted
 * gold 5 / silver 3 / bronze 2 / attended 1. Sorted by score.
 */
export async function factionBoard(): Promise<FactionRow[]> {
  const [factions, placements] = await Promise.all([
    db.faction.findMany({
      orderBy: { name: "asc" },
      include: {
        players: {
          where: { status: { not: "BANNED" }, characterName: { not: null } },
          select: {
            id: true,
            characterName: true,
            _count: { select: { attendance: true } },
          },
        },
      },
    }),
    db.eventPlacement.findMany({
      select: {
        rank: true,
        playerId: true,
        team: { select: { members: { select: { playerId: true } } } },
      },
    }),
  ]).catch(() => [[], []] as const);

  const podium = new Map<string, { g: number; s: number; b: number }>();
  const bump = (pid: string, rank: number) => {
    const p = podium.get(pid) ?? { g: 0, s: 0, b: 0 };
    if (rank === 1) p.g++;
    else if (rank === 2) p.s++;
    else if (rank === 3) p.b++;
    podium.set(pid, p);
  };
  for (const pl of placements) {
    if (pl.playerId) bump(pl.playerId, pl.rank);
    for (const m of pl.team?.members ?? []) bump(m.playerId, pl.rank);
  }

  return factions
    .map((f) => {
      let gold = 0;
      let silver = 0;
      let bronze = 0;
      let attended = 0;
      const members: FactionMember[] = f.players.map((p) => {
        const pod = podium.get(p.id) ?? { g: 0, s: 0, b: 0 };
        gold += pod.g;
        silver += pod.s;
        bronze += pod.b;
        attended += p._count.attendance;
        return {
          id: p.id,
          name: p.characterName ?? "Unnamed",
          gold: pod.g,
          silver: pod.s,
          bronze: pod.b,
          attended: p._count.attendance,
        };
      });
      members.sort(
        (a, b) => b.gold - a.gold || b.silver - a.silver || b.attended - a.attended,
      );
      return {
        id: f.id,
        name: f.name,
        tag: f.tag,
        color: f.color,
        description: f.description,
        memberCount: f.players.length,
        gold,
        silver,
        bronze,
        attended,
        score: gold * 5 + silver * 3 + bronze * 2 + attended,
        members,
      };
    })
    .sort((a, b) => b.score - a.score || b.memberCount - a.memberCount);
}
