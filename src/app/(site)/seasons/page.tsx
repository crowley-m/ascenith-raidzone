import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Seasons",
  description: "Every RAIDZONE tournament season — brackets, champions and match footage.",
};
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Live",
  UPCOMING: "Upcoming",
  ENDED: "Ended",
};

export default async function SeasonsPage() {
  const seasons = await db.season
    .findMany({
      orderBy: [{ series: "asc" }, { number: "desc" }],
      include: { _count: { select: { events: true, videos: true } } },
    })
    .catch(() => []);

  // group by series
  const bySeries = new Map<string, typeof seasons>();
  for (const s of seasons) {
    const arr = bySeries.get(s.series) ?? [];
    arr.push(s);
    bySeries.set(s.series, arr);
  }

  return (
    <div className="bg-void">
      <div className="container-x py-16">
        <h1 className="font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
          Seasons
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Every RAIDZONE tournament series and the seasons that ran under it — champions, prize
          pools and match footage.
        </p>

        {bySeries.size === 0 && (
          <p className="mt-12 text-sm text-slate-400">No seasons recorded yet.</p>
        )}

        {[...bySeries.entries()].map(([series, list]) => (
          <section key={series} className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ {series}</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/seasons/${s.slug}`}
                    className="group block border border-edge bg-panel/30 p-5 transition hover:border-teal/60"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-lg font-bold text-white">
                        Season {s.number}
                      </span>
                      <span
                        className={`font-mono text-[0.6rem] uppercase tracking-widest ${
                          s.status === "ACTIVE" ? "text-teal" : "text-slate-500"
                        }`}
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </div>
                    {s.championName ? (
                      <p className="mt-2 text-sm text-slate-200">
                        🏆 {s.championName}
                        {s.prizePoolText ? (
                          <span className="text-slate-500"> · {s.prizePoolText}</span>
                        ) : null}
                      </p>
                    ) : s.prizePoolText ? (
                      <p className="mt-2 text-sm text-slate-400">{s.prizePoolText}</p>
                    ) : null}
                    <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-widest text-slate-500">
                      {s._count.events} event{s._count.events === 1 ? "" : "s"} ·{" "}
                      {s._count.videos} video{s._count.videos === 1 ? "" : "s"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
