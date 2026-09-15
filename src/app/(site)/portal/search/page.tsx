import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const TAKE = 15;

export default async function PortalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("player:view");
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <div>
        <h2 className="font-display text-xl font-bold text-white">Search</h2>
        <p className="mt-2 text-sm text-slate-400">
          Type a name, UID, Discord handle, email, team, or event into the search box above.
        </p>
      </div>
    );
  }

  const contains = { contains: query, mode: "insensitive" as const };

  const [players, teams, events] = await Promise.all([
    db.player.findMany({
      where: {
        OR: [
          { characterName: contains },
          { gameUid: contains },
          { user: { discordUsername: contains } },
          { user: { email: contains } },
        ],
      },
      orderBy: { characterName: "asc" },
      take: TAKE,
      include: { user: { select: { discordUsername: true, email: true } } },
    }),
    db.team.findMany({
      where: { OR: [{ name: contains }, { tag: contains }] },
      orderBy: { createdAt: "desc" },
      take: TAKE,
      include: { event: { select: { title: true, mode: true } } },
    }),
    db.event.findMany({
      where: { OR: [{ title: contains }, { mode: contains }] },
      orderBy: { startsAt: "desc" },
      take: TAKE,
      select: { id: true, title: true, mode: true, status: true, startsAt: true },
    }),
  ]);

  const nothing = players.length === 0 && teams.length === 0 && events.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-white">
          Search <span className="text-slate-400">&ldquo;{query}&rdquo;</span>
        </h2>
        {nothing && <p className="mt-2 text-sm text-slate-400">No matches.</p>}
      </div>

      {players.length > 0 && (
        <div>
          <h3 className="label mb-2">Players ({players.length})</h3>
          <ul className="divide-y divide-edge/60 border border-edge">
            {players.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <Link href={`/portal/players/${p.id}`} className="text-slate-100 hover:text-teal">
                  {p.characterName ?? "Unnamed"}
                </Link>
                <span className="text-xs text-slate-400">
                  {p.gameUid ? `UID ${p.gameUid}` : "no UID"}
                  {p.user.discordUsername ? ` · @${p.user.discordUsername}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {teams.length > 0 && (
        <div>
          <h3 className="label mb-2">Teams ({teams.length})</h3>
          <ul className="divide-y divide-edge/60 border border-edge">
            {teams.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <Link href={`/portal/teams/${t.id}`} className="text-slate-100 hover:text-teal">
                  {t.tag && <span className="text-teal">[{t.tag}] </span>}
                  {t.name}
                </Link>
                <span className="text-xs text-slate-400">
                  {t.event.mode ? `RAIDZONE ${t.event.mode}` : t.event.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <h3 className="label mb-2">Events ({events.length})</h3>
          <ul className="divide-y divide-edge/60 border border-edge">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <Link href={`/portal/events/${e.id}`} className="text-slate-100 hover:text-teal">
                  {e.mode ? `RAIDZONE ${e.mode}` : e.title}
                </Link>
                <span className="text-xs text-slate-400">
                  {e.status} · {fmtDate(e.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
