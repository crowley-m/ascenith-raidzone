import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Seasons",
  description: "Every RAIDZONE tournament season — brackets, champions and match footage.",
};
export const dynamic = "force-dynamic";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export default async function SeasonsPage() {
  const seasons = await db.season
    .findMany({
      orderBy: [{ series: "asc" }, { number: "desc" }],
      include: { _count: { select: { events: true, videos: true } } },
    })
    .catch(() => []);

  const bySeries = new Map<string, typeof seasons>();
  for (const s of seasons) {
    const arr = bySeries.get(s.series) ?? [];
    arr.push(s);
    bySeries.set(s.series, arr);
  }
  const series = [...bySeries.entries()];

  return (
    <div className="bg-void">
      {/* masthead */}
      <header className="border-b border-white/15">
        <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-6">
          <h1 className="font-poster text-[18vw] uppercase leading-[0.82] text-white sm:text-[10rem]">
            Seasons
          </h1>
          <p className="mt-4 font-mono text-[0.7rem] font-bold uppercase tracking-[0.28em] text-slate-400">
            The record — {seasons.length} season{seasons.length === 1 ? "" : "s"} · {series.length}{" "}
            {series.length === 1 ? "series" : "series"}
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-24">
        {series.length === 0 && (
          <p className="mt-16 text-sm text-slate-400">No seasons recorded yet.</p>
        )}

        {series.map(([name, list], i) => (
          <section key={name} data-reveal className="mt-16 first:mt-14">
            {/* series masthead line */}
            <div className="flex items-end justify-between gap-6 border-b-2 border-white/20 pb-3">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-slate-600">{ROMAN[i + 1] ?? i + 1}</span>
                <h2 className="font-poster text-3xl uppercase leading-none text-white sm:text-5xl">
                  {name}
                </h2>
              </div>
              <span className="shrink-0 pb-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                {list.length} season{list.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* season ledger */}
            <ul>
              {list.map((s) => (
                <li key={s.id} className="border-b border-white/10">
                  <Link
                    href={`/seasons/${s.slug}`}
                    className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-1 py-5 sm:grid-cols-[3.5rem_1fr_minmax(0,14rem)_2rem]"
                  >
                    {/* season no. */}
                    <span className="font-poster text-2xl leading-none text-slate-500 group-hover:text-teal sm:text-3xl">
                      S{s.number}
                    </span>

                    {/* champion / meta */}
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg font-bold text-white sm:text-xl">
                        {s.championName ?? (
                          <span className="text-slate-600">— no champion —</span>
                        )}
                        {s.status === "ACTIVE" && (
                          <span className="ml-3 align-middle font-mono text-[0.6rem] uppercase tracking-widest text-teal">
                            ● live
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-500">
                        {s._count.events} event{s._count.events === 1 ? "" : "s"} ·{" "}
                        {s._count.videos} video{s._count.videos === 1 ? "" : "s"}
                        <span className="ml-2 sm:hidden">
                          {s.prizePoolText ? `· ${s.prizePoolText}` : ""}
                        </span>
                      </span>
                    </span>

                    {/* prize — the figure */}
                    <span className="col-start-2 hidden text-right font-poster text-2xl uppercase leading-none text-white tabular-nums sm:col-start-3 sm:block sm:text-3xl">
                      {s.prizePoolText ?? ""}
                    </span>

                    <span className="hidden text-right font-mono text-slate-600 transition group-hover:translate-x-1 group-hover:text-teal sm:block">
                      →
                    </span>
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
