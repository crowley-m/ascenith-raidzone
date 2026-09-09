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
  author?: { name: string; url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
};

export type { Embed };

const BRAND = 0xe5484d; // crimson accent


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

/**
 * DM a user by their Discord id. Opens (or reuses) the DM channel then posts.
 * Best-effort — silently no-ops if the bot can't DM them (closed DMs, no
 * shared guild, no token). Never throws.
 */
export async function dmUser(discordId: string, content: string): Promise<void> {
  if (!discordId || !process.env.DISCORD_BOT_TOKEN) return;
  try {
    const ch = (await discordFetch("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: discordId }),
    })) as { id?: string };
    if (!ch?.id) return;
    await discordFetch(`/channels/${ch.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
  } catch (err) {
    console.error("dmUser failed", err);
  }
}

// A single-button action row (Discord message component).
type ButtonRow = {
  type: 1;
  components: { type: 2; style: number; label: string; url?: string; custom_id?: string }[];
};

export type { ButtonRow };

/** A link button that opens the event's page on the website (works for solo + team). */
export function signupButtonRow(url: string, label = "Open the event page"): ButtonRow {
  return {
    type: 1,
    components: [{ type: 2, style: 5, label: label.slice(0, 80), url }],
  };
}

/**
 * Resolve the final content + allowed_mentions for a possible @everyone ping.
 * Prepends "@everyone" only if the text doesn't already contain it — so a
 * hand-typed @everyone plus the ping toggle don't stack.
 */
function everyonePing(
  content: string | undefined,
  on: boolean | undefined,
): { content: string | undefined; parse: string[] } {
  if (!on) return { content, parse: ["roles"] };
  const c = (content ?? "").trim();
  const already = /(^|\s)@(everyone|here)\b/.test(c);
  return {
    content: already ? c : `@everyone${c ? `\n${c}` : ""}`,
    parse: ["roles", "everyone"],
  };
}

/** Post a message with an embed to a channel. Returns the message id. */
export async function postAnnouncement(opts: {
  channelId?: string;
  content?: string;
  embed: Embed;
  components?: ButtonRow[];
  mentionEveryone?: boolean;
}): Promise<{ id: string; channelId: string } | null> {
  const channelId = opts.channelId ?? process.env.DISCORD_ANNOUNCE_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return null;

  const { content, parse } = everyonePing(opts.content, opts.mentionEveryone);

  const msg = (await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      embeds: [{ color: BRAND, ...opts.embed }],
      components: opts.components ?? [],
      allowed_mentions: { parse },
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
  mentionEveryone?: boolean,
): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  const { content: body, parse } = everyonePing(content, mentionEveryone);
  await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      content: body ?? "",
      embeds: [{ color: BRAND, ...embed }],
      allowed_mentions: { parse },
      ...(components ? { components } : {}),
    }),
  });
}

const lines = (s: string | null | undefined) =>
  (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Turn free-typed content into a clean point-wise list for a Discord embed.
 * - a single line / sentence is left as-is
 * - `# Heading` and lone `Label:` lines become **bold** standalone lines
 * - existing `-` / `*` / `1.` list markers are normalised to `•`
 * - every other non-empty line gets a `•` bullet
 * - blank lines are kept (collapsed to one) as visual breaks
 */
export function bulletize(md: string | null | undefined, marker = "• "): string {
  const raw = (md ?? "").replace(/\r/g, "");
  if (lines(raw).length <= 1) return raw.trim();

  const out: string[] = [];
  let prevBlank = true;
  for (const src of raw.split("\n")) {
    const line = src.trim();
    if (!line) {
      if (!prevBlank) out.push("");
      prevBlank = true;
      continue;
    }
    prevBlank = false;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      out.push(`**${heading[1]}**`);
    } else if (/^([-*•]|\d+[.)])\s+/.test(line)) {
      out.push(line.replace(/^[-*•]\s+/, marker).replace(/^(\d+[.)])\s+/, `$1 `));
    } else if (/^[A-Za-z0-9][^:]{0,40}:$/.test(line)) {
      out.push(`**${line}**`);
    } else {
      out.push(`${marker}${line}`);
    }
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}


