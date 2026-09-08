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

/** The team a player leads or belongs to (they can be in at most one). */
export async function teamForPlayer(playerId: string) {
  return db.team.findFirst({
    where: { OR: [{ leaderId: playerId }, { members: { some: { playerId } } }] },
    include: {
      leader: { select: { id: true, characterName: true, gameUid: true, region: true } },
      event: { select: { id: true, title: true, mode: true } },
      members: {
        include: {
          player: { select: { id: true, characterName: true, gameUid: true, region: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

/** Published team events that haven't ended — pickable when forming a team. */
export async function selectableTeamEvents() {
  try {
    return await db.event.findMany({
      where: {
        status: "PUBLISHED",
        format: "TEAM",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, mode: true },
    });
  } catch {
    return [];
  }
}

export type TeamWithMembers = NonNullable<Awaited<ReturnType<typeof teamForPlayer>>>;
