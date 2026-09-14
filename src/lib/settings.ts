import { db } from "@/lib/db";

export type Settings = {
  /** Channel new event announcements post to (falls back to env). */
  announceChannelId: string;
  /** Discord invite link shown around the site. */
  discordInvite: string;
  /** Channels the bot creates under a new event category, in order. */
  eventChannels: string[];
  /** Also build the Discord space automatically when an event is published. */
  autoBuildSpace: boolean;
  /** Minutes before an event starts to post a reminder (0 = off). */
  reminderLeadMinutes: number;
  /** YouTube URL for the "how to join" video shown on the landing (blank = hidden). */
  howToJoinVideoUrl: string;
  /** Discord role id granted to anyone with a player profile (blank = off). */
  registeredRoleId: string;
  /** Discord role id granted to team leaders (blank = off). */
  teamLeaderRoleId: string;
  /**
   * Discord role id granted the moment a player has competed in at least one
   * event (an EventParticipation row exists) — a permanent badge, unlike the
   * per-event access role which gets deleted when that event is archived/
   * deleted. Never revoked by syncMemberRoles once earned. Blank = off.
   */
  veteranRoleId: string;
  /** Social links shown in the landing footer — blank hides that one. */
  socialTiktokUrl: string;
  socialTwitchUrl: string;
  socialXUrl: string;
  socialFacebookUrl: string;
  /** /rules content — free-typed, same one-point-per-line convention as event content. */
  rulesText: string;
  antiCheatText: string;
  disputesText: string;
};

const DEFAULTS: Settings = {
  announceChannelId: process.env.DISCORD_ANNOUNCE_CHANNEL_ID ?? "",
  discordInvite:
    process.env.NEXT_PUBLIC_DISCORD_INVITE ?? process.env.DISCORD_INVITE_URL ?? "https://discord.gg/",
  eventChannels: [
    "announcement",
    "how-to-join",
    "rules",
    "gameplay",
    "schedule",
    "wipe-info",
    "rewards",
    "registration",
    "looking-for-team",
    "questions",
    "chat",
  ],
  autoBuildSpace: false,
  reminderLeadMinutes: 60,
  howToJoinVideoUrl: "",
  registeredRoleId: "",
  teamLeaderRoleId: "",
  veteranRoleId: "",
  socialTiktokUrl: "https://www.tiktok.com/@potatoziee1",
  socialTwitchUrl: "https://www.twitch.tv/potatozie1",
  socialXUrl: "https://x.com/potatoziee",
  socialFacebookUrl: "https://www.facebook.com/people/Potatozie-Gaming/100063656476567/",
  rulesText: [
    "1. Be respectful. No harassment, hate speech, slurs, or targeted toxicity — in Discord or in game.",
    "2. No cheating, exploiting, or third-party tools that give an unfair advantage on our servers.",
    "3. No bug abuse. If you find a bug, report it in a ticket — don't use it.",
    "4. Don't grief other members' bases or steal from teammates outside sanctioned event objectives.",
    "5. Use the right channels. Keep event talk in event channels and support requests in tickets.",
    "6. One account per person for events and rewards. Alt accounts used to farm rewards are removed.",
    "7. Staff decisions on rewards and disputes are final, but you can always appeal politely in a ticket.",
  ].join("\n"),
  antiCheatText: [
    "Zero tolerance for cheats:",
    "Aimbots, wallhacks, macros, speed/teleport tools, or any third-party program that alters the game — instant permanent ban, no appeal, rewards clawed back.",
    "",
    "No bug exploiting:",
    "Duping, clipping into bases, out-of-map spots, or any unintended mechanic used for an advantage voids your placement.",
    "",
    "No account sharing or boosting:",
    "The person on comms is the person who plays. Reward UIDs must match the registered player.",
    "",
    "Clips on request:",
    "If staff ask for proof of a run or a call, you provide it. No clip, no points.",
  ].join("\n"),
  disputesText: [
    "Think a call went wrong, points were miscounted, or a reward is missing? Open a ticket in Discord with the event name, what you expected, and any clips or screenshots.",
    "",
    "Staff review and respond. Decisions on placements and rewards are final once reviewed, but every appeal is read — be specific and stay civil and it gets sorted.",
  ].join("\n"),
};

export async function getSettings(): Promise<Settings> {
  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await db.setting.findMany();
  } catch {
    return DEFAULTS;
  }
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    announceChannelId: (map.announceChannelId as string) ?? DEFAULTS.announceChannelId,
    discordInvite: (map.discordInvite as string) ?? DEFAULTS.discordInvite,
    eventChannels: Array.isArray(map.eventChannels)
      ? (map.eventChannels as string[])
      : DEFAULTS.eventChannels,
    autoBuildSpace:
      typeof map.autoBuildSpace === "boolean" ? map.autoBuildSpace : DEFAULTS.autoBuildSpace,
    reminderLeadMinutes:
      typeof map.reminderLeadMinutes === "number"
        ? map.reminderLeadMinutes
        : DEFAULTS.reminderLeadMinutes,
    howToJoinVideoUrl:
      typeof map.howToJoinVideoUrl === "string"
        ? map.howToJoinVideoUrl
        : DEFAULTS.howToJoinVideoUrl,
    registeredRoleId:
      typeof map.registeredRoleId === "string" ? map.registeredRoleId : DEFAULTS.registeredRoleId,
    teamLeaderRoleId:
      typeof map.teamLeaderRoleId === "string" ? map.teamLeaderRoleId : DEFAULTS.teamLeaderRoleId,
    veteranRoleId:
      typeof map.veteranRoleId === "string" ? map.veteranRoleId : DEFAULTS.veteranRoleId,
    socialTiktokUrl:
      typeof map.socialTiktokUrl === "string" ? map.socialTiktokUrl : DEFAULTS.socialTiktokUrl,
    socialTwitchUrl:
      typeof map.socialTwitchUrl === "string" ? map.socialTwitchUrl : DEFAULTS.socialTwitchUrl,
    socialXUrl: typeof map.socialXUrl === "string" ? map.socialXUrl : DEFAULTS.socialXUrl,
    socialFacebookUrl:
      typeof map.socialFacebookUrl === "string" ? map.socialFacebookUrl : DEFAULTS.socialFacebookUrl,
    rulesText: typeof map.rulesText === "string" ? map.rulesText : DEFAULTS.rulesText,
    antiCheatText: typeof map.antiCheatText === "string" ? map.antiCheatText : DEFAULTS.antiCheatText,
    disputesText: typeof map.disputesText === "string" ? map.disputesText : DEFAULTS.disputesText,
  };
}

export { DEFAULTS as SETTINGS_DEFAULTS };
