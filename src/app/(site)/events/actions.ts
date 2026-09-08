"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { teamForPlayer } from "@/lib/team";
import { promoteWaitlist } from "@/lib/events";

async function callerPlayerId(eventId: string): Promise<string> {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/events/${eventId}`);
  // token.playerId can lag a fresh profile by a few minutes (jwt refresh window).
  let playerId = session.user.playerId ?? null;
  if (!playerId) {
    const p = await db.player.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    playerId = p?.id ?? null;
  }
  if (!playerId) redirect("/me/profile?new=1");
  return playerId;
}

/** Player signs up (or re-activates a withdrawn signup) for a SOLO event. */
export async function signUpForEvent(eventId: string) {
  const session = await auth();
  const playerId = await callerPlayerId(eventId);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
  });
  if (!event || event.status !== "PUBLISHED") {
    return { error: "This event is not open for sign-ups." };
  }
  if (event.format === "TEAM") {
    return { error: "This is a team event — your team leader registers the team." };
  }

  const full = event.maxSlots ? event._count.signups >= event.maxSlots : false;
  const state = full ? "WAITLIST" : "SIGNED_UP";

  await db.eventSignup.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    create: { eventId, playerId, state },
    update: { state },
  });
  await logAudit({
    actorId: session?.user?.id,
    action: "event.signup",
    targetType: "Event",
    targetId: eventId,
    meta: { state },
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true, state };
}

export async function withdrawFromEvent(eventId: string) {
  const playerId = await callerPlayerId(eventId);
  await db.eventSignup.updateMany({
    where: { eventId, playerId },
    data: { state: "WITHDRAWN" },
  });
  await promoteWaitlist(eventId);
  await logAudit({ action: "event.withdraw", targetType: "Event", targetId: eventId });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true };
}

/**
 * Team leader registers their whole team for a TEAM event (also acts as
 * "update roster" — re-run it after new members join). Idempotent.
 */
export async function registerTeamForEvent(eventId: string) {
  const playerId = await callerPlayerId(eventId);
  const team = await teamForPlayer(playerId);
  if (!team) return { error: "Create or join a team first." };
  if (team.leaderId !== playerId) return { error: "Only your team leader can register the team." };

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") return { error: "This event is not open." };
  if (event.format !== "TEAM") return { error: "This is a solo event." };
  if (event.teamSize && team.members.length > event.teamSize) {
    return {
      error: `This event caps teams at ${event.teamSize} — drop ${
        team.members.length - event.teamSize
      } member${team.members.length - event.teamSize === 1 ? "" : "s"} first.`,
    };
  }

  // capacity is counted in whole teams
  const signedTeams = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP", teamId: { not: null } },
    select: { teamId: true },
    distinct: ["teamId"],
  });
  const alreadyIn = signedTeams.some((s) => s.teamId === team.id);
  const full =
    !alreadyIn && event.maxSlots ? signedTeams.length >= event.maxSlots : false;
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
  await logAudit({
    action: "event.team_signup",
    targetType: "Event",
    targetId: eventId,
    meta: { teamId: team.id, members: memberIds.length, state },
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true, state };
}

export async function withdrawTeamFromEvent(eventId: string) {
  const playerId = await callerPlayerId(eventId);
  const team = await teamForPlayer(playerId);
  if (!team || team.leaderId !== playerId) {
    return { error: "Only your team leader can withdraw the team." };
  }
  await db.eventSignup.updateMany({
    where: { eventId, teamId: team.id },
    data: { state: "WITHDRAWN" },
  });
  await promoteWaitlist(eventId);
  await logAudit({
    action: "event.team_withdraw",
    targetType: "Event",
    targetId: eventId,
    meta: { teamId: team.id },
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true };
}
