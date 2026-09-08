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
  archiveEventSpace,
  postToChannel,
  eventEmoji,
} from "@/lib/discord";
import { createMediaAsset } from "@/lib/media";
import { getSettings } from "@/lib/settings";
import { Prisma } from "@prisma/client";
import type { PlayerStatus, Role } from "@prisma/client";

type FormState = { ok?: boolean; error?: string; count?: number };

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
    const settings = await getSettings();
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
        const posted = await postAnnouncement({
          embed,
          components,
          channelId: settings.announceChannelId || undefined,
        });
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
    if (settings.autoBuildSpace && !ev.discordCategoryId) {
      try {
        await buildEventSpace(ev.id);
      } catch (err) {
        console.error("auto build space failed", err);
      }
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
  const { eventChannels } = await getSettings();
  let space;
  try {
    space = await createEventSpace({
      name: spaceName,
      emoji: eventEmoji(ev.mode),
      channels: eventChannels,
    });
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
  let posted: { id: string } | null = null;
  try {
    const embed = eventEmbed({ ...ev, signupCount: 0, url });
    if (space.channels.announcement) {
      posted = await postToChannel(space.channels.announcement, {
        embed,
        components: [signupButtonRow(url, "Sign up on the website")],
      });
    }

    if (space.channels["how-to-join"]) {
      await postToChannel(space.channels["how-to-join"], {
        content:
          `**How to join**\n` +
          `1. Register once at ${APP_URL}/register (Discord login links automatically)\n` +
          `2. Fill your in-game UID on your profile — that's where rewards go\n` +
          (ev.format === "TEAM"
            ? `3. Team event: your team leader registers the whole team at ${url}\n`
            : `3. Sign up at ${url}\n`),
      });
    }

    if (space.channels.rewards && (tiers.length || ev.bonusText || ev.rewardPoolText)) {
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

export async function archiveEventDiscord(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev?.discordCategoryId) return { error: "This event has no Discord space." };
  if (ev.discordArchivedAt) return { error: "Already archived." };

  const channels = Object.values((ev.discordChannels as Record<string, string>) ?? {});
  try {
    await archiveEventSpace(ev.discordCategoryId, channels);
  } catch (err) {
    console.error("archiveEventSpace failed", err);
    return { error: `Discord: ${err instanceof Error ? err.message : "archive failed"}` };
  }
  await db.event.update({ where: { id: ev.id }, data: { discordArchivedAt: new Date() } });
  await logAudit({ actorId: actor.id, action: "event.discord_archive", targetType: "Event", targetId: ev.id });
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
  revalidatePath("/winners");
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
  revalidatePath("/winners");
}

// --------------------------------------------------------------------------
// Teams (staff moderation)
// --------------------------------------------------------------------------

export async function staffKickTeamMember(teamId: string, playerId: string) {
  const actor = await assertPermission("player:edit");
  const team = await db.team.findUnique({ where: { id: teamId }, select: { leaderId: true } });
  if (!team) throw new Error("Team not found.");
  if (team.leaderId === playerId) throw new Error("Transfer leadership or disband the team instead.");
  await db.teamMember.deleteMany({ where: { teamId, playerId } });
  await logAudit({ actorId: actor.id, action: "team.staff_kick", targetType: "Team", targetId: teamId, meta: { playerId } });
  revalidatePath(`/portal/teams/${teamId}`);
  revalidatePath("/portal/teams");
  revalidatePath("/teams");
}

export async function staffDisbandTeam(teamId: string) {
  const actor = await assertPermission("player:edit");
  await db.team.delete({ where: { id: teamId } });
  await logAudit({ actorId: actor.id, action: "team.staff_disband", targetType: "Team", targetId: teamId });
  revalidatePath("/portal/teams");
  revalidatePath("/teams");
  redirect("/portal/teams");
}

// --------------------------------------------------------------------------
// Settings (Owner)
// --------------------------------------------------------------------------

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("settings:manage");
  const str = (k: string) => ((formData.get(k) as string) || "").trim();

  const entries: [string, unknown][] = [
    ["announceChannelId", str("announceChannelId")],
    ["discordInvite", str("discordInvite")],
    [
      "eventChannels",
      str("eventChannels")
        .split(/[\n,]/)
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean),
    ],
    ["autoBuildSpace", formData.get("autoBuildSpace") === "on"],
    ["reminderLeadMinutes", Math.max(0, parseInt(str("reminderLeadMinutes") || "0", 10) || 0)],
  ];

  await db.$transaction(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value: value as Prisma.InputJsonValue },
        update: { value: value as Prisma.InputJsonValue },
      }),
    ),
  );
  await logAudit({ actorId: actor.id, action: "settings.save", targetType: "Setting" });
  revalidatePath("/portal/settings");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Results / placements + bulk rewards
