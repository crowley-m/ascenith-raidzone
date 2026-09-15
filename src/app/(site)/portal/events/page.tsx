import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtInZone, DEFAULT_EVENT_TZ } from "@/lib/tz";
import type { Prisma, EventStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: EventStatus[] = ["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"];

export default async function PortalEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const user = await requirePermission("event:view");
  const { status, q, page } = await searchParams;
  const pageN = Math.max(1, Number(page) || 1);
  const take = 100;

  const where: Prisma.EventWhereInput = {};
  if (status && STATUSES.includes(status as EventStatus)) where.status = status as EventStatus;
  if (q) where.title = { contains: q, mode: "insensitive" };

  const [events, matched, counts, published] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip: (pageN - 1) * take,
      take,
      include: {
        _count: { select: { signups: true, attendance: true } },
      },
    }),
    db.event.count({ where }),
    db.event.groupBy({ by: ["status"], _count: true }),
    // unrestricted by this page's own filter/pagination — always the full
    // published set, since "which event is featured" doesn't depend on
    // what staff happen to be searching/filtering for right now
    db.event.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + (typeof c._count === "number" ? c._count : 0), 0);
  const pages = Math.ceil(matched / take);
  const pageHref = (n: number) =>
    `/portal/events?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      page: String(n),
    })}`;

  // Which event the landing page currently features (same rule as app/page.tsx):
  // an ongoing published event, else the soonest upcoming published one.
  const now = Date.now();
  const featuredId =
    (published.find(
      (e) => e.startsAt.getTime() <= now && (!e.endsAt || e.endsAt.getTime() >= now),
    ) ?? published.find((e) => e.startsAt.getTime() > now))?.id ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-white">Events</h2>
        <span className="text-sm text-slate-500">
          {matched > take
            ? `${(pageN - 1) * take + 1}–${(pageN - 1) * take + events.length} of ${matched}`
            : `${events.length} shown`}
        </span>
        {can(user.role, "event:manage") && (
          <Link href="/portal/events/new" className="btn-primary ml-auto">New event</Link>
        )}
      </div>

      <nav className="mt-3 flex flex-wrap gap-2 text-xs">
        {[
          { k: "", label: `All ${total}` },
          { k: "PUBLISHED", label: `Published ${countFor("PUBLISHED")}` },
          { k: "DRAFT", label: `Draft ${countFor("DRAFT")}` },
          { k: "COMPLETED", label: `Completed ${countFor("COMPLETED")}` },
          { k: "CANCELLED", label: `Cancelled ${countFor("CANCELLED")}` },
        ].map((t) => (
          <Link
            key={t.k}
            href={t.k ? `/portal/events?status=${t.k}` : "/portal/events"}
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

      <form className="mt-4 flex flex-wrap gap-2" action="/portal/events">
        <input name="q" defaultValue={q ?? ""} placeholder="Search title…" className="input max-w-xs" />
        <button className="btn-ghost" type="submit">Filter</button>
        {(q || status) && (
          <Link href="/portal/events" className="btn-ghost">Clear</Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Title</th>
              <th className="py-2">Starts</th>
              <th className="py-2">Status</th>
              <th className="py-2">Signups</th>
              <th className="py-2">Attended</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-panel/40">
                <td className="py-3">
                  <Link href={`/portal/events/${e.id}`} className="font-medium text-slate-100 hover:text-teal">
                    {e.title}
                  </Link>
                  {e.id === featuredId && (
                    <span className="ml-2 badge border-teal/40 text-teal">On landing</span>
                  )}
                </td>
                <td className="py-3 text-slate-400">
                  {fmtInZone(e.startsAt, e.timezone ?? DEFAULT_EVENT_TZ)}
                </td>
                <td className="py-3">
                  <span
                    className={`badge ${
                      e.status === "PUBLISHED"
                        ? "border-teal/40 text-teal"
                        : e.status === "CANCELLED"
                          ? "border-red-500/40 text-red-300"
                          : "border-ember/40 text-ember"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="py-3 text-slate-400">{e._count.signups}</td>
                <td className="py-3 text-slate-400">{e._count.attendance}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-slate-400">
                  {q || status ? "No events match." : "No events yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {pageN > 1 && (
            <Link href={pageHref(pageN - 1)} className="link">← Newer</Link>
          )}
          <span className="text-slate-500">Page {pageN} / {pages}</span>
          {pageN < pages && (
            <Link href={pageHref(pageN + 1)} className="link">Older →</Link>
          )}
        </div>
      )}
    </div>
  );
}
