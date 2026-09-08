import { Landing } from "@/components/landing/Landing";
import type { OpEvent, UpcomingOp } from "@/components/landing/EventBrief";
import type { GalleryImage } from "@/components/landing/Gallery";
import { db } from "@/lib/db";
import { latestVideos } from "@/lib/youtube";
import { getSettings } from "@/lib/settings";

/** Shown when the DB has no published event yet (local dev, or before staff add one). */
const FALLBACK_EVENT: OpEvent = {
  id: "",
  title: "RAIDZONE Purge",
  server: "ASCENITH-01",
  startsAt: "2026-08-28T09:30:00+08:00",
  endsAt: "2026-09-10T23:59:00+08:00",
  maxSlots: null,
  signups: 0,
  rewardPoolText: "90K Crystgin total",
  summary:
    "No rules, no limits — a normal RaidZone wipe with PvP and raiding fully allowed. Top 3 on the Glory Points leaderboard split the pool.",
  mode: "PURGE",
  wipeCycle: "2 weeks",
  raidWindow: "6:00 PM – 12:00 AM GMT+8 · 6 hrs/day",
  rewardTiers: [
    { place: "1st", reward: "30K Crystgin" },
    { place: "2nd", reward: "25K Crystgin" },
    { place: "3rd", reward: "15K Crystgin" },
  ],
  bonusText: "20K Crystgin · hidden across airdrops, cards & alpha boss",
  howToJoinVideoUrl: null,
  seasonNumber: 1,
  seasonName: null,
};

// re-fetch the current op at most once a minute; the client ticker handles seconds
export const revalidate = 60;

async function eventData(): Promise<{ current: OpEvent | null; upcoming: UpcomingOp[] }> {
  const now = new Date();
  let events: Awaited<ReturnType<typeof db.event.findMany>> = [];
  try {
    events = await db.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { startsAt: "asc" },
      include: {
        _count: { select: { signups: true } },
        season: { select: { number: true, name: true } },
      },
    });
  } catch {
    return { current: null, upcoming: [] };
  }

  const withCount = events as Array<
    (typeof events)[number] & {
      _count: { signups: number };
      season: { number: number; name: string | null } | null;
    }
  >;
  const ongoing = withCount.find(
    (e) => e.startsAt <= now && (!e.endsAt || e.endsAt >= now),
  );
  const laterStart = withCount.filter((e) => e.startsAt > now);
  const current = ongoing ?? laterStart[0] ?? null;

  const upcoming: UpcomingOp[] = laterStart
    .filter((e) => e.id !== current?.id)
    .slice(0, 3)
    .map((e) => ({
      id: e.id,
      title: e.title,
      mode: e.mode,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    }));

  if (!current) return { current: null, upcoming };

  return {
    current: {
      id: current.id,
      title: current.title,
      server: current.server,
      startsAt: current.startsAt.toISOString(),
      endsAt: current.endsAt ? current.endsAt.toISOString() : null,
      maxSlots: current.maxSlots,
      signups: current._count.signups,
      rewardPoolText: current.rewardPoolText,
      summary: current.summary,
      mode: current.mode,
      wipeCycle: current.wipeCycle,
      raidWindow: current.raidWindow,
      rewardTiers: Array.isArray(current.rewardTiers)
        ? (current.rewardTiers as Array<{ place: string; reward: string }>)
        : [],
      bonusText: current.bonusText,
      howToJoinVideoUrl: current.howToJoinVideoUrl,
      seasonNumber: current.season?.number ?? null,
      seasonName: current.season?.name ?? null,
    },
    upcoming,
  };
}

/** "S3" for the nav tag / hero line — active season, else the highest-numbered. */
async function seasonLabel(): Promise<string> {
  try {
    const s =
      (await db.season.findFirst({ where: { status: "ACTIVE" }, orderBy: { number: "desc" } })) ??
      (await db.season.findFirst({ orderBy: { number: "desc" } }));
    return s ? `S${s.number}` : "";
  } catch {
    return "";
  }
}

async function seasonSummary(): Promise<
  { series: string; count: number; latestSlug: string; champion: string | null }[]
> {
  try {
    const rows = await db.season.findMany({
      orderBy: [{ series: "asc" }, { number: "desc" }],
      select: { series: true, slug: true, number: true, championName: true },
    });
    const map = new Map<string, { series: string; count: number; latestSlug: string; champion: string | null }>();
    for (const r of rows) {
      const cur = map.get(r.series);
      if (cur) cur.count += 1;
      else map.set(r.series, { series: r.series, count: 1, latestSlug: r.slug, champion: r.championName });
    }
    return [...map.values()];
  } catch {
    return [];
  }
}

async function galleryImages(): Promise<GalleryImage[]> {
  try {
    return await db.mediaAsset.findMany({
      where: { kind: "gallery" },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: { id: true, caption: true, tag: true },
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [{ current, upcoming }, videos, gallery, settings, season, seasons] = await Promise.all([
    eventData(),
    latestVideos(9),
    galleryImages(),
    getSettings(),
    seasonLabel(),
    seasonSummary(),
  ]);
  return (
    <Landing
      event={current ?? FALLBACK_EVENT}
      upcoming={upcoming}
      videos={videos}
      howToJoinVideo={current?.howToJoinVideoUrl || settings.howToJoinVideoUrl}
      gallery={gallery}
      seasonLabel={season}
      seasons={seasons}
    />
  );
}
