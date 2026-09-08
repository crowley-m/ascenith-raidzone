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
 * Live member / online counts for the guild.
 * Uses the bot token + `?with_counts=true` — no privileged intents, no widget
 * toggle needed (the bot just has to be in the server). Falls back to the public
 * widget JSON if there's no bot token. Returns null if nothing is available.
 */
export async function guildPresence(): Promise<{
  online: number | null;
  members: number | null;
} | null> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid) return null;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (token) {
    try {
      const res = await fetch(
        `${API}/guilds/${gid}?with_counts=true`,
        { headers: { Authorization: `Bot ${token}` }, next: { revalidate: 60 } },
      );
      if (res.ok) {
        const d = (await res.json()) as {
          approximate_presence_count?: number;
          approximate_member_count?: number;
        };
        return {
          online: d.approximate_presence_count ?? null,
          members: d.approximate_member_count ?? null,
        };
      }
    } catch {
      /* fall through to widget */
    }
  }

  try {
    const res = await fetch(`https://discord.com/api/guilds/${gid}/widget.json`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { presence_count?: number };
    return { online: data.presence_count ?? null, members: null };
  } catch {
    return null;
  }
}
