import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { RewardForm } from "@/components/portal/reward-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteReward } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function PortalRewardsPage() {
  const user = await requirePermission("reward:view");
  const canGrant = can(user.role, "reward:grant");

  const [rewards, players, events] = await Promise.all([
    db.reward.findMany({
      orderBy: { grantedAt: "desc" },
      take: 100,
      include: {
        player: { select: { id: true, characterName: true } },
        event: { select: { title: true } },
        grantedBy: { select: { name: true, email: true } },
      },
    }),
    canGrant
      ? db.player.findMany({
          where: { status: { not: "BANNED" } },
          orderBy: { characterName: "asc" },
          select: { id: true, characterName: true, user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    canGrant
      ? db.event.findMany({ orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Reward log</h2>
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
                  <td className="py-2 text-teal">{r.item}{r.amount ? ` ×${r.amount}` : ""}</td>
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
                label: `${p.characterName ?? "Unnamed"}${p.user.email ? ` (${p.user.email})` : ""}`,
              }))}
              events={events.map((e) => ({ id: e.id, label: e.title }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