// --------------------------------------------------------------------------

/** formData: rank1, rank2, rank3 … each "team:<id>" | "player:<id>" | "". */
export async function savePlacements(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const eventId = formData.get("eventId") as string;
  if (!eventId) return { error: "Missing event." };

  const rows: { rank: number; teamId: string | null; playerId: string | null }[] = [];
  for (let rank = 1; rank <= 5; rank++) {
    const raw = (formData.get(`rank${rank}`) as string) || "";
    if (!raw) continue;
    const [kind, id] = raw.split(":");
    if (!id) continue;
    rows.push({
      rank,
      teamId: kind === "team" ? id : null,
      playerId: kind === "player" ? id : null,
    });
  }

  await db.$transaction([
    db.eventPlacement.deleteMany({ where: { eventId } }),
    ...rows.map((r) => db.eventPlacement.create({ data: { eventId, ...r } })),
  ]);
  await logAudit({ actorId: actor.id, action: "event.placements", targetType: "Event", targetId: eventId, meta: { count: rows.length } });
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/winners");
  revalidatePath("/winners");
  return { ok: true };
}

/** One reward per attendee (attended = true). */
export async function grantAttendeeRewards(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("reward:grant");
  const eventId = formData.get("eventId") as string;
  const item = ((formData.get("item") as string) || "").trim();
  const amount = ((formData.get("amount") as string) || "").trim() || null;
  const reason = ((formData.get("reason") as string) || "").trim() || "Attendance";
  const isPublic = formData.get("isPublic") === "on";
  if (!eventId || !item) return { error: "Item is required." };

  const attended = await db.eventAttendance.findMany({
    where: { eventId, attended: true },
    select: { playerId: true },
  });
  if (attended.length === 0) return { error: "No one is marked as attended yet." };

  await db.reward.createMany({
    data: attended.map((a) => ({
      playerId: a.playerId,
      eventId,
      item,
      amount,
      reason,
      isPublic,
      grantedById: actor.id,
    })),
  });
  await logAudit({ actorId: actor.id, action: "reward.bulk_attendees", targetType: "Event", targetId: eventId, meta: { count: attended.length } });
  revalidatePath("/portal/rewards");
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/winners");
  return { ok: true, count: attended.length };
}

/** Reward each placement from the event's reward tiers (1st tier → rank 1, …). */
export async function grantPlacementRewards(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("reward:grant");
  const eventId = formData.get("eventId") as string;
  const isPublic = formData.get("isPublic") === "on";
  if (!eventId) return { error: "Missing event." };

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      placements: {
        orderBy: { rank: "asc" },
        include: {
          team: { include: { members: { select: { playerId: true } } } },
        },
      },
    },
  });
  if (!event) return { error: "Event not found." };
  if (event.placements.length === 0) return { error: "Set the results first." };

  const tiers = Array.isArray(event.rewardTiers)
    ? (event.rewardTiers as Array<{ place: string; reward: string }>)
    : [];

  const rewards: Prisma.RewardCreateManyInput[] = [];
  for (const p of event.placements) {
    const tier = tiers[p.rank - 1];
    const item = tier?.reward ?? `Rank ${p.rank}`;
    const reason = `${tier?.place ?? `#${p.rank}`} — ${event.title}`;
    const playerIds = p.playerId
      ? [p.playerId]
      : (p.team?.members.map((m) => m.playerId) ?? []);
    for (const playerId of playerIds) {
      rewards.push({ playerId, eventId, item, reason, isPublic, grantedById: actor.id });
    }
  }
  if (rewards.length === 0) return { error: "Placements have no players." };

  await db.reward.createMany({ data: rewards });
  await logAudit({ actorId: actor.id, action: "reward.placements", targetType: "Event", targetId: eventId, meta: { count: rewards.length } });
  revalidatePath("/portal/rewards");
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/winners");
  revalidatePath("/winners");
  return { ok: true, count: rewards.length };
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
  const role = formData.get("role") as Role;
  const userId = ((formData.get("userId") as string) || "").trim();
  const ident = ((formData.get("ident") as string) || "").trim();
  if (!["OWNER", "ADMIN", "MODERATOR"].includes(role)) return { error: "Pick a role." };

  // Prefer the picked user; otherwise match an email or a Discord username.
  let user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  if (!user && ident) {
    user =
      (await db.user.findUnique({ where: { email: ident.toLowerCase() } })) ??
      (await db.user.findFirst({
        where: { discordUsername: { equals: ident, mode: "insensitive" } },
      }));
  }
  if (!user) {
    return { error: "Pick someone from the list, or type an email / Discord username they've used to sign in." };
  }

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
