import type { Metadata } from "next";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Reward proof" };
export const dynamic = "force-dynamic";

export default async function ProofPage() {
  const rewards = await db.reward.findMany({
    where: { isPublic: true },
    orderBy: { grantedAt: "desc" },
    take: 60,
    include: {
      player: { select: { characterName: true } },
      event: { select: { title: true } },
    },
  });

  const proofSrc = (r: (typeof rewards)[number]) =>
    r.proofImageId ? `/api/media/${r.proofImageId}` : r.proofImageUrl;

  return (
    <div className="container-x py-16">
      <h1 className="font-display text-3xl font-extrabold text-white">Reward proof</h1>
      <p className="mt-3 max-w-2xl text-slate-300">
        A running log of rewards our staff have handed out to players. Real events, real payouts.
      </p>

      {rewards.length === 0 ? (
        <p className="mt-12 text-sm text-slate-400">
          No public rewards logged yet — check back after the next event.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              {proofSrc(r) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofSrc(r) as string}
                  alt=""
                  className="-mx-5 -mt-5 mb-4 h-44 w-[calc(100%+2.5rem)] object-cover"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-white">
                  {r.player.characterName ?? "A player"}
                </span>
                <span className="text-xs text-slate-500">{fmtDate(r.grantedAt)}</span>
              </div>
              <p className="mt-1 text-sm text-teal">
                {r.item}
                {r.amount ? ` ×${r.amount}` : ""}
              </p>
              <p className="mt-1 text-sm text-slate-400">{r.reason}</p>
              {r.event && (
                <p className="mt-2 text-xs text-slate-500">from “{r.event.title}”</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
