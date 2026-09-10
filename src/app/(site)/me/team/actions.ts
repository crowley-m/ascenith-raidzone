"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { teamCreateSchema, teamJoinSchema } from "@/lib/validation";
import { uniqueInviteCode, teamForEvent } from "@/lib/team";
import { registerTeam } from "@/lib/events";
import { notify, notifyPlayer } from "@/lib/notify";
import { syncMemberRolesByPlayer } from "@/lib/discord-roles";
import { ensureTeamVoice, revokeTeamVoice, revokeEventAccess } from "@/lib/event-space";
import { deleteChannel, deleteGuildRole } from "@/lib/discord";

export type TeamState = { ok?: boolean; error?: string };

async function myPlayerId(): Promise<string> {
  const user = await requireUser();
  if (user.playerId) return user.playerId;
  const p = await db.player.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!p) redirect("/me/profile?new=1");
  return p.id;
}

async function validTeamEventId(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  const e = await db.event.findFirst({
    where: {
      id: raw,
      status: "PUBLISHED",
      format: "TEAM",
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    select: { id: true },
  });
  return e?.id ?? null;
}

/** Load a team by id and assert the caller is its leader. */
async function requireLeadership(playerId: string, teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { members: { select: { playerId: true } } },
  });
  if (!team) throw new Error("Team not found.");
  if (team.leaderId !== playerId) throw new Error("Only the team leader can do that.");
  return team;
}

