import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePermission("reward:view");

  const rewards = await db.reward.findMany({
    orderBy: { grantedAt: "desc" },
    include: {
      player: { select: { characterName: true, gameUid: true } },
      event: { select: { title: true } },
      grantedBy: { select: { name: true, discordUsername: true } },
    },
  });

  const csv = toCsv(
    rewards.map((r) => ({
      grantedAt: r.grantedAt,
      character: r.player.characterName ?? "",
      gameUid: r.player.gameUid ?? "",
      item: r.item,
      amount: r.amount ?? "",
      reason: r.reason,
      event: r.event?.title ?? "",
      public: r.isPublic ? "yes" : "no",
      received: r.receivedAt ? "yes" : "no",
      receivedAt: r.receivedAt ?? "",
      grantedBy: r.grantedBy.name ?? r.grantedBy.discordUsername ?? "",
    })),
  );

  return csvResponse(csv, `raidzone-rewards-${new Date().toISOString().slice(0, 10)}.csv`);
}
