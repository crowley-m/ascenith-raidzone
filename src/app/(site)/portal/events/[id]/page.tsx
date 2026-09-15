import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { fmtInZone, DEFAULT_EVENT_TZ, utcToZonedInput } from "@/lib/tz";
import { tiersToText } from "@/lib/validation";
import { EventForm } from "@/components/portal/event-form";
import { AttendanceToggle } from "@/components/portal/attendance-toggle";
import { RewardForm } from "@/components/portal/reward-form";
import { RosterCopy } from "@/components/portal/roster-copy";
import { BuildSpaceButton, ArchiveSpaceButton, ReannounceButton } from "@/components/portal/build-space-button";
import { ResultsForm, AttendeeRewardForm } from "@/components/portal/results-form";
import { DiscordPreview } from "@/components/portal/discord-preview";
import { LandingPreview } from "@/components/portal/landing-preview";
import { RosterTools } from "@/components/portal/roster-tools";
import { TeamRosterList } from "@/components/portal/team-roster-list";
import { EventChannelsManager } from "@/components/portal/event-channels-manager";
import { eventChannelPayloads } from "@/lib/event-channels";
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
      season: { select: { number: true, name: true } },
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

  const [seasons, bracket, bracketEntrants, settings] = await Promise.all([
    db.season.findMany({
      orderBy: [{ series: "asc" }, { number: "desc" }],
      select: { id: true, series: true, number: true, name: true },
    }),
    bracketForEvent(id),
    entrantsForEvent(id),
    getSettings(),
  ]);

  const attMap = new Map(event.attendance.map((a) => [a.playerId, a.attended]));
  const canManage = can(user.role, "event:manage");
  const canMark = can(user.role, "attendance:mark");
  const canReward = can(user.role, "reward:grant");

  // channels whose freshly-computed content no longer matches what was
  // actually last pushed to Discord — surfaced in the Channels panel so
  // staff know what still needs a push, instead of re-syncing everything
  const contentHashes = (event.discordContentHashes as Record<string, string>) ?? {};
  const pendingChannels = Object.entries(eventChannelPayloads(event))
    .filter(([, payload]) => payload.content || payload.embed)
    .filter(([name, payload]) => contentHashes[name] !== JSON.stringify(payload))
    .map(([name]) => name);

  const isTeamEvent = event.format === "TEAM";
  const confirmed = event.signups.filter((s) => s.state === "SIGNED_UP");
  const waitlist = event.signups.filter((s) => s.state === "WAITLIST");
  const attendedCount = confirmed.filter((s) => attMap.get(s.player.id)).length;
  const noShow = confirmed.filter((s) => attMap.get(s.player.id) === false);
  const teamCount = new Set(confirmed.map((s) => s.teamId).filter(Boolean)).size;

  const rosterPlayers = event.signups.map((s) => ({
    id: s.player.id,
    label: `${s.nickname || s.player.characterName || "Unnamed"}${s.player.gameUid ? ` · UID ${s.player.gameUid}` : ""}${
      s.team ? ` · ${s.team.name}` : ""
    }`,
  }));

  // plain-text roster for pasting into Discord / reward processing
  const rosterText = (() => {
    const lines: string[] = [`${event.title} — roster`, ""];
    if (isTeamEvent) {
      const groups = new Map<string, typeof confirmed>();
      for (const s of confirmed) {
        const k = s.team?.name ?? "Free agents (no team)";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(s);
      }
      for (const [name, members] of groups) {
        lines.push(`[${name}]`);
        for (const s of members) {
          lines.push(
            `  ${s.nickname || s.player.characterName || "Unnamed"}${s.player.gameUid ? ` (${s.player.gameUid})` : ""}`,
          );
        }
        lines.push("");
      }
    } else {
      for (const s of confirmed) {
        lines.push(
          `${s.nickname || s.player.characterName || "Unnamed"}${s.player.gameUid ? ` (${s.player.gameUid})` : ""}`,
        );
      }
    }
    return lines.join("\n");
  })();

  // team-event roster grouped; teamless sign-ups are free agents
  const teamGroups = new Map<
    string,
    { name: string; tag: string | null; members: typeof confirmed }
  >();
  const freeAgents: typeof confirmed = [];
  if (isTeamEvent) {
    for (const s of confirmed) {
      if (!s.teamId) {
        freeAgents.push(s);
        continue;
      }
      if (!teamGroups.has(s.teamId)) {
        teamGroups.set(s.teamId, {
          name: s.team?.name ?? "—",
          tag: s.team?.tag ?? null,
          members: [],
        });
      }
      teamGroups.get(s.teamId)!.members.push(s);
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
        label: s.nickname || s.player.characterName || "Unnamed",
      }));
  const currentPlacements: Record<number, string> = {};
  for (const p of event.placements) {
    currentPlacements[p.rank] = p.teamId ? `team:${p.teamId}` : `player:${p.playerId}`;
  }

  const landingEvent = {
    id: event.id,
    title: event.title,
    server: event.server,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    maxSlots: event.maxSlots,
    signups: isTeamEvent ? teamCount : confirmed.length,
    rewardPoolText: event.rewardPoolText,
    summary: event.summary,
    mode: event.mode,
    wipeCycle: event.wipeCycle,
    raidWindow: event.raidWindow,
    rewardTiers: tiers,
    bonusText: event.bonusText,
    howToJoinVideoUrl: event.howToJoinVideoUrl,
    seasonNumber: event.season?.number ?? null,
    seasonName: event.season?.name ?? null,
  };

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
                <span className="badge border-edge text-slate-500">Discord archived</span>
              ) : (
                <span className="badge border-teal/40 text-teal">
                  Discord:{" "}
                  {Object.keys((event.discordChannels as Record<string, string>) ?? {}).length}{" "}
                  channels
                </span>
              )
            ) : (
              <>
                {event.status === "PUBLISHED" && <ReannounceButton eventId={event.id} />}
                <BuildSpaceButton eventId={event.id} />
              </>
            ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {fmtInZone(event.startsAt, eventTz)}
        {event.discordMessageId && " · announced in Discord"}
      </p>

      {canManage && pendingChannels.length > 0 && (
        <div className="mt-4 border border-ember/40 bg-ember/5 p-3 text-xs text-ember">
          {pendingChannels.length} channel{pendingChannels.length === 1 ? "" : "s"} with unpushed
          content changes — see{" "}
          <a href="#channels" className="underline hover:no-underline">
            Channels
          </a>{" "}
          below.
        </div>
      )}

      {canManage && (
        <nav className="sticky top-0 z-10 mt-6 -mx-1 flex flex-wrap gap-4 border-b border-edge bg-panel/95 px-1 py-2 font-mono text-[0.66rem] uppercase tracking-widest text-slate-500 backdrop-blur">
          <a href="#registrations" className="hover:text-teal">Registrations</a>
          <a href="#bracket" className="hover:text-teal">Bracket</a>
          {confirmed.length > 0 && <a href="#results" className="hover:text-teal">Results</a>}
          <a href="#previews" className="hover:text-teal">Previews</a>
          {event.discordCategoryId && <a href="#channels" className="hover:text-teal">Channels</a>}
          <a href="#edit" className="hover:text-teal">Edit</a>
          <a href="#danger" className="hover:text-teal">Danger zone</a>
        </nav>
      )}

      <div className="mt-8 space-y-12">
        {/* Registrations */}
        <div id="registrations">
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
              {canReward && (
                <Link
                  href={`/portal/rewards/export?eventId=${event.id}`}
                  prefetch={false}
                  className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:text-teal"
                >
                  ↓ Crystgin sheet
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

          {confirmed.length > 0 && (
            <div className="mt-2">
              <div className="flex h-1.5 overflow-hidden bg-panel/40">
                {attendedCount > 0 && (
                  <div className="bg-teal" style={{ width: `${(attendedCount / confirmed.length) * 100}%` }} />
                )}
                {noShow.length > 0 && (
                  <div className="bg-ember" style={{ width: `${(noShow.length / confirmed.length) * 100}%` }} />
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-slate-500">
                <span><span className="text-teal">■</span> attended {attendedCount}</span>
                <span><span className="text-ember">■</span> no-show {noShow.length}</span>
                <span>
                  <span className="text-slate-600">■</span> not marked{" "}
                  {confirmed.length - attendedCount - noShow.length}
                </span>
              </div>
            </div>
          )}

          {isTeamEvent ? (
            <div className="mt-4">
              <TeamRosterList
                eventId={event.id}
                groups={[...teamGroups.values()]}
                freeAgents={freeAgents}
                attendance={Object.fromEntries(attMap)}
                canMark={canMark}
              />
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
                        {s.nickname && (
                          <span className="ml-1.5 text-xs text-teal">as {s.nickname}</span>
                        )}
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

          {(canMark || canManage) && confirmed.length > 0 && (
            <RosterTools eventId={event.id} canMark={canMark} canManage={canManage} />
          )}

          {canManage && (
            <div id="bracket" className="mt-8">
              <BracketEditor
                eventId={event.id}
                bracket={bracket}
                entrantCount={bracketEntrants.length}
              />
            </div>
          )}

          {canManage && confirmed.length > 0 && (
            <div id="results" className="mt-8">
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
              {canReward && (
                <p className="mt-2 text-xs text-slate-500">
                  The Crystgin sheet (↓ up by Registrations) lists every reward already logged for
                  this event — Event / ID / Region / Crystgin, nothing else. Run &ldquo;Reward the
                  placements&rdquo; below first if you haven&apos;t yet.
                </p>
              )}
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

        {/* Previews */}
        {canManage && (
          <div id="previews" className="max-w-3xl space-y-3">
            <details>
              <summary className="cursor-pointer font-display font-bold text-white">
                Landing preview
                <span className="ml-2 text-xs font-normal text-slate-500">
                  how this event reads on the homepage
                </span>
              </summary>
              <div className="mt-4">
                <LandingPreview event={landingEvent} />
              </div>
            </details>
            <details>
              <summary className="cursor-pointer font-display font-bold text-white">
                Discord preview
                <span className="ml-2 text-xs font-normal text-slate-500">
                  what the bot posts to each channel
                </span>
              </summary>
              <div className="mt-4">
                <DiscordPreview event={event} />
              </div>
            </details>
          </div>
        )}

        {canManage && event.discordCategoryId && (
          <div id="channels" className="max-w-3xl">
            <EventChannelsManager
              eventId={event.id}
              channels={(event.discordChannels as Record<string, string>) ?? {}}
              seeded={Object.keys((event.discordSeedMessages as Record<string, string>) ?? {})}
              pending={pendingChannels}
              guildId={process.env.DISCORD_GUILD_ID}
              archived={!!event.discordArchivedAt}
            />
          </div>
        )}

        {/* Edit */}
        <div id="edit" className="max-w-3xl">
          {canManage ? (
            <details className="card" open={event.status === "DRAFT"}>
              <summary className="cursor-pointer font-display font-bold text-white">Edit</summary>
              <div className="mt-3">
                <EventForm
                  seasons={seasons}
                  defaultChannels={settings.eventChannels}
                  event={{
                    id: event.id,
                    hasDiscordSpace: !!event.discordCategoryId,
                    discordChannelPlan: Array.isArray(event.discordChannelPlan)
                      ? (event.discordChannelPlan as string[])
                      : null,
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
                    posterUrl: event.posterUrl,
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
                    registrationMd: event.registrationMd,
                    howToJoinMd: event.howToJoinMd,
                    gameplayMd: event.gameplayMd,
                    scheduleMd: event.scheduleMd,
                    wipeInfoMd: event.wipeInfoMd,
                    rewardsMd: event.rewardsMd,
                  }}
                />
              </div>

              <div id="danger" className="mt-6 border-t border-edge pt-4">
                <h3 className="font-display font-bold text-white">Danger zone</h3>

                {event.discordCategoryId && (
                  <div className="mt-3 border-b border-edge/60 pb-4">
                    <p className="text-xs text-slate-500">
                      {event.discordArchivedAt
                        ? "This space is archived — renamed, sunk to the bottom, and locked private. Re-lock it if the bot's permissions changed and something didn't take."
                        : "Renames the category, sinks it to the bottom, and locks every channel private. Nothing is deleted — reversible by rebuilding permissions manually if ever needed."}
                    </p>
                    <div className="mt-2">
                      <ArchiveSpaceButton eventId={event.id} relock={!!event.discordArchivedAt} />
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
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
            </details>
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
