import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv, csvResponse, slugify } from "@/lib/csv";

export const dynamic = "force-dynamic";

/**
 * Payout hand-off sheet — just what a dev needs to send Crystgin: event, UID,
 * region, amount. `?eventId=` scopes it to one event; omitted, it's the full
 * history.
 */
export async function GET(req: Request) {
  await requirePermission("reward:view");
  const eventId = new URL(req.url).searchParams.get("eventId") || undefined;

  const [rewards, event] = await Promise.all([
    db.reward.findMany({
      where: eventId ? { eventId } : undefined,
      orderBy: { grantedAt: "desc" },
      include: {
        player: { select: { gameUid: true, region: true } },
        event: { select: { title: true } },
      },
    }),
    eventId ? db.event.findUnique({ where: { id: eventId }, select: { title: true } }) : null,
  ]);

  const csv = toCsv(
    rewards.map((r) => ({
      EVENT: r.event?.title ?? "",
      ID: r.player.gameUid ?? "",
      REGION: r.player.region ?? "",
      CRYSTGIN: r.amount ?? "",
    })),
  );

  const name = event
    ? `raidzone-crystgin-${slugify(event.title) || eventId}.csv`
    : `raidzone-crystgin-${new Date().toISOString().slice(0, 10)}.csv`;
  return csvResponse(csv, name);
}
