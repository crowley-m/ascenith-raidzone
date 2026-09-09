import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const MEDAL = ["1st", "2nd", "3rd", "4th", "5th"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await db.player
    .findUnique({ where: { id }, select: { characterName: true } })
    .catch(() => null);
  return { title: p?.characterName ?? "Raider" };
}

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await db.player
    .findUnique({
      where: { id },
      select: {
        id: true,
        characterName: true,
        region: true,
        platform: true,
        status: true,
        joinedAt: true,
        faction: { select: { name: true, tag: true } },
        teamsLed: { select: { id: true, name: true, tag: true, event: { select: { title: true, mode: true } } } },
        teamMemberships: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                leaderId: true,
                event: { select: { title: true, mode: true } },
              },
            },
          },
        },
        placements: {
          orderBy: { rank: "asc" },
          select: {
            id: true,
            rank: true,
            event: { select: { id: true, title: true, mode: true, startsAt: true } },
          },
        },
        participation: {
          orderBy: { playedAt: "desc" },
          select: { id: true, eventId: true, eventName: true, eventMode: true, playedAt: true },
        },
        _count: { select: { attendance: true } },
      },
    })
    .catch(() => null);

  if (!player || player.status === "BANNED" || !player.characterName) notFound();

  const teams = [
    ...player.teamsLed.map((t) => ({ ...t, lead: true })),
    ...player.teamMemberships
      .map((m) => m.team)
      .filter((t) => t.leaderId !== player.id)
      .map((t) => ({ id: t.id, name: t.name, tag: t.tag, event: t.event, lead: false })),
  ];

  const podiums = player.placements.filter((p) => p.rank <= 3);

  return (
    <div className="bg-void">
      <div className="container-x py-16">
        <p className="eyebrow">Raider</p>
        <h1 className="mt-2 font-poster text-5xl uppercase leading-[0.95] text-white sm:text-6xl">
          {player.characterName}
        </h1>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
          {player.region && <span>{player.region}</span>}
          {player.platform && <span>{player.platform}</span>}
          {player.faction && (
            <span>
              {player.faction.tag ? `[${player.faction.tag}] ` : ""}
              {player.faction.name}
            </span>
          )}
          <span>joined {fmtDate(player.joinedAt)}</span>
        </p>

        <div className="mt-10 grid grid-cols-3 gap-4 sm:max-w-md">
          {[
            { k: "Podiums", v: podiums.length },
            { k: "Events placed", v: player.placements.length },
            { k: "Attended", v: player._count.attendance },
          ].map((s) => (
            <div key={s.k} className="border border-edge bg-panel/40 py-4 text-center">
              <div className="font-poster text-3xl text-white tabular-nums">{s.v}</div>
              <div className="mt-1 text-[0.6rem] uppercase tracking-wide text-slate-500">{s.k}</div>
            </div>
          ))}
        </div>

        {teams.length > 0 && (
          <section className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Teams</h2>
            <ul className="mt-4 divide-y divide-edge/60">
              {teams.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <Link href={`/teams/${t.id}`} className="text-slate-100 hover:text-teal">
                    {t.tag ? `[${t.tag}] ` : ""}
                    {t.name}
                    {t.lead && <span className="badge ml-2 border-teal/40 text-teal">Leader</span>}
                  </Link>
                  <span className="text-slate-500">
                    {t.event.mode ? `RAIDZONE ${t.event.mode}` : t.event.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {player.placements.length > 0 && (
          <section className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Results</h2>
            <ul className="mt-4 divide-y divide-edge/60">
              {player.placements.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <Link href={`/events/${p.event.id}`} className="text-slate-100 hover:text-teal">
                    {p.event.mode ? `RAIDZONE ${p.event.mode}` : p.event.title}
                  </Link>
                  <span className="font-mono text-xs uppercase tracking-wide text-teal">
                    {MEDAL[p.rank - 1] ?? `#${p.rank}`} · {fmtDate(p.event.startsAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {player.participation.length > 0 && (
          <section className="mt-14 border-t border-edge pt-6">
            <h2 className="eyebrow">+ Events competed in</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {player.participation.map((c) => {
                const label = c.eventMode ? `RAIDZONE ${c.eventMode}` : c.eventName;
                return c.eventId ? (
                  <li key={c.id}>
                    <Link
                      href={`/events/${c.eventId}`}
                      className="badge border-edge hover:border-teal/50"
                    >
                      {label}
                    </Link>
                  </li>
                ) : (
                  <li key={c.id} className="badge border-edge text-slate-300">
                    {label}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {teams.length === 0 &&
          player.placements.length === 0 &&
          player.participation.length === 0 && (
            <p className="mt-12 text-sm text-slate-400">No tournament history yet.</p>
          )}
      </div>
    </div>
  );
}
