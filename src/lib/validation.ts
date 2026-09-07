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
  platform: z.enum(["PC", "PLAYSTATION", "XBOX"]).nullable().optional(),
  region: z.string().max(80).nullable().optional(),
  powerLevel: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  timezone: z.string().max(60).nullable().optional(),
  playHours: z.string().max(200).nullable().optional(),
  languages: z.string().max(200).nullable().optional(),
  factionId: z.string().nullable().optional(),
});

export const eventSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(4000).nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().optional(),
  server: z.string().max(120).nullable().optional(),
  maxSlots: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  rewardPoolText: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]),
});

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
