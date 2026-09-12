"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { teamForEvent } from "@/lib/team";
import { promoteWaitlist, registerTeam } from "@/lib/events";
import { grantEventAccess, revokeEventAccess } from "@/lib/event-space";

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

const cleanNickname = (raw?: string | null) => {
  const t = (raw ?? "").trim().slice(0, 40);
  return t || null;
};

/** Player signs up (or re-activates a withdrawn signup) for a SOLO event. */
export async function signUpForEvent(eventId: string, nickname?: string) {
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
  const nick = cleanNickname(nickname);

  await db.eventSignup.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    create: { eventId, playerId, state, nickname: nick },
    update: { state, nickname: nick },
  });
  await logAudit({
    actorId: session?.user?.id,
    action: "event.signup",
    targetType: "Event",
    targetId: eventId,
    meta: { state },
  });
  if (state === "SIGNED_UP") void grantEventAccess(eventId, playerId);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true, state };
}

/**
 * Solo "I'm in, looking for a team" registration for a TEAM event. Puts the
 * player on the roster with no team so leaders can recruit them; joining or
 * forming a team later absorbs this signup.
 */
export async function registerAsFreeAgent(eventId: string, nickname?: string) {
  const session = await auth();
  const playerId = await callerPlayerId(eventId);

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") {
    return { error: "This event is not open for sign-ups." };
  }
  if (event.format !== "TEAM") {
    return { error: "This is a solo event — just sign up." };
  }
  if (await teamForEvent(playerId, eventId)) {
    return { error: "You're already in a team for this event." };
  }

  const nick = cleanNickname(nickname);
  await db.eventSignup.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    create: { eventId, playerId, state: "SIGNED_UP", nickname: nick },
    update: { state: "SIGNED_UP", teamId: null, nickname: nick },
  });
  await logAudit({
    actorId: session?.user?.id,
    action: "event.free_agent",
    targetType: "Event",
    targetId: eventId,
  });
  void grantEventAccess(eventId, playerId);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true };
}

/** Player marks their own attendance once the event is live. */
export async function checkInToEvent(eventId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/events/${eventId}`);
  const playerId = await callerPlayerId(eventId);

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "PUBLISHED") return { error: "This event isn't running." };

  const now = Date.now();
  const opensAt = event.startsAt.getTime() - 30 * 60 * 1000; // 30 min before start
  const closesAt = event.endsAt ? event.endsAt.getTime() : event.startsAt.getTime() + 864e5;
  if (now < opensAt) return { error: "Check-in opens 30 minutes before the start." };
  if (now > closesAt) return { error: "Check-in for this event has closed." };

  const signup = await db.eventSignup.findUnique({
    where: { eventId_playerId: { eventId, playerId } },
    select: { state: true },
  });
  if (signup?.state !== "SIGNED_UP") return { error: "You're not on the roster for this event." };

  await db.eventAttendance.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    create: { eventId, playerId, attended: true, markedById: session.user.id },
    update: { attended: true, markedById: session.user.id, markedAt: new Date() },
  });
  await logAudit({
    actorId: session.user.id,
    action: "event.checkin",
    targetType: "Event",
    targetId: eventId,
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  return { ok: true };
}

/**
 * Set/change the display name used for this one event — works for a solo
 * sign-up, a free agent, or a team member; anywhere there's an active
 * EventSignup row. Doesn't touch state/capacity, safe to call any time.
 */
export async function updateEventNickname(eventId: string, nickname: string) {
  const playerId = await callerPlayerId(eventId);
  const nick = cleanNickname(nickname);
  const updated = await db.eventSignup.updateMany({
    where: { eventId, playerId, state: { in: ["SIGNED_UP", "WAITLIST"] } },
    data: { nickname: nick },
  });
  if (updated.count === 0) return { error: "You're not on the roster for this event." };
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true };
}

export async function withdrawFromEvent(eventId: string) {
  const playerId = await callerPlayerId(eventId);
  const existing = await db.eventSignup.findUnique({
    where: { eventId_playerId: { eventId, playerId } },
    select: { teamId: true },
  });
  if (existing?.teamId) {
    return {
      error:
        "You're on a team for this event — leave the team, or your leader withdraws the whole team.",
    };
  }
  await db.eventSignup.updateMany({
    where: { eventId, playerId },
    data: { state: "WITHDRAWN" },
  });
  void revokeEventAccess(eventId, playerId);
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
  const team = await teamForEvent(playerId, eventId);
  if (!team) return { error: "Create or join a team first." };
  if (team.leaderId !== playerId) return { error: "Only your team leader can register the team." };

  const res = await registerTeam(eventId, team);
  if ("error" in res) return res;

  await logAudit({
    action: "event.team_signup",
    targetType: "Event",
    targetId: eventId,
    meta: { teamId: team.id, members: team.members.length, state: res.state },
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return res;
}

export async function withdrawTeamFromEvent(eventId: string) {
  const playerId = await callerPlayerId(eventId);
  const team = await teamForEvent(playerId, eventId);
  if (!team || team.leaderId !== playerId) {
    return { error: "Only your team leader can withdraw the team." };
  }
  await db.eventSignup.updateMany({
    where: { eventId, teamId: team.id },
    data: { state: "WITHDRAWN" },
  });
  for (const m of team.members) void revokeEventAccess(eventId, m.playerId);
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
