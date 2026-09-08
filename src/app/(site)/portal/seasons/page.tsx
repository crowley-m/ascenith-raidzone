import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SeasonForm } from "@/components/portal/season-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteSeason } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

const d = (v: Date | null) => (v ? v.toISOString().slice(0, 10) : "");

export default async function SeasonsPage() {
  await requirePermission("event:manage");

  const seasons = await db.season.findMany({
    orderBy: [{ series: "asc" }, { number: "desc" }],
    include: {
      _count: { select: { events: true } },
      videos: { orderBy: { sortOrder: "asc" } },
    },
  });
  const seriesList = [...new Set(seasons.map((s) => s.series))];

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Seasons</h2>
      <p className="mt-1 text-sm text-slate-400">
        Each tournament series has its own seasons. Events link to a season in the event form;
        each season gets a public page at <code>/seasons/&lt;slug&gt;</code>.
      </p>

      <div className="card mt-6">
        <p className="label mb-2">New season</p>
        <SeasonForm seriesList={seriesList} />
      </div>

      <ul className="mt-6 space-y-3">
        {seasons.map((s) => (
          <li key={s.id} className="card">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 list-none">
                <span className="font-display font-bold text-white">
                  {s.series} · S{s.number}
                  {s.name ? ` · ${s.name}` : ""}
                </span>
                <span className="badge">{s.status}</span>
                {s.championName ? (
                  <span className="text-sm text-teal">🏆 {s.championName}</span>
                ) : (
                  <span className="text-xs text-slate-500">no champion yet</span>
                )}
                <span className="text-xs text-slate-500">
                  {s._count.events} event{s._count.events === 1 ? "" : "s"} · {s.videos.length} video
                  {s.videos.length === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/seasons/${s.slug}`}
                  className="text-xs text-slate-500 underline hover:text-teal"
                >
                  /seasons/{s.slug}
                </Link>
              </summary>

              <div className="mt-4 border-t border-edge pt-4">
                <SeasonForm
                  seriesList={seriesList}
                  season={{
                    id: s.id,
                    series: s.series,
                    number: s.number,
                    slug: s.slug,
                    name: s.name,
                    status: s.status,
                    startsAt: d(s.startsAt),
                    endsAt: d(s.endsAt),
                    prizePoolText: s.prizePoolText,
                    championName: s.championName,
                    championNote: s.championNote,
                    posterUrl: s.posterUrl,
                    blurb: s.blurb,
                    videosText: s.videos
                      .map((v) => (v.title ? `${v.url} | ${v.title}` : v.url))
                      .join("\n"),
                  }}
                />
                <div className="mt-3">
                  <ConfirmButton
                    action={deleteSeason.bind(null, s.id)}
                    confirm={`Delete ${s.series} Season ${s.number}? Events stay but lose their season link.`}
                  >
                    Delete season
                  </ConfirmButton>
                </div>
              </div>
            </details>
          </li>
        ))}
        {seasons.length === 0 && <li className="text-sm text-slate-400">No seasons yet.</li>}
      </ul>
    </div>
  );
}
