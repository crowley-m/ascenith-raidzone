import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtInZone, DEFAULT_EVENT_TZ } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function PortalEventsPage() {
  const user = await requirePermission("event:view");

  const events = await db.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      _count: { select: { signups: true, attendance: true } },
    },
  });

  // Which event the landing page currently features (same rule as app/page.tsx):
  // an ongoing published event, else the soonest upcoming published one.
  const now = Date.now();
  const published = events
    .filter((e) => e.status === "PUBLISHED")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const featuredId =
    (published.find(
      (e) => e.startsAt.getTime() <= now && (!e.endsAt || e.endsAt.getTime() >= now),
    ) ?? published.find((e) => e.startsAt.getTime() > now))?.id ?? null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Events</h2>
        {can(user.role, "event:manage") && (
          <Link href="/portal/events/new" className="btn-primary">New event</Link>
        )}
      </div>

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
                <td colSpan={5} className="py-6 text-slate-400">No events yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
