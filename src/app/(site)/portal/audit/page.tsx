import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const TARGET_HREF: Record<string, (id: string) => string> = {
  Player: (id) => `/portal/players/${id}`,
  Event: (id) => `/portal/events/${id}`,
  Team: (id) => `/portal/teams/${id}`,
  Season: () => `/portal/seasons`,
  Faction: () => `/portal/factions`,
  Reward: () => `/portal/rewards`,
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission("settings:manage");
  const { q, page } = await searchParams;
  const pageN = Math.max(1, Number(page) || 1);
  const take = 100;

  const where = q
    ? {
        OR: [
          { action: { contains: q, mode: "insensitive" as const } },
          { targetType: { contains: q, mode: "insensitive" as const } },
          { actor: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageN - 1) * take,
      take,
      include: { actor: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.ceil(total / take);

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-white">Audit log</h2>
      <p className="mt-1 text-sm text-slate-400">
        Every staff mutation, newest first. {total.toLocaleString()} entries.
      </p>

      <form className="mt-4 flex gap-2" action="/portal/audit">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Filter by action, type or staff name…"
          className="input max-w-sm"
        />
        <button className="btn-ghost" type="submit">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">When</th>
              <th className="py-2">Who</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
              <th className="py-2">Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {rows.map((r) => {
              const href =
                r.targetType && r.targetId && TARGET_HREF[r.targetType]
                  ? TARGET_HREF[r.targetType](r.targetId)
                  : null;
              return (
                <tr key={r.id} className="align-top">
                  <td className="py-2 text-slate-500">{fmtDateTime(r.createdAt)}</td>
                  <td className="py-2 text-slate-300">{r.actor?.name ?? r.actor?.email ?? "system"}</td>
                  <td className="py-2 font-mono text-xs text-teal">{r.action}</td>
                  <td className="py-2 text-slate-400">
                    {r.targetType}
                    {href ? (
                      <Link href={href} className="ml-1 text-slate-500 underline hover:text-teal">
                        open
                      </Link>
                    ) : null}
                  </td>
                  <td className="py-2 font-mono text-[0.7rem] text-slate-500">
                    {r.meta ? JSON.stringify(r.meta) : ""}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-slate-400">
                  Nothing logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {pageN > 1 && (
            <Link
              href={`/portal/audit?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageN - 1) })}`}
              className="link"
            >
              ← Newer
            </Link>
          )}
          <span className="text-slate-500">
            Page {pageN} / {pages}
          </span>
          {pageN < pages && (
            <Link
              href={`/portal/audit?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageN + 1) })}`}
              className="link"
            >
              Older →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
