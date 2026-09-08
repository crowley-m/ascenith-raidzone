import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { addGuildRole, removeGuildRole } from "@/lib/discord";

/**
 * Reconcile a member's managed Discord roles with their site state:
 *  - "Registered" role  ⇢  has a player profile
 *  - "Team leader" role ⇢  leads a team
 * No-ops when the role ids aren't set in Settings or the user has no Discord id.
 */
export async function syncMemberRoles(userId: string): Promise<void> {
  try {
    const { registeredRoleId, teamLeaderRoleId } = await getSettings();
    if (!registeredRoleId && !teamLeaderRoleId) return;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        discordId: true,
        player: {
          select: { id: true, teamLed: { select: { id: true } } },
        },
      },
    });
    if (!user?.discordId) return;

    const hasPlayer = !!user.player;
    const leadsTeam = !!user.player?.teamLed;

    if (registeredRoleId) {
      if (hasPlayer) await addGuildRole(user.discordId, registeredRoleId);
      else await removeGuildRole(user.discordId, registeredRoleId);
    }
    if (teamLeaderRoleId) {
      if (leadsTeam) await addGuildRole(user.discordId, teamLeaderRoleId);
      else await removeGuildRole(user.discordId, teamLeaderRoleId);
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
