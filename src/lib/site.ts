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

// POTATOZIE's channels.
export const socials: { label: string; href: string }[] = [
  { label: "TikTok", href: "https://www.tiktok.com/@potatoziee1" },
  { label: "Twitch", href: "https://www.twitch.tv/potatozie1" },
  { label: "X", href: "https://x.com/potatoziee" },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Potatozie-Gaming/100063656476567/",
  },
];
