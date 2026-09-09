import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SeasonVideos } from "@/components/seasons/season-videos";
import type { RewardTier } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await db.season
    .findUnique({ where: { slug }, select: { series: true, number: true } })
    .catch(() => null);
  return { title: s ? `${s.series} — Season ${s.number}` : "Season" };
}

const MEDAL = ["1st", "2nd", "3rd", "4th", "5th"];

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const season = await db.season
    .findUnique({
      where: { slug },
      include: {
        videos: { orderBy: { sortOrder: "asc" } },
        events: {
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
        },
      },
    })
    .catch(() => null);

  if (!season) notFound();

  return (
    <div className="bg-void">
      <div className="container-x py-16">
        <Link href="/seasons" className="link text-xs uppercase tracking-widest">
          &larr; All seasons
        </Link>

        <div className="mt-4">
          <p className="eyebrow">{season.series}</p>
          <h1 className="mt-2 font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
            Season {season.number}
            {season.name ? <span className="text-slate-500"> · {season.name}</span> : null}
          </h1>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {season.championName && (
            <span className="text-slate-200">
              <span className="font-mono text-xs uppercase tracking-widest text-teal">Champion </span>
              {season.championName}
            </span>
          )}
          {season.prizePoolText && (
            <span className="text-slate-200">
              <span className="font-mono text-xs uppercase tracking-widest text-teal">Prize pool </span>
              {season.prizePoolText}
            </span>
          )}
          {(season.startsAt || season.endsAt) && (
            <span className="text-slate-400">
              {season.startsAt ? fmtDate(season.startsAt) : "?"}
              {season.endsAt ? ` – ${fmtDate(season.endsAt)}` : ""}
            </span>
          )}
        </div>

        {season.blurb && <p className="mt-6 max-w-2xl text-slate-300">{season.blurb}</p>}

        {season.posterUrl && (
          <div className="mt-8 max-w-2xl border border-edge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={season.posterUrl}
              alt={`Season ${season.number}${season.championName ? ` — ${season.championName}` : ""}`}
              className="block w-full"
            />
          </div>
        )}

        {season.videos.length > 0 && (
          <section data-reveal className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Match footage</h2>
            <div className="mt-5 max-w-3xl">
              <SeasonVideos
                videos={season.videos.map((v) => ({ id: v.id, url: v.url, title: v.title }))}
              />
            </div>
          </section>
        )}

        {season.events.length > 0 && (
          <section data-reveal className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Events</h2>
            <div className="mt-5 space-y-10">
              {season.events.map((e) => {
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
                  <div key={e.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-white">
                        <Link href={`/events/${e.id}`} className="hover:text-teal">
                          {e.mode ? `RAIDZONE ${e.mode}` : e.title}
                        </Link>
                      </h3>
                      <span className="text-xs text-slate-500">{fmtDate(e.startsAt)}</span>
                    </div>
                    {ev.placements.length > 0 && (
                      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                        {ev.placements.map((p) => (
                          <li
                            key={p.id}
                            className={`border p-3 ${p.rank === 1 ? "border-teal/50" : "border-edge"}`}
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
                              <div className="mt-1 text-sm text-slate-400">
                                {tiers[p.rank - 1].reward}
                              </div>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {season.videos.length === 0 && season.events.length === 0 && (
          <p className="mt-12 text-sm text-slate-400">
            Footage and results for this season are still being added.
          </p>
        )}
      </div>
    </div>
  );
}
