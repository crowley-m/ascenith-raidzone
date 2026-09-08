import { db } from "@/lib/db";

// Ambiguous chars removed (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeInviteCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = makeInviteCode();
    const exists = await db.team.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  return makeInviteCode(8);
}

const teamInclude = {
  leader: { select: { id: true, characterName: true, gameUid: true, region: true } },
  event: { select: { id: true, title: true, mode: true } },
  members: {
    include: {
      player: { select: { id: true, characterName: true, gameUid: true, region: true } },
    },
    orderBy: { joinedAt: "asc" as const },
  },
} as const;

/** Every team a player leads or belongs to (one per event). */
export async function teamsForPlayer(playerId: string) {
  return db.team.findMany({
    where: { OR: [{ leaderId: playerId }, { members: { some: { playerId } } }] },
    include: teamInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** The player's team for one specific event, or null. */
export async function teamForEvent(playerId: string, eventId: string) {
  return db.team.findFirst({
    where: {
      eventId,
      OR: [{ leaderId: playerId }, { members: { some: { playerId } } }],
    },
    include: teamInclude,
  });
}

/**
 * Published team events that haven't ended and where the player is not already
 * in a team — pickable when forming a new team.
 */
export async function selectableTeamEvents(playerId?: string) {
  try {
    const events = await db.event.findMany({
      where: {
        status: "PUBLISHED",
        format: "TEAM",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, mode: true },
    });
    if (!playerId) return events;
    const taken = new Set(
      (
        await db.team.findMany({
          where: { OR: [{ leaderId: playerId }, { members: { some: { playerId } } }] },
          select: { eventId: true },
        })
      ).map((t) => t.eventId),
    );
    return events.filter((e) => !taken.has(e.id));
  } catch {
    return [];
  }
}

export type TeamWithMembers = Awaited<ReturnType<typeof teamsForPlayer>>[number];
