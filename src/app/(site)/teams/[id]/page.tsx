import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const team = await db.team.findUnique({ where: { id }, select: { name: true } });
    return { title: team ? `${team.name} — Team` : "Team" };
  } catch {
    return { title: "Team" };
  }
}

export default async function PublicTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const team = await db.team.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, title: true, mode: true } },
      leader: { select: { characterName: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: { player: { select: { characterName: true, region: true } } },
      },
      placements: {
        orderBy: { createdAt: "desc" },
        include: { event: { select: { id: true, title: true, mode: true, startsAt: true } } },
      },
    },
  });
  if (!team) notFound();

  const forEvent = team.event
    ? team.event.mode
      ? `RAIDZONE ${team.event.mode}`
      : team.event.title
    : null;

  return (
    <div className="container-x py-16">
      <Link href="/teams" className="link text-xs uppercase tracking-widest">
        &larr; All teams
      </Link>

      <h1 className="mt-4 font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
        {team.tag && <span className="text-teal">[{team.tag}] </span>}
        {team.name}
      </h1>
      <p className="mt-3 text-sm text-slate-400">
        {team.members.length} member{team.members.length === 1 ? "" : "s"} · led by{" "}
        {team.leader.characterName ?? "—"}
        {forEvent && (
          <>
            {" · formed for "}
            {team.event ? (
              <Link href={`/events/${team.event.id}`} className="link">
                {forEvent}
              </Link>
            ) : (
              forEvent
            )}
          </>
        )}
      </p>

      <section className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Roster</h2>
          <ul className="mt-4 divide-y divide-edge/60">
            {team.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-100">{m.player.characterName ?? "Unnamed"}</span>
                <span className="text-xs text-slate-500">{m.player.region ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold text-white">Placements</h2>
          {team.placements.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No podium finishes yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {team.placements.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <Link href={`/events/${p.event.id}`} className="text-slate-200 hover:text-teal">
                    {p.event.mode ? `RAIDZONE ${p.event.mode}` : p.event.title}
                  </Link>
                  <span className="badge border-teal/40 text-teal">
                    {p.rank === 1 ? "1st" : p.rank === 2 ? "2nd" : p.rank === 3 ? "3rd" : `#${p.rank}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="mt-12 text-xs text-slate-600">Formed {fmtDate(team.createdAt)}</p>
    </div>
  );
}
