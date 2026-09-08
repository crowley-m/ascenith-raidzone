import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

const STATUS_COPY: Record<string, string> = {
  PENDING: "Pending — a staff member will take a look shortly.",
  ACTIVE: "Active — you're all set for events and rewards.",
  INACTIVE: "Inactive — ping staff in Discord to reactivate.",
  BANNED: "Suspended — contact staff via a ticket.",
};

export default async function MeOverviewPage() {
  const user = await requireUser();

  const player = await db.player.findUnique({
    where: { userId: user.id },
    include: {
      faction: true,
      signups: {
        where: { state: { in: ["SIGNED_UP", "WAITLIST"] }, event: { startsAt: { gte: new Date() } } },
        include: { event: true },
        orderBy: { event: { startsAt: "asc" } },
        take: 5,
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

  const fields = [
    ["Character", player.characterName],
    ["Platform", player.platform],
    ["Region", player.region],
    ["Timezone", player.timezone],
    ["Faction", player.faction?.name],
  ].filter(([, v]) => v);
  const missing = !player.characterName || !player.platform || !player.region;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className={`card ${player.status === "ACTIVE" ? "border-teal/30" : "border-ember/30"}`}>
          <div className="label">Status</div>
          <p className="text-sm text-slate-200">{STATUS_COPY[player.status]}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white">Upcoming events</h2>
            <Link href="/events" className="link text-sm">Browse</Link>
          </div>
          <ul className="mt-3 divide-y divide-edge/60">
            {player.signups.length === 0 && (
              <li className="py-3 text-sm text-slate-400">You&apos;re not signed up for anything yet.</li>
            )}
            {player.signups.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <Link href={`/events/${s.eventId}`} className="text-slate-200 hover:text-teal">
                  {s.event.title}
                </Link>
                <span className="text-slate-500">
                  {fmtDateTime(s.event.startsAt)}
                  {s.state === "WAITLIST" && <span className="ml-2 text-ember">waitlist</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

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
      </div>
    </div>
  );
}
