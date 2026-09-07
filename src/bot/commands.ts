import {
  SlashCommandBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
  type APIActionRowComponent,
  type APIButtonComponent,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db, APP_URL, TEAL, playerForDiscordUser } from "./lib.js";

export const commandData = [
  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Get the link to register your ASCENITH RAIDZONE profile"),
  new SlashCommandBuilder()
    .setName("whoami")
    .setDescription("Check whether your Discord is linked to a website profile"),
  new SlashCommandBuilder()
    .setName("events")
    .setDescription("List upcoming ASCENITH RAIDZONE events"),
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show an ASCENITH RAIDZONE player profile")
    .addUserOption((o) => o.setName("user").setDescription("Whose profile (defaults to you)")),
].map((c) => c.toJSON());

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  switch (interaction.commandName) {
    case "register":
      return interaction.reply({
        ephemeral: true,
        content:
          `Register or finish your profile here:\n${APP_URL}/register\n\n` +
          `Log in with Discord and it links automatically.`,
      });

    case "whoami": {
      const user = await playerForDiscordUser(interaction.user.id);
      if (!user) {
        return interaction.reply({
          ephemeral: true,
          content: `Not linked yet. Register at ${APP_URL}/register (use "Continue with Discord").`,
        });
      }
      const p = user.player;
      return interaction.reply({
        ephemeral: true,
        content:
          `Linked as **${p?.characterName ?? user.discordUsername}**\n` +
          `Status: ${p?.status ?? "no profile"}` +
          (user.staffRole ? `\nStaff role: ${user.staffRole.role}` : ""),
      });
    }

    case "profile": {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const user = await playerForDiscordUser(target.id);
      if (!user?.player) {
        return interaction.reply({
          ephemeral: true,
          content: `${target.username} has no ASCENITH RAIDZONE profile yet.`,
        });
      }
      const p = user.player;
      const embed = new EmbedBuilder()
        .setColor(TEAL)
        .setTitle(p.characterName ?? target.username)
        .addFields(
          { name: "Status", value: p.status, inline: true },
          { name: "Platform", value: p.platform ?? "—", inline: true },
          { name: "Region", value: p.region ?? "—", inline: true },
          { name: "Faction", value: p.faction?.name ?? "—", inline: true },
        )
        .setFooter({ text: "ASCENITH RAIDZONE" });
      return interaction.reply({ embeds: [embed] });
    }

    case "events": {
      const events = await db.event.findMany({
        where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
      });
      if (events.length === 0) {
        return interaction.reply({ ephemeral: true, content: "No upcoming events right now." });
      }
      const embed = new EmbedBuilder()
        .setColor(TEAL)
        .setTitle("Upcoming events")
        .setDescription(
          events
            .map(
              (e) =>
                `**${e.title}** — <t:${Math.floor(e.startsAt.getTime() / 1000)}:R>\n` +
                `${e._count.signups}${e.maxSlots ? `/${e.maxSlots}` : ""} signed up · ${APP_URL}/events/${e.id}`,
            )
            .join("\n\n"),
        );
      const row: APIActionRowComponent<APIButtonComponent> = {
        type: ComponentType.ActionRow,
        components: events.slice(0, 5).map((e) => ({
          type: ComponentType.Button,
          style: ButtonStyle.Primary,
          custom_id: `signup:${e.id}`,
          label: `Sign up: ${e.title}`.slice(0, 80),
        })),
      };
      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }
}
