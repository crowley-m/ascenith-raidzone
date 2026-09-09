import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { winnersSections } from "@/lib/gallery";

const BASE = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "",
    "/events",
    "/teams",
    "/seasons",
    "/winners",
    "/factions",
    "/rules",
    "/about",
    "/register",
    "/login",
  ].map((p) => ({ url: `${BASE}${p}`, lastModified: now }));

  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const [seasons, events, sections, teams] = await Promise.all([
      db.season.findMany({ select: { slug: true, updatedAt: true } }),
      db.event.findMany({
        where: { status: { in: ["PUBLISHED", "COMPLETED"] } },
        select: { id: true, updatedAt: true },
      }),
      winnersSections(),
      db.team.findMany({ select: { id: true, updatedAt: true } }),
    ]);
    dynamicEntries = [
      ...seasons.map((s) => ({ url: `${BASE}/seasons/${s.slug}`, lastModified: s.updatedAt })),
      ...events.map((e) => ({ url: `${BASE}/events/${e.id}`, lastModified: e.updatedAt })),
      ...sections.map((s) => ({ url: `${BASE}/winners/${s.slug}`, lastModified: now })),
      ...teams.map((t) => ({ url: `${BASE}/teams/${t.id}`, lastModified: t.updatedAt })),
    ];
  } catch {
    /* db unreachable — static only */
  }

  return [...staticPaths, ...dynamicEntries];
}
