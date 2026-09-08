import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(8, "At least 8 characters").max(200),
    confirm: z.string(),
    characterName: z.string().min(1).max(60),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const profileSchema = z.object({
  characterName: z.string().min(1).max(60),
  gameUid: z.string().max(40).nullable().optional(),
  platform: z.enum(["PC", "PLAYSTATION", "XBOX"]).nullable().optional(),
  region: z.string().max(80).nullable().optional(),
  timezone: z.string().max(60).nullable().optional(),
  playHours: z.string().max(200).nullable().optional(),
  languages: z.string().max(200).nullable().optional(),
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
  server: z.string().max(120).nullable().optional(),
  format: z.enum(["SOLO", "TEAM"]).default("SOLO"),
  maxSlots: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  teamSize: z.coerce.number().int().min(0).max(100).nullable().optional(),
  rewardPoolText: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]),
  // landing / public brief
  summary: z.string().max(400).nullable().optional(),
  mode: z.string().max(40).nullable().optional(),
  wipeCycle: z.string().max(80).nullable().optional(),
  raidWindow: z.string().max(120).nullable().optional(),
  rewardTiersText: z.string().max(2000).nullable().optional(),
  bonusText: z.string().max(400).nullable().optional(),
  rulesMd: z.string().max(20000).nullable().optional(),
  detailsMd: z.string().max(20000).nullable().optional(),
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

/** "1st | 30K Crystgen" per line → [{ place, reward }] */
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
  proofImageUrl: z.string().url().max(500).nullable().optional(),
});

export const factionSchema = z.object({
  name: z.string().min(1).max(80),
  tag: z.string().max(12).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  description: z.string().max(500).nullable().optional(),
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
