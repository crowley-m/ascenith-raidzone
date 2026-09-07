import { REST, Routes } from "discord.js";
import { commandData } from "./commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required.");
  process.exit(1);
}

const rest = new REST().setToken(token);

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

await rest.put(route, { body: commandData });
console.log(
  `Registered ${commandData.length} commands ${guildId ? `to guild ${guildId}` : "globally (may take ~1h to appear)"}.`,
);
