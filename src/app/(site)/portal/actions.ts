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
  resultsEmbed,
  bulletize,
  signupButtonRow,
  createEventSpace,
  addMissingEventChannels,
  archiveEventSpace,
  applyEventChannelPerms,
  postToChannel,
  editChannelMessage,
  deleteChannelMessage,
  eventEmoji,
  eventIndexContent,
  pinMessage,
} from "@/lib/discord";
import { eventChannelPayloads, EVENT_CHANNEL_ORDER } from "@/lib/event-channels";
import { createMediaAsset } from "@/lib/media";
import { getSettings } from "@/lib/settings";
import { notify, notifyPlayer } from "@/lib/notify";
import { syncMemberRolesByPlayer, syncAllMemberRoles } from "@/lib/discord-roles";
import {
  ensureEventRole,
  ensureTeamVoice,
  grantEventAccess,
  teardownEventAccess,
  resyncEventAccess,
} from "@/lib/event-space";
import { BRACKET_SIZES, entrantsForEvent, roundCount, seedOrder } from "@/lib/bracket";
import { DEFAULT_EVENT_TZ, isValidEventTz, zonedInputToUtc } from "@/lib/tz";
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
    timezone: str("timezone"),
    server: str("server"),
    format: str("format") ?? "SOLO",
    maxSlots: str("maxSlots"),
    teamSize: str("teamSize"),
    rewardPoolText: str("rewardPoolText"),
    status: formData.get("status"),
    seasonId: str("seasonId"),
    summary: str("summary"),
    posterUrl: str("posterUrl"),
    mode: str("mode"),
    wipeCycle: str("wipeCycle"),
    raidWindow: str("raidWindow"),
    rewardTiersText: str("rewardTiersText"),
    bonusText: str("bonusText"),
    rulesMd: str("rulesMd"),
    detailsMd: str("detailsMd"),
    howToJoinVideoUrl: str("howToJoinVideoUrl"),
    announcePing: formData.get("announcePing") === "on",
    announcePingAll: formData.get("announcePingAll") === "on",
    announcementMd: str("announcementMd"),
    registrationMd: str("registrationMd"),
    howToJoinMd: str("howToJoinMd"),
    gameplayMd: str("gameplayMd"),
    scheduleMd: str("scheduleMd"),
    wipeInfoMd: str("wipeInfoMd"),
    rewardsMd: str("rewardsMd"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }
  const d = parsed.data;
  const tz = isValidEventTz(d.timezone) ? (d.timezone as string) : DEFAULT_EVENT_TZ;
  const startsAt = zonedInputToUtc(d.startsAt, tz);
  const endsAt =
    d.endsWeeks && d.endsWeeks > 0
      ? new Date(startsAt.getTime() + d.endsWeeks * 7 * 24 * 60 * 60 * 1000)
      : d.endsAt
        ? zonedInputToUtc(d.endsAt, tz)
        : null;
  const data = {
    title: d.title,
    description: d.description ?? null,
    startsAt,
    endsAt,
    timezone: tz,
    server: d.server ?? null,
    format: d.format,
    maxSlots: d.maxSlots ?? null,
    teamSize: d.teamSize ?? null,
    rewardPoolText: d.rewardPoolText ?? null,
    status: d.status,
    seasonId: d.seasonId ? d.seasonId : null,
    summary: d.summary ?? null,
    posterUrl: d.posterUrl ? d.posterUrl : null,
    mode: d.mode ?? null,
    wipeCycle: d.wipeCycle ?? null,
    raidWindow: d.raidWindow ?? null,
    rewardTiers:
      (parseRewardTiers(d.rewardTiersText) as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    bonusText: d.bonusText ?? null,
    rulesMd: d.rulesMd ?? null,
    detailsMd: d.detailsMd ?? null,
    howToJoinVideoUrl: d.howToJoinVideoUrl ? d.howToJoinVideoUrl : null,
    announcePing: d.announcePing ?? false,
    announcePingAll: d.announcePingAll ?? false,
    announcementMd: d.announcementMd ?? null,
    registrationMd: d.registrationMd ?? null,
    howToJoinMd: d.howToJoinMd ?? null,
    gameplayMd: d.gameplayMd ?? null,
    scheduleMd: d.scheduleMd ?? null,
    wipeInfoMd: d.wipeInfoMd ?? null,
    rewardsMd: d.rewardsMd ?? null,
  };

  let eventId: string;
  let prevStatus: string | null = null;
  if (id) {
    const before = await db.event.findUnique({ where: { id }, select: { status: true } });
    prevStatus = before?.status ?? null;
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

  // Just cancelled — tell the roster and mark the announcement cancelled.
  if (id && data.status === "CANCELLED" && prevStatus !== "CANCELLED") {
    await handleEventCancelled(eventId).catch((e) => console.error("handleEventCancelled", e));
  }

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
        const chans = (ev.discordChannels as Record<string, string>) ?? {};
        await applyEventChannelPerms(chans, ev.discordRoleId);
        await pushEventChannelContent(
          ev.id,
          chans,
          (ev.discordSeedMessages as Record<string, string>) ?? {},
        );
      } else {
        const embed = eventEmbed({
          ...ev,
          summary: bulletize(ev.announcementMd) || ev.summary,
          signupCount: ev._count.signups,
          url: `${APP_URL}/events/${ev.id}`,
        });
        const components = [signupButtonRow(`${APP_URL}/events/${ev.id}`, "Sign up on the website")];
        if (ev.discordMessageId && ev.discordChannelId) {
          // don't re-ping @everyone on an edit — the first post already did
          await editAnnouncement(ev.discordChannelId, ev.discordMessageId, embed, undefined, components);
        } else {
          const posted = await postAnnouncement({
            embed,
            components,
            channelId: settings.announceChannelId || undefined,
            mentionEveryone: ev.announcePing,
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

/**
 * Event just moved to CANCELLED: DM everyone on the roster / waitlist and
 * overwrite the Discord announcement so it no longer invites sign-ups.
 */
async function handleEventCancelled(eventId: string): Promise<void> {
  const ev = await db.event.findUnique({
    where: { id: eventId },
    include: {
      signups: {
        where: { state: { in: ["SIGNED_UP", "WAITLIST"] } },
        select: { playerId: true },
      },
    },
  });
  if (!ev) return;

  const msg = notify.eventCancelled(ev.title);
  const seen = new Set<string>();
  for (const s of ev.signups) {
    if (seen.has(s.playerId)) continue;
    seen.add(s.playerId);
    void notifyPlayer(s.playerId, msg);
  }

  const channels = (ev.discordChannels as Record<string, string>) ?? {};
  const cancelledEmbed = {
    title: `❌ ${ev.title} — CANCELLED`,
    description:
      "This event has been cancelled. Sorry for the change — watch the announcements channel for what's next.",
    color: 0x6b7280,
  };

  try {
    if (ev.discordMessageId && ev.discordChannelId) {
      await editAnnouncement(ev.discordChannelId, ev.discordMessageId, cancelledEmbed, "", []);
    }
    const annId = channels.announcement;
    const seed = (ev.discordSeedMessages as Record<string, string>) ?? {};
    if (annId && seed.announcement) {
      await editChannelMessage(annId, seed.announcement, { embed: cancelledEmbed, components: [] });
    }
    if (annId) {
      await postToChannel(annId, { content: `**${ev.title} is cancelled.** ${msg.split("\n")[0]}` });
    }
  } catch (err) {
    console.error("cancel announce failed", err);
  }
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

  // Pinned channel guide in #announcement — jump-links to every channel.
  const indexChannel = channels.announcement;
  if (indexChannel) {
    const content = eventIndexContent(ev.title, channels, EVENT_CHANNEL_ORDER);
    try {
      if (seed.index) {
        await editChannelMessage(indexChannel, seed.index, { content });
      } else {
        const m = await postToChannel(indexChannel, { content });
        if (m) {
          next.index = m.id;
          await pinMessage(indexChannel, m.id);
        }
      }
    } catch (err) {
      console.error("channel index sync failed", err);
      if (seed.index) delete next.index;
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

  let channels = (ev.discordChannels as Record<string, string>) ?? {};
  const seed = (ev.discordSeedMessages as Record<string, string>) ?? {};
  let added: string[] = [];
  try {
    // bring an older space up to the current channel set (e.g. #schedule)
    const { eventChannels } = await getSettings();
    const grown = await addMissingEventChannels(
      ev.discordCategoryId,
      channels,
      eventEmoji(ev.mode),
      eventChannels,
    );
    channels = grown.channels;
    added = grown.added;
    if (added.length) {
      await db.event.update({
        where: { id: eventId },
        data: { discordChannels: channels as Prisma.InputJsonValue },
      });
    }
    // re-assert channel perms first — also grants the bot a send override
    await applyEventChannelPerms(channels, ev.discordRoleId);
    await pushEventChannelContent(eventId, channels, seed);
  } catch (err) {
    return { error: `Discord: ${err instanceof Error ? err.message : "sync failed"}` };
  }
  await logAudit({
    actorId: actor.id,
    action: "event.discord_sync",
    targetType: "Event",
    targetId: eventId,
    meta: added.length ? { addedChannels: added } : undefined,
  });
  revalidatePath(`/portal/events/${eventId}`);
  return {
    ok: true,
    ...(added.length ? { count: added.length } : {}),
  };
}

/**
 * Re-post the standalone announcement embed (event with no Discord space) —
 * deletes the old message and posts fresh to the currently-configured
 * announcement channel. Use after changing the announce channel in Settings.
 */
export async function reannounceEvent(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
  });
  if (!ev) return { error: "Event not found." };
  if (ev.status !== "PUBLISHED") return { error: "Publish the event first." };
  if (ev.discordCategoryId) return reannounceEventChannels(eventId);

  const settings = await getSettings();
  const url = `${APP_URL}/events/${ev.id}`;
  const embed = eventEmbed({
    ...ev,
    summary: bulletize(ev.announcementMd) || ev.summary,
    signupCount: ev._count.signups,
    url,
  });
  const components = [signupButtonRow(url, "Sign up on the website")];

  if (ev.discordMessageId && ev.discordChannelId) {
    await deleteChannelMessage(ev.discordChannelId, ev.discordMessageId);
  }
  try {
    const posted = await postAnnouncement({
      embed,
      components,
      channelId: settings.announceChannelId || undefined,
      mentionEveryone: ev.announcePing || ev.announcePingAll,
    });
    if (!posted) return { error: "Discord isn't configured, or no announce channel is set." };
    await db.event.update({
      where: { id: ev.id },
      data: { discordMessageId: posted.id, discordChannelId: posted.channelId },
    });
  } catch (err) {
    return { error: `Discord: ${err instanceof Error ? err.message : "post failed"}` };
  }

  await logAudit({ actorId: actor.id, action: "event.reannounce", targetType: "Event", targetId: eventId });
  revalidatePath(`/portal/events/${eventId}`);
  return { ok: true };
}

/**
 * Delete the current channel messages and post fresh ones — so the pings fire
 * again (edits never re-notify). Honours the event's @everyone ping settings.
 */
export async function reannounceEventChannels(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev?.discordCategoryId) return { error: "This event has no Discord space yet." };

  const channels = (ev.discordChannels as Record<string, string>) ?? {};
  const seed = (ev.discordSeedMessages as Record<string, string>) ?? {};

  try {
    // drop the old messages
    for (const [name, msgId] of Object.entries(seed)) {
      const chId = channels[name];
      if (chId && msgId) await deleteChannelMessage(chId, msgId);
    }
    await db.event.update({
      where: { id: eventId },
      data: { discordSeedMessages: {} as Prisma.InputJsonValue },
    });
    // repost fresh (empty seed → new posts → pings per announcePing / announcePingAll)
    await applyEventChannelPerms(channels, ev.discordRoleId);
    await pushEventChannelContent(eventId, channels, {});
  } catch (err) {
    return { error: `Discord: ${err instanceof Error ? err.message : "repost failed"}` };
  }

  await logAudit({ actorId: actor.id, action: "event.discord_reannounce", targetType: "Event", targetId: eventId });
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

  // per-event access role, then gate the channels to it, then seed
  const roleId = await ensureEventRole(ev.id);
  try {
    await applyEventChannelPerms(space.channels, roleId);
    await pushEventChannelContent(ev.id, space.channels, {});
  } catch (err) {
    console.error("event space seed failed", err);
  }

  // grant access + build team voice channels for whoever's already registered
  const signups = await db.eventSignup.findMany({
    where: { eventId: ev.id, state: "SIGNED_UP" },
    select: { playerId: true },
  });
  for (const s of signups) await grantEventAccess(ev.id, s.playerId);
  if (ev.format === "TEAM") {
    const teams = await db.team.findMany({
      where: { eventId: ev.id, signups: { some: { state: "SIGNED_UP" } } },
      select: { id: true },
    });
    for (const t of teams) await ensureTeamVoice(t.id);
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

/**
 * Create the event role if missing, re-gate the channels to it, rebuild any
 * team voice channels, and grant access to everyone signed up. Also upgrades a
 * space that was built before event roles existed.
 */
export async function resyncEventRoles(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({
    where: { id: eventId },
    select: { discordCategoryId: true, discordChannels: true, format: true },
  });
  if (!ev?.discordCategoryId) return { error: "Build the Discord space first." };

  const roleId = await ensureEventRole(eventId);
  const channels = (ev.discordChannels as Record<string, string>) ?? {};
  await applyEventChannelPerms(channels, roleId).catch((e) => console.error("resync perms", e));

  if (ev.format === "TEAM") {
    const teams = await db.team.findMany({
      where: { eventId, signups: { some: { state: "SIGNED_UP" } } },
      select: { id: true },
    });
    for (const t of teams) await ensureTeamVoice(t.id);
  }

  const res = await resyncEventAccess(eventId).catch(() => ({ granted: 0 }));
  await logAudit({ actorId: actor.id, action: "event.role_resync", targetType: "Event", targetId: eventId });
  revalidatePath(`/portal/events/${eventId}`);
  return { ok: true, count: res.granted };
}

export async function archiveEventDiscord(eventId: string): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev?.discordCategoryId) return { error: "This event has no Discord space." };

  // snapshot participation + delete the event / team roles + team voice channels
  await teardownEventAccess(eventId).catch((err) => console.error("teardownEventAccess", err));

  const channels = Object.values((ev.discordChannels as Record<string, string>) ?? {});
  let result: { renamed: boolean; hidden: boolean };
  try {
    result = await archiveEventSpace(ev.discordCategoryId, channels);
  } catch (err) {
    console.error("archiveEventSpace failed", err);
    return { error: `Discord: ${err instanceof Error ? err.message : "archive failed"}` };
  }
  if (!ev.discordArchivedAt) {
    await db.event.update({ where: { id: ev.id }, data: { discordArchivedAt: new Date() } });
  }
  await logAudit({
    actorId: actor.id,
    action: ev.discordArchivedAt ? "event.discord_relock" : "event.discord_archive",
    targetType: "Event",
    targetId: ev.id,
  });
  revalidatePath(`/portal/events/${ev.id}`);
  if (!result.hidden) {
    return {
      ok: true,
      error:
        "Locked what it could, but not every channel — the bot needs Manage Roles + Manage Channels. Grant those and click again.",
    };
  }
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
      timezone: src.timezone,
      server: src.server,
      format: src.format,
      maxSlots: src.maxSlots,
      teamSize: src.teamSize,
      rewardPoolText: src.rewardPoolText,
      status: "DRAFT",
      seasonId: src.seasonId,
      summary: src.summary,
      posterUrl: src.posterUrl,
      mode: src.mode,
      wipeCycle: src.wipeCycle,
      raidWindow: src.raidWindow,
      rewardTiers: (src.rewardTiers as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      bonusText: src.bonusText,
      rulesMd: src.rulesMd,
      detailsMd: src.detailsMd,
      howToJoinVideoUrl: src.howToJoinVideoUrl,
      announcePing: src.announcePing,
      announcePingAll: src.announcePingAll,
      announcementMd: src.announcementMd,
      registrationMd: src.registrationMd,
      howToJoinMd: src.howToJoinMd,
      gameplayMd: src.gameplayMd,
      scheduleMd: src.scheduleMd,
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
    for (const m of members) {
      void notifyPlayer(m.playerId, msg);
      void grantEventAccess(s.eventId, m.playerId);
    }
    void ensureTeamVoice(s.teamId);
  } else {
    await db.eventSignup.update({ where: { id: signupId }, data: { state: "SIGNED_UP" } });
    const ev = await db.event.findUnique({ where: { id: s.eventId }, select: { title: true } });
    void notifyPlayer(s.playerId, notify.waitlistPromoted(ev?.title ?? "the event", s.eventId));
    void grantEventAccess(s.eventId, s.playerId);
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

/** Mark every SIGNED_UP player attended / no-show in one go. */
export async function markAllAttendance(
  eventId: string,
  attended: boolean,
): Promise<FormState> {
  const actor = await assertPermission("attendance:mark");
  const roster = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP" },
    select: { playerId: true },
  });
  if (roster.length === 0) return { error: "Nobody is signed up." };
  await db.$transaction(
    roster.map((r) =>
      db.eventAttendance.upsert({
        where: { eventId_playerId: { eventId, playerId: r.playerId } },
        create: { eventId, playerId: r.playerId, attended, markedById: actor.id },
        update: { attended, markedById: actor.id, markedAt: new Date() },
      }),
    ),
  );
  await logAudit({
    actorId: actor.id,
    action: "event.attendance_bulk",
    targetType: "Event",
    targetId: eventId,
    meta: { count: roster.length, attended },
  });
  revalidatePath(`/portal/events/${eventId}`);
  return { ok: true, count: roster.length };
}

/** DM the whole roster (SIGNED_UP) a free-text staff message. */
export async function dmRoster(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const eventId = (formData.get("eventId") as string) || "";
  const body = ((formData.get("body") as string) || "").trim();
  if (!eventId || !body) return { error: "Write a message first." };
  if (body.length > 1500) return { error: "Keep it under 1500 characters." };

  const ev = await db.event.findUnique({ where: { id: eventId }, select: { title: true } });
  if (!ev) return { error: "Event not found." };

  const roster = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP" },
    select: { playerId: true },
    distinct: ["playerId"],
  });
  const msg = notify.fromStaff(ev.title, body, eventId);
  for (const r of roster) void notifyPlayer(r.playerId, msg);

  await logAudit({
    actorId: actor.id,
    action: "event.dm_roster",
    targetType: "Event",
    targetId: eventId,
    meta: { recipients: roster.length },
  });
  return { ok: true, count: roster.length };
}

/** Reconcile every linked member's managed Discord roles. */
export async function syncAllDiscordRoles(): Promise<FormState> {
  const actor = await assertPermission("settings:manage");
  const { synced } = await syncAllMemberRoles();
  await logAudit({
    actorId: actor.id,
    action: "settings.role_backfill",
    targetType: "Setting",
    targetId: "discord",
    meta: { synced },
  });
  revalidatePath("/portal/settings");
  return { ok: true, count: synced };
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

  // announce the podium to Discord + DM everyone who placed (best-effort)
  await announceResults(eventId).catch((e) => console.error("announceResults", e));

  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath("/winners");
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

/**
 * Post (or update) the event's podium embed to its Discord announcement channel
 * and DM every placed player. Called from savePlacements; also exposed as a
 * button so staff can re-fire it.
 */
export async function announceResults(eventId: string): Promise<FormState> {
  const ev = await db.event.findUnique({
    where: { id: eventId },
    include: {
      season: { select: { number: true } },
      placements: {
        orderBy: { rank: "asc" },
        include: {
          team: { select: { name: true, tag: true, members: { select: { playerId: true } } } },
          player: { select: { id: true, characterName: true } },
        },
      },
    },
  });
  if (!ev) return { error: "Event not found." };
  if (ev.placements.length === 0) return { error: "Set the results first." };

  const url = `${APP_URL}/events/${ev.id}`;
  const tiers = Array.isArray(ev.rewardTiers)
    ? (ev.rewardTiers as Array<{ place: string; reward: string }>)
    : [];
  const embed = resultsEmbed({
    title: ev.title,
    mode: ev.mode,
    seasonNumber: ev.season?.number ?? null,
    url,
    placements: ev.placements.map((p) => ({
      rank: p.rank,
      name: p.team
        ? `${p.team.tag ? `[${p.team.tag}] ` : ""}${p.team.name}`
        : (p.player?.characterName ?? "—"),
      reward: tiers[p.rank - 1]?.reward ?? null,
    })),
  });

  const seed = (ev.discordSeedMessages as Record<string, string>) ?? {};
  const channels = (ev.discordChannels as Record<string, string>) ?? {};
  const settings = await getSettings();
  const channelId =
    channels.announcement || ev.discordChannelId || settings.announceChannelId || undefined;

  if (channelId) {
    try {
      if (seed.results) {
        await editChannelMessage(channelId, seed.results, {
          embed,
          components: [signupButtonRow(url, "Full results & rewards")],
        });
      } else {
        const m = await postToChannel(channelId, {
          embed,
          components: [signupButtonRow(url, "Full results & rewards")],
        });
        if (m) {
          await db.event.update({
            where: { id: ev.id },
            data: {
              discordSeedMessages: { ...seed, results: m.id } as Prisma.InputJsonValue,
            },
          });
        }
      }
    } catch (err) {
      console.error("results announce failed", err);
    }
  }

  // DM the placed players (team → every member)
  for (const p of ev.placements) {
    const msg = notify.placed(p.rank, ev.title, ev.id);
    const targets = p.team ? p.team.members.map((m) => m.playerId) : p.playerId ? [p.playerId] : [];
    for (const pid of targets) void notifyPlayer(pid, msg);
  }

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

/** Set exactly this set of events on the season; detach any others it had. */
export async function assignEventsToSeason(
  seasonId: string,
  eventIds: string[],
): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const wanted = [...new Set(eventIds)].filter(Boolean);

  await db.event.updateMany({
    where: { seasonId, ...(wanted.length ? { id: { notIn: wanted } } : {}) },
    data: { seasonId: null },
  });
  if (wanted.length) {
    await db.event.updateMany({ where: { id: { in: wanted } }, data: { seasonId } });
  }

  await logAudit({
    actorId: actor.id,
    action: "season.assign_events",
    targetType: "Season",
    targetId: seasonId,
    meta: { count: wanted.length },
  });
  revalidatePath("/portal/seasons");
  revalidatePath("/portal/events");
  revalidatePath("/seasons");
  revalidatePath("/winners");
  return { ok: true, count: wanted.length };
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

const RESERVED_MEDIA_KINDS = new Set(["gallery", "proof", "reward"]);

/** Resolve the target kind: a built-in, or an existing collection slug. */
async function mediaKind(v: FormDataEntryValue | null): Promise<string> {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "gallery" || s === "proof") return s;
  if (s && (await db.mediaCollection.findUnique({ where: { slug: s }, select: { id: true } }))) {
    return s;
  }
  return "gallery";
}
const mediaRevalidate = (kind: string) => (kind === "gallery" ? "/" : "/winners");

function slugifyTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function createMediaCollection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await assertPermission("media:manage");
  const title = ((formData.get("title") as string) || "").trim();
  if (title.length < 2) return { error: "Give the section a title." };
  let slug = slugifyTitle(title);
  if (!slug || RESERVED_MEDIA_KINDS.has(slug) || slug === "champions" || slug === "campaign") {
    slug = `${slug || "section"}-${Date.now().toString(36).slice(-4)}`;
  }
  const last = await db.mediaCollection.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  try {
    await db.mediaCollection.create({
      data: { slug, title: title.slice(0, 60), sortOrder: (last?.sortOrder ?? 0) + 1 },
    });
  } catch {
    return { error: "A section with a similar name already exists." };
  }
  await logAudit({ actorId: actor.id, action: "media.collection_create", targetType: "MediaCollection" });
  revalidatePath("/portal/media");
  revalidatePath("/winners");
  return { ok: true };
}

export async function renameMediaCollection(id: string, title: string) {
  const actor = await assertPermission("media:manage");
  const t = title.trim();
  if (t.length < 2) return;
  await db.mediaCollection.update({ where: { id }, data: { title: t.slice(0, 60) } });
  await logAudit({ actorId: actor.id, action: "media.collection_rename", targetType: "MediaCollection", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath("/winners");
}

export async function deleteMediaCollection(id: string) {
  const actor = await assertPermission("media:manage");
  const col = await db.mediaCollection.findUnique({ where: { id }, select: { slug: true } });
  if (!col) return;
  await db.mediaAsset.deleteMany({ where: { kind: col.slug } });
  await db.mediaCollection.delete({ where: { id } });
  await logAudit({ actorId: actor.id, action: "media.collection_delete", targetType: "MediaCollection", targetId: id });
  revalidatePath("/portal/media");
  revalidatePath("/winners");
}

export async function addGalleryImage(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("media:manage");
  const kind = await mediaKind(formData.get("kind"));
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

// --------------------------------------------------------------------------
// Broadcast — free-form server announcements posted by the bot
// --------------------------------------------------------------------------

export async function postBroadcast(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await assertPermission("event:manage");

  const channelId = ((formData.get("channelId") as string) || "").trim();
  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const asEmbed = formData.get("asEmbed") === "on";
  const mentionEveryone = formData.get("mentionEveryone") === "on";

  if (!channelId) return { error: "Pick a channel to post to." };
  if (!body) return { error: "Write something to announce." };

  try {
    // postToChannel adds the @everyone prefix when mentionEveryone is set —
    // don't add it here too.
    const payload = asEmbed
      ? {
          embed: { title: title || undefined, description: body.slice(0, 4000) },
          mentionEveryone,
        }
      : {
          content: `${title ? `**${title}**\n` : ""}${body}`.slice(0, 1980),
          mentionEveryone,
        };
    const msg = await postToChannel(channelId, payload);
    if (!msg) return { error: "Discord isn't configured (bot token / guild id)." };
  } catch (err) {
    return { error: `Discord: ${err instanceof Error ? err.message : "post failed"}` };
  }

  await logAudit({
    actorId: actor.id,
    action: "broadcast.post",
    targetType: "Discord",
    targetId: channelId,
    meta: { title: title || null, preview: body.slice(0, 160), embed: asEmbed, everyone: mentionEveryone },
  });
  revalidatePath("/portal/broadcast");
  return { ok: true };
}

// --------------------------------------------------------------------------
// Tournament bracket — single elimination
// --------------------------------------------------------------------------

/** Build a fresh single-elim bracket from the event's roster. Replaces any existing one. */
export async function generateBracket(
  eventId: string,
  size: number,
  seedMode: "signup" | "random",
): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  if (!BRACKET_SIZES.includes(size as (typeof BRACKET_SIZES)[number])) {
    return { error: "Pick a valid bracket size." };
  }

  const entrants = await entrantsForEvent(eventId);
  if (entrants.length < 2) {
    return { error: "Need at least 2 registered entrants to draw a bracket." };
  }

  const list = seedMode === "random" ? [...entrants].sort(() => Math.random() - 0.5) : entrants;
  const refBySeed = Array.from({ length: size }, (_, i) => list[i]?.ref ?? null);
  const order = seedOrder(size); // bracket position -> seed number
  const slots = order.map((seed) => refBySeed[seed - 1] ?? null);

  await db.bracket.deleteMany({ where: { eventId } });
  const bracket = await db.bracket.create({ data: { eventId, size } });

  const total = roundCount(size);
  const idAt = new Map<string, string>(); // "r:p" -> matchId

  // create from the final round backwards so a match can reference its (already made) parent
  for (let round = total; round >= 1; round--) {
    const count = size / 2 ** round;
    for (let position = 0; position < count; position++) {
      const nextKey = round < total ? `${round + 1}:${Math.floor(position / 2)}` : null;
      const m = await db.bracketMatch.create({
        data: {
          bracketId: bracket.id,
          round,
          position,
          nextMatchId: nextKey ? idAt.get(nextKey) : null,
          nextSlot: nextKey ? (position % 2 === 0 ? "a" : "b") : null,
          ...(round === 1
            ? { aRef: slots[position * 2] ?? null, bRef: slots[position * 2 + 1] ?? null }
            : {}),
        },
      });
      idAt.set(`${round}:${position}`, m.id);
    }
  }

  // auto-advance round-1 byes (a slot filled, the other empty)
  const r1 = await db.bracketMatch.findMany({ where: { bracketId: bracket.id, round: 1 } });
  for (const m of r1) {
    if (m.aRef && !m.bRef) {
      await db.bracketMatch.update({ where: { id: m.id }, data: { winner: "a" } });
      await propagateBracket(m.id);
    } else if (!m.aRef && m.bRef) {
      await db.bracketMatch.update({ where: { id: m.id }, data: { winner: "b" } });
      await propagateBracket(m.id);
    }
  }

  await logAudit({
    actorId: actor.id,
    action: "event.bracket_generate",
    targetType: "Event",
    targetId: eventId,
    meta: { size, entrants: entrants.length, seedMode },
  });
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

async function propagateBracket(matchId: string): Promise<void> {
  const m = await db.bracketMatch.findUnique({ where: { id: matchId } });
  if (!m?.nextMatchId || !m.nextSlot) return;
  const winnerRef = m.winner === "a" ? m.aRef : m.winner === "b" ? m.bRef : null;
  const next = await db.bracketMatch.findUnique({ where: { id: m.nextMatchId } });
  if (!next) return;
  const field = m.nextSlot === "a" ? "aRef" : "bRef";
  const current = m.nextSlot === "a" ? next.aRef : next.bRef;
  if (current === winnerRef) return;

  const wipesDecidedSide =
    !!next.winner &&
    ((m.nextSlot === "a" && next.winner === "a") || (m.nextSlot === "b" && next.winner === "b"));
  await db.bracketMatch.update({
    where: { id: next.id },
    data: {
      [field]: winnerRef,
      ...(wipesDecidedSide ? { winner: null, aScore: null, bScore: null } : {}),
    },
  });
  if (wipesDecidedSide) await propagateBracket(next.id);
}

export async function setBracketMatch(
  matchId: string,
  data: { winner?: "a" | "b" | null; aScore?: number | null; bScore?: number | null },
): Promise<FormState> {
  const actor = await assertPermission("event:manage");
  const m = await db.bracketMatch.findUnique({
    where: { id: matchId },
    include: { bracket: { select: { eventId: true } } },
  });
  if (!m) return { error: "Match not found." };

  const patch: {
    winner?: string | null;
    aScore?: number | null;
    bScore?: number | null;
  } = {};
  if (data.aScore !== undefined) patch.aScore = Number.isFinite(data.aScore) ? data.aScore : null;
  if (data.bScore !== undefined) patch.bScore = Number.isFinite(data.bScore) ? data.bScore : null;
  if (data.winner !== undefined) {
    if (data.winner === "a" && !m.aRef) return { error: "That side is empty." };
    if (data.winner === "b" && !m.bRef) return { error: "That side is empty." };
    patch.winner = data.winner;
  }

  await db.bracketMatch.update({ where: { id: matchId }, data: patch });
  if (data.winner !== undefined) await propagateBracket(matchId);

  await logAudit({
    actorId: actor.id,
    action: "event.bracket_result",
    targetType: "Event",
    targetId: m.bracket.eventId,
    meta: { matchId, winner: patch.winner ?? null },
  });
  revalidatePath(`/portal/events/${m.bracket.eventId}`);
  revalidatePath(`/events/${m.bracket.eventId}`);
  return { ok: true };
}

export async function deleteBracket(eventId: string): Promise<void> {
  const actor = await assertPermission("event:manage");
  await db.bracket.deleteMany({ where: { eventId } });
  await logAudit({ actorId: actor.id, action: "event.bracket_delete", targetType: "Event", targetId: eventId });
  revalidatePath(`/portal/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
}
