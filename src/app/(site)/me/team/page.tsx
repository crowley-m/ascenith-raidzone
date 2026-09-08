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

  const [teams, openEvents] = await Promise.all([
    teamsForPlayer(player.id),
    selectableTeamEvents(player.id),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="font-display text-lg font-bold text-white">Your teams</h2>
        <p className="mt-1 text-sm text-slate-400">
          Team events are entered by a team leader. You can be in a different team for each event —
          just not two teams for the same one.
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
            eventLabel: team.event.mode ? `RAIDZONE ${team.event.mode}` : team.event.title,
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
        {openEvents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No team events open right now that you can form a team for.
          </p>
        ) : (
          <CreateTeamForm events={openEvents} />
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