export async function createTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const playerId = await myPlayerId();
  const parsed = teamCreateSchema.safeParse({
    name: formData.get("name"),
    tag: formData.get("tag") ?? "",
    eventId: formData.get("eventId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid team." };

  const eventId = await validTeamEventId(parsed.data.eventId || undefined);
  if (!eventId) return { error: "Pick a team event to form this team for." };
  if (await teamForEvent(playerId, eventId)) {
    return { error: "You're already in a team for that event." };
  }

  const code = await uniqueInviteCode();
  try {
    const team = await db.team.create({
      data: {
        name: parsed.data.name,
        tag: parsed.data.tag ? parsed.data.tag.toUpperCase() : null,
        inviteCode: code,
        leaderId: playerId,
        eventId,
        members: { create: { playerId } },
      },
    });
    await logAudit({ actorId: playerId, action: "team.create", targetType: "Team", targetId: team.id });
    // forming a team for an event = signing it up for that event
    const reg = await registerTeam(eventId, { id: team.id, members: [{ playerId }] });
    if ("ok" in reg) {
      await logAudit({
        actorId: playerId,
        action: "event.team_signup",
        targetType: "Event",
        targetId: eventId,
        meta: { teamId: team.id, members: 1, state: reg.state, via: "team.create" },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A team with that name already exists for this event." };
    }
    throw e;
  }

  void syncMemberRolesByPlayer(playerId);
  revalidatePath("/me/team");
  revalidatePath("/teams");
  revalidatePath("/me/events");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function joinTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const playerId = await myPlayerId();
  const parsed = teamJoinSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter a valid invite code." };

  const team = await db.team.findUnique({
    where: { inviteCode: parsed.data.code },
    select: { id: true, name: true, eventId: true, leaderId: true },
  });
  if (!team) return { error: "No team matches that code." };
  if (await teamForEvent(playerId, team.eventId)) {
    return { error: "You're already in a team for that event." };
  }

  try {
    await db.teamMember.create({ data: { teamId: team.id, playerId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "You're already on that team." };
    }
    throw e;
  }
  await logAudit({ actorId: playerId, action: "team.join", targetType: "Team", targetId: team.id });
  void syncMemberRolesByPlayer(playerId);
  void ensureTeamVoice(team.id);

  // tell the leader
  if (team.leaderId !== playerId) {
    const me = await db.player.findUnique({
      where: { id: playerId },
      select: { characterName: true },
    });
    void notifyPlayer(team.leaderId, notify.teamMemberJoined(me?.characterName ?? "A player", team.name));
  }

  // if the team is already registered for its event, pull the new member onto the roster
  const registered = await db.eventSignup.findFirst({
    where: { teamId: team.id, state: { in: ["SIGNED_UP", "WAITLIST"] } },
    select: { id: true },
  });
  if (registered) {
    const members = await db.teamMember.findMany({
      where: { teamId: team.id },
      select: { playerId: true },
    });
    await registerTeam(team.eventId, { id: team.id, members });
  }

  revalidatePath("/me/team");
  revalidatePath("/teams");
  revalidatePath("/me/events");
  revalidatePath(`/events/${team.eventId}`);
  return { ok: true };
}

/** Drop a player from a team's event roster when they leave / are kicked. */
async function dropFromTeamEvent(teamId: string, eventId: string, playerId: string) {
  const removed = await db.eventSignup.updateMany({
    where: { eventId, teamId, playerId, state: { in: ["SIGNED_UP", "WAITLIST"] } },
    data: { state: "WITHDRAWN", teamId: null },
  });
  if (removed.count) void revokeEventAccess(eventId, playerId);
}

export async function leaveTeam(teamId: string) {
  const playerId = await myPlayerId();
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { leaderId: true, eventId: true, name: true },
  });
  if (!team) return;
  if (team.leaderId === playerId) {
    throw new Error("Transfer leadership or disband the team first.");
  }
  await db.teamMember.deleteMany({ where: { teamId, playerId } });
  await dropFromTeamEvent(teamId, team.eventId, playerId);
  await logAudit({ actorId: playerId, action: "team.leave", targetType: "Team", targetId: teamId });
  const me = await db.player.findUnique({
    where: { id: playerId },
    select: { characterName: true },
  });
  void notifyPlayer(team.leaderId, notify.teamMemberLeft(me?.characterName ?? "A player", team.name));
  void syncMemberRolesByPlayer(playerId);
  void revokeTeamVoice(teamId, playerId);
  revalidatePath("/me/team");
  revalidatePath("/teams");
  revalidatePath("/me/events");
}

export async function kickMember(teamId: string, memberPlayerId: string) {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId, teamId);
  if (memberPlayerId === team.leaderId) throw new Error("You can't remove yourself.");
  await db.teamMember.deleteMany({ where: { teamId, playerId: memberPlayerId } });
  await dropFromTeamEvent(teamId, team.eventId, memberPlayerId);
  await logAudit({
    actorId: playerId,
    action: "team.kick",
    targetType: "Team",
    targetId: teamId,
    meta: { memberPlayerId },
  });
  void syncMemberRolesByPlayer(memberPlayerId);
  void revokeTeamVoice(teamId, memberPlayerId);
  revalidatePath("/me/team");
  revalidatePath("/teams");
  revalidatePath("/me/events");
}

export async function renameTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const playerId = await myPlayerId();
  const teamId = (formData.get("teamId") as string) || "";
  await requireLeadership(playerId, teamId);
  const parsed = teamCreateSchema.safeParse({
    name: formData.get("name"),
    tag: formData.get("tag") ?? "",
    eventId: "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid." };
  try {
    await db.team.update({
      where: { id: teamId },
      data: {
        name: parsed.data.name,
        tag: parsed.data.tag ? parsed.data.tag.toUpperCase() : null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A team with that name already exists for this event." };
    }
    throw e;
  }
  revalidatePath("/me/team");
  revalidatePath("/teams");
  return { ok: true };
}

export async function transferLeadership(teamId: string, newLeaderPlayerId: string) {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId, teamId);
  const isMember = team.members.some((m) => m.playerId === newLeaderPlayerId);
  if (!isMember) throw new Error("Pick someone on the team.");
  await db.team.update({ where: { id: teamId }, data: { leaderId: newLeaderPlayerId } });
  await logAudit({
    actorId: playerId,
    action: "team.transfer",
    targetType: "Team",
    targetId: teamId,
    meta: { newLeaderPlayerId },
  });
  void syncMemberRolesByPlayer(playerId);
  void syncMemberRolesByPlayer(newLeaderPlayerId);
  revalidatePath("/me/team");
}

export async function regenerateInviteCode(teamId: string) {
  const playerId = await myPlayerId();
  await requireLeadership(playerId, teamId);
  const code = await uniqueInviteCode();
  await db.team.update({ where: { id: teamId }, data: { inviteCode: code } });
  revalidatePath("/me/team");
}

export async function disbandTeam(teamId: string) {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId, teamId);
  const memberIds = team.members.map((m) => m.playerId);
  const full = await db.team.findUnique({
    where: { id: teamId },
    select: { discordRoleId: true, discordVoiceChannelId: true },
  });
  await db.team.delete({ where: { id: teamId } });
  await logAudit({ actorId: playerId, action: "team.disband", targetType: "Team", targetId: teamId });
  for (const pid of memberIds) void syncMemberRolesByPlayer(pid);
  if (full?.discordVoiceChannelId) void deleteChannel(full.discordVoiceChannelId);
  if (full?.discordRoleId) void deleteGuildRole(full.discordRoleId);
  revalidatePath("/me/team");
  revalidatePath("/teams");
}
