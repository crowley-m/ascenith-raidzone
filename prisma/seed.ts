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

  // Seasons run so far. Champion text/poster stay editable in the portal —
  // this only guarantees the rows exist so the Hall of Winners isn't empty.
  const seasons = [
    {
      number: 1,
      status: "ENDED" as const,
      prizePoolText: "67,410 Crystgin",
      championName: "FSQ Team",
      posterUrl: "/media/champion-season-1.webp",
    },
    {
      number: 2,
      status: "ENDED" as const,
      prizePoolText: "46,260 Crystgin",
      championName: "BT",
      posterUrl: "/media/champion-season-2.webp",
    },
    {
      number: 3,
      status: "ENDED" as const,
      prizePoolText: "101,450 Crystgin",
      championName: "SCUBACAT",
      posterUrl: "/media/champion-season-3.webp",
    },
    {
      number: 4,
      status: "ENDED" as const,
      prizePoolText: "47,390 Crystgin",
      championName: "CrumblyBread",
      posterUrl: "/media/champion-season-4.webp",
    },
    {
      number: 5,
      status: "ACTIVE" as const,
      prizePoolText: "120,425 Crystgin",
      championName: "ADBOT",
      posterUrl: "/media/champion-season-5.webp",
    },
  ];
  for (const s of seasons) {
    await db.season.upsert({
      where: { number: s.number },
      create: s,
      update: {}, // never clobber portal edits
    });
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
