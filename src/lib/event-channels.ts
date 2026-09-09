import type { Event } from "@prisma/client";
import {
  eventEmbed,
  contentEmbed,
  bulletize,
  signupButtonRow,
  type Embed,
  type ButtonRow,
} from "./discord";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type ChannelPayload = {
  content?: string;
  embed?: Embed;
  components?: ButtonRow[];
  mentionEveryone?: boolean;
};

/** Display order for the event's channels (also drives the portal preview). */
export const EVENT_CHANNEL_ORDER = [
  "announcement",
  "how-to-join",
  "registration",
  "rules",
  "gameplay",
  "schedule",
  "wipe-info",
  "rewards",
] as const;

const lineList = (s: string | null | undefined) =>
  (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** What goes in each of the event's Discord channels. Pure — safe to call from a page. */
export function eventChannelPayloads(ev: Event): Record<string, ChannelPayload> {
  const url = `${APP_URL}/events/${ev.id}`;
  const tiers = Array.isArray(ev.rewardTiers)
    ? (ev.rewardTiers as Array<{ place: string; reward: string }>)
    : [];
  const out: Record<string, ChannelPayload> = {};

  // #announcement — the rich auto-composed card only, no raw text dump.
  // A custom announcementMd (if the staffer wrote one) becomes the card's intro.
  out.announcement = {
    embed: eventEmbed({
      ...ev,
      summary: bulletize(ev.announcementMd) || ev.summary,
      signupCount: 0,
      url,
    }),
    components: [signupButtonRow(url, "Sign up on the website")],
    mentionEveryone: ev.announcePing || ev.announcePingAll,
  };

  out["how-to-join"] = {
    embed: contentEmbed(
      "🧭 How to join",
      ev.howToJoinMd
        ? bulletize(ev.howToJoinMd)
        : `**1.** Register once at ${APP_URL}/register — Discord login links automatically.\n` +
            `**2.** Add your in-game UID on your profile — that's where rewards go.\n` +
            (ev.format === "TEAM"
              ? `**3.** Team event — your team leader registers the whole team on the event page.`
              : `**3.** Claim your slot on the event page.`),
    ),
    components: [signupButtonRow(url, "Open the event page")],
  };

  out.registration = {
    embed: contentEmbed(
      `📝 Registration — ${ev.title}`,
      ev.registrationMd
        ? bulletize(ev.registrationMd)
        : ev.format === "TEAM"
          ? "Your team leader signs the whole team up on the website. Everyone else needs a profile with an in-game UID set."
          : "Open to everyone. Register once, add your in-game UID, then claim your slot below.",
    ),
    components: [signupButtonRow(url, "Sign up on the website")],
  };

  if (ev.rulesMd) out.rules = { embed: contentEmbed(`📜 Rules — ${ev.title}`, bulletize(ev.rulesMd)) };
  if (ev.gameplayMd) out.gameplay = { embed: contentEmbed("🎮 Gameplay", bulletize(ev.gameplayMd)) };
  if (ev.scheduleMd) out.schedule = { embed: contentEmbed("🗓 Schedule", bulletize(ev.scheduleMd)) };

  if (ev.wipeInfoMd || ev.wipeCycle || ev.raidWindow) {
    const parts: string[] = [];
    if (ev.wipeCycle) parts.push(`**Wipe cycle** — ${ev.wipeCycle}`);
    const windows = lineList(ev.raidWindow);
    if (windows.length === 1) parts.push(`**Raid window** — ${windows[0]}`);
    else if (windows.length > 1)
      parts.push(`**Raid window**\n${windows.map((w) => `• ${w}`).join("\n")}`);
    if (ev.wipeInfoMd) parts.push(bulletize(ev.wipeInfoMd));
    out["wipe-info"] = { embed: contentEmbed("♻ Wipe info", parts.join("\n\n")) };
  }

  if (ev.rewardsMd) {
    out.rewards = { embed: contentEmbed("🏆 Rewards", bulletize(ev.rewardsMd)) };
  } else if (tiers.length || ev.bonusText || ev.rewardPoolText) {
    const medals = ["🥇", "🥈", "🥉"];
    const parts: string[] = [];
    tiers.forEach((t, i) => parts.push(`${medals[i] ?? `#${i + 1}`} **${t.place}** — ${t.reward}`));
    if (!tiers.length && ev.rewardPoolText) parts.push(ev.rewardPoolText);
    const bonus = lineList(ev.bonusText);
    if (bonus.length) parts.push("", "**Bonus**", ...bonus.map((b) => `✨ ${b}`));
    out.rewards = { embed: contentEmbed("🏆 Rewards", parts.join("\n")) };
  }

  if (ev.announcePingAll) {
    for (const p of Object.values(out)) p.mentionEveryone = true;
  }

  return out;
}
