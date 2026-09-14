import { db } from "@/lib/db";
import { dmUser } from "@/lib/discord";
import { logAudit } from "@/lib/audit";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Send a player a Discord DM, respecting their opt-out. Fire-and-forget:
 * callers should `void notifyPlayer(...)` so a slow/failed DM never blocks.
 * A DM that actually fails to send (closed DMs, rate limit, etc.) — as
 * opposed to being opted out — writes a `notify.dm_failed` audit row so it's
 * not just a console line nobody sees; these matter most for reward/placement
 * DMs, which are how a player finds out they won something.
 */
export async function notifyPlayer(playerId: string, message: string): Promise<void> {
  try {
    const p = await db.player.findUnique({
      where: { id: playerId },
      select: { dmNotifications: true, user: { select: { discordId: true } } },
    });
    if (!p?.dmNotifications || !p.user.discordId) return;
    const sent = await dmUser(p.user.discordId, message);
    if (!sent) {
      await logAudit({ action: "notify.dm_failed", targetType: "Player", targetId: playerId });
    }
  } catch (err) {
    console.error("notifyPlayer failed", err);
  }
}

export const notify = {
  waitlistPromoted(eventTitle: string, eventId: string) {
    return (
      `🎟️ A slot opened up — **you're now signed up for ${eventTitle}**.\n` +
      `${APP_URL}/events/${eventId}`
    );
  },
  rewardGranted(item: string, amount: string | null, eventTitle: string | null) {
    return (
      `🏆 Reward logged: **${item}${amount ? ` ×${amount}` : ""}**` +
      (eventTitle ? ` for ${eventTitle}` : "") +
      `.\nStaff will send it in-game to your registered UID. See ${APP_URL}/me/rewards`
    );
  },
  eventStarting(eventTitle: string, eventId: string, mins: number) {
    return (
      `⏰ **${eventTitle}** starts in ~${mins} min — you're on the roster.\n` +
      `${APP_URL}/events/${eventId}`
    );
  },
  placed(rank: number, eventTitle: string, eventId: string) {
    const medal = ["🥇", "🥈", "🥉"][rank - 1] ?? "🏅";
    const ord = rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`;
    return (
      `${medal} **You placed ${ord} in ${eventTitle}!** Congratulations.\n` +
      `${APP_URL}/events/${eventId}`
    );
  },
  eventCancelled(eventTitle: string) {
    return (
      `❌ **${eventTitle} has been cancelled.** Sorry for the change — ` +
      `keep an eye on Discord for the next one.`
    );
  },
  teamMemberJoined(memberName: string, teamName: string) {
    return `👥 **${memberName}** joined your team **${teamName}**.`;
  },
  teamMemberLeft(memberName: string, teamName: string) {
    return `👋 **${memberName}** left your team **${teamName}**.`;
  },
  teamKicked(teamName: string) {
    return `👋 You were removed from **${teamName}**.`;
  },
  teamDisbanded(teamName: string) {
    return `💥 Your team **${teamName}** was disbanded.`;
  },
  teamShort(teamName: string, have: number, cap: number, eventTitle: string, eventId: string) {
    return (
      `⚠️ **${teamName}** has ${have}/${cap} players and **${eventTitle}** starts soon.\n` +
      `Recruit from the free-agent list or share your invite code: ${APP_URL}/events/${eventId}`
    );
  },
  fromStaff(eventTitle: string, body: string, eventId: string) {
    return `📣 **${eventTitle}** — staff update:\n\n${body}\n\n${APP_URL}/events/${eventId}`;
  },
};
