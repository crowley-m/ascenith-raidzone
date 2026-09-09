import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({ log: ["error"] });

export const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
export const TEAL = 0xe5484d; // brand crimson (kept the export name for callers)

export async function playerForDiscordUser(discordId: string) {
  const user = await db.user.findUnique({
    where: { discordId },
    include: { player: { include: { faction: true } }, staffRole: true },
  });
  return user;
}
