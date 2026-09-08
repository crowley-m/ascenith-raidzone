"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { teamCreateSchema, teamJoinSchema } from "@/lib/validation";
import { uniqueInviteCode, teamForPlayer } from "@/lib/team";

export type TeamState = { ok?: boolean; error?: string };

async function myPlayerId(): Promise<string> {
  const user = await requireUser();
  if (user.playerId) return user.playerId;
  const p = await db.player.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!p) redirect("/me/profile?new=1");
  return p.id;
}

export async function createTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const playerId = await myPlayerId();
  const parsed = teamCreateSchema.safeParse({
    name: formData.get("name"),
    tag: formData.get("tag") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid team." };

  if (await teamForPlayer(playerId)) return { error: "You're already in a team." };

  const code = await uniqueInviteCode();
  try {
    const team = await db.team.create({
      data: {
        name: parsed.data.name,
        tag: parsed.data.tag ? parsed.data.tag.toUpperCase() : null,
        inviteCode: code,
        leaderId: playerId,
        members: { create: { playerId } },
      },
    });
    await logAudit({ actorId: playerId, action: "team.create", targetType: "Team", targetId: team.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That team name is taken." };
    }
    throw e;
  }

  revalidatePath("/me/team");
  revalidatePath("/teams");
  return { ok: true };
}

export async function joinTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const playerId = await myPlayerId();
  const parsed = teamJoinSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: "Enter a valid invite code." };

  if (await teamForPlayer(playerId)) return { error: "Leave your current team first." };

  const team = await db.team.findUnique({
    where: { inviteCode: parsed.data.code },
    select: { id: true, name: true },
  });
  if (!team) return { error: "No team matches that code." };

  await db.teamMember.create({ data: { teamId: team.id, playerId } });
  await logAudit({ actorId: playerId, action: "team.join", targetType: "Team", targetId: team.id });

  revalidatePath("/me/team");
  revalidatePath("/teams");
  return { ok: true };
}

/** Load the caller's team and assert they lead it. */
async function requireLeadership(playerId: string) {
  const team = await teamForPlayer(playerId);
  if (!team) throw new Error("You're not in a team.");
  if (team.leaderId !== playerId) throw new Error("Only the team leader can do that.");
  return team;
}

export async function leaveTeam() {
  const playerId = await myPlayerId();
  const team = await teamForPlayer(playerId);
  if (!team) return;
  if (team.leaderId === playerId) {
    throw new Error("Transfer leadership or disband the team first.");
  }
  await db.teamMember.deleteMany({ where: { teamId: team.id, playerId } });
  await logAudit({ actorId: playerId, action: "team.leave", targetType: "Team", targetId: team.id });
  revalidatePath("/me/team");
  revalidatePath("/teams");
}

export async function kickMember(memberPlayerId: string) {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId);
  if (memberPlayerId === team.leaderId) throw new Error("You can't remove yourself.");
  await db.teamMember.deleteMany({ where: { teamId: team.id, playerId: memberPlayerId } });
  await logAudit({ actorId: playerId, action: "team.kick", targetType: "Team", targetId: team.id, meta: { memberPlayerId } });
  revalidatePath("/me/team");
  revalidatePath("/teams");
}

export async function renameTeam(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId);
  const parsed = teamCreateSchema.safeParse({
    name: formData.get("name"),
    tag: formData.get("tag") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid." };
  try {
    await db.team.update({
      where: { id: team.id },
      data: {
        name: parsed.data.name,
        tag: parsed.data.tag ? parsed.data.tag.toUpperCase() : null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That team name is taken." };
    }
    throw e;
  }
  revalidatePath("/me/team");
  revalidatePath("/teams");
  return { ok: true };
}

export async function transferLeadership(newLeaderPlayerId: string) {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId);
  const isMember = team.members.some((m) => m.playerId === newLeaderPlayerId);
  if (!isMember) throw new Error("Pick someone on the team.");
  await db.team.update({ where: { id: team.id }, data: { leaderId: newLeaderPlayerId } });
  await logAudit({ actorId: playerId, action: "team.transfer", targetType: "Team", targetId: team.id, meta: { newLeaderPlayerId } });
  revalidatePath("/me/team");
}

export async function regenerateInviteCode() {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId);
  const code = await uniqueInviteCode();
  await db.team.update({ where: { id: team.id }, data: { inviteCode: code } });
  revalidatePath("/me/team");
}

export async function disbandTeam() {
  const playerId = await myPlayerId();
  const team = await requireLeadership(playerId);
  await db.team.delete({ where: { id: team.id } });
  await logAudit({ actorId: playerId, action: "team.disband", targetType: "Team", targetId: team.id });
  revalidatePath("/me/team");
  revalidatePath("/teams");
}
