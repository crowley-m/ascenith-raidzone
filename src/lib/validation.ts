import { z } from "zod";

export const profileSchema = z.object({
  characterName: z.string().min(1).max(60),
  gameUid: z.string().max(40).nullable().optional(),
  platform: z.enum(["PC", "PLAYSTATION", "XBOX", "MOBILE"]).nullable().optional(),
  region: z.string().max(80).nullable().optional(),
  timezone: z.string().max(60).nullable().optional(),
  languages: z.string().max(200).nullable().optional(),
  factionId: z.string().trim().max(40).nullable().optional().or(z.literal("")),
});

export const teamCreateSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(40),
  tag: z
    .string()
    .trim()
    .max(6, "Max 6 characters")
    .regex(/^[A-Za-z0-9]*$/, "Letters and numbers only")
    .optional()
    .or(z.literal("")),
  eventId: z.string().trim().optional().or(z.literal("")),
});

export const teamJoinSchema = z.object({
  code: z.string().trim().min(4).max(12).toUpperCase(),
});

export const eventSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(4000).nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
  endsWeeks: z.coerce.number().int().min(0).max(52).nullable().optional(),
  timezone: z.string().max(60).nullable().optional(),
  server: z.string().max(120).nullable().optional(),
  format: z.enum(["SOLO", "TEAM"]).default("SOLO"),
  maxSlots: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  teamSize: z.coerce.number().int().min(0).max(100).nullable().optional(),
  rewardPoolText: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]),
  seasonId: z.string().trim().nullable().optional().or(z.literal("")),
  // landing / public brief
  summary: z.string().max(400).nullable().optional(),
  posterUrl: z.string().trim().max(500).nullable().optional().or(z.literal("")),
  mode: z.string().max(40).nullable().optional(),
  wipeCycle: z.string().max(80).nullable().optional(),
  raidWindow: z.string().max(600).nullable().optional(),
  rewardTiersText: z.string().max(2000).nullable().optional(),
  bonusText: z.string().max(1500).nullable().optional(),
  rulesMd: z.string().max(20000).nullable().optional(),
  detailsMd: z.string().max(20000).nullable().optional(),
  howToJoinVideoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((s) => s === "" || /^https?:\/\//i.test(s), "Video link must start with http:// or https://")
    .nullable()
    .optional()
    .or(z.literal("")),
  announcePing: z.coerce.boolean().optional(),
  announcePingAll: z.coerce.boolean().optional(),
  announcementMd: z.string().max(4000).nullable().optional(),
  registrationMd: z.string().max(4000).nullable().optional(),
  howToJoinMd: z.string().max(4000).nullable().optional(),
  gameplayMd: z.string().max(20000).nullable().optional(),
  scheduleMd: z.string().max(20000).nullable().optional(),
  wipeInfoMd: z.string().max(20000).nullable().optional(),
  rewardsMd: z.string().max(4000).nullable().optional(),
});

export type RewardTier = { place: string; reward: string };

/** stored JSON → editable textarea value */
export function tiersToText(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  return (raw as RewardTier[])
    .filter((t) => t && typeof t.place === "string")
    .map((t) => `${t.place} | ${t.reward}`)
    .join("\n");
}

/** "1st | 30K Crystgin" per line → [{ place, reward }] */
export function parseRewardTiers(text: string | null | undefined) {
  if (!text) return null;
  const tiers = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [place, ...rest] = l.split("|");
      return { place: place.trim(), reward: rest.join("|").trim() };
    })
    .filter((t) => t.place && t.reward);
  return tiers.length ? tiers : null;
}

export const rewardSchema = z.object({
  playerId: z.string().min(1),
  eventId: z.string().nullable().optional(),
  item: z.string().min(1).max(200),
  amount: z.string().max(80).nullable().optional(),
  reason: z.string().min(1).max(1000),
  isPublic: z.coerce.boolean().optional(),
  // staff commonly paste a bare "imgur.com/x.png" — url() demands a scheme
  // and rejects the whole reward log over a cosmetic slip, so accept it
  // without one and add https:// ourselves.
  proofImageUrl: z
    .string()
    .trim()
    .max(500)
    .transform((s) => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))
    .refine((s) => s === "" || z.string().url().safeParse(s).success, "Not a valid image URL")
    .nullable()
    .optional(),
});

export const seasonSchema = z.object({
  series: z.string().trim().min(2).max(80),
  number: z.coerce.number().int().min(1).max(999),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  name: z.string().max(80).nullable().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "ENDED"]).default("UPCOMING"),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  prizePoolText: z.string().max(120).nullable().optional(),
  championName: z.string().max(120).nullable().optional(),
  championNote: z.string().max(200).nullable().optional(),
  posterUrl: z.string().max(500).nullable().optional(),
  blurb: z.string().max(600).nullable().optional(),
});

/** Index-aligned url/title card rows (from the season form's video builder) → [{ url, title }], dropping any card whose url isn't http(s). */
export function buildSeasonVideos(urls: string[], titles: string[]) {
  return urls
    .map((url, i) => ({ url: url.trim(), title: (titles[i] ?? "").trim() || null }))
    .filter((v) => /^https?:\/\//.test(v.url));
}

export const factionSchema = z.object({
  name: z.string().min(1).max(80),
  tag: z.string().max(12).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  description: z.string().max(500).nullable().optional(),
  discordRoleId: z
    .string()
    .trim()
    .regex(/^\d{5,25}$/, "Discord role ID is digits only")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export const noteSchema = z.object({
  playerId: z.string().min(1),
  body: z.string().min(1).max(2000),
  pinned: z.coerce.boolean().optional(),
});

export const flagSchema = z.object({
  playerId: z.string().min(1),
  type: z.enum(["NOTE", "WARNING", "BAN"]),
  reason: z.string().min(1).max(1000),
});
