import { Client, GatewayIntentBits, Events, MessageFlags } from "discord.js";
import { db, APP_URL } from "./lib.js";
import { handleCommand } from "./commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN not set — bot will not start.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Bot online as ${c.user.tag}`);
  c.guilds.cache.forEach((g) => console.log(`  guild: ${g.name} (${g.id})`));
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("signup:")) {
      const eventId = interaction.customId.slice("signup:".length);
      const user = await db.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { player: true },
      });
      if (!user?.player) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: `Register first: ${APP_URL}/register`,
        });
        return;
      }

      const event = await db.event.findUnique({
        where: { id: eventId },
        include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
      });
      if (!event || event.status !== "PUBLISHED") {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "That event is not open." });
        return;
      }

      const full = event.maxSlots ? event._count.signups >= event.maxSlots : false;
      const state = full ? "WAITLIST" : "SIGNED_UP";
      await db.eventSignup.upsert({
        where: { eventId_playerId: { eventId, playerId: user.player.id } },
        create: { eventId, playerId: user.player.id, state },
        update: { state },
      });
      await db.auditLog.create({
        data: { actorId: user.id, action: "event.signup.discord", targetType: "Event", targetId: eventId },
      });

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content:
          state === "WAITLIST"
            ? "You're on the waitlist — we'll bump you if a slot frees up."
            : `You're signed up for **${event.title}**. See you there.`,
      });
    }
  } catch (err) {
    console.error("interaction error", err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Something went wrong." }).catch(() => {});
    }
  }
});

client.login(token);

process.on("SIGTERM", () => {
  client.destroy();
  process.exit(0);
});
