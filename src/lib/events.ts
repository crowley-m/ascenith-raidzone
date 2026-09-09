import { db } from "@/lib/db";
import { notify, notifyPlayer } from "@/lib/notify";
import { grantEventAccess } from "@/lib/event-space";

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
