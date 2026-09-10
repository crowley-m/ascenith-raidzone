import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { teamsForPlayer, selectableTeamEvents } from "@/lib/team";
import { CreateTeamForm, JoinTeamForm, TeamPanel } from "@/components/team/team-forms";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const user = await requireUser();
  const player = await db.player.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!player) {
    return (
      <p className="text-sm text-slate-400">
        Complete your profile first — then you can create or join a team.
      </p>
    );
  }

  const [teams, openEvents, anyTeamEvents] = await Promise.all([
    teamsForPlayer(player.id),
    selectableTeamEvents(player.id),
    db.event.count({
      where: {
        status: "PUBLISHED",
        format: "TEAM",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
    }),
  ]);

  // registration state per team (forming a team signs it up for its event)
  const regRows = teams.length
    ? await db.eventSignup.findMany({
        where: {
          teamId: { in: teams.map((t) => t.id) },
          state: { in: ["SIGNED_UP", "WAITLIST"] },
        },
        select: { teamId: true, state: true },
        distinct: ["teamId"],
      })
    : [];
  const regByTeam = new Map(
    regRows.map((r) => [r.teamId, r.state as "SIGNED_UP" | "WAITLIST"]),
  );

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="font-display text-lg font-bold text-white">Your teams</h2>
        <p className="mt-1 text-sm text-slate-400">
          Forming a team signs it up for that event straight away — teammates who join with your
          code are added too. You can be in a different team for each event, just not two for the
          same one.
        </p>
      </div>

      {teams.map((team) => (
        <TeamPanel
          key={team.id}
          me={player.id}
          isLeader={team.leaderId === player.id}
          team={{
            id: team.id,
            name: team.name,
            tag: team.tag,
            inviteCode: team.inviteCode,
            leaderId: team.leaderId,
            eventId: team.event.id,
            eventLabel: team.event.mode ? `RAIDZONE ${team.event.mode}` : team.event.title,
            registration: regByTeam.get(team.id) ?? null,
            members: team.members.map((m) => ({
              playerId: m.playerId,
              name: m.player.characterName ?? "Unnamed",
              gameUid: m.player.gameUid,
              region: m.player.region,
            })),
          }}
        />
      ))}

      {teams.length === 0 && (
        <p className="text-sm text-slate-400">You&apos;re not in any team yet.</p>
      )}

      <div className="card">
        <h3 className="font-display font-bold text-white">Create a team</h3>
        <p className="mt-1 text-xs text-slate-500">
          Picking an event here registers your team for it — you don&apos;t need a separate
          sign-up step.
        </p>
        {openEvents.length > 0 ? (
          <CreateTeamForm events={openEvents} />
        ) : anyTeamEvents === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            There are no team events right now. Teams are formed for{" "}
            <span className="text-slate-300">team-format</span> events only — solo events you sign
            up for yourself on the event page. When staff publish a team event it&apos;ll show up
            here.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            You already have a team for every open team event. You can only lead or join one team
            per event.
          </p>
        )}
      </div>

      <div className="card">
        <h3 className="font-display font-bold text-white">Join a team</h3>
        <p className="mt-1 text-xs text-slate-500">
          Paste an invite code — it&apos;ll add you to that team for its event.
        </p>
        <JoinTeamForm />
      </div>
    </div>
  );
}
