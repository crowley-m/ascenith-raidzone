import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv, csvResponse, slugify } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("event:view");
  const { id } = await params;

  const event = await db.event.findUnique({ where: { id }, select: { title: true } });
  if (!event) return new Response("Not found", { status: 404 });

  const [signups, attendance] = await Promise.all([
    db.eventSignup.findMany({
      where: { eventId: id, state: { not: "WITHDRAWN" } },
      orderBy: [{ state: "asc" }, { createdAt: "asc" }],
      include: {
        player: { include: { user: { select: { discordUsername: true } } } },
        team: { select: { name: true, tag: true } },
      },
    }),
    db.eventAttendance.findMany({
      where: { eventId: id },
      select: { playerId: true, attended: true },
    }),
  ]);

  const attMap = new Map(attendance.map((a) => [a.playerId, a.attended]));

  const csv = toCsv(
    signups.map((s) => ({
      character: s.player.characterName ?? "",
      eventNickname: s.nickname ?? "",
      gameUid: s.player.gameUid ?? "",
      discord: s.player.user.discordUsername ?? "",
      platform: s.player.platform ?? "",
      region: s.player.region ?? "",
      team: s.team ? `${s.team.tag ? `[${s.team.tag}] ` : ""}${s.team.name}` : "",
      state: s.state,
      attended: attMap.has(s.playerId) ? (attMap.get(s.playerId) ? "yes" : "no") : "",
      signedUpAt: s.createdAt,
    })),
  );

  return csvResponse(csv, `raidzone-roster-${slugify(event.title) || id}.csv`);
}
