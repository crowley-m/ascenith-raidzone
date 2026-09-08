import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { RewardReceipt } from "@/components/me/reward-receipt";

export default async function MyRewardsPage() {
  const user = await requireUser();
  if (!user.playerId) {
    return <p className="text-sm text-slate-400">Complete your profile first.</p>;
  }

  const rewards = await db.reward.findMany({
    where: { playerId: user.playerId },
    orderBy: { grantedAt: "desc" },
    include: { event: { select: { id: true, title: true } } },
  });

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-white">My rewards</h2>
      {rewards.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No rewards yet. Show up to events and staff will log them here.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Item</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Event</th>
              <th className="py-2">Date</th>
              <th className="py-2 text-right">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {rewards.map((r) => (
              <tr key={r.id}>
                <td className="py-3 text-teal">{r.item}{r.amount ? ` ×${r.amount}` : ""}</td>
                <td className="py-3 text-slate-300">{r.reason}</td>
                <td className="py-3 text-slate-400">
                  {r.event ? (
                    <Link href={`/events/${r.event.id}`} className="link">{r.event.title}</Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 text-slate-500">{fmtDate(r.grantedAt)}</td>
                <td className="py-3 text-right">
                  <RewardReceipt rewardId={r.id} received={!!r.receivedAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
