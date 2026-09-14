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
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join a team with its invite code")
    .addStringOption((o) =>
      o.setName("code").setDescription("The team's invite code").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("standings")
    .setDescription("Show a season's results")
    .addStringOption((o) =>
      o.setName("season").setDescription("Which season").setRequired(true).setAutocomplete(true),
    ),
].map((c) => c.toJSON());

function seasonLabel(s: { series: string; number: number; name: string | null }) {
  return `${s.series} — Season ${s.number}${s.name ? ` · ${s.name}` : ""}`;
}

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
  const q = interaction.options.getFocused().toLowerCase();

  if (interaction.commandName === "standings") {
    const seasons = await db.season.findMany({
      orderBy: [{ startsAt: "desc" }, { number: "desc" }],
      take: 25,
      select: { slug: true, series: true, number: true, name: true },
    });
    return interaction.respond(
      seasons
        .filter((s) => seasonLabel(s).toLowerCase().includes(q))
        .slice(0, 25)
        .map((s) => ({ name: seasonLabel(s).slice(0, 100), value: s.slug })),
    );
  }

  if (interaction.commandName !== "signup") return interaction.respond([]);
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
      if (user.player.status === "BANNED") {
        return interaction.reply({
          ephemeral: true,
          content: "Your account is suspended — contact staff to resolve this.",
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

    case "join": {
      const code = interaction.options.getString("code", true).trim().toUpperCase();
      const user = await playerForDiscordUser(interaction.user.id);
      if (!user?.player) {
        return interaction.reply({
          ephemeral: true,
          content: `You need a profile first — ${APP_URL}/register`,
        });
      }
      if (user.player.status === "BANNED") {
        return interaction.reply({
          ephemeral: true,
          content: "Your account is suspended — contact staff to resolve this.",
        });
      }
      const player = user.player;

      const team = await db.team.findUnique({
        where: { inviteCode: code },
        include: {
          event: { select: { id: true, title: true, mode: true, teamSize: true } },
          leader: { select: { id: true, characterName: true, user: { select: { discordId: true } } } },
        },
      });
      if (!team) {
        return interaction.reply({ ephemeral: true, content: "No team matches that code." });
      }

      const existingTeam = await db.team.findFirst({
        where: {
          eventId: team.eventId,
          OR: [{ leaderId: player.id }, { members: { some: { playerId: player.id } } }],
        },
        select: { id: true },
      });
      if (existingTeam) {
        return interaction.reply({
          ephemeral: true,
          content:
            existingTeam.id === team.id
              ? "You're already on that team."
              : "You're already in a team for that event.",
        });
      }

      if (team.event.teamSize) {
        const memberCount = await db.teamMember.count({ where: { teamId: team.id } });
        if (memberCount >= team.event.teamSize) {
          return interaction.reply({
            ephemeral: true,
            content: `That team is full — it caps at ${team.event.teamSize} members.`,
          });
        }
      }

      try {
        await db.teamMember.create({ data: { teamId: team.id, playerId: player.id } });
      } catch {
        return interaction.reply({ ephemeral: true, content: "Couldn't join that team — try again." });
      }
      await db.auditLog
        .create({
          data: {
            actorId: user.id,
            action: "team.join",
            targetType: "Team",
            targetId: team.id,
            meta: { via: "discord" },
          },
        })
        .catch(() => {});

      const guildMember = interaction.guild
        ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
        : null;
      if (team.discordRoleId && guildMember) {
        await guildMember.roles.add(team.discordRoleId).catch(() => {});
      }

      // if the team's already registered for its event, this join puts them on the roster too
      const registered = await db.eventSignup.findFirst({
        where: { teamId: team.id, state: { in: ["SIGNED_UP", "WAITLIST"] } },
        select: { state: true },
      });
      if (registered) {
        await db.eventSignup.upsert({
          where: { eventId_playerId: { eventId: team.eventId, playerId: player.id } },
          create: { eventId: team.eventId, playerId: player.id, teamId: team.id, state: registered.state },
          update: { teamId: team.id, state: registered.state },
        });
        const event = await db.event.findUnique({
          where: { id: team.eventId },
          select: { discordRoleId: true },
        });
        if (event?.discordRoleId && guildMember) {
          await guildMember.roles.add(event.discordRoleId).catch(() => {});
        }
      }

      if (team.leader.id !== player.id && team.leader.user.discordId) {
        const leaderUser = await interaction.client.users.fetch(team.leader.user.discordId).catch(() => null);
        await leaderUser
          ?.send(`**${player.characterName ?? "A player"}** joined **${team.name}** via invite code.`)
          .catch(() => {});
      }

      const forEvent = team.event.mode ? `RAIDZONE ${team.event.mode}` : team.event.title;
      return interaction.reply({
        ephemeral: true,
        content:
          `✅ Joined **${team.name}** for **${forEvent}**.` +
          (registered ? " You're on the roster." : ""),
      });
    }

    case "standings": {
      const slug = interaction.options.getString("season", true);
      const season = await db.season.findUnique({
        where: { slug },
        include: {
          events: {
            orderBy: { startsAt: "desc" },
            include: {
              placements: {
                orderBy: { rank: "asc" },
                include: {
                  team: { select: { name: true, tag: true } },
                  player: { select: { characterName: true } },
                },
              },
            },
          },
        },
      });
      if (!season) {
        return interaction.reply({ ephemeral: true, content: "Pick a season from the list." });
      }
      const withResults = season.events.filter((e) => e.placements.length > 0);
      if (withResults.length === 0) {
        return interaction.reply({
          ephemeral: true,
          content: `No results posted yet for that season. ${APP_URL}/seasons/${season.slug}`,
        });
      }
      const medal = ["🥇", "🥈", "🥉"];
      const embed = new EmbedBuilder()
        .setColor(TEAL)
        .setTitle(`${season.series} — Season ${season.number}${season.name ? ` · ${season.name}` : ""}`)
        .setURL(`${APP_URL}/seasons/${season.slug}`)
        .setDescription(
          withResults
            .slice(0, 10)
            .map((e) => {
              const title = e.mode ? `RAIDZONE ${e.mode}` : e.title;
              const podium = e.placements
                .slice(0, 3)
                .map((p, i) => `${medal[i] ?? `#${p.rank}`} ${p.team ? `${p.team.tag ? `[${p.team.tag}] ` : ""}${p.team.name}` : (p.player?.characterName ?? "—")}`)
                .join("  ");
              return `**${title}**\n${podium}`;
            })
            .join("\n\n"),
        )
        .setFooter({ text: season.championName ? `Champion: ${season.championName}` : "ASCENITH RAIDZONE" });
      return interaction.reply({ embeds: [embed] });
    }
  }
}
