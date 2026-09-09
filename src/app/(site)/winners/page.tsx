import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { topRaiders } from "@/lib/leaderboard";
import { TopRaiders } from "@/components/top-raiders";
import { GalleryGrid } from "@/components/winners/gallery-grid";
import { PageMasthead } from "@/components/page-masthead";
import { winnersSections, WINNERS_SECTION_LIMIT } from "@/lib/gallery";
import type { RewardTier } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Winners",
  description: "Every RAIDZONE event, who placed, and what they took home.",
};
export const dynamic = "force-dynamic";

const MEDAL = ["1st", "2nd", "3rd", "4th", "5th"];

export default async function WinnersPage() {
  const raiders = await topRaiders(15);
  const sections = await winnersSections();
  const championCount =
    sections.find((s) => s.slug === "champions")?.items.length ?? 0;

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

  const nothing =
    events.length === 0 &&
    looseRewards.length === 0 &&
    raiders.length === 0 &&
    sections.length === 0;

  return (
    <div className="bg-void">
      <PageMasthead
        title="Hall of winners"
        kicker={`The honours — ${championCount} champion${championCount === 1 ? "" : "s"} · ${events.length} event${events.length === 1 ? "" : "s"} settled`}
        lead="Every RAIDZONE event, who placed, and what they took home. Real events, real payouts."
      />
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10">
        {raiders.length > 0 && (
          <section data-reveal className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Top raiders</h2>
            <div className="mt-5 max-w-xl">
              <TopRaiders raiders={raiders} />
            </div>
          </section>
        )}

        {sections.map((s) => (
          <section key={s.slug} data-reveal className="mt-14 border-t border-edge pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="eyebrow">+ {s.title}</h2>
              {s.items.length > WINNERS_SECTION_LIMIT && (
                <Link
                  href={`/winners/${s.slug}`}
                  className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-slate-500 hover:text-teal"
                >
                  View all {s.items.length} →
                </Link>
              )}
            </div>
            <GalleryGrid
              items={s.items}
              limit={WINNERS_SECTION_LIMIT}
              moreHref={`/winners/${s.slug}`}
              moreCount={s.items.length}
            />
          </section>
        ))}

        {nothing ? (
          <p className="mt-12 text-sm text-slate-400">
            No results logged yet — check back after the next event.
          </p>
        ) : (
          <div data-reveal className="mt-14 space-y-12 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Event results</h2>
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
                <section key={e.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl font-bold text-white">
                      <Link href={`/events/${e.id}`} className="hover:text-teal">
                        {e.mode ? `RAIDZONE ${e.mode}` : e.title}
                      </Link>
                    </h3>
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
              <section>
                <h3 className="font-display text-xl font-bold text-white">Other payouts</h3>
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
