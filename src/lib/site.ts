export const site = {
  name: "ASCENITH RAIDZONE",
  owner: "POTATOZIE",
  game: "Once Human",
  tagline: "Custom servers. Real events. Real rewards.",
  discordInvite:
    process.env.NEXT_PUBLIC_DISCORD_INVITE ??
    process.env.DISCORD_INVITE_URL ??
    "https://discord.gg/",
};
