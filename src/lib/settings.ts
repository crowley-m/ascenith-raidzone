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
  /** Social links shown in the landing footer — blank hides that one. */
  socialTiktokUrl: string;
  socialTwitchUrl: string;
  socialXUrl: string;
  socialFacebookUrl: string;
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
  socialTiktokUrl: "https://www.tiktok.com/@potatoziee1",
  socialTwitchUrl: "https://www.twitch.tv/potatozie1",
  socialXUrl: "https://x.com/potatoziee",
  socialFacebookUrl: "https://www.facebook.com/people/Potatozie-Gaming/100063656476567/",
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
    socialTiktokUrl:
      typeof map.socialTiktokUrl === "string" ? map.socialTiktokUrl : DEFAULTS.socialTiktokUrl,
    socialTwitchUrl:
      typeof map.socialTwitchUrl === "string" ? map.socialTwitchUrl : DEFAULTS.socialTwitchUrl,
    socialXUrl: typeof map.socialXUrl === "string" ? map.socialXUrl : DEFAULTS.socialXUrl,
    socialFacebookUrl:
      typeof map.socialFacebookUrl === "string" ? map.socialFacebookUrl : DEFAULTS.socialFacebookUrl,
  };
}

export { DEFAULTS as SETTINGS_DEFAULTS };
