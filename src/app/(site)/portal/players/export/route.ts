import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePermission("player:view");

  const players = await db.player.findMany({
    orderBy: { joinedAt: "asc" },
    include: {
      user: { select: { email: true, discordUsername: true } },
      faction: { select: { name: true } },
      _count: { select: { rewards: true, attendance: true } },
    },
  });

  const csv = toCsv(
    players.map((p) => ({
      character: p.characterName ?? "",
      gameUid: p.gameUid ?? "",
      status: p.status,
      platform: p.platform ?? "",
      region: p.region ?? "",
      timezone: p.timezone ?? "",
      faction: p.faction?.name ?? "",
      discord: p.user.discordUsername ?? "",
      email: p.user.email ?? "",
      rewards: p._count.rewards,
      attended: p._count.attendance,
      joinedAt: p.joinedAt,
    })),
  );

  return csvResponse(csv, `raidzone-players-${new Date().toISOString().slice(0, 10)}.csv`);
}
