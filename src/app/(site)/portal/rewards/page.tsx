import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { RewardForm } from "@/components/portal/reward-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { DisputeActions } from "@/components/portal/dispute-actions";
import { deleteReward } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function PortalRewardsPage() {
  const user = await requirePermission("reward:view");
  const canGrant = can(user.role, "reward:grant");

  const [rewards, disputed, players, events] = await Promise.all([
    db.reward.findMany({
      orderBy: { grantedAt: "desc" },
      take: 100,
      include: {
        player: { select: { id: true, characterName: true } },
        event: { select: { title: true } },
        grantedBy: { select: { name: true, email: true } },
      },
    }),
    db.reward.findMany({
      where: { disputedAt: { not: null } },
      orderBy: { disputedAt: "desc" },
      include: {
        player: { select: { id: true, characterName: true, gameUid: true } },
        event: { select: { title: true } },
      },
    }),
    canGrant
      ? db.player.findMany({
          where: { status: { not: "BANNED" } },
          orderBy: { characterName: "asc" },
          select: { id: true, characterName: true, gameUid: true, user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    canGrant
      ? db.event.findMany({ orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {disputed.length > 0 && (
          <div className="mb-6 border border-ember/50 bg-ember/5 p-4">
            <h3 className="font-display font-bold text-ember">
              Reported missing ({disputed.length})
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Players say these never arrived in-game. Re-send the item, then clear the flag.
            </p>
            <ul className="mt-3 divide-y divide-edge/60 text-sm">
              {disputed.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <Link
                      href={`/portal/players/${r.player.id}`}
                      className="text-slate-100 hover:text-teal"
                    >
                      {r.player.characterName ?? "Unnamed"}
                    </Link>
                    {r.player.gameUid && (
                      <span className="text-slate-500"> · UID {r.player.gameUid}</span>
                    )}
                    <span className="text-teal">
                      {" "}
                      — {r.item}
                      {r.amount ? ` ×${r.amount}` : ""}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {r.reason}
                      {r.event ? ` · ${r.event.title}` : ""} · flagged {fmtDate(r.disputedAt!)}
                    </span>
                  </span>
                  {canGrant && <DisputeActions rewardId={r.id} playerId={r.player.id} />}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold text-white">Reward log</h2>
          <Link
            href="/portal/rewards/export"
            prefetch={false}
            className="ml-auto font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:text-teal"
          >
            ↓ Export CSV
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Player</th>
                <th className="py-2">Item</th>
                <th className="py-2">Reason</th>
                <th className="py-2">Event</th>
                <th className="py-2">By</th>
                <th className="py-2">Date</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60">
              {rewards.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">
                    <Link href={`/portal/players/${r.player.id}`} className="text-slate-200 hover:text-teal">
                      {r.player.characterName ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="py-2 text-teal">
                    {r.item}{r.amount ? ` ×${r.amount}` : ""}
                    {r.receivedAt && <span className="ml-2 text-[0.65rem] uppercase text-teal/70">✓ received</span>}
                    {!r.receivedAt && r.disputedAt && (
                      <span className="ml-2 text-[0.65rem] uppercase text-ember">⚠ missing</span>
                    )}
                  </td>
                  <td className="py-2 text-slate-300">{r.reason}{r.isPublic && <span className="badge ml-2">public</span>}</td>
                  <td className="py-2 text-slate-500">{r.event?.title ?? "—"}</td>
                  <td className="py-2 text-slate-500">{r.grantedBy.name ?? r.grantedBy.email}</td>
                  <td className="py-2 text-slate-500">{fmtDate(r.grantedAt)}</td>
                  <td className="py-2">
                    {canGrant && (
                      <ConfirmButton
                        action={deleteReward.bind(null, r.id, r.player.id)}
                        confirm="Delete this reward?"
                        className="text-xs text-slate-500 hover:text-red-300"
                      >
                        delete
                      </ConfirmButton>
                    )}
                  </td>
                </tr>
              ))}
              {rewards.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-slate-400">No rewards logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canGrant && (
        <div className="card lg:sticky lg:top-24 lg:self-start">
          <h3 className="font-display font-bold text-white">Log a reward</h3>
          <div className="mt-3">
            <RewardForm
              players={players.map((p) => ({
                id: p.id,
                label: `${p.characterName ?? "Unnamed"}${p.gameUid ? ` · UID ${p.gameUid}` : " · no UID"}`,
              }))}
              events={events.map((e) => ({ id: e.id, label: e.title }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
