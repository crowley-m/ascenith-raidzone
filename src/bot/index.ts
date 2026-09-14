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

// An unhandled 'error'/'shardError' on a Node EventEmitter with no listener
// throws and kills the process — log instead so a network blip doesn't take
// the whole bot down (the restart policy is the last resort, not the first).
client.on(Events.Error, (err) => console.error("client error", err));
client.on(Events.ShardError, (err) => console.error("shard error", err));

process.on("unhandledRejection", (err) => console.error("unhandled rejection", err));
process.on("uncaughtException", (err) => console.error("uncaught exception", err));

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
