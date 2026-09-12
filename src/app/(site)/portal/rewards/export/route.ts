import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv, csvResponse, slugify } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * Rewards payout sheet — everything a dev needs to hand out prizes: who,
 * their UID/platform, what they won, and whether it's already gone out.
 * `?eventId=` scopes it to one event; omitted, it's the full history.
 */
export async function GET(req: Request) {
  await requirePermission("reward:view");
  const eventId = new URL(req.url).searchParams.get("eventId") || undefined;

  const [rewards, event] = await Promise.all([
    db.reward.findMany({
      where: eventId ? { eventId } : undefined,
      orderBy: { grantedAt: "desc" },
      include: {
        player: {
          select: { characterName: true, gameUid: true, platform: true, region: true },
        },
        event: { select: { title: true } },
        grantedBy: { select: { name: true, discordUsername: true } },
      },
    }),
    eventId ? db.event.findUnique({ where: { id: eventId }, select: { title: true } }) : null,
  ]);

  const csv = toCsv(
    rewards.map((r) => ({
      character: r.player.characterName ?? "",
      gameUid: r.player.gameUid ?? "",
      platform: r.player.platform ?? "",
      region: r.player.region ?? "",
      item: r.item,
      amount: r.amount ?? "",
      reason: r.reason,
      event: r.event?.title ?? "",
      public: r.isPublic ? "yes" : "no",
      received: r.receivedAt ? "yes" : "no",
      receivedAt: r.receivedAt ?? "",
      disputed: r.disputedAt ? "yes" : "no",
      grantedBy: r.grantedBy.name ?? r.grantedBy.discordUsername ?? "",
      grantedAt: r.grantedAt,
    })),
  );

  const name = event
    ? `raidzone-rewards-${slugify(event.title) || eventId}.csv`
    : `raidzone-rewards-${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(csv, name);
}
