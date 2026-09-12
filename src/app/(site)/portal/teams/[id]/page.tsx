import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { staffKickTeamMember, staffDisbandTeam } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function PortalTeamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("player:view");
  const { id } = await params;

  const team = await db.team.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, title: true, mode: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          player: { select: { id: true, characterName: true, gameUid: true, region: true } },
        },
      },
      placements: {
        orderBy: { createdAt: "desc" },
        include: { event: { select: { id: true, title: true, startsAt: true, rewardTiers: true } } },
      },
      signups: {
        where: { state: { in: ["SIGNED_UP", "WAITLIST"] } },
        include: { event: { select: { id: true, title: true, startsAt: true } } },
        distinct: ["eventId"],
        orderBy: { event: { startsAt: "desc" } },
      },
    },
  });
  if (!team) notFound();

  const nicknames = team.event
    ? new Map(
        (
          await db.eventSignup.findMany({
            where: { eventId: team.event.id, playerId: { in: team.members.map((m) => m.playerId) } },
            select: { playerId: true, nickname: true },
          })
        ).map((s) => [s.playerId, s.nickname]),
      )
    : new Map<string, string | null>();

  const canEdit = can(user.role, "player:edit");

  return (
    <div className="max-w-2xl">
      <Link href="/portal/teams" className="text-sm text-slate-500 hover:text-white">
        ← Teams
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-white">
          {team.tag && <span className="text-teal">[{team.tag}] </span>}
          {team.name}
        </h2>
        {canEdit && (
          <ConfirmButton
            action={staffDisbandTeam.bind(null, team.id)}
            confirm={`Disband ${team.name}? Removes every member. Can't be undone.`}
          >
            Disband team
          </ConfirmButton>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Invite code <code className="font-mono text-teal">{team.inviteCode}</code> · created{" "}
        {fmtDate(team.createdAt)}
        {team.event && (
          <>
            {" · formed for "}
            <Link href={`/portal/events/${team.event.id}`} className="text-slate-300 hover:text-teal">
              {team.event.mode ? `RAIDZONE ${team.event.mode}` : team.event.title}
            </Link>
          </>
        )}
      </p>

      <div className="card mt-6">
        <h3 className="font-display font-bold text-white">Roster ({team.members.length})</h3>
        <ul className="mt-3 divide-y divide-edge/60">
          {team.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>
                <Link
                  href={`/portal/players/${m.player.id}`}
                  className="text-slate-200 hover:text-teal"
                >
                  {m.player.characterName ?? "Unnamed"}
                </Link>
                {nicknames.get(m.playerId) && (
                  <span className="ml-1.5 text-xs text-teal">as {nicknames.get(m.playerId)}</span>
                )}
                {m.playerId === team.leaderId && (
                  <span className="badge ml-2 border-teal/40 text-teal">Leader</span>
                )}
                <span className="block text-xs text-slate-500">
                  {m.player.gameUid ? `UID ${m.player.gameUid}` : "no UID"}
                  {m.player.region ? ` · ${m.player.region}` : ""}
                </span>
              </span>
              {canEdit && m.playerId !== team.leaderId && (
                <ConfirmButton
                  action={staffKickTeamMember.bind(null, team.id, m.playerId)}
                  confirm={`Remove ${m.player.characterName ?? "this member"} from ${team.name}?`}
                  className="text-xs text-slate-500 hover:text-red-300"
                >
                  remove
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card mt-4">
        <h3 className="font-display font-bold text-white">Event history</h3>
        {team.placements.length === 0 && team.signups.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {team.placements.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/portal/events/${p.event.id}`}
                  className="text-slate-200 hover:text-teal"
                >
                  {p.event.title}
                </Link>
                <span className="badge border-teal/40 text-teal">Placed #{p.rank}</span>
              </li>
            ))}
            {team.signups.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-slate-400">
                <Link href={`/portal/events/${s.event.id}`} className="hover:text-teal">
                  {s.event.title}
                </Link>
                <span className="text-xs">{s.state === "WAITLIST" ? "waitlist" : "registered"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
