import {
  SlashCommandBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
  type APIActionRowComponent,
  type APIButtonComponent,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { db, APP_URL, TEAL, playerForDiscordUser } from "./lib.js";

/** PUBLISHED solo events that are still open for sign-ups (upcoming or live). */
function openSoloEventFilter() {
  const now = new Date();
  return {
    status: "PUBLISHED" as const,
    format: "SOLO" as const,
    OR: [{ endsAt: null, startsAt: { gte: now } }, { endsAt: { gte: now } }],
  };
}

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
  new SlashCommandBuilder().setName("team").setDescription("Show your ASCENITH RAIDZONE team"),
  new SlashCommandBuilder()
    .setName("signup")
    .setDescription("Sign up for an upcoming solo event")
    .addStringOption((o) =>
      o.setName("event").setDescription("Which event").setRequired(true).setAutocomplete(true),
    ),
  new SlashCommandBuilder()
    .setName("myevents")
    .setDescription("List the events you're signed up for"),
].map((c) => c.toJSON());

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
  if (interaction.commandName !== "signup") return interaction.respond([]);
  const q = interaction.options.getFocused().toLowerCase();
  const events = await db.event.findMany({
    where: openSoloEventFilter(),
    orderBy: { startsAt: "asc" },
    take: 25,
    select: { id: true, title: true },
  });
  await interaction.respond(
    events
      .filter((e) => e.title.toLowerCase().includes(q))
      .slice(0, 25)
      .map((e) => ({ name: e.title.slice(0, 100), value: e.id })),
  );
}

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
          style: ButtonStyle.Link,
          url: `${APP_URL}/events/${e.id}`,
          label: `Open: ${e.title}`.slice(0, 80),
        })),
      };
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    case "team": {
      const user = await playerForDiscordUser(interaction.user.id);
      if (!user?.player) {
        return interaction.reply({
          ephemeral: true,
          content: `You need a profile first — ${APP_URL}/register`,
        });
      }
      const teams = await db.team.findMany({
        where: {
          OR: [
            { leaderId: user.player.id },
            { members: { some: { playerId: user.player.id } } },
          ],
        },
        include: {
          event: { select: { title: true, mode: true } },
          members: { include: { player: { select: { characterName: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });
      if (teams.length === 0) {
        return interaction.reply({
          ephemeral: true,
          content: `No team yet. Create or join one at ${APP_URL}/me/team`,
        });
      }
      const embeds = teams.slice(0, 5).map((team) => {
        const isLeader = team.leaderId === user.player!.id;
        const forEvent = team.event.mode
          ? `RAIDZONE ${team.event.mode}`
          : team.event.title;
        return new EmbedBuilder()
          .setColor(TEAL)
          .setTitle(`${team.tag ? `[${team.tag}] ` : ""}${team.name}`)
          .setDescription(
            `Formed for **${forEvent}**\n` +
              team.members
                .map(
                  (m) =>
                    `• ${m.player.characterName ?? "Unnamed"}${
                      m.playerId === team.leaderId ? " (leader)" : ""
                    }`,
                )
                .join("\n") +
              (isLeader ? `\n\nInvite code: \`${team.inviteCode}\`` : ""),
          )
          .setFooter({ text: "ASCENITH RAIDZONE" });
      });
      return interaction.reply({ ephemeral: true, embeds });
    }

    case "signup": {
      const user = await playerForDiscordUser(interaction.user.id);
      if (!user?.player) {
        return interaction.reply({
          ephemeral: true,
          content: `You need a profile first — ${APP_URL}/register`,
        });
      }
      const eventId = interaction.options.getString("event", true);
      const event = await db.event.findUnique({
        where: { id: eventId },
        include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
      });
      if (!event || event.status !== "PUBLISHED") {
        return interaction.reply({
          ephemeral: true,
          content: `Pick an event from the list — that one isn't open. See ${APP_URL}/events`,
        });
      }
      if (event.format === "TEAM") {
        return interaction.reply({
          ephemeral: true,
          content: `**${event.title}** is a team event — your team leader registers the team at ${APP_URL}/events/${event.id}`,
        });
      }
      const full = event.maxSlots ? event._count.signups >= event.maxSlots : false;
      const state = full ? "WAITLIST" : "SIGNED_UP";
      await db.eventSignup.upsert({
        where: { eventId_playerId: { eventId, playerId: user.player.id } },
        create: { eventId, playerId: user.player.id, state },
        update: { state },
      });
      await db.auditLog
        .create({
          data: {
            actorId: user.id,
            action: "event.signup",
            targetType: "Event",
            targetId: eventId,
            meta: { state, via: "discord" },
          },
        })
        .catch(() => {});
      return interaction.reply({
        ephemeral: true,
        content:
          state === "WAITLIST"
            ? `📋 **${event.title}** is full — you're on the waitlist. We'll DM you if a slot opens.\n${APP_URL}/events/${event.id}`
            : `✅ You're signed up for **${event.title}**.\n${APP_URL}/events/${event.id}`,
      });
    }

    case "myevents": {
      const now = new Date();
      const signups = await db.eventSignup.findMany({
        where: {
          player: { user: { discordId: interaction.user.id } },
          state: { in: ["SIGNED_UP", "WAITLIST"] },
          event: { startsAt: { gte: now } },
        },
        include: { event: { select: { id: true, title: true, startsAt: true } } },
        orderBy: { event: { startsAt: "asc" } },
        take: 10,
      });
      if (signups.length === 0) {
        return interaction.reply({
          ephemeral: true,
          content: `You're not signed up for anything upcoming. See ${APP_URL}/events`,
        });
      }
      return interaction.reply({
        ephemeral: true,
        content: signups
          .map(
            (s) =>
              `**${s.event.title}** — <t:${Math.floor(s.event.startsAt.getTime() / 1000)}:R>` +
              `${s.state === "WAITLIST" ? " (waitlist)" : ""}\n${APP_URL}/events/${s.event.id}`,
          )
          .join("\n\n"),
      });
    }
  }
}
