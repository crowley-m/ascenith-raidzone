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
  parseSeasonVideos,
  rewardSchema,
  seasonSchema,
} from "@/lib/validation";
import {
  postAnnouncement,
  editAnnouncement,
  eventEmbed,
  signupButtonRow,
  createEventSpace,
  archiveEventSpace,
  lockReadonlyChannels,
  postToChannel,
  editChannelMessage,
  eventEmoji,
} from "@/lib/discord";
import { createMediaAsset } from "@/lib/media";
import { getSettings } from "@/lib/settings";
import { notify, notifyPlayer } from "@/lib/notify";
import { syncMemberRolesByPlayer } from "@/lib/discord-roles";
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

export async function deleteFlag(flagId: string, playerId: string) {
  const actor = await assertPermission("flag:write");
  await db.flag.delete({ where: { id: flagId } });
  await logAudit({
    actorId: actor.id,
    action: "player.flag_delete",
    targetType: "Player",
    targetId: playerId,
  });
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
    endsWeeks: str("endsWeeks"),
    server: str("server"),
    format: str("format") ?? "SOLO",
    maxSlots: str("maxSlots"),
    teamSize: str("teamSize"),
    rewardPoolText: str("rewardPoolText"),
    status: formData.get("status"),
    seasonId: str("seasonId"),
    summary: str("summary"),
    mode: str("mode"),
    wipeCycle: str("wipeCycle"),
    raidWindow: str("raidWindow"),
    rewardTiersText: str("rewardTiersText"),
    bonusText: str("bonusText"),
    rulesMd: str("rulesMd"),
    detailsMd: str("detailsMd"),
    howToJoinVideoUrl: str("howToJoinVideoUrl"),
    announcementMd: str("announcementMd"),
    howToJoinMd: str("howToJoinMd"),
    gameplayMd: str("gameplayMd"),
    wipeInfoMd: str("wipeInfoMd"),
    rewardsMd: str("rewardsMd"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }
  const d = parsed.data;
  const startsAt = new Date(d.startsAt);
  const endsAt =
    d.endsWeeks && d.endsWeeks > 0
      ? new Date(startsAt.getTime() + d.endsWeeks * 7 * 24 * 60 * 60 * 1000)
      : d.endsAt
        ? new Date(d.endsAt)
        : null;
  const data = {
    title: d.title,
    description: d.description ?? null,
    startsAt,
    endsAt,
    server: d.server ?? null,
    format: d.format,
    maxSlots: d.maxSlots ?? null,
    teamSize: d.teamSize ?? null,
    rewardPoolText: d.rewardPoolText ?? null,
    status: d.status,
    seasonId: d.seasonId ? d.seasonId : null,
    summary: d.summary ?? null,
    mode: d.mode ?? null,
    wipeCycle: d.wipeCycle ?? null,
    raidWindow: d.raidWindow ?? null,
    rewardTiers:
      (parseRewardTiers(d.rewardTiersText) as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    bonusText: d.bonusText ?? null,
    rulesMd: d.rulesMd ?? null,
    detailsMd: d.detailsMd ?? null,
    howToJoinVideoUrl: d.howToJoinVideoUrl ? d.howToJoinVideoUrl : null,
    announcementMd: d.announcementMd ?? null,
    howToJoinMd: d.howToJoinMd ?? null,
    gameplayMd: d.gameplayMd ?? null,
    wipeInfoMd: d.wipeInfoMd ?? null,
    rewardsMd: d.rewardsMd ?? null,
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
      if (ev.discordCategoryId) {
        // full space exists — resync every channel (announcement included)
        await pushEventChannelContent(
          ev.id,
          (ev.discordChannels as Record<string, string>) ?? {},
          (ev.discordSeedMessages as Record<string, string>) ?? {},
        );
      } else {
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

type ChannelPayload = {
  content?: string;
  embed?: Parameters<typeof postToChannel>[1]["embed"];
  components?: Parameters<typeof postToChannel>[1]["components"];
};

type FullEvent = NonNullable<Awaited<ReturnType<typeof db.event.findUnique>>>;

/** What goes in each of the event's Discord channels. */
function eventChannelPayloads(ev: FullEvent): Record<string, ChannelPayload> {
  const url = `${APP_URL}/events/${ev.id}`;
  const tiers = Array.isArray(ev.rewardTiers)
    ? (ev.rewardTiers as Array<{ place: string; reward: string }>)
    : [];
  const clip = (s: string) => s.slice(0, 1990);
  const out: Record<string, ChannelPayload> = {};

  out.announcement = {
    content: ev.announcementMd ? clip(ev.announcementMd) : undefined,
    embed: eventEmbed({ ...ev, signupCount: 0, url }),
    components: [signupButtonRow(url, "Sign up on the website")],
  };

  out["how-to-join"] = {
    content: clip(
      ev.howToJoinMd ??
        `**How to join**\n` +
          `1. Register once at ${APP_URL}/register (Discord login links automatically)\n` +
          `2. Fill your in-game UID on your profile — that's where rewards go\n` +
          (ev.format === "TEAM"
            ? `3. Team event: your team leader registers the whole team at ${url}`
            : `3. Sign up at ${url}`),
    ),
  };

  if (ev.rulesMd) out.rules = { content: clip(`**Rules — ${ev.title}**\n\n${ev.rulesMd}`) };
  if (ev.gameplayMd) out.gameplay = { content: clip(ev.gameplayMd) };

  if (ev.wipeInfoMd || ev.wipeCycle || ev.raidWindow) {
    const lines: string[] = ["**Wipe info**"];
    if (ev.wipeCycle) lines.push(`Cycle: ${ev.wipeCycle}`);
    if (ev.raidWindow) lines.push(`Raid window: ${ev.raidWindow}`);
    if (ev.wipeInfoMd) lines.push("", ev.wipeInfoMd);
    out["wipe-info"] = { content: clip(lines.join("\n")) };
  }

  if (ev.rewardsMd) {
    out.rewards = { content: clip(ev.rewardsMd) };
  } else if (tiers.length || ev.bonusText || ev.rewardPoolText) {
    const lines = ["**Rewards**"];
    for (const t of tiers) lines.push(`${t.place} — ${t.reward}`);
    if (!tiers.length && ev.rewardPoolText) lines.push(ev.rewardPoolText);
    if (ev.bonusText) lines.push(`\n**Bonus:** ${ev.bonusText}`);
    out.rewards = { content: clip(lines.join("\n")) };
  }

  return out;
}

/**
 * Post (or edit, if a seed message id exists) the event's channel content.
 * Stores the message ids on the event for the next re-sync.
 */
async function pushEventChannelContent(
  eventId: string,
  channels: Record<string, string>,
  seed: Record<string, string>,
): Promise<void> {
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev) return;
  const payloads = eventChannelPayloads(ev);
  const next: Record<string, string> = { ...seed };

  for (const [name, payload] of Object.entries(payloads)) {
    const channelId = channels[name];
    if (!channelId || (!payload.content && !payload.embed)) continue;
    const existing = seed[name];
    try {
      if (existing) {
        await editChannelMessage(channelId, existing, payload);
      } else {
        const m = await postToChannel(channelId, payload);
        if (m) next[name] = m.id;
      }
    } catch (err) {
      console.error(`channel sync failed for ${name}`, err);
      // a deleted message → post a fresh one next time
      if (existing) delete next[name];
    }
  }

  await db.event.update({
    where: { id: eventId },
    data: {
      discordSeedMessages: next as Prisma.InputJsonValue,
      discordMessageId: next.announcement ?? ev.discordMessageId,
      discordChannelId: channels.announcement ?? ev.discordChannelId,
    },
  });
}

/**
 * Re-post / update the event's channel content after you've edited it.
 */
export async function syncEventChannels(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev?.discordCategoryId) return { error: "This event has no Discord space yet." };

  const channels = (ev.discordChannels as Record<string, string>) ?? {};
  const seed = (ev.discordSeedMessages as Record<string, string>) ?? {};
  try {
    await pushEventChannelContent(eventId, channels, seed);
    await lockReadonlyChannels(channels);
  } catch (err) {
    return { error: `Discord: ${err instanceof Error ? err.message : "sync failed"}` };
  }
  await logAudit({ actorId: actor.id, action: "event.discord_sync", targetType: "Event", targetId: eventId });
  revalidatePath(`/portal/events/${eventId}`);
  return { ok: true };
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

  // record category + channel ids straight away so nothing is orphaned
  await db.event.update({
    where: { id: ev.id },
    data: {
      discordCategoryId: space.categoryId,
      discordChannels: space.channels as Prisma.InputJsonValue,
      discordChannelId: space.channels.announcement ?? null,
    },
  });

  try {
    await pushEventChannelContent(ev.id, space.channels, {});
  } catch (err) {
    console.error("event space seed failed", err);
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

export async function cloneEvent(eventId: string): Promise<void> {
  const actor = await assertPermission("event:manage");
  const src = await db.event.findUnique({ where: { id: eventId } });
  if (!src) redirect("/portal/events");

  // shift the schedule forward by the same span, or a week if there's no end
  const span = src.endsAt ? src.endsAt.getTime() - src.startsAt.getTime() : 0;
  const startsAt = new Date(src.startsAt.getTime() + (span || 7 * 24 * 3600 * 1000) + 14 * 24 * 3600 * 1000);
  const endsAt = src.endsAt ? new Date(startsAt.getTime() + span) : null;

  const created = await db.event.create({
    data: {
      title: `${src.title} (copy)`,
      description: src.description,
      startsAt,
      endsAt,
      server: src.server,
      format: src.format,
      maxSlots: src.maxSlots,
      teamSize: src.teamSize,
      rewardPoolText: src.rewardPoolText,
      status: "DRAFT",
      seasonId: src.seasonId,
      summary: src.summary,
      mode: src.mode,
      wipeCycle: src.wipeCycle,
      raidWindow: src.raidWindow,
      rewardTiers: (src.rewardTiers as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      bonusText: src.bonusText,
      rulesMd: src.rulesMd,
      detailsMd: src.detailsMd,
      howToJoinVideoUrl: src.howToJoinVideoUrl,
      announcementMd: src.announcementMd,
      howToJoinMd: src.howToJoinMd,
      gameplayMd: src.gameplayMd,
      wipeInfoMd: src.wipeInfoMd,
      rewardsMd: src.rewardsMd,
      createdById: actor.id,
    },
  });
  await logAudit({
    actorId: actor.id,
    action: "event.clone",
    targetType: "Event",
    targetId: created.id,
    meta: { from: eventId },
  });
  revalidatePath("/portal/events");
  redirect(`/portal/events/${created.id}`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev) redirect("/portal/events");

  // Best-effort: sink the Discord space so no orphan category is left behind.
  if (ev.discordCategoryId && !ev.discordArchivedAt) {
    const channels = Object.values((ev.discordChannels as Record<string, string>) ?? {});
    try {
      await archiveEventSpace(ev.discordCategoryId, channels);
    } catch (err) {
      console.error("archiveEventSpace during delete failed", err);
    }
  }

  // Signups / attendance / placements cascade; rewards & teams keep their rows
  // (eventId set null) so player history and squads survive.
  await db.event.delete({ where: { id: eventId } });
  await logAudit({
    actorId: actor.id,
    action: "event.delete",
    targetType: "Event",
    targetId: eventId,
    meta: { title: ev.title },
  });
  revalidatePath("/portal/events");
  revalidatePath("/events");
  redirect("/portal/events");
}

/** Staff manually pulls a waitlisted player (SOLO) or team (TEAM) into the roster. */
export async function promoteSignup(signupId: string): Promise<void> {
  const actor = await assertPermission("event:manage");
  const s = await db.eventSignup.findUnique({ where: { id: signupId } });
  if (!s || s.state !== "WAITLIST") return;

  if (s.teamId) {
    await db.eventSignup.updateMany({
      where: { eventId: s.eventId, teamId: s.teamId, state: "WAITLIST" },
      data: { state: "SIGNED_UP" },
    });
    const members = await db.eventSignup.findMany({
      where: { eventId: s.eventId, teamId: s.teamId },
      select: { playerId: true },
    });
    const ev = await db.event.findUnique({ where: { id: s.eventId }, select: { title: true } });
    const msg = notify.waitlistPromoted(ev?.title ?? "the event", s.eventId);
    for (const m of members) void notifyPlayer(m.playerId, msg);
  } else {
    await db.eventSignup.update({ where: { id: signupId }, data: { state: "SIGNED_UP" } });
    const ev = await db.event.findUnique({ where: { id: s.eventId }, select: { title: true } });
    void notifyPlayer(s.playerId, notify.waitlistPromoted(ev?.title ?? "the event", s.eventId));
  }

  await logAudit({
    actorId: actor.id,
    action: "event.promote",
    targetType: "Event",
    targetId: s.eventId,
    meta: { signupId },
  });
  revalidatePath(`/portal/events/${s.eventId}`);
  revalidatePath(`/events/${s.eventId}`);
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

  const ev = parsed.data.eventId
    ? await db.event.findUnique({ where: { id: parsed.data.eventId }, select: { title: true } })
    : null;
  void notifyPlayer(
    parsed.data.playerId,
    notify.rewardGranted(parsed.data.item, parsed.data.amount ?? null, ev?.title ?? null),
  );

  revalidatePath("/portal/rewards");
  revalidatePath(`/portal/players/${parsed.data.playerId}`);
  revalidatePath("/winners");
  revalidatePath("/me/rewards");
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
    ["howToJoinVideoUrl", str("howToJoinVideoUrl")],
    ["registeredRoleId", str("registeredRoleId").replace(/[^0-9]/g, "")],
    ["teamLeaderRoleId", str("teamLeaderRoleId").replace(/[^0-9]/g, "")],
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
    discordRoleId: (formData.get("discordRoleId") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Faction name is required." };
  }
  const data = { ...parsed.data, discordRoleId: parsed.data.discordRoleId || null };

  const faction = id
    ? await db.faction.update({ where: { id }, data })
    : await db.faction.create({ data });
  await logAudit({ actorId: actor.id, action: id ? "faction.update" : "faction.create", targetType: "Faction", targetId: faction.id });

  // reconcile the Discord role for everyone currently in this faction
  const members = await db.player.findMany({ where: { factionId: faction.id }, select: { id: true } });
  for (const m of members) void syncMemberRolesByPlayer(m.id);

  revalidatePath("/portal/factions");
  return { ok: true };
}

export async function deleteFaction(id: string) {
  const actor = await assertPermission("faction:manage");
  const members = await db.player.findMany({ where: { factionId: id }, select: { id: true } });
  await db.faction.delete({ where: { id } });
  await logAudit({ actorId: actor.id, action: "faction.delete", targetType: "Faction", targetId: id });
  for (const m of members) void syncMemberRolesByPlayer(m.id);
  revalidatePath("/portal/factions");
}

export async function setPlayerFaction(playerId: string, factionId: string | null) {
  const actor = await assertPermission("faction:manage");
  await db.player.update({
    where: { id: playerId },
    data: { factionId: factionId || null },
  });
  await logAudit({
    actorId: actor.id,
    action: "player.faction",
    targetType: "Player",
    targetId: playerId,
    meta: { factionId: factionId || null },
  });
  void syncMemberRolesByPlayer(playerId);
  revalidatePath(`/portal/players/${playerId}`);
}

// --------------------------------------------------------------------------
// Seasons
// --------------------------------------------------------------------------

export async function saveSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const id = (formData.get("id") as string) || null;
  const str = (k: string) => ((formData.get(k) as string) || "").trim() || null;

  const parsed = seasonSchema.safeParse({
    series: str("series"),
    number: formData.get("number"),
    slug: str("slug"),
    name: str("name"),
    status: formData.get("status") ?? "UPCOMING",
    startsAt: str("startsAt"),
    endsAt: str("endsAt"),
    prizePoolText: str("prizePoolText"),
    championName: str("championName"),
    championNote: str("championNote"),
    posterUrl: str("posterUrl"),
    blurb: str("blurb"),
    videosText: str("videosText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the season fields." };
  }
  const s = parsed.data;
  const data = {
    series: s.series,
    number: s.number,
    slug: s.slug,
    name: s.name ?? null,
    status: s.status,
    startsAt: s.startsAt ? new Date(s.startsAt) : null,
    endsAt: s.endsAt ? new Date(s.endsAt) : null,
    prizePoolText: s.prizePoolText ?? null,
    championName: s.championName ?? null,
    championNote: s.championNote ?? null,
    posterUrl: s.posterUrl ?? null,
    blurb: s.blurb ?? null,
  };
  const videos = parseSeasonVideos(s.videosText);

  let seasonId = id;
  try {
    if (id) {
      await db.season.update({ where: { id }, data });
    } else {
      const created = await db.season.create({ data });
      seasonId = created.id;
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `That series + number, or that slug, already exists.` };
    }
    throw err;
  }

  // videos: replace the set from the textarea
  if (seasonId) {
    await db.seasonVideo.deleteMany({ where: { seasonId } });
    if (videos.length) {
      await db.seasonVideo.createMany({
        data: videos.map((v, i) => ({ seasonId, url: v.url, title: v.title, sortOrder: i })),
      });
    }
  }

  await logAudit({
    actorId: actor.id,
    action: id ? "season.update" : "season.create",
    targetType: "Season",
    targetId: seasonId ?? undefined,
  });
  revalidatePath("/portal/seasons");
  revalidatePath("/seasons");
  if (seasonId) revalidatePath(`/seasons/${s.slug}`);
  revalidatePath("/winners");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteSeason(id: string) {
  const actor = await assertPermission("event:manage");
  await db.season.delete({ where: { id } });
  await logAudit({ actorId: actor.id, action: "season.delete", targetType: "Season", targetId: id });
  revalidatePath("/portal/seasons");
  revalidatePath("/seasons");
  revalidatePath("/winners");
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

function mediaKind(v: FormDataEntryValue | null): "gallery" | "proof" {
  return v === "proof" ? "proof" : "gallery";
}
const mediaRevalidate = (kind: string) => (kind === "proof" ? "/winners" : "/");

export async function addGalleryImage(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("media:manage");
  const kind = mediaKind(formData.get("kind"));
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick an image to upload." };

  const last = await db.mediaAsset.findFirst({
    where: { kind },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    const asset = await createMediaAsset({
      kind,
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
  revalidatePath(mediaRevalidate(kind));
  return { ok: true };
}

export async function updateGalleryImage(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("media:manage");
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing image." };
  const asset = await db.mediaAsset.update({
    where: { id },
    data: {
      caption: ((formData.get("caption") as string) || "").trim() || null,
      tag: ((formData.get("tag") as string) || "").trim() || null,
    },
    select: { kind: true },
  });
  await logAudit({ actorId: actor.id, action: "media.update", targetType: "MediaAsset", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath(mediaRevalidate(asset.kind));
  return { ok: true };
}

export async function deleteGalleryImage(id: string) {
  const actor = await assertPermission("media:manage");
  const asset = await db.mediaAsset.delete({ where: { id }, select: { kind: true } });
  await logAudit({ actorId: actor.id, action: "media.delete", targetType: "MediaAsset", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath(mediaRevalidate(asset.kind));
}

/** Swap sortOrder with the neighbour in `dir` so staff can reorder within a kind. */
export async function moveGalleryImage(id: string, dir: "up" | "down") {
  const actor = await assertPermission("media:manage");
  const self = await db.mediaAsset.findUnique({ where: { id }, select: { kind: true } });
  if (!self) return;
  const all = await db.mediaAsset.findMany({
    where: { kind: self.kind },
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
  revalidatePath(mediaRevalidate(self.kind));
}
