import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { listGuildTextChannels } from "@/lib/discord";
import { BroadcastForm } from "@/components/portal/broadcast-form";
import { BroadcastList } from "@/components/portal/broadcast-list";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  await requirePermission("event:manage");

  const [settings, channels, events, recent] = await Promise.all([
    getSettings(),
    listGuildTextChannels(),
    db.event.findMany({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
      orderBy: { startsAt: "desc" },
      take: 15,
      select: {
        id: true,
        title: true,
        mode: true,
        status: true,
        startsAt: true,
        discordMessageId: true,
        discordCategoryId: true,
      },
    }),
    db.broadcast.findMany({
      orderBy: { postedAt: "desc" },
      take: 15,
      include: { postedBy: { select: { name: true, discordUsername: true } } },
    }),
  ]);

  const channelName = (id: string | null) =>
    id ? (channels.find((c) => c.id === id)?.name ?? id) : null;

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Broadcast</h2>
      <p className="mt-1 text-sm text-slate-400">
        Post a server-wide announcement through the bot. Event announcements are posted from each
        event&apos;s own page when you publish it — this is for everything else (maintenance,
        news, off-schedule notices).
      </p>

      <div className="card mt-6">
        <h3 className="font-display font-bold text-white">Server announcement</h3>
        <div className="mt-4">
          <BroadcastForm
            channels={channels}
            defaultChannelId={settings.announceChannelId}
          />
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <h3 className="label mb-2">Recent broadcasts</h3>
          <BroadcastList
            broadcasts={recent.map((r) => ({
              id: r.id,
              channelName: channelName(r.channelId) ?? r.channelId,
              title: r.title,
              body: r.body,
              asEmbed: r.asEmbed,
              postedBy: r.postedBy.name ?? r.postedBy.discordUsername ?? "staff",
              postedAt: r.postedAt.toISOString(),
              editedAt: r.editedAt ? r.editedAt.toISOString() : null,
            }))}
          />
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-display font-bold text-white">Event announcements</h3>
        <p className="mt-1 text-sm text-slate-400">
          Managed per event. Open one to edit its brief and re-sync its Discord space.
        </p>
        <ul className="mt-3 divide-y divide-edge/60 border border-edge">
          {events.length === 0 && (
            <li className="p-3 text-sm text-slate-400">No published events.</li>
          )}
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <Link
                href={`/portal/events/${e.id}`}
                className="text-slate-200 hover:text-teal"
              >
                {e.mode ? `RAIDZONE ${e.mode}` : e.title}
              </Link>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                {e.discordMessageId ? (
                  <span className="badge border-teal/40 text-teal">announced</span>
                ) : (
                  <span className="badge border-ember/40 text-ember">not announced</span>
                )}
                {e.discordCategoryId && (
                  <span className="badge border-edge text-slate-400">space built</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
