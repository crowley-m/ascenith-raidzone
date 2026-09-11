import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { EventForm } from "@/components/portal/event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requirePermission("event:manage");
  const [seasons, settings] = await Promise.all([
    db.season.findMany({
      orderBy: [{ series: "asc" }, { number: "desc" }],
      select: { id: true, series: true, number: true, name: true },
    }),
    getSettings(),
  ]);
  return (
    <div>
      <Link href="/portal/events" className="text-sm text-slate-500 hover:text-white">← Events</Link>
      <h2 className="mt-3 font-display text-xl font-bold text-white">New event</h2>
      <p className="mt-1 text-sm text-slate-400">
        Save as draft first, or publish straight away to announce it in Discord.
      </p>
      <div className="mt-6">
        <EventForm seasons={seasons} defaultChannels={settings.eventChannels} />
      </div>
    </div>
  );
}
