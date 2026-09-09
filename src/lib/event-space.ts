import { db } from "@/lib/db";
import {
  addGuildRole,
  removeGuildRole,
  createGuildRole,
  deleteGuildRole,
  createRoleVoiceChannel,
  deleteChannel,
} from "@/lib/discord";

async function discordIdFor(playerId: string): Promise<string | null> {
  const p = await db.player.findUnique({
    where: { id: playerId },
    select: { user: { select: { discordId: true } } },
  });
  return p?.user.discordId ?? null;
}

/** Create the event's access role if it doesn't have one. Returns the role id. */
export async function ensureEventRole(eventId: string): Promise<string | null> {
  const ev = await db.event.findUnique({
    where: { id: eventId },
    select: { discordRoleId: true, title: true, mode: true },
  });
  if (!ev) return null;
  if (ev.discordRoleId) return ev.discordRoleId;
  const label = ev.mode ? `RAIDZONE ${ev.mode}` : ev.title;
  const roleId = await createGuildRole(`🎟 ${label}`.slice(0, 90));
  if (roleId) await db.event.update({ where: { id: eventId }, data: { discordRoleId: roleId } });
  return roleId;
}

/** Grant a signed-up player access to the event's private channels (+ team voice). */
export async function grantEventAccess(eventId: string, playerId: string): Promise<void> {
  try {
    const ev = await db.event.findUnique({
      where: { id: eventId },
      select: { discordRoleId: true },
    });
    if (!ev?.discordRoleId) return;
    const discordId = await discordIdFor(playerId);
    if (!discordId) return;
    await addGuildRole(discordId, ev.discordRoleId);
    const tm = await db.teamMember.findFirst({
      where: { playerId, team: { eventId } },
      select: { team: { select: { discordRoleId: true } } },
    });
    if (tm?.team.discordRoleId) await addGuildRole(discordId, tm.team.discordRoleId);
  } catch (err) {
    console.error("grantEventAccess", err);
  }
}

export async function revokeEventAccess(eventId: string, playerId: string): Promise<void> {
  try {
    const ev = await db.event.findUnique({
      where: { id: eventId },
      select: { discordRoleId: true },
    });
    const discordId = await discordIdFor(playerId);
    if (!discordId) return;
    if (ev?.discordRoleId) await removeGuildRole(discordId, ev.discordRoleId);
    const tm = await db.teamMember.findFirst({
      where: { playerId, team: { eventId } },
      select: { team: { select: { discordRoleId: true } } },
    });
    if (tm?.team.discordRoleId) await removeGuildRole(discordId, tm.team.discordRoleId);
  } catch (err) {
    console.error("revokeEventAccess", err);
  }
}

/** Ensure a team has its private role + voice channel; grant the role to members. */
export async function ensureTeamVoice(teamId: string): Promise<void> {
  try {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: {
        name: true,
        tag: true,
        discordRoleId: true,
        discordVoiceChannelId: true,
        event: { select: { discordCategoryId: true } },
        members: { select: { player: { select: { user: { select: { discordId: true } } } } } },
      },
    });
    if (!team?.event.discordCategoryId) return;
    const label = `${team.tag ? `[${team.tag}] ` : ""}${team.name}`.slice(0, 88);

    let roleId = team.discordRoleId;
    if (!roleId) {
      roleId = await createGuildRole(`🔊 ${label}`);
      if (roleId) await db.team.update({ where: { id: teamId }, data: { discordRoleId: roleId } });
    }
    if (!roleId) return;

    if (!team.discordVoiceChannelId) {
      const vcId = await createRoleVoiceChannel(
        `🔊・${label}`,
        team.event.discordCategoryId,
        roleId,
      );
      if (vcId)
        await db.team.update({ where: { id: teamId }, data: { discordVoiceChannelId: vcId } });
    }

    for (const m of team.members) {
      if (m.player.user.discordId) await addGuildRole(m.player.user.discordId, roleId);
    }
  } catch (err) {
    console.error("ensureTeamVoice", err);
  }
}

export async function grantTeamVoice(teamId: string, playerId: string): Promise<void> {
  try {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { discordRoleId: true },
    });
    if (!team?.discordRoleId) return;
    const discordId = await discordIdFor(playerId);
    if (discordId) await addGuildRole(discordId, team.discordRoleId);
  } catch (err) {
    console.error("grantTeamVoice", err);
  }
}

export async function revokeTeamVoice(teamId: string, playerId: string): Promise<void> {
  try {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { discordRoleId: true },
    });
    if (!team?.discordRoleId) return;
    const discordId = await discordIdFor(playerId);
    if (discordId) await removeGuildRole(discordId, team.discordRoleId);
  } catch (err) {
    console.error("revokeTeamVoice", err);
  }
}

/**
 * On archive: write a permanent participation record for every signed-up player,
 * then delete the event role and all team roles / voice channels.
 */
export async function teardownEventAccess(eventId: string): Promise<void> {
  const ev = await db.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      mode: true,
      startsAt: true,
      discordRoleId: true,
      teamsFor: { select: { id: true, discordRoleId: true, discordVoiceChannelId: true } },
    },
  });
  if (!ev) return;

  const signups = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP" },
    select: { playerId: true },
  });
  for (const s of signups) {
    await db.eventParticipation
      .upsert({
        where: { eventId_playerId: { eventId, playerId: s.playerId } },
        create: {
          eventId,
          playerId: s.playerId,
          eventName: ev.title,
          eventMode: ev.mode,
          playedAt: ev.startsAt,
        },
        update: {},
      })
      .catch(() => {});
  }

  for (const t of ev.teamsFor) {
    if (t.discordVoiceChannelId) await deleteChannel(t.discordVoiceChannelId);
    if (t.discordRoleId) await deleteGuildRole(t.discordRoleId);
    await db.team
      .update({ where: { id: t.id }, data: { discordRoleId: null, discordVoiceChannelId: null } })
      .catch(() => {});
  }
  if (ev.discordRoleId) {
    await deleteGuildRole(ev.discordRoleId);
    await db.event
      .update({ where: { id: eventId }, data: { discordRoleId: null } })
      .catch(() => {});
  }
}

/** Re-grant the event role to everyone currently signed up. */
export async function resyncEventAccess(eventId: string): Promise<{ granted: number }> {
  const ev = await db.event.findUnique({
    where: { id: eventId },
    select: { discordRoleId: true },
  });
  if (!ev?.discordRoleId) return { granted: 0 };
  const signups = await db.eventSignup.findMany({
    where: { eventId, state: "SIGNED_UP" },
    select: { playerId: true },
  });
  for (const s of signups) await grantEventAccess(eventId, s.playerId);
  return { granted: signups.length };
}
