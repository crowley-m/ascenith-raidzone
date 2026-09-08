// Minimal Discord REST helpers used by the web app to post announcements.
// The bot process (src/bot) handles slash commands / interactions separately.

const API = "https://discord.com/api/v10";

export const botConfigured = !!process.env.DISCORD_BOT_TOKEN;

type Embed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
};

async function discordFetch(path: string, init: RequestInit) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not set");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord ${init.method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

/** Post a message with an embed to a channel. Returns the message id. */
export async function postAnnouncement(opts: {
  channelId?: string;
  content?: string;
  embed: Embed;
}): Promise<{ id: string; channelId: string } | null> {
  const channelId = opts.channelId ?? process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return null;

  const msg = (await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: opts.content,
      embeds: [{ color: 0x2fd4c7, ...opts.embed }],
      allowed_mentions: { parse: ["roles"] },
    }),
  })) as { id: string };

  return { id: msg.id, channelId };
}

/** Edit a previously posted announcement. */
export async function editAnnouncement(
  channelId: string,
  messageId: string,
  embed: Embed,
  content?: string,
): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content, embeds: [{ color: 0x2fd4c7, ...embed }] }),
  });
}

export function eventEmbed(e: {
  title: string;
  description?: string | null;
  startsAt: Date;
  server?: string | null;
  maxSlots?: number | null;
  rewardPoolText?: string | null;
  signupCount?: number;
  url: string;
}): Embed {
  const fields: Embed["fields"] = [
    { name: "When", value: `<t:${Math.floor(e.startsAt.getTime() / 1000)}:F>`, inline: false },
  ];
  if (e.server) fields.push({ name: "Server", value: e.server, inline: true });
  if (e.maxSlots)
    fields.push({
      name: "Slots",
      value: `${e.signupCount ?? 0} / ${e.maxSlots}`,
      inline: true,
    });
  if (e.rewardPoolText) fields.push({ name: "Rewards", value: e.rewardPoolText, inline: false });
  fields.push({ name: "Sign up", value: `[On the website](${e.url})`, inline: false });

  return {
    title: `🏴‍☠️ ${e.title}`,
    description: e.description ?? undefined,
    url: e.url,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "ASCENITH RAIDZONE" },
  };
}

/**
 * Live presence from the guild's public widget (Server Settings → Widget → Enable).
 * No bot token needed — just DISCORD_GUILD_ID and the widget switched on.
 * Returns null if unavailable.
 */
export async function guildPresence(): Promise<{ online: number; name?: string } | null> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid) return null;
  try {
    const res = await fetch(`https://discord.com/api/guilds/${gid}/widget.json`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { presence_count?: number; name?: string };
    if (typeof data.presence_count !== "number") return null;
    return { online: data.presence_count, name: data.name };
  } catch {
    return null;
  }
}
