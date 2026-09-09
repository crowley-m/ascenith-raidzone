import { db } from "@/lib/db";

const FACTION_SERIES = "faction"; // season.series containing this = a Faction War series

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
  hasRole: boolean;
  memberCount: number;
  titles: number; // Faction War seasons won
  gold: number;
  silver: number;
  bronze: number;
  members: FactionMember[];
};

export type FactionWarSeason = {
  slug: string;
  number: number;
  name: string | null;
  status: string;
  championName: string | null;
  championFactionId: string | null;
  prizePoolText: string | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * The two things the /factions page shows:
 *  - `factions`: each house with its roster + Faction War record (titles, and
 *    podiums from events run under a Faction War season)
 *  - `seasons`: the Faction War series history
 * Team-event results elsewhere are NOT rolled up here — only faction-scored play.
 */
export async function factionBoard(): Promise<{
  factions: FactionRow[];
  seasons: FactionWarSeason[];
}> {
  const [factions, seasons, placements] = await Promise.all([
    db.faction
      .findMany({
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
      })
      .catch(() => []),
    db.season
      .findMany({
        where: { series: { contains: FACTION_SERIES, mode: "insensitive" } },
        orderBy: [{ number: "desc" }],
        select: {
          slug: true,
          number: true,
          name: true,
          status: true,
          championName: true,
          prizePoolText: true,
        },
      })
      .catch(() => []),
    db.eventPlacement
      .findMany({
        where: {
          event: { season: { series: { contains: FACTION_SERIES, mode: "insensitive" } } },
        },
        select: {
          rank: true,
          player: { select: { factionId: true } },
          team: { select: { members: { select: { player: { select: { factionId: true } } } } } },
        },
      })
      .catch(() => []),
  ]);

  // podiums from faction-scored events, credited to each placed player's faction
  const pod = new Map<string, { g: number; s: number; b: number }>();
  const bump = (fid: string | null, rank: number) => {
    if (!fid) return;
    const p = pod.get(fid) ?? { g: 0, s: 0, b: 0 };
    if (rank === 1) p.g++;
    else if (rank === 2) p.s++;
    else if (rank === 3) p.b++;
    pod.set(fid, p);
  };
  for (const pl of placements) {
    if (pl.player) bump(pl.player.factionId, pl.rank);
    for (const m of pl.team?.members ?? []) bump(m.player.factionId, pl.rank);
  }

  // resolve each Faction War season's champion to a faction by name
  const byName = new Map(factions.map((f) => [norm(f.name), f.id]));
  const seasonsOut: FactionWarSeason[] = seasons.map((s) => ({
    ...s,
    championFactionId: byName.get(norm(s.championName)) ?? null,
  }));
  const titleCount = new Map<string, number>();
  for (const s of seasonsOut) {
    if (s.championFactionId) {
      titleCount.set(s.championFactionId, (titleCount.get(s.championFactionId) ?? 0) + 1);
    }
  }

  const rows: FactionRow[] = factions
    .map((f) => {
      const podF = pod.get(f.id) ?? { g: 0, s: 0, b: 0 };
      const members: FactionMember[] = f.players.map((p) => ({
        id: p.id,
        name: p.characterName ?? "Unnamed",
        gold: 0,
        silver: 0,
        bronze: 0,
        attended: p._count.attendance,
      }));
      members.sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name));
      return {
        id: f.id,
        name: f.name,
        tag: f.tag,
        color: f.color,
        description: f.description,
        hasRole: !!f.discordRoleId,
        memberCount: f.players.length,
        titles: titleCount.get(f.id) ?? 0,
        gold: podF.g,
        silver: podF.s,
        bronze: podF.b,
        members,
      };
    })
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        b.gold - a.gold ||
        b.memberCount - a.memberCount ||
        a.name.localeCompare(b.name),
    );

  return { factions: rows, seasons: seasonsOut };
}
