import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { topRaiders } from "@/lib/leaderboard";
import { TopRaiders } from "@/components/top-raiders";
import { GalleryGrid, type GalleryItem } from "@/components/winners/gallery-grid";
import type { RewardTier } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Winners",
  description: "Every RAIDZONE event, who placed, and what they took home.",
};
export const dynamic = "force-dynamic";

const MEDAL = ["1st", "2nd", "3rd", "4th", "5th"];

// Event / campaign posters (static art in /public/media).
const CAMPAIGN_POSTERS = [
  { img: "/media/key-art-ascenith.webp", label: "ASCENITH — Rise. Conquer. Ascend." },
  { img: "/media/promo-solo-season-1.webp", label: "Solo Mode · Season 1" },
  { img: "/media/promo-solo-duo.webp", label: "Solo / Duo RaidZone" },
  { img: "/media/poster-boxing-event.webp", label: "Boxing Event — Fight for Glory" },
  { img: "/media/trophy-ascenith.webp", label: "The RaidZone trophy" },
];

export default async function WinnersPage() {
  const raiders = await topRaiders(15);
  const seasons = await db.season
    .findMany({ orderBy: { number: "desc" } })
    .catch(() => []);
  const champions = seasons.filter((s) => s.championName);
  const championItems: GalleryItem[] = champions
    .filter((c) => c.posterUrl)
    .map((c) => ({
      key: c.id,
      src: c.posterUrl as string,
      alt: `Season ${c.number} champion — ${c.championName}`,
      caption: `Season ${c.number} — ${c.championName}`,
    }));

  const proofImages = await db.mediaAsset
    .findMany({
      where: { kind: "proof" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, caption: true, tag: true },
    })
    .catch(() => []);
  const proofItems: GalleryItem[] = proofImages.map((img) => ({
    key: img.id,
    src: `/api/media/${img.id}`,
    alt: img.caption ?? "",
    caption: img.caption ?? null,
  }));

  const campaignItems: GalleryItem[] = CAMPAIGN_POSTERS.map((p) => ({
    key: p.img,
    src: p.img,
    alt: p.label,
    caption: p.label,
  }));

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
    <div className="relative">
      {/* full-bleed page background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-[0.16]"
        style={{ backgroundImage: "url(/media/bg-raidzone.webp)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-void/85 via-void/70 to-void/95"
      />

      <div className="container-x py-16">
        <h1 className="font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
          Hall of winners
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Every RAIDZONE event, who placed, and what they took home. Real events, real payouts.
        </p>

        {championItems.length > 0 && (
          <section className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Season champions</h2>
            <GalleryGrid items={championItems} />
          </section>
        )}

        {raiders.length > 0 && (
          <section className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Top raiders</h2>
            <div className="mt-5 max-w-xl">
              <TopRaiders raiders={raiders} />
            </div>
          </section>
        )}

        {proofItems.length > 0 && (
          <section className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Proof</h2>
            <GalleryGrid items={proofItems} />
          </section>
        )}

        <section className="mt-14 border-t border-edge pt-6">
          <h2 className="eyebrow">+ From the campaign</h2>
          <GalleryGrid items={campaignItems} />
        </section>

      {events.length === 0 &&
      looseRewards.length === 0 &&
      raiders.length === 0 &&
      champions.length === 0 &&
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
    </div>
  );
}
