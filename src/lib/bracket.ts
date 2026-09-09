import { db } from "@/lib/db";

export const BRACKET_SIZES = [4, 8, 16, 32] as const;
export type BracketSize = (typeof BRACKET_SIZES)[number];

export type Entrant = { ref: string; label: string };

/**
 * Standard single-elimination seed order for `n` slots (n a power of two).
 * Returns 1-based seed numbers arranged so #1 and #2 can only meet in the final.
 * n=8 -> [1,8,4,5,2,7,3,6]
 */
export function seedOrder(n: number): number[] {
  let rows = [1, 2];
  while (rows.length < n) {
    const sum = rows.length * 2 + 1;
    const next: number[] = [];
    for (const s of rows) {
      next.push(s);
      next.push(sum - s);
    }
    rows = next;
  }
  return rows;
}

export function roundCount(size: number): number {
  return Math.round(Math.log2(size));
}

export function roundName(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}

/** The entrants that seed a bracket for an event, in registration order. */
export async function entrantsForEvent(eventId: string): Promise<Entrant[]> {
  const event = await db.event.findUnique({ where: { id: eventId }, select: { format: true } });
  if (!event) return [];

  if (event.format === "TEAM") {
    const rows = await db.eventSignup.findMany({
      where: { eventId, state: "SIGNED_UP", teamId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { team: { select: { id: true, name: true, tag: true } } },
    });
    const seen = new Set<string>();
    const out: Entrant[] = [];
    for (const r of rows) {
      if (!r.team || seen.has(r.team.id)) continue;
      seen.add(r.team.id);
      out.push({
        ref: `team:${r.team.id}`,
        label: `${r.team.tag ? `[${r.team.tag}] ` : ""}${r.team.name}`,
      });
    }
    return out;
  }

  const rows = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP" },
    orderBy: { createdAt: "asc" },
    select: { player: { select: { id: true, characterName: true } } },
  });
  return rows.map((r) => ({
    ref: `player:${r.player.id}`,
    label: r.player.characterName ?? "Unnamed",
  }));
}

/** Resolve "team:<id>" / "player:<id>" refs to display labels. */
export async function resolveRefs(refs: string[]): Promise<Map<string, string>> {
  const teamIds: string[] = [];
  const playerIds: string[] = [];
  for (const r of refs) {
    const [k, id] = r.split(":");
    if (k === "team") teamIds.push(id);
    else if (k === "player") playerIds.push(id);
  }
  const [teams, players] = await Promise.all([
    teamIds.length
      ? db.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, tag: true } })
      : [],
    playerIds.length
      ? db.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, characterName: true } })
      : [],
  ]);
  const m = new Map<string, string>();
  for (const t of teams) m.set(`team:${t.id}`, `${t.tag ? `[${t.tag}] ` : ""}${t.name}`);
  for (const p of players) m.set(`player:${p.id}`, p.characterName ?? "Unnamed");
  return m;
}

export type BracketMatchView = {
  id: string;
  round: number;
  position: number;
  a: { ref: string | null; label: string | null; score: number | null; won: boolean };
  b: { ref: string | null; label: string | null; score: number | null; won: boolean };
  decided: boolean;
};

export type BracketView = {
  id: string;
  size: number;
  rounds: { round: number; name: string; matches: BracketMatchView[] }[];
  champion: string | null;
};

export async function bracketForEvent(eventId: string): Promise<BracketView | null> {
  const bracket = await db.bracket.findUnique({
    where: { eventId },
    include: { matches: { orderBy: [{ round: "asc" }, { position: "asc" }] } },
  });
  if (!bracket) return null;

  const refs = new Set<string>();
  for (const m of bracket.matches) {
    if (m.aRef) refs.add(m.aRef);
    if (m.bRef) refs.add(m.bRef);
  }
  const labels = await resolveRefs([...refs]);
  const total = roundCount(bracket.size);

  const byRound = new Map<number, BracketMatchView[]>();
  for (const m of bracket.matches) {
    const v: BracketMatchView = {
      id: m.id,
      round: m.round,
      position: m.position,
      a: {
        ref: m.aRef,
        label: m.aRef ? (labels.get(m.aRef) ?? "—") : null,
        score: m.aScore,
        won: m.winner === "a",
      },
      b: {
        ref: m.bRef,
        label: m.bRef ? (labels.get(m.bRef) ?? "—") : null,
        score: m.bScore,
        won: m.winner === "b",
      },
      decided: !!m.winner,
    };
    const arr = byRound.get(m.round) ?? [];
    arr.push(v);
    byRound.set(m.round, arr);
  }

  const rounds = [...byRound.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([round, matches]) => ({ round, name: roundName(round, total), matches }));

  const finalMatch = bracket.matches.find((m) => m.round === total);
  const champRef =
    finalMatch?.winner === "a"
      ? finalMatch.aRef
      : finalMatch?.winner === "b"
        ? finalMatch.bRef
        : null;

  return {
    id: bracket.id,
    size: bracket.size,
    rounds,
    champion: champRef ? (labels.get(champRef) ?? null) : null,
  };
}
