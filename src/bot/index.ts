import { Client, GatewayIntentBits, Events, MessageFlags } from "discord.js";
import { handleCommand, handleAutocomplete } from "./commands.js";
import { startReminders } from "./reminders.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN not set — bot will not start.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Bot online as ${c.user.tag}`);
  c.guilds.cache.forEach((g) => console.log(`  guild: ${g.name} (${g.id})`));
  startReminders(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
      return;
    }
    // Sign-up is done on the website now (link buttons); nothing else to handle.
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
