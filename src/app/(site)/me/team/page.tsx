import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { teamForPlayer } from "@/lib/team";
import { CreateTeamForm, JoinTeamForm, TeamPanel } from "@/components/team/team-forms";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const user = await requireUser();
  const player = await db.player.findUnique({ where: { userId: user.id }, select: { id: true } });

  if (!player) {
    return (
      <p className="text-sm text-slate-400">
        Complete your profile first — then you can create or join a team.
      </p>
    );
  }

  const team = await teamForPlayer(player.id);

  if (!team) {
    return (
      <div className="max-w-lg space-y-8">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Your team</h2>
          <p className="mt-1 text-sm text-slate-400">
            Team events are entered by a team leader. Create a team and share the invite code, or
            join one you&apos;ve been given a code for.
          </p>
        </div>
        <div className="card">
          <h3 className="font-display font-bold text-white">Create a team</h3>
          <CreateTeamForm />
        </div>
        <div className="card">
          <h3 className="font-display font-bold text-white">Join a team</h3>
          <JoinTeamForm />
        </div>
      </div>
    );
  }

  const isLeader = team.leaderId === player.id;

  return (
    <TeamPanel
      me={player.id}
      isLeader={isLeader}
      team={{
        id: team.id,
        name: team.name,
        tag: team.tag,
        inviteCode: team.inviteCode,
        leaderId: team.leaderId,
        members: team.members.map((m) => ({
          playerId: m.playerId,
          name: m.player.characterName ?? "Unnamed",
          gameUid: m.player.gameUid,
          region: m.player.region,
        })),
      }}
    />
  );
}
