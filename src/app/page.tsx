import { Landing } from "@/components/landing/Landing";
import type { OpEvent } from "@/components/landing/EventBrief";
import { db } from "@/lib/db";
import { latestVideos } from "@/lib/youtube";
import { guildPresence } from "@/lib/discord";

/** Shown when the DB has no published event yet (local dev, or before staff add one). */
const FALLBACK_EVENT: OpEvent = {
  id: "",
  title: "RAIDZONE Purge",
  server: "ASCENITH-01",
  startsAt: "2026-08-28T09:30:00+08:00",
  endsAt: "2026-09-10T23:59:00+08:00",
  maxSlots: null,
  signups: 0,
  rewardPoolText: "90K Crystgen total",
  summary:
    "No rules, no limits — a normal RaidZone wipe with PvP and raiding fully allowed. Top 3 on the Glory Points leaderboard split the pool.",
  mode: "PURGE",
  wipeCycle: "2 weeks",
  raidWindow: "6:00 PM – 12:00 AM GMT+8 · 6 hrs/day",
  rewardTiers: [
    { place: "1st", reward: "30K Crystgen" },
    { place: "2nd", reward: "25K Crystgen" },
    { place: "3rd", reward: "15K Crystgen" },
  ],
  bonusText: "20K Crystgen · hidden across airdrops, cards & alpha boss",
};

// re-fetch the current op at most once a minute; the client ticker handles seconds
export const revalidate = 60;

async function currentOp(): Promise<OpEvent | null> {
  const now = new Date();
  let events: Awaited<ReturnType<typeof db.event.findMany>> = [];
  try {
    events = await db.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { signups: true } } },
    });
  } catch {
    return null;
  }

  const withCount = events as Array<
    (typeof events)[number] & { _count: { signups: number } }
  >;
  const ongoing = withCount.find(
    (e) => e.startsAt <= now && (!e.endsAt || e.endsAt >= now),
  );
  const upcoming = withCount.find((e) => e.startsAt > now);
  const e = ongoing ?? upcoming;
  if (!e) return null;

  return {
    id: e.id,
    title: e.title,
    server: e.server,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    maxSlots: e.maxSlots,
    signups: e._count.signups,
    rewardPoolText: e.rewardPoolText,
    summary: e.summary,
    mode: e.mode,
    wipeCycle: e.wipeCycle,
    raidWindow: e.raidWindow,
    rewardTiers: Array.isArray(e.rewardTiers)
      ? (e.rewardTiers as Array<{ place: string; reward: string }>)
      : [],
    bonusText: e.bonusText,
  };
}

export default async function HomePage() {
  const [event, videos, presence] = await Promise.all([
    currentOp(),
    latestVideos(9),
    guildPresence(),
  ]);
  return (
    <Landing
      event={event ?? FALLBACK_EVENT}
      videos={videos}
      discordOnline={presence?.online ?? null}
    />
  );
}
