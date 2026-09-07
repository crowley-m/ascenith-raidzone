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
