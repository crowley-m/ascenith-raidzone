import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { relative } from "@/lib/format";
import { fmtInZone, DEFAULT_EVENT_TZ } from "@/lib/tz";
import { SignupButton } from "@/components/signup-button";
import { TeamSignup } from "@/components/team/team-signup";
import { Markdown } from "@/components/markdown";
import { EventProse } from "@/components/event-prose";
import { VideoEmbed } from "@/components/video-embed";
import { teamForEvent } from "@/lib/team";
import { bracketForEvent } from "@/lib/bracket";
import { BracketBoard } from "@/components/bracket/bracket-board";
import type { RewardTier } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await db.event.findUnique({
      where: { id, status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { title: true },
    });
    return { title: event?.title ?? "Event" };
  } catch {
    return { title: "Event" };
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const event = await db.event.findUnique({
    where: { id },
    include: {
      signups: {
        where: { state: { in: ["SIGNED_UP", "WAITLIST"] } },
        include: {
          player: { select: { id: true, characterName: true, region: true } },
          team: { select: { id: true, name: true, tag: true, leaderId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event || (event.status !== "PUBLISHED" && event.status !== "COMPLETED")) {
    notFound();
  }

  const isTeamEvent = event.format === "TEAM";

  // caller's player + team
  let myPlayerId: string | null = session?.user?.playerId ?? null;
  if (session?.user && !myPlayerId) {
    const p = await db.player.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    myPlayerId = p?.id ?? null;
  }
  const myTeam = isTeamEvent && myPlayerId ? await teamForEvent(myPlayerId, id) : null;
  const bracket = await bracketForEvent(id);

  const mySignup = myPlayerId
    ? event.signups.find((s) => s.playerId === myPlayerId)
    : undefined;

  const confirmed = event.signups.filter((s) => s.state === "SIGNED_UP");
  const waitlist = event.signups.filter((s) => s.state === "WAITLIST");

  // team-event roster, grouped by team
  const teamGroups = new Map<string, { name: string; tag: string | null; members: typeof confirmed }>();
  if (isTeamEvent) {
    for (const s of confirmed) {
      const key = s.teamId ?? "none";
      if (!teamGroups.has(key)) {
        teamGroups.set(key, { name: s.team?.name ?? "—", tag: s.team?.tag ?? null, members: [] });
      }
      teamGroups.get(key)!.members.push(s);
    }
  }

  const myTeamRegisteredCount = myTeam
    ? confirmed.filter((s) => s.teamId === myTeam.id).length
    : 0;

  const teamSignupState = (() => {
    if (!session?.user) return { kind: "no-account" as const };
    if (!myPlayerId) return { kind: "no-player" as const };
    if (!myTeam) return { kind: "no-team" as const };
    if (myTeam.leaderId === myPlayerId) {
      return {
        kind: "leader" as const,
        teamName: myTeam.name,
        memberCount: myTeam.members.length,
        registeredCount: myTeamRegisteredCount,
      };
    }
    return {
      kind: "member" as const,
      teamName: myTeam.name,
      registered: myTeamRegisteredCount > 0,
    };
  })();
  const now = Date.now();
  const live =
    event.status === "PUBLISHED" &&
    event.startsAt.getTime() <= now &&
    (!event.endsAt || event.endsAt.getTime() > now);
  // sign-ups stay open through a running wipe — closed only once it ends
  const open =
    event.status === "PUBLISHED" && (!event.endsAt || event.endsAt.getTime() > now);
  const upcoming = event.startsAt.getTime() > now;
  const statusWord =
    event.status === "COMPLETED"
      ? "Over"
      : live
        ? "Live"
        : upcoming
          ? "Upcoming"
          : "Locked";

  const tiers = (Array.isArray(event.rewardTiers) ? event.rewardTiers : []) as RewardTier[];

  const tz = event.timezone ?? DEFAULT_EVENT_TZ;
  const multiline = (text: string) => {
    const rows = text.split("\n").map((l) => l.trim()).filter(Boolean);
    return rows.length > 1
      ? rows.map((l, i) => <span key={i} className="block">{l}</span>)
      : text;
  };

  const facts: [string, React.ReactNode][] = [["Starts", fmtInZone(event.startsAt, tz)]];
  if (event.endsAt) facts.push(["Wipe / ends", fmtInZone(event.endsAt, tz)]);
  if (event.wipeCycle) facts.push(["Cycle", event.wipeCycle]);
  if (event.raidWindow) facts.push(["Raid window", multiline(event.raidWindow)]);
  if (event.server) facts.push(["Server", event.server]);
  facts.push(["Format", isTeamEvent ? "Team event" : "Solo event"]);
  if (isTeamEvent && event.teamSize)
    facts.push(["Players per team", `up to ${event.teamSize}`]);
  facts.push([
    isTeamEvent ? "Teams registered" : "Players signed up",
    String(isTeamEvent ? teamGroups.size : confirmed.length),
  ]);
  facts.push([
    isTeamEvent ? "Max teams" : "Max slots",
    event.maxSlots ? String(event.maxSlots) : "Unlimited",
  ]);

  return (
    <div className="bg-void">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <Link href="/events" className="link text-xs uppercase tracking-widest">
        &larr; All events
      </Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="eyebrow">
            {event.mode ? `${event.mode} event` : "Event"} &mdash;{" "}
            <span className="text-slate-400">{statusWord}</span> &middot; {relative(event.startsAt)}
          </p>
          <h1 className="mt-2 font-poster text-5xl uppercase leading-none text-white sm:text-6xl">
            {event.mode ? (
              <>
                RAIDZONE <span className="text-slate-500">{event.mode}</span>
              </>
            ) : (
              event.title
            )}
          </h1>
          {event.summary && (
            <p className="mt-4 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-slate-300">
              {event.summary}
            </p>
          )}

          {event.posterUrl && /^https?:\/\//.test(event.posterUrl) && (
            <div className="mt-8 max-w-2xl overflow-hidden border border-edge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.posterUrl}
                alt={`${event.title} key art`}
                className="w-full object-cover"
              />
            </div>
          )}

          {event.howToJoinVideoUrl && (
            <div className="mt-8 max-w-2xl">
              <div className="eyebrow">How to join</div>
              <div className="mt-3">
                <VideoEmbed url={event.howToJoinVideoUrl} title={`How to join — ${event.title}`} />
              </div>
            </div>
          )}

          {(tiers.length > 0 || event.bonusText || event.rewardPoolText) && (
            <div className="mt-8 border border-edge bg-panel/70 p-5">
              <div className="eyebrow">Rewards</div>
              {tiers.length > 0 && (
                <ul className="mt-3 divide-y divide-edge">
                  {tiers.map((t) => (
                    <li
                      key={t.place}
                      className="flex items-baseline justify-between gap-4 py-2 font-mono text-sm uppercase"
                    >
                      <span className="text-teal">{t.place}</span>
                      <span className="text-slate-100">{t.reward}</span>
                    </li>
                  ))}
                </ul>
              )}
              {event.bonusText && (
                <div className="mt-3 border-t border-edge pt-3">
                  <span className="border border-teal px-1.5 py-0.5 font-mono text-xs font-bold uppercase text-teal">
                    Bonus
                  </span>
                  <ul className="mt-2 space-y-1 font-mono text-xs uppercase tracking-wide text-slate-300">
                    {event.bonusText
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                  </ul>
                </div>
              )}
              {event.rewardPoolText && !tiers.length && (
                <p className="mt-2 whitespace-pre-wrap font-mono text-sm text-slate-200">
                  {event.rewardPoolText}
                </p>
              )}
            </div>
          )}

          {event.detailsMd && (
            <Markdown source={event.detailsMd} className="md mt-10 max-w-2xl" />
          )}
          {!event.detailsMd && event.description && (
            <p className="mt-8 max-w-2xl whitespace-pre-wrap text-sm text-slate-300">
              {event.description}
            </p>
          )}

          {event.gameplayMd && (
            <div className="mt-10 max-w-2xl border-l-2 border-teal/50 pl-5">
              <h2 className="font-poster text-2xl uppercase text-white">Gameplay</h2>
              <div className="mt-3">
                <EventProse source={event.gameplayMd} />
              </div>
            </div>
          )}

          {event.scheduleMd && (
            <div className="mt-10 max-w-2xl border-l-2 border-teal/50 pl-5">
              <h2 className="font-poster text-2xl uppercase text-white">Schedule</h2>
              <div className="mt-3">
                <EventProse source={event.scheduleMd} />
              </div>
            </div>
          )}

          {event.rulesMd && (
            <div className="mt-10 max-w-2xl border-l-2 border-teal/50 pl-5">
              <h2 className="font-poster text-2xl uppercase text-white">Rules</h2>
              <Markdown source={event.rulesMd} className="md mt-3" />
            </div>
          )}

          {event.wipeInfoMd && (
            <div className="mt-10 max-w-2xl border-l-2 border-teal/50 pl-5">
              <h2 className="font-poster text-2xl uppercase text-white">Wipe info</h2>
              <div className="mt-3">
                <EventProse source={event.wipeInfoMd} />
              </div>
            </div>
          )}

          <div className="mt-10 max-w-2xl border-l-2 border-teal/50 pl-5">
            <h2 className="font-poster text-2xl uppercase text-white">Information</h2>
            <dl className="mt-3 grid grid-cols-2 gap-px border border-edge bg-edge sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k} className="bg-panel p-4">
                  <dt className="label">{k}</dt>
                  <dd className="mt-1 font-mono text-sm text-slate-100">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {bracket && (
            <div className="mt-12">
              <h2 className="font-poster text-2xl uppercase text-white">Bracket</h2>
              <div className="mt-4">
                <BracketBoard bracket={bracket} />
              </div>
            </div>
          )}

          <div className="mt-12">
            {isTeamEvent ? (
              <>
                <h2 className="font-poster text-2xl uppercase text-white">
                  Teams <span className="text-slate-500">({teamGroups.size})</span>
                </h2>
                {teamGroups.size === 0 ? (
                  <p className="mt-3 font-mono text-xs uppercase text-slate-500">
                    No teams registered yet.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[...teamGroups.values()].map((g) => (
                      <div key={g.name} className="border border-edge bg-panel/50 p-4">
                        <div className="font-display font-bold text-white">
                          {g.tag && <span className="text-teal">[{g.tag}] </span>}
                          {g.name}
                        </div>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {g.members.map((s) => (
                            <li key={s.id} className="badge text-xs">
                              {s.player.characterName ?? "Unnamed"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="font-poster text-2xl uppercase text-white">
                  Roster <span className="text-slate-500">({confirmed.length})</span>
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {confirmed.length === 0 && (
                    <li className="font-mono text-xs uppercase text-slate-500">
                      No sign-ups yet. Be first.
                    </li>
                  )}
                  {confirmed.map((s) => (
                    <li key={s.id} className="badge">
                      {s.player.characterName ?? "Unnamed"}
                      {s.player.region ? ` · ${s.player.region}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {waitlist.length > 0 && (
              <>
                <h3 className="mt-5 font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
                  Waitlist ({isTeamEvent ? "teams" : waitlist.length})
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {waitlist.map((s) => (
                    <li key={s.id} className="badge opacity-70">
                      {isTeamEvent && s.team ? s.team.name : s.player.characterName ?? "Unnamed"}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-edge bg-panel/70 p-5">
            <h2 className="font-poster text-xl uppercase text-white">
              {event.status === "COMPLETED"
                ? "This event is over"
                : open
                  ? live
                    ? "Join the wipe"
                    : "Claim a slot"
                  : "Sign-ups closed"}
            </h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-wide text-slate-400">
              {event.status === "COMPLETED"
                ? "Thanks to everyone who came out."
                : open
                  ? live
                    ? "Wipe's running — sign up and jump in. Withdraw any time."
                    : "You can withdraw any time before it starts."
                  : "The roster is locked."}
            </p>
            <div className="mt-4">
              {open ? (
                isTeamEvent ? (
                  <TeamSignup eventId={event.id} state={teamSignupState} />
                ) : (
                  <SignupButton
                    eventId={event.id}
                    signedUp={!!mySignup}
                    state={mySignup?.state}
                    loggedIn={!!session?.user}
                  />
                )
              ) : (
                mySignup && (
                  <span className="badge border-teal/40 text-teal">
                    {isTeamEvent ? "Your team was registered" : "You were signed up"}
                  </span>
                )
              )}
            </div>
            {!session?.user && (
              <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-wide text-slate-500">
                No account?{" "}
                <a href="/register" className="link">
                  Register
                </a>{" "}
                first.
              </p>
            )}
            {(upcoming || live) && (
              <a
                href={`/events/${event.id}/calendar`}
                className="mt-4 inline-block font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:text-teal"
              >
                + Add to calendar
              </a>
            )}
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}
