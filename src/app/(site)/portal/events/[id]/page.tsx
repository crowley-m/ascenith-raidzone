import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtInZone, DEFAULT_EVENT_TZ, utcToZonedInput } from "@/lib/tz";
import { tiersToText } from "@/lib/validation";
import { EventForm } from "@/components/portal/event-form";
import { AttendanceToggle } from "@/components/portal/attendance-toggle";
import { RewardForm } from "@/components/portal/reward-form";
import { RosterCopy } from "@/components/portal/roster-copy";
import {
  BuildSpaceButton,
  ArchiveSpaceButton,
  SyncChannelsButton,
  ReannounceButton,
} from "@/components/portal/build-space-button";
import { ResultsForm, AttendeeRewardForm } from "@/components/portal/results-form";
import { BracketEditor } from "@/components/portal/bracket-editor";
import { bracketForEvent, entrantsForEvent } from "@/lib/bracket";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteEvent, cloneEvent, promoteSignup } from "@/app/(site)/portal/actions";
import type { RewardTier } from "@/lib/validation";

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
      placements: {
        orderBy: { rank: "asc" },
        include: {
          team: { select: { name: true, tag: true } },
          player: { select: { characterName: true } },
        },
      },
    },
  });
  if (!event) notFound();
  const eventTz = event.timezone ?? DEFAULT_EVENT_TZ;

  const [seasons, bracket, bracketEntrants] = await Promise.all([
    db.season.findMany({
      orderBy: [{ series: "asc" }, { number: "desc" }],
      select: { id: true, series: true, number: true, name: true },
    }),
    bracketForEvent(id),
    entrantsForEvent(id),
  ]);

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

  // results / placements
  const tiers = (Array.isArray(event.rewardTiers) ? event.rewardTiers : []) as RewardTier[];
  const entrants: { value: string; label: string }[] = isTeamEvent
    ? [...new Map(confirmed.filter((s) => s.teamId).map((s) => [s.teamId!, s])).values()].map((s) => ({
        value: `team:${s.teamId}`,
        label: s.team?.name ?? "—",
      }))
    : confirmed.map((s) => ({
        value: `player:${s.player.id}`,
        label: s.player.characterName ?? "Unnamed",
      }));
  const currentPlacements: Record<number, string> = {};
  for (const p of event.placements) {
    currentPlacements[p.rank] = p.teamId ? `team:${p.teamId}` : `player:${p.playerId}`;
  }

  return (
    <div>
      <Link href="/portal/events" className="text-sm text-slate-500 hover:text-white">← Events</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">{event.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">{event.status}</span>
          <Link href={`/events/${event.id}`} className="btn-ghost text-xs" target="_blank">
            Public page ↗
          </Link>
          {canManage && (
            <ConfirmButton
              action={cloneEvent.bind(null, event.id)}
              confirm="Create a draft copy of this event (schedule shifted forward)?"
              className="btn-ghost text-xs"
            >
              Clone
            </ConfirmButton>
          )}
          {canManage &&
            (event.discordCategoryId ? (
              event.discordArchivedAt ? (
                <>
                  <span className="badge border-edge text-slate-500">Discord archived</span>
                  <ArchiveSpaceButton eventId={event.id} relock />
                </>
              ) : (
                <>
                  <span className="badge border-teal/40 text-teal">
                    Discord:{" "}
                    {Object.keys((event.discordChannels as Record<string, string>) ?? {}).length}{" "}
                    channels
                  </span>
                  <SyncChannelsButton eventId={event.id} />
                  <ReannounceButton eventId={event.id} />
                  <ArchiveSpaceButton eventId={event.id} />
                </>
              )
            ) : (
              <BuildSpaceButton eventId={event.id} />
            ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {fmtInZone(event.startsAt, eventTz)}
        {event.discordMessageId && " · announced in Discord"}
      </p>

      <div className="mt-8 space-y-12">
        {/* Registrations */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold text-white">
              {isTeamEvent ? "Registered teams" : "Registrations"}{" "}
              <span className="text-slate-500">
                ({isTeamEvent ? teamCount : confirmed.length})
              </span>
            </h3>
            <div className="flex items-center gap-3">
              {event.signups.length > 0 && (
                <Link
                  href={`/portal/events/${event.id}/roster`}
                  prefetch={false}
                  className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:text-teal"
                >
                  ↓ CSV
                </Link>
              )}
              {confirmed.length > 0 && <RosterCopy text={rosterText} />}
            </div>
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
                        {s.state === "WAITLIST" ? (
                          <span className="flex items-center gap-2">
                            waitlist
                            {canManage && (
                              <ConfirmButton
                                action={promoteSignup.bind(null, s.id)}
                                confirm={`Pull ${s.player.characterName ?? "this player"} into the roster?`}
                                className="text-xs text-teal hover:text-cream"
                              >
                                promote
                              </ConfirmButton>
                            )}
                          </span>
                        ) : (
                          "in"
                        )}
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

          {canManage && (
            <div className="mt-8">
              <BracketEditor
                eventId={event.id}
                bracket={bracket}
                entrantCount={bracketEntrants.length}
              />
            </div>
          )}

          {canManage && confirmed.length > 0 && (
            <div className="mt-8">
              <ResultsForm
                eventId={event.id}
                entrants={entrants}
                current={currentPlacements}
                tiers={tiers}
                canReward={canReward}
              />
            </div>
          )}

          {event.placements.length > 0 && (
            <div className="card mt-4">
              <h3 className="font-display font-bold text-white">Placed</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {event.placements.map((p) => (
                  <li key={p.id} className="flex gap-3">
                    <span className="font-mono text-xs uppercase text-teal">
                      {tiers[p.rank - 1]?.place ?? `#${p.rank}`}
                    </span>
                    <span className="text-slate-200">
                      {p.team
                        ? `${p.team.tag ? `[${p.team.tag}] ` : ""}${p.team.name}`
                        : (p.player?.characterName ?? "—")}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {canReward && (
            <div className="mt-4">
              <AttendeeRewardForm eventId={event.id} />
            </div>
          )}

          {canReward && rosterPlayers.length > 0 && (
            <div className="card mt-4">
              <h3 className="font-display font-bold text-white">Log a single reward</h3>
              <div className="mt-3">
                <RewardForm players={rosterPlayers} fixedEventId={event.id} />
              </div>
            </div>
          )}
        </div>

        {/* Edit */}
        <div className="max-w-3xl">
          {canManage ? (
            <div className="card">
              <h3 className="font-display font-bold text-white">Edit</h3>
              <div className="mt-3">
                <EventForm
                  seasons={seasons}
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    timezone: eventTz,
                    startsAt: utcToZonedInput(event.startsAt, eventTz),
                    endsAt: event.endsAt ? utcToZonedInput(event.endsAt, eventTz) : "",
                    server: event.server,
                    format: event.format,
                    maxSlots: event.maxSlots,
                    teamSize: event.teamSize,
                    rewardPoolText: event.rewardPoolText,
                    status: event.status,
                    seasonId: event.seasonId,
                    summary: event.summary,
                    mode: event.mode,
                    wipeCycle: event.wipeCycle,
                    raidWindow: event.raidWindow,
                    rewardTiersText: tiersToText(event.rewardTiers),
                    bonusText: event.bonusText,
                    rulesMd: event.rulesMd,
                    detailsMd: event.detailsMd,
                    howToJoinVideoUrl: event.howToJoinVideoUrl,
                    announcePing: event.announcePing,
                    announcePingAll: event.announcePingAll,
                    announcementMd: event.announcementMd,
                    howToJoinMd: event.howToJoinMd,
                    gameplayMd: event.gameplayMd,
                    wipeInfoMd: event.wipeInfoMd,
                    rewardsMd: event.rewardsMd,
                  }}
                />
              </div>

              <div className="mt-6 border-t border-edge pt-4">
                <h3 className="font-display font-bold text-white">Danger zone</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Deletes the event, its roster, attendance and placements. Player rewards and
                  teams are kept. Any Discord space is archived first.
                </p>
                <div className="mt-3">
                  <ConfirmButton
                    action={deleteEvent.bind(null, event.id)}
                    confirm={`Delete "${event.title}"? This cannot be undone.`}
                  >
                    Delete event
                  </ConfirmButton>
                </div>
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
