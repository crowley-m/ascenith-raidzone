import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Teams",
  description: "The squads competing in ASCENITH RAIDZONE team events.",
};
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  let teams: Awaited<ReturnType<typeof db.team.findMany>> = [];
  try {
    teams = await db.team.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        leader: { select: { characterName: true } },
        _count: { select: { members: true } },
      },
    });
  } catch {
    /* db down — empty */
  }

  return (
    <div className="container-x py-16">
      <p className="eyebrow">{"// teams"}</p>
      <h1 className="mt-2 font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
        The squads
      </h1>
      <p className="mt-4 max-w-2xl text-slate-300">
        Teams enter RAIDZONE team events as a unit. Anyone can start one —{" "}
        <Link href="/me/team" className="link">
          create or join a team
        </Link>{" "}
        from your account.
      </p>

      {teams.length === 0 ? (
        <p className="mt-12 text-sm text-slate-400">No teams yet. Be the first.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const tt = t as typeof t & {
              leader: { characterName: string | null };
              _count: { members: number };
            };
            return (
              <div key={t.id} className="card">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-white">
                    {t.tag && <span className="text-teal">[{t.tag}] </span>}
                    {t.name}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {tt._count.members} member{tt._count.members === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Led by {tt.leader.characterName ?? "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
