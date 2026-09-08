import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { topRaiders } from "@/lib/leaderboard";
import { TopRaiders } from "@/components/top-raiders";
import type { RewardTier } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Winners",
  description: "Every RAIDZONE event, who placed, and what they took home.",
};
export const dynamic = "force-dynamic";

const MEDAL = ["1st", "2nd", "3rd", "4th", "5th"];

export default async function WinnersPage() {
  const raiders = await topRaiders(15);
  const proofImages = await db.mediaAsset
    .findMany({
      where: { kind: "proof" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, caption: true, tag: true },
    })
    .catch(() => []);

  let events: Awaited<ReturnType<typeof db.event.findMany>> = [];
  let looseRewards: Awaited<ReturnType<typeof db.reward.findMany>> = [];
  try {
    [events, looseRewards] = await Promise.all([
      db.event.findMany({
        where: {
          status: { in: ["PUBLISHED", "COMPLETED"] },
          placements: { some: {} },
        },
        orderBy: { startsAt: "desc" },
        include: {
          placements: {
            orderBy: { rank: "asc" },
            include: {
              team: { select: { name: true, tag: true } },
              player: { select: { characterName: true } },
            },
          },
        },
      }),
      db.reward.findMany({
        where: { isPublic: true, eventId: null },
        orderBy: { grantedAt: "desc" },
        take: 24,
        include: { player: { select: { characterName: true } } },
      }),
    ]);
  } catch {
    /* db down */
  }

  return (
    <div className="container-x py-16">
      <p className="eyebrow">{"// winners"}</p>
      <h1 className="mt-2 font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
        Hall of winners
      </h1>
      <p className="mt-4 max-w-2xl text-slate-300">
        Every RAIDZONE event, who placed, and what they took home. Real events, real payouts.
      </p>

      {raiders.length > 0 && (
        <section className="mt-12 border-t border-edge pt-8">
          <h2 className="font-display text-xl font-bold text-white">Top raiders</h2>
          <p className="mt-1 text-sm text-slate-500">
            Weighted by podium finishes and events played.
          </p>
          <div className="mt-4 max-w-xl">
            <TopRaiders raiders={raiders} />
          </div>
        </section>
      )}

      {proofImages.length > 0 && (
        <section className="mt-12 border-t border-edge pt-8">
          <h2 className="font-display text-xl font-bold text-white">Proof</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proofImages.map((img) => (
              <figure key={img.id} className="border border-edge">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/${img.id}`}
                  alt={img.caption ?? ""}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
                {(img.caption || img.tag) && (
                  <figcaption className="px-3 py-2 text-xs text-slate-400">
                    {img.caption}
                    {img.tag ? ` · ${img.tag}` : ""}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {events.length === 0 &&
      looseRewards.length === 0 &&
      raiders.length === 0 &&
      proofImages.length === 0 ? (
        <p className="mt-12 text-sm text-slate-400">
          No results logged yet — check back after the next event.
        </p>
      ) : (
        <div className="mt-12 space-y-12">
          {events.map((e) => {
            const ev = e as typeof e & {
              placements: Array<{
                id: string;
                rank: number;
                team: { name: string; tag: string | null } | null;
                player: { characterName: string | null } | null;
              }>;
            };
            const tiers = (Array.isArray(e.rewardTiers) ? e.rewardTiers : []) as RewardTier[];
            return (
              <section key={e.id} className="border-t border-edge pt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-white">
                    <Link href={`/events/${e.id}`} className="hover:text-teal">
                      {e.mode ? `RAIDZONE ${e.mode}` : e.title}
                    </Link>
                  </h2>
                  <span className="text-xs text-slate-500">{fmtDate(e.startsAt)}</span>
                </div>
                <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                  {ev.placements.map((p) => (
                    <li
                      key={p.id}
                      className={`border p-4 ${p.rank === 1 ? "border-teal/50" : "border-edge"}`}
                    >
                      <div className="font-mono text-xs uppercase tracking-wide text-teal">
                        {MEDAL[p.rank - 1] ?? `#${p.rank}`}
                      </div>
                      <div className="mt-1 font-display font-bold text-white">
                        {p.team
                          ? `${p.team.tag ? `[${p.team.tag}] ` : ""}${p.team.name}`
                          : (p.player?.characterName ?? "—")}
                      </div>
                      {tiers[p.rank - 1]?.reward && (
                        <div className="mt-1 text-sm text-slate-400">{tiers[p.rank - 1].reward}</div>
                      )}
                    </li>
                  ))}
                </ol>
                {e.bonusText && (
                  <p className="mt-3 text-xs text-slate-500">Bonus pool: {e.bonusText}</p>
                )}
              </section>
            );
          })}

          {looseRewards.length > 0 && (
            <section className="border-t border-edge pt-8">
              <h2 className="font-display text-xl font-bold text-white">Other payouts</h2>
              <ul className="mt-4 divide-y divide-edge/60">
                {looseRewards.map((r) => {
                  const rr = r as typeof r & { player: { characterName: string | null } };
                  return (
                    <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                      <span className="text-slate-200">
                        {rr.player.characterName ?? "A player"} — {r.item}
                        {r.amount ? ` ×${r.amount}` : ""}
                      </span>
                      <span className="text-slate-500">{r.reason}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
