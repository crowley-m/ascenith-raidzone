import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const factions = [
    { name: "Raidzone Alpha", tag: "RZA", color: "#2fd4c7" },
    { name: "Raidzone Bravo", tag: "RZB", color: "#ff8a3d" },
    { name: "Freelancers", tag: "FREE", color: "#8b5cf6" },
  ];
  for (const f of factions) {
    await db.faction.upsert({
      where: { name: f.name },
      create: f,
      update: {},
    });
  }
  console.log(`Seeded ${factions.length} factions.`);

  // Tournament history. Text / posters / videos stay editable in the portal —
  // this only guarantees the rows exist so the pages aren't empty.
  type SeasonSeed = {
    series: string;
    number: number;
    slug: string;
    status: "ENDED" | "ACTIVE" | "UPCOMING";
    prizePoolText?: string;
    championName?: string;
    posterUrl?: string;
    videos?: string[];
  };
  const seasons: SeasonSeed[] = [
    {
      series: "Duo-Squad Tournament",
      number: 1,
      slug: "duo-squad-1",
      status: "ENDED",
      prizePoolText: "67,410 Crystgin",
      championName: "FSQ Team",
      posterUrl: "/media/champion-season-1.webp",
      videos: [
        "https://youtu.be/nG-ImybZ8cA",
        "https://youtu.be/8Bn2S15Grsw",
        "https://youtu.be/IO6FH0H8-mg",
        "https://youtu.be/rKZDbZiPURc",
      ],
    },
    {
      series: "Duo-Squad Tournament",
      number: 2,
      slug: "duo-squad-2",
      status: "ENDED",
      prizePoolText: "46,260 Crystgin",
      championName: "BT",
      posterUrl: "/media/champion-season-2.webp",
      videos: [
        "https://www.youtube.com/watch?v=F_biHQLsiFY",
        "https://www.tiktok.com/@aiozakme/video/7576215463802309909",
        "https://www.tiktok.com/@newbie_people/video/7569844387878817042",
        "https://www.tiktok.com/@olympuzsss/video/7569789667931999509",
        "https://www.tiktok.com/@flinchnoaim/video/7565937378892762389",
        "https://www.tiktok.com/@flinchnoaim/video/7565555937822461192",
      ],
    },
    {
      series: "Duo-Squad Tournament",
      number: 3,
      slug: "duo-squad-3",
      status: "ENDED",
      prizePoolText: "101,450 Crystgin",
      championName: "SCUBACAT",
      posterUrl: "/media/champion-season-3.webp",
      videos: [
        "https://www.youtube.com/watch?v=2SR1Ut4tnaA",
        "https://www.youtube.com/watch?v=umS8aGXUW3A",
        "https://www.youtube.com/watch?v=kNYzfXJBKPM",
        "https://www.youtube.com/watch?v=U5bYwtj_6-g",
        "https://www.tiktok.com/@potatoziee1/video/7572933734228299029",
        "https://www.tiktok.com/@potatoziee1/video/7572214604906908949",
        "https://www.tiktok.com/@potatoziee1/video/7571463436287184135",
      ],
    },
    {
      series: "Duo-Squad Tournament",
      number: 4,
      slug: "duo-squad-4",
      status: "ENDED",
      prizePoolText: "47,390 Crystgin",
      championName: "CrumblyBread",
      posterUrl: "/media/champion-season-4.webp",
      videos: [
        "https://youtube.com/live/uNentpwIZLo",
        "https://youtu.be/YzmEis28560",
        "https://youtu.be/nZteW4GfHxA",
      ],
    },
    {
      series: "Duo-Squad Tournament",
      number: 5,
      slug: "duo-squad-5",
      status: "ACTIVE",
      prizePoolText: "120,425 Crystgin",
      championName: "ADBOT",
      posterUrl: "/media/champion-season-5.webp",
    },
    {
      series: "Faction War",
      number: 1,
      slug: "faction-war-1",
      status: "ENDED",
      prizePoolText: "105,820 Crystgin",
      championName: "MAYFLY",
      videos: [
        "https://youtube.com/live/qBr7j1-5Ui0",
        "https://youtube.com/live/2PsAW_zjOac",
        "https://youtube.com/live/816-cHYU7n0",
        "https://youtube.com/live/TsyC2-GCEfk",
        "https://youtube.com/live/xlhdg_S5fMU",
      ],
    },
    {
      series: "The Purge",
      number: 1,
      slug: "the-purge-1",
      status: "ENDED",
    },
    {
      series: "Hyperbrawl",
      number: 1,
      slug: "hyperbrawl-1",
      status: "ENDED",
      prizePoolText: "8,000 Crystgin",
      championName: "Summus",
      videos: ["https://youtube.com/live/AiPgNkdZ1_8"],
    },
    {
      series: "Solo Mode",
      number: 1,
      slug: "solo-mode-1",
      status: "ENDED",
      prizePoolText: "15,000 Crystgin",
      posterUrl: "/media/promo-solo-season-1.webp",
    },
    {
      series: "Solo / Duo Tournament",
      number: 1,
      slug: "solo-duo-1",
      status: "ENDED",
      videos: [
        "https://youtube.com/live/oi327gB1lss",
        "https://youtube.com/live/0WqJufEH26s",
        "https://youtube.com/live/o1RUHiLSvHM",
        "https://youtube.com/live/t_g58y7faPk",
      ],
    },
    {
      series: "Cash Tournament",
      number: 1,
      slug: "cash-1",
      status: "ENDED",
      prizePoolText: "$200",
      videos: ["https://www.twitch.tv/videos/2836622232"],
    },
    {
      series: "Cash Tournament",
      number: 2,
      slug: "cash-2",
      status: "ENDED",
      prizePoolText: "$200",
    },
  ];
  for (const s of seasons) {
    const { videos, ...row } = s;
    const created = await db.season.upsert({
      where: { slug: s.slug },
      create: row,
      update: {}, // never clobber portal edits
    });
    if (videos?.length) {
      const have = await db.seasonVideo.count({ where: { seasonId: created.id } });
      if (have === 0) {
        await db.seasonVideo.createMany({
          data: videos.map((url, i) => ({ seasonId: created.id, url, sortOrder: i })),
        });
      }
    }
  }
  console.log(`Seeded ${seasons.length} seasons.`);

  const ownerId = process.env.OWNER_DISCORD_ID;
  const ownerName = process.env.OWNER_DISCORD_USERNAME;
  if (ownerId || ownerName) {
    console.log(
      `Owner will be auto-promoted on first Discord login (${ownerName ?? ownerId}).`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
