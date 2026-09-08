import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toInputDateTime, fmtDateTime } from "@/lib/format";
import { tiersToText } from "@/lib/validation";
import { EventForm } from "@/components/portal/event-form";
import { AttendanceToggle } from "@/components/portal/attendance-toggle";
import { RewardForm } from "@/components/portal/reward-form";
import { RosterCopy } from "@/components/portal/roster-copy";

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
        include: {
          player: { select: { id: true, characterName: true, region: true, gameUid: true } },
          team: { select: { id: true, name: true, tag: true, leaderId: true } },
        },
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

  const isTeamEvent = event.format === "TEAM";
  const confirmed = event.signups.filter((s) => s.state === "SIGNED_UP");
  const waitlist = event.signups.filter((s) => s.state === "WAITLIST");
  const attendedCount = confirmed.filter((s) => attMap.get(s.player.id)).length;
  const noShow = confirmed.filter((s) => attMap.get(s.player.id) === false);
  const teamCount = new Set(confirmed.map((s) => s.teamId).filter(Boolean)).size;

  const rosterPlayers = event.signups.map((s) => ({
    id: s.player.id,
    label: `${s.player.characterName ?? "Unnamed"}${s.player.gameUid ? ` · UID ${s.player.gameUid}` : ""}${
      s.team ? ` · ${s.team.name}` : ""
    }`,
  }));

  // plain-text roster for pasting into Discord / reward processing
  const rosterText = (() => {
    const lines: string[] = [`${event.title} — roster`, ""];
    if (isTeamEvent) {
      const groups = new Map<string, typeof confirmed>();
      for (const s of confirmed) {
        const k = s.team?.name ?? "—";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(s);
      }
      for (const [name, members] of groups) {
        lines.push(`[${name}]`);
        for (const s of members) {
          lines.push(
            `  ${s.player.characterName ?? "Unnamed"}${s.player.gameUid ? ` (${s.player.gameUid})` : ""}`,
          );
        }
        lines.push("");
      }
    } else {
      for (const s of confirmed) {
        lines.push(
          `${s.player.characterName ?? "Unnamed"}${s.player.gameUid ? ` (${s.player.gameUid})` : ""}`,
        );
      }
    }
    return lines.join("\n");
  })();

  // team-event roster grouped
  const teamGroups = new Map<
    string,
    { name: string; tag: string | null; members: typeof confirmed }
  >();
  if (isTeamEvent) {
    for (const s of confirmed) {
      const key = s.teamId ?? "none";
      if (!teamGroups.has(key)) {
        teamGroups.set(key, { name: s.team?.name ?? "—", tag: s.team?.tag ?? null, members: [] });
      }
      teamGroups.get(key)!.members.push(s);
    }
  }

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
        {/* Registrations */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold text-white">
              {isTeamEvent ? "Registered teams" : "Registrations"}{" "}
              <span className="text-slate-500">
                ({isTeamEvent ? teamCount : confirmed.length})
              </span>
            </h3>
            {confirmed.length > 0 && <RosterCopy text={rosterText} />}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { k: isTeamEvent ? "Teams" : "Signed up", v: isTeamEvent ? teamCount : confirmed.length },
              { k: "Players", v: confirmed.length },
              { k: "Attended", v: attendedCount },
              { k: "No-show", v: noShow.length },
            ].map((x) => (
              <div key={x.k} className="border border-edge bg-panel/40 py-2">
                <div className="font-display text-lg font-bold text-white">{x.v}</div>
                <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">{x.k}</div>
              </div>
            ))}
          </div>

          {isTeamEvent ? (
            <div className="mt-4 space-y-4">
              {teamGroups.size === 0 && (
                <p className="text-sm text-slate-400">No teams registered yet.</p>
              )}
              {[...teamGroups.values()].map((g) => (
                <div key={g.name} className="border border-edge">
                  <div className="flex items-center justify-between border-b border-edge bg-panel/50 px-3 py-2 text-sm font-bold text-white">
                    <span>
                      {g.tag && <span className="text-teal">[{g.tag}] </span>}
                      {g.name}
                    </span>
                    <span className="text-xs font-normal text-slate-500">
                      {g.members.length} player{g.members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-edge/60">
                      {g.members.map((s) => (
                        <tr key={s.id}>
                          <td className="px-3 py-2">
                            <Link
                              href={`/portal/players/${s.player.id}`}
                              className="text-slate-200 hover:text-teal"
                            >
                              {s.player.characterName ?? "Unnamed"}
                            </Link>
                            {s.player.gameUid && (
                              <span className="block text-xs text-slate-500">
                                UID {s.player.gameUid}
                              </span>
                            )}
                          </td>
                          {canMark && (
                            <td className="px-3 py-2 text-right">
                              <AttendanceToggle
                                eventId={event.id}
                                playerId={s.player.id}
                                attended={attMap.get(s.player.id) ?? null}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Player</th>
                    <th className="py-2">UID</th>
                    <th className="py-2">State</th>
                    {canMark && <th className="py-2">Attendance</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60">
                  {event.signups.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2">
                        <Link
                          href={`/portal/players/${s.player.id}`}
                          className="text-slate-200 hover:text-teal"
                        >
                          {s.player.characterName ?? "Unnamed"}
                        </Link>
                        {s.player.region && (
                          <span className="text-slate-600"> · {s.player.region}</span>
                        )}
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-400">
                        {s.player.gameUid ?? "—"}
                      </td>
                      <td className="py-2 text-slate-400">
                        {s.state === "WAITLIST" ? "waitlist" : "in"}
                      </td>
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
                    <tr>
                      <td colSpan={4} className="py-4 text-slate-400">
                        No sign-ups yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {waitlist.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              + {waitlist.length} on the waitlist
            </p>
          )}

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
                    format: event.format,
                    maxSlots: event.maxSlots,
                    teamSize: event.teamSize,
                    rewardPoolText: event.rewardPoolText,
                    status: event.status,
                    summary: event.summary,
                    mode: event.mode,
                    wipeCycle: event.wipeCycle,
                    raidWindow: event.raidWindow,
                    rewardTiersText: tiersToText(event.rewardTiers),
                    bonusText: event.bonusText,
                    detailsMd: event.detailsMd,
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