/** Rich, auto-composed announcement embed built from the event's structured fields. */
export function eventEmbed(e: {
  title: string;
  summary?: string | null;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  format?: string | null;
  teamSize?: number | null;
  server?: string | null;
  mode?: string | null;
  wipeCycle?: string | null;
  raidWindow?: string | null;
  rewardTiers?: unknown;
  bonusText?: string | null;
  rewardPoolText?: string | null;
  maxSlots?: number | null;
  signupCount?: number;
  seasonNumber?: number | null;
  posterUrl?: string | null;
  url: string;
}): Embed {
  const start = Math.floor(e.startsAt.getTime() / 1000);
  const tiers = Array.isArray(e.rewardTiers)
    ? (e.rewardTiers as Array<{ place: string; reward: string }>)
    : [];
  const medals = ["🥇", "🥈", "🥉"];

  const fields: NonNullable<Embed["fields"]> = [];

  const when = [`<t:${start}:F>`];
  if (e.endsAt) when.push(`Wipe <t:${Math.floor(e.endsAt.getTime() / 1000)}:R>`);
  fields.push({ name: "🗓 When", value: when.join("\n"), inline: true });

  fields.push({
    name: "⚔ Format",
    value:
      e.format === "TEAM"
        ? `Team${e.teamSize ? ` · up to ${e.teamSize}` : ""}`
        : "Solo",
    inline: true,
  });

  if (e.maxSlots) {
    fields.push({
      name: e.format === "TEAM" ? "👥 Teams" : "🎟 Slots",
      value: `${e.signupCount ?? 0} / ${e.maxSlots}`,
      inline: true,
    });
  }
  if (e.server) fields.push({ name: "🌐 Server", value: e.server, inline: true });
  if (e.wipeCycle) fields.push({ name: "♻ Wipe cycle", value: e.wipeCycle, inline: true });

  const windows = lines(e.raidWindow);
  if (windows.length) {
    fields.push({
      name: "🕐 Raid window",
      value: windows.map((w) => `• ${w}`).join("\n"),
      inline: false,
    });
  }

  const reward: string[] = [];
  if (tiers.length) {
    tiers.forEach((t, i) => reward.push(`${medals[i] ?? `#${i + 1}`} **${t.place}** — ${t.reward}`));
  } else if (e.rewardPoolText) {
    reward.push(e.rewardPoolText);
  }
  for (const b of lines(e.bonusText)) reward.push(`✨ ${b}`);
  if (reward.length) {
    fields.push({ name: "🏆 Rewards", value: reward.join("\n").slice(0, 1024), inline: false });
  }

  fields.push({ name: "​", value: `**[▶ Sign up on the website](${e.url})**`, inline: false });

  const emoji = eventEmoji(e.mode);
  const poster = (e.posterUrl ?? "").trim();
  return {
    author: { name: e.mode ? `RAIDZONE · ${e.mode}` : "ASCENITH RAIDZONE" },
    title: `${emoji} ${e.title}`,
    description: e.summary || e.description || undefined,
    url: e.url,
    color: BRAND,
    fields,
    ...(/^https?:\/\//.test(poster) ? { image: { url: poster } } : {}),
    timestamp: e.startsAt.toISOString(),
    footer: { text: e.seasonNumber ? `Season ${e.seasonNumber}` : "ASCENITH RAIDZONE" },
  };
}

/** A plain titled embed for the per-channel content posts. */
export function contentEmbed(title: string, body: string): Embed {
  return { title, description: body.slice(0, 4000), color: BRAND };
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
  "schedule",
  "wipe-info",
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

// Channels members can read but not post in (staff bypass via role perms).
export const READONLY_CHANNELS = new Set([
  "announcement",
  "how-to-join",
  "rules",
  "gameplay",
  "schedule",
  "wipe-info",
  "registration",
]);
// Channels anyone can see even without the event role — the entry points.
export const PUBLIC_EVENT_CHANNELS = new Set(["announcement", "how-to-join", "registration"]);
const PERM_VIEW_CHANNEL = (1n << 10n).toString();
const PERM_SEND_MESSAGES = (1n << 11n).toString();
const PERM_CONNECT = (1n << 20n).toString();

// The bot's own user id — needed so read-only channels can still deny @everyone
// while letting the bot post the seed content. Cached for the process lifetime.
let _botUserId: string | null | undefined;
async function botUserId(): Promise<string | null> {
  if (_botUserId !== undefined) return _botUserId;
  try {
    const me = (await discordFetch("/users/@me", { method: "GET" })) as { id?: string };
    _botUserId = me.id ?? null;
  } catch {
    _botUserId = null;
  }
  return _botUserId;
}

/**
 * Create `<emoji> BOLD NAME <emoji>` category + the channel set under it.
 * Read-only channels get a @everyone SEND_MESSAGES deny (needs Manage Roles on
 * the bot; silently skipped otherwise).
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

  // Create every channel WITHOUT the send lock — the bot has to post the seed
  // content first. lockReadonlyChannels() applies the @everyone deny afterwards.
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

/**
 * Create any channels in `wanted` that aren't already in `existing`, under the
 * event's category. Returns the full name→id map (existing + newly created).
 * Used to bring an older space up to the current channel set.
 */
export async function addMissingEventChannels(
  categoryId: string,
  existing: Record<string, string>,
  emoji: string,
  wanted: readonly string[] = EVENT_CHANNELS,
): Promise<{ channels: Record<string, string>; added: string[] }> {
  const gid = process.env.DISCORD_GUILD_ID;
  const channels = { ...existing };
  const added: string[] = [];
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return { channels, added };

  for (const name of wanted) {
    if (channels[name]) continue;
    try {
      const ch = (await discordFetch(`/guilds/${gid}/channels`, {
        method: "POST",
        body: JSON.stringify({
          name: `${emoji}・${name}`,
          type: 0,
          parent_id: categoryId,
        }),
      })) as { id: string };
      channels[name] = ch.id;
      added.push(name);
    } catch (err) {
      console.error(`addMissingEventChannels ${name}`, err);
    }
  }
  return { channels, added };
}

/**
 * Set the full permission state on an event's channels in one pass:
 *  - public channels (announcement / how-to-join): @everyone can read, not post
 *  - registration: default (open)
 *  - every other channel: hidden from @everyone, visible to `eventRoleId`
 *    (read-only ones stay read-only for role members too)
 *  - the bot always keeps view + send so it can seed / re-sync content
 * Needs Manage Roles + Manage Channels; per-channel failures are logged, not thrown.
 */
export async function applyEventChannelPerms(
  channels: Record<string, string>,
  eventRoleId: string | null,
): Promise<void> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return;
  const botId = await botUserId();
  const VIEW = BigInt(PERM_VIEW_CHANNEL);
  const SEND = BigInt(PERM_SEND_MESSAGES);

  for (const [name, id] of Object.entries(channels)) {
    const readonly = READONLY_CHANNELS.has(name);
    const isPublic = PUBLIC_EVENT_CHANNELS.has(name);
    const ow: Array<{ id: string; type: number; allow?: string; deny?: string }> = [];

    if (isPublic) {
      ow.push({ id: gid, type: 0, deny: SEND.toString() });
    } else {
      ow.push({ id: gid, type: 0, deny: (readonly ? VIEW | SEND : VIEW).toString() });
      if (eventRoleId) {
        ow.push({
          id: eventRoleId,
          type: 0,
          allow: (readonly ? VIEW : VIEW | SEND).toString(),
        });
      }
    }
    if (botId) ow.push({ id: botId, type: 1, allow: (VIEW | SEND).toString() });

    try {
      await discordFetch(`/channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ permission_overwrites: ow }),
      });
    } catch (err) {
      console.error(`applyEventChannelPerms ${name}`, err);
    }
  }
}

/** Create a plain guild role. Returns the id, or null if the bot can't. */
export async function createGuildRole(name: string, color = 0): Promise<string | null> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return null;
  try {
    const r = (await discordFetch(`/guilds/${gid}/roles`, {
      method: "POST",
      body: JSON.stringify({
        name: name.slice(0, 100),
        color,
        mentionable: false,
        hoist: false,
      }),
    })) as { id?: string };
    return r.id ?? null;
  } catch (err) {
    console.error("createGuildRole failed", err);
    return null;
  }
}

export async function deleteGuildRole(roleId: string): Promise<void> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !roleId || !process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/guilds/${gid}/roles/${roleId}`, { method: "DELETE" }).catch(() => {});
}

/** Voice channel visible + joinable only by `roleId` (and staff / bot). */
export async function createRoleVoiceChannel(
  name: string,
  parentId: string,
  roleId: string,
): Promise<string | null> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return null;
  const view = BigInt(PERM_VIEW_CHANNEL);
  const connect = BigInt(PERM_CONNECT);
  try {
    const c = (await discordFetch(`/guilds/${gid}/channels`, {
      method: "POST",
      body: JSON.stringify({
        name: name.slice(0, 100),
        type: 2,
        parent_id: parentId,
        permission_overwrites: [
          { id: gid, type: 0, deny: (view | connect).toString() },
          { id: roleId, type: 0, allow: (view | connect).toString() },
        ],
      }),
    })) as { id?: string };
    return c.id ?? null;
  } catch (err) {
    console.error("createRoleVoiceChannel failed", err);
    return null;
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/channels/${channelId}`, { method: "DELETE" }).catch(() => {});
}

/**
 * Archive an event's space: rename the category to mark it done, sink it to the
 * bottom, and make it fully private. Every channel (and the category) has its
 * permission overwrites *replaced* with a single pair — @everyone denied
 * VIEW/SEND/CONNECT, the bot explicitly allowed — so nothing a member (or a
 * left-over role/channel override) can see survives. Non-destructive otherwise.
 * Returns which steps succeeded so the caller can warn about missing bot perms.
 */
export async function archiveEventSpace(
  categoryId: string,
  channelIds: string[],
): Promise<{ renamed: boolean; hidden: boolean }> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return { renamed: false, hidden: false };

  const botId = await botUserId();
  const hideDeny = (
    BigInt(PERM_VIEW_CHANNEL) |
    BigInt(PERM_SEND_MESSAGES) |
    BigInt(PERM_CONNECT)
  ).toString();
  const botAllow = (BigInt(PERM_VIEW_CHANNEL) | BigInt(PERM_SEND_MESSAGES)).toString();

  const overwrites = [
    { id: gid, type: 0, deny: hideDeny, allow: "0" },
    ...(botId ? [{ id: botId, type: 1, allow: botAllow, deny: "0" }] : []),
  ];

  // every channel actually parented to this category right now — not just the
  // ones we created, so manually-added channels get locked too
  let liveChildren: string[] = [];
  try {
    const all = (await discordFetch(`/guilds/${gid}/channels`, { method: "GET" })) as {
      id: string;
      parent_id: string | null;
    }[];
    liveChildren = all.filter((c) => c.parent_id === categoryId).map((c) => c.id);
  } catch {
    /* fall back to the recorded ids */
  }
  const targets = [...new Set([...channelIds, ...liveChildren])];

  let hidden = true;
  // children first, category last — so the bot keeps inherited access while it
  // still needs to edit them
  for (const id of [...targets, categoryId]) {
    try {
      await discordFetch(`/channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ permission_overwrites: overwrites }),
      });
    } catch (err) {
      console.error(`archive hide failed for ${id}`, err);
      hidden = false;
    }
  }

  const cat = (await discordFetch(`/channels/${categoryId}`, { method: "GET" }).catch(
    () => null,
  )) as { name?: string } | null;
  const base = (cat?.name ?? "event").replace(/^[^A-Za-z0-9\uD800-\uDFFF]*/, "").trim();

  let renamed = false;
  try {
    await discordFetch(`/channels/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: `🗄️ ARCHIVED — ${base}`.slice(0, 95), position: 900 }),
    });
    renamed = true;
  } catch (err) {
    console.error("archive rename failed", err);
  }

  return { renamed, hidden };
}

/**
 * Re-run the archive lockdown on a space that's already flagged archived —
 * used to retry after the bot is given the right permissions.
 */
export async function relockArchivedSpace(
  categoryId: string,
  channelIds: string[],
): Promise<{ renamed: boolean; hidden: boolean }> {
  return archiveEventSpace(categoryId, channelIds);
}

/** Plain message (optionally with an embed / components) to a channel. */
export async function postToChannel(
  channelId: string,
  payload: {
    content?: string;
    embed?: Embed;
    components?: ButtonRow[];
    mentionEveryone?: boolean;
  },
): Promise<{ id: string } | null> {
  if (!process.env.DISCORD_BOT_TOKEN) return null;
  const { content, parse } = everyonePing(payload.content, payload.mentionEveryone);
  return (await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      embeds: payload.embed ? [{ color: BRAND, ...payload.embed }] : [],
      components: payload.components ?? [],
      allowed_mentions: { parse },
    }),
  })) as { id: string };
}

/** Text channels (type 0) in the guild, for channel-picker dropdowns. */
export async function listGuildTextChannels(): Promise<{ id: string; name: string }[]> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return [];
  try {
    const rows = (await discordFetch(`/guilds/${gid}/channels`, { method: "GET" })) as {
      id: string;
      name: string;
      type: number;
      position: number;
    }[];
    return rows
      .filter((c) => c.type === 0)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}

/** Assignable guild roles (no @everyone, no bot-managed roles), for pickers. */
export async function listGuildRoles(): Promise<{ id: string; name: string; color: number }[]> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return [];
  try {
    const rows = (await discordFetch(`/guilds/${gid}/roles`, { method: "GET" })) as {
      id: string;
      name: string;
      color: number;
      managed: boolean;
      position: number;
    }[];
    return rows
      .filter((r) => r.id !== gid && !r.managed && r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, color: r.color }));
  } catch {
    return [];
  }
}

/** Edit one of the bot's own messages (no Manage Messages needed). */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: { content?: string; embed?: Embed; components?: ButtonRow[]; mentionEveryone?: boolean },
): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  const { content, parse } = everyonePing(payload.content, payload.mentionEveryone);
  await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      content: content ?? "",
      embeds: payload.embed ? [{ color: BRAND, ...payload.embed }] : [],
      allowed_mentions: { parse },
      ...(payload.components ? { components: payload.components } : {}),
    }),
  });
}

/** Delete one of the bot's own messages. Best-effort. */
export async function deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  }).catch(() => {});
}

/** Pin a message (needs Manage Messages). Best-effort — returns whether it stuck. */
export async function pinMessage(channelId: string, messageId: string): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) return false;
  try {
    await discordFetch(`/channels/${channelId}/pins/${messageId}`, { method: "PUT" });
    return true;
  } catch {
    return false;
  }
}

// Discord permission bits we rely on, name → bit.
const PERM_BITS: Record<string, bigint> = {
  "View Channels": 1n << 10n,
  "Manage Channels": 1n << 4n,
  "Manage Roles": 1n << 28n,
  "Send Messages": 1n << 11n,
  "Manage Messages": 1n << 13n,
  "Mention Everyone": 1n << 17n,
};
const PERM_ADMINISTRATOR = 1n << 3n;

/**
 * The bot's effective guild-level permissions, and which of the ones we need
 * are missing. Returns null if Discord isn't configured / reachable.
 */
export async function botGuildPermissions(): Promise<{
  administrator: boolean;
  missing: string[];
} | null> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !process.env.DISCORD_BOT_TOKEN) return null;
  try {
    const me = await botUserId();
    if (!me) return null;
    const [member, roles] = (await Promise.all([
      discordFetch(`/guilds/${gid}/members/${me}`, { method: "GET" }),
      discordFetch(`/guilds/${gid}/roles`, { method: "GET" }),
    ])) as [{ roles: string[] }, { id: string; permissions: string }[]];

    const held = new Set(member.roles);
    let perms = 0n;
    for (const r of roles) {
      if (r.id === gid || held.has(r.id)) perms |= BigInt(r.permissions);
    }
    const administrator = (perms & PERM_ADMINISTRATOR) !== 0n;
    const missing = administrator
      ? []
      : Object.entries(PERM_BITS)
          .filter(([, bit]) => (perms & bit) === 0n)
          .map(([name]) => name);
    return { administrator, missing };
  } catch {
    return null;
  }
}

/**
 * A navigation index for an event's category — jump-links to every channel.
 * `channels` is the name→id map; `order` controls the display order.
 */
export function eventIndexContent(
  title: string,
  channels: Record<string, string>,
  order: readonly string[] = EVENT_CHANNELS,
): string {
  const label: Record<string, string> = {
    announcement: "📢 announcement",
    "how-to-join": "🧭 how-to-join",
    registration: "📝 registration",
    rules: "📜 rules",
    gameplay: "🎮 gameplay",
    schedule: "🗓 schedule",
    "wipe-info": "♻ wipe-info",
    rewards: "🏆 rewards",
    "looking-for-team": "🤝 looking-for-team",
    questions: "❓ questions",
    chat: "💬 chat",
  };
  const links = order
    .filter((n) => channels[n])
    .map((n) => `${label[n] ?? `# ${n}`} → <#${channels[n]}>`);
  return `**📂 ${title} — channel guide**\n${links.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Guild role management (bot needs Manage Roles + a role above the target)
// ---------------------------------------------------------------------------

export async function addGuildRole(discordUserId: string, roleId: string): Promise<void> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !roleId || !process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/guilds/${gid}/members/${discordUserId}/roles/${roleId}`, {
    method: "PUT",
  }).catch(() => {});
}

export async function removeGuildRole(discordUserId: string, roleId: string): Promise<void> {
  const gid = process.env.DISCORD_GUILD_ID;
  if (!gid || !roleId || !process.env.DISCORD_BOT_TOKEN) return;
  await discordFetch(`/guilds/${gid}/members/${discordUserId}/roles/${roleId}`, {
    method: "DELETE",
  }).catch(() => {});
}
