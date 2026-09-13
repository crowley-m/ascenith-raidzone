import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { guessEventForReason } from "@/lib/reward-match";
import { RewardForm } from "@/components/portal/reward-form";
import { RewardLogTable } from "@/components/portal/reward-log-table";
import { DisputeActions } from "@/components/portal/dispute-actions";

export const dynamic = "force-dynamic";

export default async function PortalRewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  const user = await requirePermission("reward:view");
  const canGrant = can(user.role, "reward:grant");

  const [rewards, disputed, players, eventsRaw] = await Promise.all([
    db.reward.findMany({
      where: eventId ? { eventId } : undefined,
      orderBy: { grantedAt: "desc" },
      take: 100,
      include: {
        player: { select: { id: true, characterName: true } },
        event: { select: { title: true } },
        grantedBy: { select: { name: true, email: true } },
      },
    }),
    db.reward.findMany({
      where: { disputedAt: { not: null } },
      orderBy: { disputedAt: "desc" },
      include: {
        player: { select: { id: true, characterName: true, gameUid: true } },
        event: { select: { title: true } },
      },
    }),
    canGrant
      ? db.player.findMany({
          where: { status: { not: "BANNED" } },
          orderBy: { characterName: "asc" },
          select: { id: true, characterName: true, gameUid: true, user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    db.event.findMany({
      orderBy: { startsAt: "desc" },
      take: 50,
      select: { id: true, title: true, startsAt: true },
    }),
  ]);

  // Most likely-relevant first: already-happened events (most recent first), then upcoming (soonest first).
  const now = Date.now();
  const events = [...eventsRaw].sort((a, b) => {
    const aPast = a.startsAt.getTime() <= now;
    const bPast = b.startsAt.getTime() <= now;
    if (aPast !== bPast) return aPast ? -1 : 1;
    return aPast ? b.startsAt.getTime() - a.startsAt.getTime() : a.startsAt.getTime() - b.startsAt.getTime();
  });

  const rewardRows = rewards.map((r) => ({
    id: r.id,
    playerId: r.player.id,
    playerName: r.player.characterName ?? "Unnamed",
    item: r.item,
    amount: r.amount,
    reason: r.reason,
    isPublic: r.isPublic,
    received: !!r.receivedAt,
    disputed: !!r.disputedAt,
    eventId: r.eventId,
    eventTitle: r.event?.title ?? null,
    guessedEventTitle: r.event ? null : (guessEventForReason(r.reason, events)?.title ?? null),
    grantedByName: r.grantedBy.name ?? r.grantedBy.email ?? "",
    grantedAtLabel: fmtDate(r.grantedAt),
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {disputed.length > 0 && (
          <div className="mb-6 border border-ember/50 bg-ember/5 p-4">
            <h3 className="font-display font-bold text-ember">
              Reported missing ({disputed.length})
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Players say these never arrived in-game. Re-send the item, then clear the flag.
            </p>
            <ul className="mt-3 divide-y divide-edge/60 text-sm">
              {disputed.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <Link
                      href={`/portal/players/${r.player.id}`}
                      className="text-slate-100 hover:text-teal"
                    >
                      {r.player.characterName ?? "Unnamed"}
                    </Link>
                    {r.player.gameUid && (
                      <span className="text-slate-500"> · UID {r.player.gameUid}</span>
                    )}
                    <span className="text-teal">
                      {" "}
                      — {r.item}
                      {r.amount ? ` ×${r.amount}` : ""}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {r.reason}
                      {r.event ? ` · ${r.event.title}` : ""} · flagged {fmtDate(r.disputedAt!)}
                    </span>
                  </span>
                  {canGrant && <DisputeActions rewardId={r.id} playerId={r.player.id} />}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold text-white">Reward log</h2>
          <form action="/portal/rewards" className="ml-auto flex items-center gap-2">
            <select name="eventId" defaultValue={eventId ?? ""} className="input w-auto py-1 text-xs">
              <option value="">All events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            <button type="submit" className="btn-ghost text-xs">Filter</button>
          </form>
          <Link
            href={`/portal/rewards/export${eventId ? `?eventId=${eventId}` : ""}`}
            prefetch={false}
            className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:text-teal"
          >
            ↓ Export CSV
          </Link>
        </div>
        {eventId && (
          <p className="mt-1 text-xs text-slate-500">
            Showing only {events.find((e) => e.id === eventId)?.title ?? "this event"} —{" "}
            <Link href="/portal/rewards" className="text-teal hover:text-cream">clear filter</Link>
          </p>
        )}
        <div className="mt-4">
          <RewardLogTable
            rewards={rewardRows}
            events={events.map((e) => ({ id: e.id, label: e.title }))}
            canGrant={canGrant}
          />
        </div>
      </div>

      {canGrant && (
        <div className="card lg:sticky lg:top-24 lg:self-start">
          <h3 className="font-display font-bold text-white">Log a reward</h3>
          <div className="mt-3">
            <RewardForm
              players={players.map((p) => ({
                id: p.id,
                label: `${p.characterName ?? "Unnamed"}${p.gameUid ? ` · UID ${p.gameUid}` : " · no UID"}`,
              }))}
              events={events.map((e) => ({ id: e.id, label: e.title }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
