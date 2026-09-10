import type { Client } from "discord.js";
import { db, APP_URL } from "./lib.js";

async function settingNum(key: string, fallback: number): Promise<number> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    return typeof row?.value === "number" ? row.value : fallback;
  } catch {
    return fallback;
  }
}
async function settingStr(key: string): Promise<string> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    return typeof row?.value === "string" ? row.value : "";
  } catch {
    return "";
  }
}

async function tick(client: Client) {
  const lead = await settingNum("reminderLeadMinutes", 60);
  if (lead <= 0) return;

  const now = new Date();
  const cutoff = new Date(now.getTime() + lead * 60 * 1000);

  const due = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      reminderSentAt: null,
      startsAt: { gt: now, lte: cutoff },
    },
    take: 5,
  });
  if (due.length === 0) return;

  const fallbackChannel =
    (await settingStr("announceChannelId")) || process.env.DISCORD_ANNOUNCE_CHANNEL_ID || "";

  for (const ev of due) {
    const channels = (ev.discordChannels ?? {}) as Record<string, string>;
    const channelId = channels.announcement || fallbackChannel;
    if (!channelId) continue;
    const mins = Math.round((ev.startsAt.getTime() - now.getTime()) / 60000);
    try {
      const ch = await client.channels.fetch(channelId);
      if (ch && "send" in ch && typeof ch.send === "function") {
        await ch.send(
          `⏰ **${ev.title}** starts <t:${Math.floor(ev.startsAt.getTime() / 1000)}:R>` +
            ` (in ~${mins} min).\nLast call to sign up: ${APP_URL}/events/${ev.id}`,
        );
      }
      // DM everyone on the roster who opted in
      const roster = await db.eventSignup.findMany({
        where: { eventId: ev.id, state: "SIGNED_UP" },
        select: {
          teamId: true,
          player: { select: { dmNotifications: true, user: { select: { discordId: true } } } },
        },
      });
      const rel = `<t:${Math.floor(ev.startsAt.getTime() / 1000)}:R>`;
      for (const s of roster) {
        if (!s.player.dmNotifications || !s.player.user.discordId) continue;
        const teamless = ev.format === "TEAM" && !s.teamId;
        const body = teamless
          ? `⏰ **${ev.title}** starts ${rel} (in ~${mins} min) — you're registered but still` +
            ` need a team. Find one now: ${APP_URL}/me/team`
          : `⏰ **${ev.title}** starts ${rel} (in ~${mins} min) — you're on the roster.\n` +
            `${APP_URL}/events/${ev.id}`;
        try {
          const u = await client.users.fetch(s.player.user.discordId);
          await u.send(body);
        } catch {
          /* DMs closed — skip */
        }
      }

      await db.event.update({ where: { id: ev.id }, data: { reminderSentAt: now } });
    } catch (err) {
      console.error(`reminder failed for ${ev.id}`, err);
    }
  }
}

export function startReminders(client: Client) {
  const run = () => void tick(client).catch((e) => console.error("reminder tick", e));
  run();
  setInterval(run, 5 * 60 * 1000);
  console.log("Reminder scheduler started (5-min interval).");
}
