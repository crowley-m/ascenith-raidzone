import { db } from "@/lib/db";
import type { GalleryItem } from "@/components/winners/gallery-grid";

export const WINNERS_SECTION_LIMIT = 5;

// Static campaign / key-art posters kept in /public/media.
export const CAMPAIGN_POSTERS = [
  { img: "/media/key-art-ascenith.webp", label: "ASCENITH — Rise. Conquer. Ascend." },
  { img: "/media/promo-solo-season-1.webp", label: "Solo Mode · Season 1" },
  { img: "/media/promo-solo-duo.webp", label: "Solo / Duo RaidZone" },
  { img: "/media/poster-boxing-event.webp", label: "Boxing Event — Fight for Glory" },
  { img: "/media/trophy-ascenith.webp", label: "The RaidZone trophy" },
];

export type WinnersSection = {
  slug: string; // /winners/<slug>
  title: string;
  items: GalleryItem[];
};

async function championItems(): Promise<GalleryItem[]> {
  const seasons = await db.season
    .findMany({ orderBy: { number: "desc" }, where: { championName: { not: null } } })
    .catch(() => []);
  return seasons
    .filter((s) => s.posterUrl)
    .map((s) => ({
      key: s.id,
      src: s.posterUrl as string,
      alt: `Season ${s.number} champion — ${s.championName}`,
      caption: `Season ${s.number} — ${s.championName}`,
    }));
}

async function proofItems(): Promise<GalleryItem[]> {
  const rows = await db.mediaAsset
    .findMany({
      where: { kind: "proof" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, caption: true },
    })
    .catch(() => []);
  return rows.map((r) => ({
    key: r.id,
    src: `/api/media/${r.id}`,
    alt: r.caption ?? "",
    caption: r.caption ?? null,
  }));
}

function campaignItems(): GalleryItem[] {
  return CAMPAIGN_POSTERS.map((p) => ({ key: p.img, src: p.img, alt: p.label, caption: p.label }));
}

async function collectionItems(slug: string): Promise<GalleryItem[]> {
  const rows = await db.mediaAsset
    .findMany({
      where: { kind: slug },
      orderBy: { sortOrder: "asc" },
      select: { id: true, caption: true },
    })
    .catch(() => []);
  return rows.map((r) => ({
    key: r.id,
    src: `/api/media/${r.id}`,
    alt: r.caption ?? "",
    caption: r.caption ?? null,
  }));
}

/** Every image section shown on /winners, in display order. */
export async function winnersSections(): Promise<WinnersSection[]> {
  const collections = await db.mediaCollection
    .findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
    .catch(() => []);

  const [champions, proof, ...cols] = await Promise.all([
    championItems(),
    proofItems(),
    ...collections.map((c) => collectionItems(c.slug)),
  ]);

  const sections: WinnersSection[] = [
    { slug: "champions", title: "Season champions", items: champions },
    { slug: "proof", title: "Proof", items: proof },
  ];
  collections.forEach((c, i) => {
    sections.push({ slug: c.slug, title: c.title, items: cols[i] ?? [] });
  });
  sections.push({ slug: "campaign", title: "From the campaign", items: campaignItems() });

  return sections.filter((s) => s.items.length > 0);
}

/** One section by slug, for the /winners/[section] full listing. */
export async function winnersSection(slug: string): Promise<WinnersSection | null> {
  return (await winnersSections()).find((s) => s.slug === slug) ?? null;
}
