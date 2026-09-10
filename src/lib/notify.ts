import { db } from "@/lib/db";
import { dmUser } from "@/lib/discord";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Send a player a Discord DM, respecting their opt-out. Fire-and-forget:
 * callers should `void notifyPlayer(...)` so a slow/failed DM never blocks.
 */
export async function notifyPlayer(playerId: string, message: string): Promise<void> {
  try {
    const p = await db.player.findUnique({
      where: { id: playerId },
      select: { dmNotifications: true, user: { select: { discordId: true } } },
    });
    if (!p?.dmNotifications || !p.user.discordId) return;
    await dmUser(p.user.discordId, message);
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
};
