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
import {
  postAnnouncement,
  editAnnouncement,
  eventEmbed,
  signupButtonRow,
  createEventSpace,
  postToChannel,
  eventEmoji,
} from "@/lib/discord";
import { createMediaAsset } from "@/lib/media";
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
    format: str("format") ?? "SOLO",
    maxSlots: str("maxSlots"),
    teamSize: str("teamSize"),
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
    format: d.format,
    maxSlots: d.maxSlots ?? null,
    teamSize: d.teamSize ?? null,
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
      const components = [signupButtonRow(`${APP_URL}/events/${ev.id}`, "Sign up on the website")];
      if (ev.discordMessageId && ev.discordChannelId) {
        await editAnnouncement(ev.discordChannelId, ev.discordMessageId, embed, undefined, components);
      } else {
        const posted = await postAnnouncement({ embed, components });
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
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/"); // landing shows the current / next published event
  redirect(`/portal/events/${eventId}`);
}

/**
 * Bot builds the event's Discord space: a themed category + the standard
 * channel set, then seeds announcement / how-to-join / rewards. Idempotent —
 * refuses if the event already has a category.
 */
export async function buildEventSpace(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev) return { error: "Event not found." };
  if (ev.discordCategoryId) return { error: "This event already has a Discord space." };

  const spaceName = ev.mode ? `RAIDZONE ${ev.mode}` : ev.title;
  let space;
  try {
    space = await createEventSpace({ name: spaceName, emoji: eventEmoji(ev.mode) });
  } catch (err) {
    console.error("createEventSpace failed", err);
    return { error: `Discord: ${err instanceof Error ? err.message : "channel creation failed"}` };
  }
  if (!space) return { error: "Discord isn't configured (bot token / guild id)." };

  const url = `${APP_URL}/events/${ev.id}`;
  const tiers = Array.isArray(ev.rewardTiers)
    ? (ev.rewardTiers as Array<{ place: string; reward: string }>)
    : [];

  // seed the key channels — best-effort, don't fail the action on a post error
  try {
    const embed = eventEmbed({ ...ev, signupCount: 0, url });
    const posted = await postToChannel(space.channels.announcement, {
      embed,
      components: [signupButtonRow(url, "Sign up on the website")],
    });

    await postToChannel(space.channels["how-to-join"], {
      content:
        `**How to join**\n` +
        `1. Register once at ${APP_URL}/register (Discord login links automatically)\n` +
        `2. Fill your in-game UID on your profile — that's where rewards go\n` +
        (ev.format === "TEAM"
          ? `3. Team event: your team leader registers the whole team at ${url}\n`
          : `3. Sign up at ${url}\n`),
    });

    if (tiers.length || ev.bonusText || ev.rewardPoolText) {
      const lines = ["**Rewards**"];
      for (const t of tiers) lines.push(`${t.place} — ${t.reward}`);
      if (!tiers.length && ev.rewardPoolText) lines.push(ev.rewardPoolText);
      if (ev.bonusText) lines.push(`\n**Bonus:** ${ev.bonusText}`);
      await postToChannel(space.channels.rewards, { content: lines.join("\n") });
    }

    await db.event.update({
      where: { id: ev.id },
      data: {
        discordCategoryId: space.categoryId,
        discordChannels: space.channels as Prisma.InputJsonValue,
        discordChannelId: space.channels.announcement,
        discordMessageId: posted?.id ?? ev.discordMessageId,
      },
    });
  } catch (err) {
    console.error("event space seed failed", err);
    // still record the category/channels so we don't orphan them
    await db.event.update({
      where: { id: ev.id },
      data: {
        discordCategoryId: space.categoryId,
        discordChannels: space.channels as Prisma.InputJsonValue,
      },
    });
  }

  await logAudit({
    actorId: actor.id,
    action: "event.discord_space",
    targetType: "Event",
    targetId: ev.id,
    meta: { categoryId: space.categoryId, channels: Object.keys(space.channels).length },
  });
  revalidatePath(`/portal/events/${ev.id}`);
  return { ok: true };
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

  let proofImageId: string | null = null;
  const upload = formData.get("proofImage");
  if (upload instanceof File && upload.size > 0) {
    try {
      const asset = await createMediaAsset({ kind: "reward", file: upload, createdById: actor.id });
      proofImageId = asset.id;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not process that image." };
    }
  }

  const r = await db.reward.create({
    data: {
      playerId: parsed.data.playerId,
      eventId: parsed.data.eventId ?? null,
      item: parsed.data.item,
      amount: parsed.data.amount ?? null,
      reason: parsed.data.reason,
      isPublic: parsed.data.isPublic ?? false,
      proofImageUrl: parsed.data.proofImageUrl ?? null,
      proofImageId,
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
  const existing = await db.reward.findUnique({
    where: { id: rewardId },
    select: { proofImageId: true },
  });
  await db.reward.delete({ where: { id: rewardId } });
  if (existing?.proofImageId) {
    await db.mediaAsset.delete({ where: { id: existing.proofImageId } }).catch(() => {});
  }
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

// --------------------------------------------------------------------------
// Media — landing gallery images
// --------------------------------------------------------------------------

export async function addGalleryImage(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("media:manage");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick an image to upload." };

  const last = await db.mediaAsset.findFirst({
    where: { kind: "gallery" },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    const asset = await createMediaAsset({
      kind: "gallery",
      file,
      caption: (formData.get("caption") as string) || null,
      tag: (formData.get("tag") as string) || null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      createdById: actor.id,
    });
    await logAudit({ actorId: actor.id, action: "media.add", targetType: "MediaAsset", targetId: asset.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not process that image." };
  }

  revalidatePath("/portal/media");
  revalidatePath("/");
  return { ok: true };
}

export async function updateGalleryImage(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("media:manage");
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing image." };
  await db.mediaAsset.update({
    where: { id },
    data: {
      caption: ((formData.get("caption") as string) || "").trim() || null,
      tag: ((formData.get("tag") as string) || "").trim() || null,
    },
  });
  await logAudit({ actorId: actor.id, action: "media.update", targetType: "MediaAsset", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGalleryImage(id: string) {
  const actor = await assertPermission("media:manage");
  await db.mediaAsset.delete({ where: { id } });
  await logAudit({ actorId: actor.id, action: "media.delete", targetType: "MediaAsset", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath("/");
}

/** Swap sortOrder with the neighbour in `dir` so staff can reorder the wall. */
export async function moveGalleryImage(id: string, dir: "up" | "down") {
  const actor = await assertPermission("media:manage");
  const all = await db.mediaAsset.findMany({
    where: { kind: "gallery" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const i = all.findIndex((a) => a.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;

  await db.$transaction([
    db.mediaAsset.update({ where: { id: all[i].id }, data: { sortOrder: all[j].sortOrder } }),
    db.mediaAsset.update({ where: { id: all[j].id }, data: { sortOrder: all[i].sortOrder } }),
  ]);
  await logAudit({ actorId: actor.id, action: "media.reorder", targetType: "MediaAsset", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath("/");
}
