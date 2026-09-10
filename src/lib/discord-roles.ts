import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { addGuildRole, removeGuildRole } from "@/lib/discord";

/**
 * Reconcile a member's managed Discord roles with their site state:
 *  - "Registered" role  ⇢  has a player profile
 *  - "Team leader" role ⇢  leads a team
 *  - faction roles      ⇢  the one faction they belong to (all others removed)
 * No-ops when the role ids aren't set in Settings or the user has no Discord id.
 */
export async function syncMemberRoles(userId: string): Promise<void> {
  try {
    const { registeredRoleId, teamLeaderRoleId } = await getSettings();

    const [user, factionRoles] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          discordId: true,
          player: {
            select: {
              id: true,
              factionId: true,
              teamsLed: { select: { id: true }, take: 1 },
            },
          },
        },
      }),
      db.faction.findMany({
        where: { discordRoleId: { not: null } },
        select: { id: true, discordRoleId: true },
      }),
    ]);

    if (!registeredRoleId && !teamLeaderRoleId && factionRoles.length === 0) return;
    if (!user?.discordId) return;

    const hasPlayer = !!user.player;
    const leadsTeam = (user.player?.teamsLed.length ?? 0) > 0;

    if (registeredRoleId) {
      if (hasPlayer) await addGuildRole(user.discordId, registeredRoleId);
      else await removeGuildRole(user.discordId, registeredRoleId);
    }
    if (teamLeaderRoleId) {
      if (leadsTeam) await addGuildRole(user.discordId, teamLeaderRoleId);
      else await removeGuildRole(user.discordId, teamLeaderRoleId);
    }
    for (const f of factionRoles) {
      if (!f.discordRoleId) continue;
      if (hasPlayer && user.player?.factionId === f.id) {
        await addGuildRole(user.discordId, f.discordRoleId);
      } else {
        await removeGuildRole(user.discordId, f.discordRoleId);
      }
    }
  } catch (err) {
    console.error("syncMemberRoles failed", err);
  }
}

/** Same, but keyed by player id (used from team actions). */
export async function syncMemberRolesByPlayer(playerId: string): Promise<void> {
  const p = await db.player.findUnique({ where: { id: playerId }, select: { userId: true } });
  if (p) await syncMemberRoles(p.userId);
}

/**
 * Reconcile managed roles for every linked member — a full backfill. Run after
 * first setting the role ids in Settings, or on a schedule. Serial + paced so
 * we stay well under Discord's rate limits. Returns how many members it touched.
 */
export async function syncAllMemberRoles(): Promise<{ synced: number }> {
  const { registeredRoleId, teamLeaderRoleId } = await getSettings();
  const anyFaction = await db.faction.count({ where: { discordRoleId: { not: null } } });
  if (!registeredRoleId && !teamLeaderRoleId && anyFaction === 0) return { synced: 0 };

  const users = await db.user.findMany({
    where: { discordId: { not: null } },
    select: { id: true },
  });
  let synced = 0;
  for (const u of users) {
    await syncMemberRoles(u.id);
    synced++;
    await new Promise((r) => setTimeout(r, 250));
  }
  return { synced };
}
