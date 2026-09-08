import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import type { Prisma, PlayerStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: PlayerStatus[] = ["PENDING", "ACTIVE", "INACTIVE", "BANNED"];

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requirePermission("player:view");
  const { status, q } = await searchParams;

  const where: Prisma.PlayerWhereInput = {};
  if (status && STATUSES.includes(status as PlayerStatus)) where.status = status as PlayerStatus;
  if (q) {
    where.OR = [
      { characterName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { discordUsername: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [players, counts] = await Promise.all([
    db.player.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        user: { select: { email: true, discordUsername: true } },
        faction: { select: { name: true } },
        _count: { select: { rewards: true } },
      },
    }),
    db.player.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + (typeof c._count === "number" ? c._count : 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-white">Players</h2>
        <span className="text-sm text-slate-500">{players.length} shown</span>
        <Link
          href="/portal/players/export"
          prefetch={false}
          className="ml-auto font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:text-teal"
        >
          ↓ Export CSV
        </Link>
      </div>

      <nav className="mt-3 flex flex-wrap gap-2 text-xs">
        {[
          { k: "", label: `All ${total}` },
          { k: "ACTIVE", label: `Active ${countFor("ACTIVE")}` },
          { k: "PENDING", label: `Pending ${countFor("PENDING")}` },
          { k: "INACTIVE", label: `Inactive ${countFor("INACTIVE")}` },
          { k: "BANNED", label: `Banned ${countFor("BANNED")}` },
        ].map((t) => (
          <Link
            key={t.k}
            href={t.k ? `/portal/players?status=${t.k}` : "/portal/players"}
            className={`border px-3 py-1 uppercase tracking-wide ${
              (status ?? "") === t.k
                ? "border-teal text-teal"
                : "border-edge text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <form className="mt-4 flex flex-wrap gap-2" action="/portal/players">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email, Discord…"
          className="input max-w-xs"
        />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[10rem]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn-ghost" type="submit">Filter</button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Character</th>
              <th className="py-2">Contact</th>
              <th className="py-2">Platform</th>
              <th className="py-2">Faction</th>
              <th className="py-2">Status</th>
              <th className="py-2">Rewards</th>
              <th className="py-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {players.map((p) => (
              <tr key={p.id} className="hover:bg-panel/40">
                <td className="py-3">
                  <Link href={`/portal/players/${p.id}`} className="font-medium text-slate-100 hover:text-teal">
                    {p.characterName ?? "Unnamed"}
                  </Link>
                </td>
                <td className="py-3 text-slate-400">{p.user.discordUsername ?? p.user.email ?? "—"}</td>
                <td className="py-3 text-slate-400">{p.platform ?? "—"}</td>
                <td className="py-3 text-slate-400">{p.faction?.name ?? "—"}</td>
                <td className="py-3">
                  <span
                    className={`badge ${
                      p.status === "ACTIVE"
                        ? "border-teal/40 text-teal"
                        : p.status === "BANNED"
                          ? "border-red-500/40 text-red-300"
                          : "border-ember/40 text-ember"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="py-3 text-slate-400">{p._count.rewards}</td>
                <td className="py-3 text-slate-500">{fmtDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {players.length === 0 && <p className="py-6 text-sm text-slate-400">No players match.</p>}
      </div>
    </div>
  );
}
