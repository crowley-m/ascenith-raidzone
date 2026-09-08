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

async function discordFetch(path: string, init: RequestInit, attempt = 0): Promise<unknown> {
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
  if (res.status === 429 && attempt < 4) {
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
    await new Promise((r) => setTimeout(r, Math.ceil((body.retry_after ?? 1) * 1000) + 250));
    return discordFetch(path, init, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord ${init.method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

// A single-button action row (Discord message component).
type ButtonRow = {
  type: 1;
  components: { type: 2; style: number; label: string; url?: string; custom_id?: string }[];
};

/** A link button that opens the event's page on the website (works for solo + team). */
export function signupButtonRow(url: string, label = "Open the event page"): ButtonRow {
  return {
    type: 1,
    components: [{ type: 2, style: 5, label: label.slice(0, 80), url }],
  };
}

/** Post a message with an embed to a channel. Returns the message id. */
export async function postAnnouncement(opts: {
  channelId?: string;
  content?: string;
  embed: Embed;
  components?: ButtonRow[];
}): Promise<{ id: string; channelId: string } | null> {
  const channelId = opts.channelId ?? process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return null;

  const msg = (await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: opts.content,
      embeds: [{ color: 0x2fd4c7, ...opts.embed }],
      components: opts.components ?? [],
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
  components?: ButtonRow[],
): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      content,
      embeds: [{ color: 0x2fd4c7, ...embed }],
      ...(components ? { components } : {}),
    }),
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

// ---------------------------------------------------------------------------
// Event Discord space — one category + a set of channels per event.
// Needs the bot to have Manage Channels in the guild.
// ---------------------------------------------------------------------------

const MODE_EMOJI: Record<string, string> = {
  PURGE: "\u2620\uFE0F", // ☠️
  PRESIDENT: "\uD83D\uDEE1\uFE0F", // 🛡️
  FACTION: "\u2622\uFE0F", // ☢️
  SQUAD: "\u2622\uFE0F",
  SOLO: "\uD83D\uDFE9", // 🟩
  BOXING: "\uD83E\uDD4A", // 🥊
};

/** Pick a themed emoji from the event's mode text (falls back to ⚔️). */
export function eventEmoji(mode?: string | null): string {
  const key = (mode ?? "").toUpperCase();
  for (const k of Object.keys(MODE_EMOJI)) if (key.includes(k)) return MODE_EMOJI[k];
  return "\u2694\uFE0F"; // ⚔️
}

/** ASCII → unicode bold — matches the server's category-name style. */
function boldName(s: string): string {
  const A = 0x1d5d4;
  const a = 0x1d5ee;
  const zero = 0x1d7ec;
  return [...s]
    .map((ch) => {
      const c = ch.codePointAt(0)!;
      if (c >= 65 && c <= 90) return String.fromCodePoint(A + (c - 65));
      if (c >= 97 && c <= 122) return String.fromCodePoint(a + (c - 97));
      if (c >= 48 && c <= 57) return String.fromCodePoint(zero + (c - 48));
      return ch;
    })
    .join("");
}

export const EVENT_CHANNELS = [
  "announcement",
  "how-to-join",
  "rules",
  "gameplay",
  "rewards",
  "registration",
  "looking-for-team",
  "questions",
  "chat",
] as const;

export type EventSpace = {
  categoryId: string;
  channels: Record<string, string>; // name -> channel id
};

/**
 * Create `<emoji> BOLD NAME <emoji>` category + the channel set under it.
 * Returns the ids; caller stores them on the event. No-op-safe: caller must
 * check the event doesn't already have a category.
 */
export async function createEventSpace(opts: {
  name: string;
  emoji: string;
  channels?: readonly string[];
}): Promise<EventSpace | null> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return null;

  const catName = `${opts.emoji} ${boldName(opts.name.slice(0, 60))} ${opts.emoji}`.trim();
  const category = (await discordFetch(`/guilds/${gid}/channels`, {
    method: "POST",
    body: JSON.stringify({ name: catName, type: 4 }),
  })) as { id: string };

  const channels: Record<string, string> = {};
  for (const name of opts.channels ?? EVENT_CHANNELS) {
    const ch = (await discordFetch(`/guilds/${gid}/channels`, {
      method: "POST",
      body: JSON.stringify({
        name: `${opts.emoji}\u30FB${name}`, // emoji・name
        type: 0,
        parent_id: category.id,
      }),
    })) as { id: string };
    channels[name] = ch.id;
  }

  return { categoryId: category.id, channels };
}

/** Plain message (optionally with an embed / components) to a channel. */
export async function postToChannel(
  channelId: string,
  payload: { content?: string; embed?: Embed; components?: ButtonRow[] },
): Promise<{ id: string } | null> {
  if (!process.env.DISCORD_BOT_TOKEN) return null;
  return (await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: payload.content,
      embeds: payload.embed ? [{ color: 0x2fd4c7, ...payload.embed }] : [],
      components: payload.components ?? [],
      allowed_mentions: { parse: ["roles"] },
    }),
  })) as { id: string };
}
