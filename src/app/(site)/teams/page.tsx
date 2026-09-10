import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageMasthead } from "@/components/page-masthead";

export const metadata: Metadata = {
  title: "Teams",
  description: "The squads competing in ASCENITH RAIDZONE team events.",
};
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  let teams: Awaited<ReturnType<typeof db.team.findMany>> = [];
  try {
    const nowTs = new Date();
    teams = await db.team.findMany({
      where: {
        event: {
          status: "PUBLISHED",
          OR: [{ endsAt: null }, { endsAt: { gte: nowTs } }],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        leader: { select: { characterName: true } },
        event: { select: { title: true, mode: true } },
        _count: { select: { members: true } },
      },
    });
  } catch {
    /* db down — empty */
  }

  return (
    <div className="bg-void">
      <PageMasthead
        title="The squads"
        kicker={`The roster — ${teams.length} team${teams.length === 1 ? "" : "s"} in current events`}
        lead={
          <>
            Teams enter RAIDZONE team events as a unit. Anyone can start one —{" "}
            <Link href="/me/team" className="link">
              create or join a team
            </Link>{" "}
            from your account.
          </>
        }
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-24">
      {teams.length === 0 ? (
        <p className="mt-12 text-sm text-slate-400">
          No teams in a current event. Start one from your account.
        </p>
      ) : (
        <div data-reveal className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const tt = t as typeof t & {
              leader: { characterName: string | null };
              event: { title: string; mode: string | null } | null;
              _count: { members: number };
            };
            const forEvent = tt.event
              ? tt.event.mode
                ? `RAIDZONE ${tt.event.mode}`
                : tt.event.title
              : null;
            return (
              <Link
                key={t.id}
                href={`/teams/${t.id}`}
                className="card block transition hover:border-teal/50"
              >
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
                {forEvent && <p className="mt-1 text-xs text-teal">For {forEvent}</p>}
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
