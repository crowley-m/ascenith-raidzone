import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { teamsForPlayer } from "@/lib/team";
import { JoinWipeButton } from "@/components/me/join-wipe-button";
import { DmToggle } from "@/components/me/dm-toggle";

const STATUS_COPY: Record<string, string> = {
  PENDING: "Pending — finish your profile to get set for events and rewards.",
  ACTIVE: "Active — you're all set for events and rewards.",
  INACTIVE: "Inactive — ping staff in Discord to reactivate.",
  BANNED: "Suspended — contact staff via a ticket.",
};

export const dynamic = "force-dynamic";

export default async function MeOverviewPage() {
  const user = await requireUser();
  const now = new Date();

  const player = await db.player.findUnique({
    where: { userId: user.id },
    include: {
      signups: {
        where: {
          state: { in: ["SIGNED_UP", "WAITLIST"] },
          event: { OR: [{ endsAt: null, startsAt: { gte: now } }, { endsAt: { gte: now } }] },
        },
        include: { event: true },
        orderBy: { event: { startsAt: "asc" } },
      },
      rewards: { orderBy: { grantedAt: "desc" }, take: 5 },
      _count: { select: { rewards: true, attendance: true } },
    },
  });

  if (!player) {
    return (
      <div className="card">
        <p className="text-slate-300">You haven&apos;t set up your player profile yet.</p>
        <Link href="/me/profile?new=1" className="btn-primary mt-4">Complete your profile</Link>
      </div>
    );
  }

  const [teams, liveEvents] = await Promise.all([
    teamsForPlayer(player.id),
    db.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        format: "SOLO",
      },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, mode: true, endsAt: true },
    }),
  ]);

  const signedEventIds = new Set(player.signups.map((s) => s.eventId));
  const runningJoinable = liveEvents.filter((e) => !signedEventIds.has(e.id));

  // waitlist position per signup
  const waitlistPos = new Map<string, number>();
  for (const s of player.signups) {
    if (s.state !== "WAITLIST") continue;
    const ahead = await db.eventSignup.count({
      where: { eventId: s.eventId, state: "WAITLIST", createdAt: { lt: s.createdAt } },
    });
    waitlistPos.set(s.id, ahead + 1);
  }

  const running = player.signups.filter(
    (s) => s.event.startsAt <= now && (!s.event.endsAt || s.event.endsAt >= now),
  );
  const upcoming = player.signups.filter((s) => s.event.startsAt > now);

  const fields = [
    ["Character", player.characterName],
    ["In-game ID", player.gameUid],
    ["Platform", player.platform],
    ["Region", player.region],
    ["Timezone", player.timezone],
  ].filter(([, v]) => v);
  const missing =
    !player.characterName || !player.gameUid || !player.platform || !player.region;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className={`card ${player.status === "ACTIVE" ? "border-teal/30" : "border-ember/30"}`}>
          <div className="label">Status</div>
          <p className="text-sm text-slate-200">{STATUS_COPY[player.status]}</p>
        </div>

        {(running.length > 0 || runningJoinable.length > 0) && (
          <div className="card border-teal/30">
            <h2 className="font-display font-bold text-white">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal align-middle" />
              Running now
            </h2>
            <ul className="mt-3 divide-y divide-edge/60">
              {running.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <Link href={`/events/${s.eventId}`} className="text-slate-100 hover:text-teal">
                    {s.event.title}
                  </Link>
                  <span className="text-teal">
                    {s.state === "WAITLIST"
                      ? `waitlist #${waitlistPos.get(s.id) ?? "?"}`
                      : "you're in"}
                  </span>
                </li>
              ))}
              {runningJoinable.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <Link href={`/events/${e.id}`} className="text-slate-200 hover:text-teal">
                    {e.mode ? `RAIDZONE ${e.mode}` : e.title}
                  </Link>
                  <JoinWipeButton eventId={e.id} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white">Upcoming events</h2>
            <Link href="/events" className="link text-sm">Browse</Link>
          </div>
          <ul className="mt-3 divide-y divide-edge/60">
            {upcoming.length === 0 && (
              <li className="py-3 text-sm text-slate-400">
                You&apos;re not signed up for anything upcoming.
              </li>
            )}
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <Link href={`/events/${s.eventId}`} className="text-slate-200 hover:text-teal">
                  {s.event.title}
                </Link>
                <span className="text-slate-500">
                  {fmtDateTime(s.event.startsAt)}
                  {s.state === "WAITLIST" && (
                    <span className="ml-2 text-ember">waitlist #{waitlistPos.get(s.id) ?? "?"}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {teams.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-white">Your teams</h2>
              <Link href="/me/team" className="link text-sm">Manage</Link>
            </div>
            <ul className="mt-3 divide-y divide-edge/60">
              {teams.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="text-slate-100">
                    {t.tag ? `[${t.tag}] ` : ""}
                    {t.name}
                    {t.leaderId === player.id && (
                      <span className="badge ml-2 border-teal/40 text-teal">Leader</span>
                    )}
                  </span>
                  <span className="text-slate-500">
                    {t.event.mode ? `RAIDZONE ${t.event.mode}` : t.event.title} · {t.members.length}p
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white">Recent rewards</h2>
            <Link href="/me/rewards" className="link text-sm">All ({player._count.rewards})</Link>
          </div>
          <ul className="mt-3 divide-y divide-edge/60">
            {player.rewards.length === 0 && (
              <li className="py-3 text-sm text-slate-400">No rewards logged yet.</li>
            )}
            {player.rewards.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <span className="text-teal">{r.item}{r.amount ? ` ×${r.amount}` : ""}</span>
                <span className="text-slate-500"> — {r.reason}</span>
                {r.receivedAt && <span className="ml-2 text-xs text-teal">✓ received</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white">Profile</h2>
            <Link href="/me/profile" className="link text-sm">Edit</Link>
          </div>
          {missing && (
            <p className="mt-2 text-xs text-ember">Some key fields are missing — staff need these.</p>
          )}
          <dl className="mt-3 space-y-2 text-sm">
            {fields.map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right text-slate-200">{v as string}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card">
          <dl className="grid grid-cols-2 gap-3 text-center">
            <div>
              <dd className="font-display text-2xl font-bold text-white">{player._count.attendance}</dd>
              <dt className="text-xs text-slate-500">events attended</dt>
            </div>
            <div>
              <dd className="font-display text-2xl font-bold text-white">{player._count.rewards}</dd>
              <dt className="text-xs text-slate-500">rewards</dt>
            </div>
          </dl>
        </div>

        <div className="card">
          <div className="label mb-3">Notifications</div>
          <DmToggle initial={player.dmNotifications} />
          <p className="mt-2 text-xs text-slate-500">
            Waitlist promotions, event reminders and reward confirmations, sent to your Discord DMs.
          </p>
        </div>
      </div>
    </div>
  );
}
