import { db } from "@/lib/db";
import { notify, notifyPlayer } from "@/lib/notify";
import { grantEventAccess, ensureTeamVoice } from "@/lib/event-space";

/**
 * Sign a whole team up for a TEAM event (also the "update roster" path — safe to
 * re-run when members join or leave). Idempotent. Returns the resulting state or
 * an error string; the caller owns audit logging + revalidation.
 */
export async function registerTeam(
  eventId: string,
  team: { id: string; members: { playerId: string }[] },
): Promise<{ ok: true; state: "SIGNED_UP" | "WAITLIST" } | { error: string }> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") return { error: "This event is not open." };
  if (event.format !== "TEAM") return { error: "This is a solo event." };
  if (event.teamSize && team.members.length > event.teamSize) {
    const over = team.members.length - event.teamSize;
    return {
      error: `This event caps teams at ${event.teamSize} — drop ${over} member${
        over === 1 ? "" : "s"
      } first.`,
    };
  }

  // capacity is counted in whole teams
  const signedTeams = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP", teamId: { not: null } },
    select: { teamId: true },
    distinct: ["teamId"],
  });
  const alreadyIn = signedTeams.some((s) => s.teamId === team.id);
  const full = !alreadyIn && event.maxSlots ? signedTeams.length >= event.maxSlots : false;
  const state = full ? "WAITLIST" : "SIGNED_UP";

  const memberIds = team.members.map((m) => m.playerId);
  await db.$transaction(
    memberIds.map((pid) =>
      db.eventSignup.upsert({
        where: { eventId_playerId: { eventId, playerId: pid } },
        create: { eventId, playerId: pid, teamId: team.id, state },
        update: { teamId: team.id, state },
      }),
    ),
  );
  if (state === "SIGNED_UP") {
    void ensureTeamVoice(team.id);
    for (const pid of memberIds) void grantEventAccess(eventId, pid);
  }
  return { ok: true, state };
}

/**
 * After a withdrawal, pull the oldest waitlisted entrant(s) into open slots.
 * SOLO events promote one player per free slot; TEAM events promote a whole
 * team at a time. No-op when the event has no slot cap. DMs anyone promoted.
 */
export async function promoteWaitlist(eventId: string): Promise<void> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { maxSlots: true, format: true, title: true },
  });
  if (!event?.maxSlots) return;

  const promotedPlayerIds: string[] = [];

  if (event.format === "TEAM") {
    const signedTeams = await db.eventSignup.findMany({
      where: { eventId, state: "SIGNED_UP", teamId: { not: null } },
      select: { teamId: true },
      distinct: ["teamId"],
    });
    let free = event.maxSlots - signedTeams.length;
    if (free <= 0) return;

    const waitTeams = await db.eventSignup.findMany({
      where: { eventId, state: "WAITLIST", teamId: { not: null } },
      select: { teamId: true },
      distinct: ["teamId"],
      orderBy: { createdAt: "asc" },
    });
    for (const t of waitTeams) {
      if (free <= 0) break;
      const rows = await db.eventSignup.findMany({
        where: { eventId, teamId: t.teamId, state: "WAITLIST" },
        select: { playerId: true },
      });
      await db.eventSignup.updateMany({
        where: { eventId, teamId: t.teamId, state: "WAITLIST" },
        data: { state: "SIGNED_UP" },
      });
      promotedPlayerIds.push(...rows.map((r) => r.playerId));
      free--;
    }
  } else {
    const count = await db.eventSignup.count({ where: { eventId, state: "SIGNED_UP" } });
    const free = event.maxSlots - count;
    if (free <= 0) return;

    const promote = await db.eventSignup.findMany({
      where: { eventId, state: "WAITLIST" },
      orderBy: { createdAt: "asc" },
      take: free,
      select: { id: true, playerId: true },
    });
    if (promote.length) {
      await db.eventSignup.updateMany({
        where: { id: { in: promote.map((p) => p.id) } },
        data: { state: "SIGNED_UP" },
      });
      promotedPlayerIds.push(...promote.map((p) => p.playerId));
    }
  }

  const msg = notify.waitlistPromoted(event.title, eventId);
  for (const pid of promotedPlayerIds) {
    void notifyPlayer(pid, msg);
    void grantEventAccess(eventId, pid);
  }
}
