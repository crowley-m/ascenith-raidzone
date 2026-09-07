import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toInputDateTime, fmtDateTime } from "@/lib/format";
import { EventForm } from "@/components/portal/event-form";
import { AttendanceToggle } from "@/components/portal/attendance-toggle";
import { RewardForm } from "@/components/portal/reward-form";

export const dynamic = "force-dynamic";

export default async function PortalEventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("event:view");
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: {
      signups: {
        where: { state: { in: ["SIGNED_UP", "WAITLIST"] } },
        include: { player: { select: { id: true, characterName: true, region: true } } },
        orderBy: { createdAt: "asc" },
      },
      attendance: true,
    },
  });
  if (!event) notFound();

  const attMap = new Map(event.attendance.map((a) => [a.playerId, a.attended]));
  const canManage = can(user.role, "event:manage");
  const canMark = can(user.role, "attendance:mark");
  const canReward = can(user.role, "reward:grant");

  const rosterPlayers = event.signups.map((s) => ({
    id: s.player.id,
    label: s.player.characterName ?? "Unnamed",
  }));

  return (
    <div>
      <Link href="/portal/events" className="text-sm text-slate-500 hover:text-white">← Events</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">{event.title}</h2>
        <div className="flex items-center gap-2">
          <span className="badge">{event.status}</span>
          <Link href={`/events/${event.id}`} className="btn-ghost text-xs" target="_blank">
            Public page ↗
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {fmtDateTime(event.startsAt)}
        {event.discordMessageId && " · announced in Discord"}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Roster */}
        <div>
          <h3 className="font-display font-bold text-white">
            Roster <span className="text-slate-500">({event.signups.length})</span>
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Player</th>
                  <th className="py-2">State</th>
                  {canMark && <th className="py-2">Attendance</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {event.signups.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2">
                      <Link href={`/portal/players/${s.player.id}`} className="text-slate-200 hover:text-teal">
                        {s.player.characterName ?? "Unnamed"}
                      </Link>
                      {s.player.region && <span className="text-slate-600"> · {s.player.region}</span>}
                    </td>
                    <td className="py-2 text-slate-400">{s.state === "WAITLIST" ? "waitlist" : "in"}</td>
                    {canMark && (
                      <td className="py-2">
                        <AttendanceToggle
                          eventId={event.id}
                          playerId={s.player.id}
                          attended={attMap.get(s.player.id) ?? null}
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {event.signups.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-slate-400">No sign-ups yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {canReward && rosterPlayers.length > 0 && (
            <div className="card mt-8">
              <h3 className="font-display font-bold text-white">Log a reward for this event</h3>
              <div className="mt-3">
                <RewardForm players={rosterPlayers} fixedEventId={event.id} />
              </div>
            </div>
          )}
        </div>

        {/* Edit */}
        <div>
          {canManage ? (
            <div className="card">
              <h3 className="font-display font-bold text-white">Edit</h3>
              <div className="mt-3">
                <EventForm
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    startsAt: toInputDateTime(event.startsAt),
                    endsAt: toInputDateTime(event.endsAt),
                    server: event.server,
                    maxSlots: event.maxSlots,
                    rewardPoolText: event.rewardPoolText,
                    status: event.status,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="card text-sm text-slate-400">
              You can view rosters and mark attendance. Editing events needs Admin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
