import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/page-masthead";
import { factionBoard } from "@/lib/factions";

export const metadata: Metadata = {
  title: "Factions",
  description:
    "The houses of ASCENITH RAIDZONE and the Faction War — rosters, allegiances and the series record.",
};
export const dynamic = "force-dynamic";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

export default async function FactionsPage() {
  const { factions, seasons } = await factionBoard();
  const withMembers = factions.filter((f) => f.memberCount > 0);
  const totalMembers = factions.reduce((n, f) => n + f.memberCount, 0);

  return (
    <div className="bg-void">
      <PageMasthead
        title="Factions"
        kicker={`The houses — ${factions.length} banner${factions.length === 1 ? "" : "s"}${
          seasons.length ? ` · ${seasons.length} Faction War${seasons.length === 1 ? "" : "s"}` : ""
        }`}
        lead="Pick a house and it's your allegiance across every season — separate from the team you enter a given event with. The houses meet head-on in the Faction War."
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10">
        {factions.length === 0 && (
          <p className="mt-8 text-sm text-slate-400">No factions set up yet.</p>
        )}

        {/* the houses */}
        {factions.length > 0 && (
          <section data-reveal className="mt-8 grid gap-5 sm:grid-cols-2">
            {factions.map((f) => (
              <div key={f.id} className="border border-edge bg-panel/40 p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 flex-none rounded-full"
                    style={{ background: f.color ?? "#e5484d" }}
                  />
                  <h2 className="font-poster text-3xl uppercase leading-none text-white">
                    {f.name}
                  </h2>
                  {f.tag && <span className="badge">{f.tag}</span>}
                </div>
                {f.description && (
                  <p className="mt-3 text-sm text-slate-400">{f.description}</p>
                )}
                <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Titles", f.titles],
                    ["Raiders", f.memberCount],
                    ["Podiums", f.gold + f.silver + f.bronze],
                  ].map(([k, v]) => (
                    <div key={k as string} className="border border-edge bg-void/50 py-2">
                      <div className="font-poster text-2xl text-white">{v as number}</div>
                      <div className="text-[0.6rem] uppercase tracking-wide text-slate-500">
                        {k as string}
                      </div>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 font-mono text-[0.66rem] uppercase tracking-wide text-slate-500">
                  {f.hasRole ? "Discord role linked" : "no Discord role"}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* faction war record */}
        {seasons.length > 0 && (
          <section data-reveal className="mt-16">
            <h2 className="eyebrow">+ The Faction War</h2>
            <ul className="mt-5 divide-y divide-edge">
              {seasons.map((s) => (
                <li
                  key={s.slug}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-3"
                >
                  <span className="font-poster text-2xl text-slate-600">S{s.number}</span>
                  <div className="min-w-0">
                    <Link
                      href={`/seasons/${s.slug}`}
                      className="font-display font-bold text-white hover:text-teal"
                    >
                      {s.name ?? `Faction War — Season ${s.number}`}
                    </Link>
                    <p className="mt-0.5 font-mono text-[0.68rem] uppercase tracking-wide text-slate-500">
                      {s.championName ? (
                        <>
                          🏆 {s.championName}
                          {s.status !== "ENDED" && " · in progress"}
                        </>
                      ) : (
                        "champion tbd"
                      )}
                    </p>
                  </div>
                  {s.prizePoolText && (
                    <span className="shrink-0 font-poster text-xl tabular-nums text-white">
                      {s.prizePoolText}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* rosters */}
        {withMembers.map((f, i) => (
          <section key={f.id} data-reveal className="mt-16">
            <div className="flex items-end justify-between gap-6 border-b-2 border-white/20 pb-3">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-slate-600">{ROMAN[i + 1] ?? i + 1}</span>
                <h2 className="font-poster text-3xl uppercase leading-none text-white sm:text-5xl">
                  {f.name}
                </h2>
              </div>
              <span className="shrink-0 pb-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                {f.memberCount} raider{f.memberCount === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="mt-6 divide-y divide-edge/60">
              {f.members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <Link href={`/players/${m.id}`} className="text-slate-100 hover:text-teal">
                    {m.name}
                  </Link>
                  <span className="font-mono text-xs text-slate-500">{m.attended} attended</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {factions.length > 0 && totalMembers === 0 && (
          <p className="mt-10 text-sm text-slate-400">
            No raiders have joined a house yet — pick one on your{" "}
            <Link href="/me/profile" className="link">
              profile
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
