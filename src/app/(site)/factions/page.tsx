import type { Metadata } from "next";
import Link from "next/link";
import { PageMasthead } from "@/components/page-masthead";
import { factionBoard } from "@/lib/factions";

export const metadata: Metadata = {
  title: "Factions",
  description:
    "The factions of ASCENITH RAIDZONE — rosters and standings across every event.",
};
export const dynamic = "force-dynamic";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

export default async function FactionsPage() {
  const factions = await factionBoard();
  const active = factions.filter((f) => f.memberCount > 0);
  const totalMembers = factions.reduce((n, f) => n + f.memberCount, 0);

  return (
    <div className="bg-void">
      <PageMasthead
        title="Factions"
        kicker={`The banners — ${active.length} faction${active.length === 1 ? "" : "s"} · ${totalMembers} raider${totalMembers === 1 ? "" : "s"}`}
        lead="Every raider flies a banner. Podiums and attendance across all events roll up to the faction — this is where they stand."
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10">
        {factions.length === 0 && (
          <p className="mt-8 text-sm text-slate-400">No factions yet.</p>
        )}

        {/* standings */}
        {active.length > 0 && (
          <section data-reveal className="mt-8">
            <h2 className="eyebrow">+ Standings</h2>
            <ol className="mt-5 space-y-3">
              {active.map((f, i) => (
                <li
                  key={f.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-edge pb-3"
                >
                  <span className="font-poster text-2xl text-slate-600">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 flex-none rounded-full"
                        style={{ background: f.color ?? "#e5484d" }}
                      />
                      <span className="truncate font-display text-lg font-bold text-white">
                        {f.name}
                      </span>
                      {f.tag && <span className="badge">{f.tag}</span>}
                    </div>
                    <p className="mt-0.5 font-mono text-[0.68rem] uppercase tracking-wide text-slate-500">
                      {f.memberCount} raider{f.memberCount === 1 ? "" : "s"} · {f.gold}·{f.silver}·
                      {f.bronze} podiums · {f.attended} attended
                    </p>
                  </div>
                  <span className="font-poster text-3xl tabular-nums text-white">{f.score}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* rosters */}
        {active.map((f, i) => (
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

            {f.description && (
              <p className="mt-4 max-w-2xl text-sm text-slate-400">{f.description}</p>
            )}

            <ul className="mt-6 divide-y divide-edge/60">
              {f.members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <Link href={`/players/${m.id}`} className="text-slate-100 hover:text-teal">
                    {m.name}
                  </Link>
                  <span className="font-mono text-xs text-slate-500">
                    {m.gold + m.silver + m.bronze > 0 && (
                      <span className="text-teal">
                        {m.gold}·{m.silver}·{m.bronze} podium
                        {" · "}
                      </span>
                    )}
                    {m.attended} attended
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {active.length === 0 && factions.length > 0 && (
          <p className="mt-8 text-sm text-slate-400">
            Factions are set up, but no raiders have been assigned yet.
          </p>
        )}
      </div>
    </div>
  );
}
