import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { hiddenActorIds, maskName } from "@/lib/staff-mask";
import { PlayerStatusControl } from "@/components/portal/player-status-control";
import { NoteForm } from "@/components/portal/note-form";
import { FlagForm } from "@/components/portal/flag-form";
import { RewardForm } from "@/components/portal/reward-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteNote, deleteReward } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("player:view");
  const { id } = await params;

  const player = await db.player.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, discordUsername: true, discordId: true, createdAt: true } },
      faction: true,
      notes: { include: { author: { select: { name: true, email: true } } }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
      flags: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
      signups: { include: { event: true }, orderBy: { event: { startsAt: "desc" } } },
      attendance: { include: { event: { select: { title: true } } } },
      rewards: { include: { event: { select: { title: true } } }, orderBy: { grantedAt: "desc" } },
    },
  });
  if (!player) notFound();

  const hidden = await hiddenActorIds(user.role);
  const attendedIds = new Set(player.attendance.filter((a) => a.attended).map((a) => a.eventId));

  const info: [string, React.ReactNode][] = [
    ["Character", player.characterName ?? "—"],
    ["Platform", player.platform ?? "—"],
    ["Region", player.region ?? "—"],
    ["Power", player.powerLevel ?? "—"],
    ["Timezone", player.timezone ?? "—"],
    ["Play hours", player.playHours ?? "—"],
    ["Languages", player.languages ?? "—"],
    ["Faction", player.faction?.name ?? "—"],
    ["Discord", player.user.discordUsername ?? "—"],
    ["Email", player.user.email ?? "—"],
    ["Joined", fmtDate(player.joinedAt)],
  ];

  return (
    <div>
      <Link href="/portal/players" className="text-sm text-slate-500 hover:text-white">← Players</Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-white">
          {player.characterName ?? "Unnamed player"}
        </h2>
        <PlayerStatusControl
          playerId={player.id}
          current={player.status}
          canEdit={can(user.role, "player:status")}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h3 className="font-display font-bold text-white">Profile</h3>
          <dl className="mt-3 space-y-2 text-sm">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Events */}
          <div className="card">
            <h3 className="font-display font-bold text-white">Event history</h3>
            <ul className="mt-3 divide-y divide-edge/60 text-sm">
              {player.signups.length === 0 && <li className="py-2 text-slate-400">No sign-ups.</li>}
              {player.signups.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <Link href={`/portal/events/${s.eventId}`} className="text-slate-200 hover:text-teal">
                    {s.event.title}
                  </Link>
                  <span className="text-slate-500">
                    {fmtDate(s.event.startsAt)}
                    {" · "}
                    {s.state === "WITHDRAWN"
                      ? "withdrew"
                      : attendedIds.has(s.eventId)
                        ? "attended"
                        : s.state.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rewards */}
          <div className="card">
            <h3 className="font-display font-bold text-white">Rewards</h3>
            <ul className="mt-3 divide-y divide-edge/60 text-sm">
              {player.rewards.length === 0 && <li className="py-2 text-slate-400">None yet.</li>}
              {player.rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="text-teal">{r.item}{r.amount ? ` ×${r.amount}` : ""}</span>
                    <span className="text-slate-400"> — {r.reason}</span>
                    {r.event && <span className="text-slate-600"> ({r.event.title})</span>}
                    {r.isPublic && <span className="badge ml-2">public</span>}
                  </span>
                  {can(user.role, "reward:grant") && (
                    <ConfirmButton
                      action={deleteReward.bind(null, r.id, player.id)}
                      confirm="Delete this reward?"
                    >
                      Delete
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
            {can(user.role, "reward:grant") && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-teal">+ Log a reward</summary>
                <div className="mt-3">
                  <RewardForm fixedPlayerId={player.id} />
                </div>
              </details>
            )}
          </div>

          {/* Notes */}
          <div className="card">
            <h3 className="font-display font-bold text-white">Staff notes</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {player.notes.map((n) => (
                <li key={n.id} className="rounded-md border border-edge/60 bg-void/40 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {n.pinned && <span className="text-ember">📌 </span>}
                      {maskName(n.author.name ?? n.author.email, n.authorId, hidden)} ·{" "}
                      {fmtDateTime(n.createdAt)}
                    </span>
                    {can(user.role, "note:write") && (
                      <ConfirmButton
                        action={deleteNote.bind(null, n.id, player.id)}
                        confirm="Delete note?"
                        className="text-xs text-slate-500 hover:text-red-300"
                      >
                        delete
                      </ConfirmButton>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-slate-200">{n.body}</p>
                </li>
              ))}
              {player.notes.length === 0 && <li className="text-slate-400">No notes.</li>}
            </ul>
            {can(user.role, "note:write") && <NoteForm playerId={player.id} />}
          </div>

          {/* Flags */}
          <div className="card">
            <h3 className="font-display font-bold text-white">Flags</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {player.flags.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-md border border-edge/60 bg-void/40 p-3">
                  <span>
                    <span
                      className={`badge ${
                        f.type === "BAN"
                          ? "border-red-500/40 text-red-300"
                          : f.type === "WARNING"
                            ? "border-ember/40 text-ember"
                            : ""
                      }`}
                    >
                      {f.type}
                    </span>{" "}
                    <span className="text-slate-200">{f.reason}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {maskName(f.author.name ?? f.author.email, f.authorId, hidden)} ·{" "}
                    {fmtDate(f.createdAt)}
                  </span>
                </li>
              ))}
              {player.flags.length === 0 && <li className="text-slate-400">No flags.</li>}
            </ul>
            {can(user.role, "flag:write") && <FlagForm playerId={player.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
