"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/guard";
import { logAudit } from "@/lib/audit";
import {
  eventSchema,
  factionSchema,
  flagSchema,
  noteSchema,
  parseRewardTiers,
  rewardSchema,
} from "@/lib/validation";
import { postAnnouncement, editAnnouncement, eventEmbed } from "@/lib/discord";
import { Prisma } from "@prisma/client";
import type { PlayerStatus, Role } from "@prisma/client";

type FormState = { ok?: boolean; error?: string };

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// --------------------------------------------------------------------------
// Players
// --------------------------------------------------------------------------

export async function setPlayerStatus(playerId: string, status: PlayerStatus) {
  const actor = await assertPermission("player:status");
  await db.player.update({ where: { id: playerId }, data: { status } });
  await logAudit({
    actorId: actor.id,
    action: "player.status",
    targetType: "Player",
    targetId: playerId,
    meta: { status },
  });
  revalidatePath(`/portal/players/${playerId}`);
  revalidatePath("/portal/players");
}

export async function addNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("note:write");
  const parsed = noteSchema.safeParse({
    playerId: formData.get("playerId"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) return { error: "Note can't be empty." };

  await db.staffNote.create({
    data: { ...parsed.data, authorId: actor.id },
  });
  await logAudit({
    actorId: actor.id,
    action: "player.note_add",
    targetType: "Player",
    targetId: parsed.data.playerId,
  });
  revalidatePath(`/portal/players/${parsed.data.playerId}`);
  return { ok: true };
}

export async function deleteNote(noteId: string, playerId: string) {
  const actor = await assertPermission("note:write");
  await db.staffNote.delete({ where: { id: noteId } });
  await logAudit({ actorId: actor.id, action: "player.note_delete", targetType: "Player", targetId: playerId });
  revalidatePath(`/portal/players/${playerId}`);
}

export async function addFlag(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("flag:write");
  const parsed = flagSchema.safeParse({
    playerId: formData.get("playerId"),
    type: formData.get("type"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Pick a type and give a reason." };

  await db.flag.create({ data: { ...parsed.data, authorId: actor.id } });
  if (parsed.data.type === "BAN") {
    await db.player.update({ where: { id: parsed.data.playerId }, data: { status: "BANNED" } });
  }
  await logAudit({
    actorId: actor.id,
    action: "player.flag_add",
    targetType: "Player",
    targetId: parsed.data.playerId,
    meta: { type: parsed.data.type },
  });
  revalidatePath(`/portal/players/${parsed.data.playerId}`);
  return { ok: true };
}

// --------------------------------------------------------------------------
// Events
// --------------------------------------------------------------------------

export async function saveEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const id = (formData.get("id") as string) || null;

  const str = (k: string) => (formData.get(k) as string) || null;
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: str("description"),
    startsAt: formData.get("startsAt"),
    endsAt: str("endsAt"),
    server: str("server"),
    maxSlots: str("maxSlots"),
    rewardPoolText: str("rewardPoolText"),
    status: formData.get("status"),
    summary: str("summary"),
    mode: str("mode"),
    wipeCycle: str("wipeCycle"),
    raidWindow: str("raidWindow"),
    rewardTiersText: str("rewardTiersText"),
    bonusText: str("bonusText"),
    detailsMd: str("detailsMd"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }
  const d = parsed.data;
  const data = {
    title: d.title,
    description: d.description ?? null,
    startsAt: new Date(d.startsAt),
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    server: d.server ?? null,
    maxSlots: d.maxSlots ?? null,
    rewardPoolText: d.rewardPoolText ?? null,
    status: d.status,
    summary: d.summary ?? null,
    mode: d.mode ?? null,
    wipeCycle: d.wipeCycle ?? null,
    raidWindow: d.raidWindow ?? null,
    rewardTiers:
      (parseRewardTiers(d.rewardTiersText) as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    bonusText: d.bonusText ?? null,
    detailsMd: d.detailsMd ?? null,
  };

  let eventId: string;
  if (id) {
    await db.event.update({ where: { id }, data });
    eventId = id;
  } else {
    const created = await db.event.create({ data: { ...data, createdById: actor.id } });
    eventId = created.id;
  }
  await logAudit({
    actorId: actor.id,
    action: id ? "event.update" : "event.create",
    targetType: "Event",
    targetId: eventId,
  });

  // Post or update the Discord announcement when published.
  const ev = await db.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
  });
  if (ev && ev.status === "PUBLISHED") {
    try {
      const embed = eventEmbed({
        ...ev,
        signupCount: ev._count.signups,
        url: `${APP_URL}/events/${ev.id}`,
      });
      if (ev.discordMessageId && ev.discordChannelId) {
        await editAnnouncement(ev.discordChannelId, ev.discordMessageId, embed);
      } else {
        const posted = await postAnnouncement({ embed });
        if (posted) {
          await db.event.update({
            where: { id: ev.id },
            data: { discordMessageId: posted.id, discordChannelId: posted.channelId },
          });
        }
      }
    } catch (err) {
      console.error("announcement failed", err);
    }
  }

  revalidatePath("/portal/events");
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/portal/events/${eventId}`);
}

export async function markAttendance(eventId: string, playerId: string, attended: boolean) {
  const actor = await assertPermission("attendance:mark");
  await db.eventAttendance.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    create: { eventId, playerId, attended, markedById: actor.id },
    update: { attended, markedById: actor.id, markedAt: new Date() },
  });
  await logAudit({
    actorId: actor.id,
    action: "event.attendance",
    targetType: "Event",
    targetId: eventId,
    meta: { playerId, attended },
  });
  revalidatePath(`/portal/events/${eventId}`);
}

// --------------------------------------------------------------------------
// Rewards
// --------------------------------------------------------------------------

export async function grantReward(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("reward:grant");
  const parsed = rewardSchema.safeParse({
    playerId: formData.get("playerId"),
    eventId: (formData.get("eventId") as string) || null,
    item: formData.get("item"),
    amount: (formData.get("amount") as string) || null,
    reason: formData.get("reason"),
    isPublic: formData.get("isPublic") === "on",
    proofImageUrl: (formData.get("proofImageUrl") as string) || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid reward." };

  const r = await db.reward.create({
    data: {
      playerId: parsed.data.playerId,
      eventId: parsed.data.eventId ?? null,
      item: parsed.data.item,
      amount: parsed.data.amount ?? null,
      reason: parsed.data.reason,
      isPublic: parsed.data.isPublic ?? false,
      proofImageUrl: parsed.data.proofImageUrl ?? null,
      grantedById: actor.id,
    },
  });
  await logAudit({
    actorId: actor.id,
    action: "reward.grant",
    targetType: "Reward",
    targetId: r.id,
    meta: { playerId: parsed.data.playerId },
  });
  revalidatePath("/portal/rewards");
  revalidatePath(`/portal/players/${parsed.data.playerId}`);
  revalidatePath("/proof");
  return { ok: true };
}

export async function deleteReward(rewardId: string, playerId: string) {
  const actor = await assertPermission("reward:grant");
  await db.reward.delete({ where: { id: rewardId } });
  await logAudit({ actorId: actor.id, action: "reward.delete", targetType: "Reward", targetId: rewardId });
  revalidatePath("/portal/rewards");
  revalidatePath(`/portal/players/${playerId}`);
  revalidatePath("/proof");
}

// --------------------------------------------------------------------------
// Factions
// --------------------------------------------------------------------------

export async function saveFaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("faction:manage");
  const id = (formData.get("id") as string) || null;
  const parsed = factionSchema.safeParse({
    name: formData.get("name"),
    tag: (formData.get("tag") as string) || null,
    color: (formData.get("color") as string) || null,
    description: (formData.get("description") as string) || null,
  });
  if (!parsed.success) return { error: "Faction name is required." };

  if (id) {
    await db.faction.update({ where: { id }, data: parsed.data });
  } else {
    await db.faction.create({ data: parsed.data });
  }
  await logAudit({ actorId: actor.id, action: id ? "faction.update" : "faction.create", targetType: "Faction" });
  revalidatePath("/portal/factions");
  return { ok: true };
}

export async function deleteFaction(id: string) {
  const actor = await assertPermission("faction:manage");
  await db.faction.delete({ where: { id } });
  await logAudit({ actorId: actor.id, action: "faction.delete", targetType: "Faction", targetId: id });
  revalidatePath("/portal/factions");
}

// --------------------------------------------------------------------------
// Staff roles (Owner only)
// --------------------------------------------------------------------------

export async function setStaffRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("staff:manage");
  const email = ((formData.get("email") as string) || "").toLowerCase().trim();
  const role = formData.get("role") as Role;
  if (!email || !["OWNER", "ADMIN", "MODERATOR"].includes(role)) {
    return { error: "Enter an email and pick a role." };
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No user with that email has signed in yet." };

  await db.staffRole.upsert({
    where: { userId: user.id },
    create: { userId: user.id, role },
    update: { role },
  });
  await logAudit({
    actorId: actor.id,
    action: "staff.set_role",
    targetType: "User",
    targetId: user.id,
    meta: { role },
  });
  revalidatePath("/portal/staff");
  return { ok: true };
}

export async function removeStaffRole(userId: string) {
  const actor = await assertPermission("staff:manage");
  if (actor.id === userId) throw new Error("You can't remove your own role.");
  await db.staffRole.deleteMany({ where: { userId } });
  await logAudit({ actorId: actor.id, action: "staff.remove_role", targetType: "User", targetId: userId });
  revalidatePath("/portal/staff");
}
