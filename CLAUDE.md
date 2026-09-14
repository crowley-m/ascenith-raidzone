# ASCENITH RAIDZONE

Community website + Discord bot for an *Once Human* community that runs custom
servers, tournaments and hands out sponsored prizes. Public showcase site,
player self-service area, staff portal, and a Discord bot — one Next.js app plus
a bot process, one Postgres DB.

Owner is **POTATOZIE**. Owner identity must stay invisible to non-owner staff
(see `src/lib/staff-mask.ts`).

## Stack

- **Next.js 15** App Router, TypeScript, React 19. `type: module`.
- **Prisma 6** + PostgreSQL. Migrations are hand-written SQL (see below).
- **Auth.js v5 beta** — **Discord OAuth only**. No email/password (removed). JWT
  sessions. `src/auth.ts` (full) + `src/auth.config.ts` (edge-safe, for middleware).
- **discord.js 14** bot in `src/bot/` (run with `tsx`). Web talks to Discord via
  REST helpers in `src/lib/discord.ts` (bot token); the bot process handles slash
  commands / autocomplete / the reminder loop.
- **Tailwind v3**. Neutral-black palette; tokens: `void`, `panel`, `panel-2`,
  `edge`, `cream`, `slate` (zinc ramp), `teal` (the crimson accent `#e5484d`),
  `ember`. The landing (`src/app/page.tsx` → `src/components/landing/`) keeps its
  **own warm palette** in `landing.module.css` — don't unify them.
- `sharp` for image processing. Uploaded images (`MediaAsset`) are stored as
  bytes in Postgres and served from `/api/media/[id]`.

## Layout

```
src/app/
  page.tsx                 landing (its own design system, GSAP scroll FX)
  (site)/                   public + player area, shares SiteHeader/Footer/ScrollReveal
    events|teams|factions|seasons|winners|rules|about   public showcase pages
    me/                     player self-service (auth required)
    portal/                 staff (RBAC — see src/lib/rbac.ts)
  icon.png / apple-icon.png / opengraph-image.png / twitter-image.png
  sitemap.ts / robots.ts   force-dynamic (read runtime NEXTAUTH_URL)
src/bot/                    discord.js worker; commands.ts, reminders.ts, deploy-commands.ts
src/lib/                    db, auth helpers, discord REST, rbac, validation (zod), ...
prisma/schema.prisma + migrations/ + seed.ts
```

Showcase pages share the broadsheet `PageMasthead` and put `data-reveal` on
sections for the `ScrollReveal` fade-in (scoped to `.site-shell`, so the landing
is never touched).

## RBAC

`src/lib/rbac.ts` — roles `OWNER > ADMIN > MODERATOR`. `can(role, permission)`.
Server actions call `assertPermission(...)` (`src/lib/guard.ts`, throws); pages
call `requirePermission(...)` (`src/lib/session.ts`, redirects). Every staff
mutation writes an `AuditLog` row via `logAudit(...)`; viewer at `/portal/audit`.

## Domain notes

- **Player vs User** — `User` = auth identity, `Player` = community profile. A
  `Player` (status `PENDING`) is auto-created on every sign-in so staff see
  everyone; `updateProfileAction` flips it to `ACTIVE` once `characterName` is
  set (required field), but only from `PENDING` — an `INACTIVE`/`BANNED`
  player re-saving their own profile doesn't self-reactivate, since that's a
  staff call.
- **Teams** — player-made, **one per event**, for `format: TEAM` events. Forming
  a team (or joining one) signs it up for that event — `registerTeam()` in
  `src/lib/events.ts`; leaving / kick withdraws that member. A player with no
  team can `registerAsFreeAgent()` — a teamless `EventSignup` ("looking for a
  team"); forming/joining a team later absorbs it. Distinct from **Factions**
  (staff-defined houses / persistent allegiance, with an optional Discord role
  per house; `syncMemberRoles` reconciles roles).
- **Factions page** (`/factions`) is scoped to the **Faction War** season series
  (any `Season.series` containing "faction"). Team-event podiums are NOT rolled
  into factions. Titles matched champion-name → faction-name fuzzily.
- **Events → Discord** — "Build space" creates a category + channel set. Content
  is **auto-composed into rich embeds** (never a raw-text dump): `eventEmbed()`
  builds the `#announcement` card from the structured fields; every other channel
  gets a titled embed via `contentEmbed()`. `eventChannelPayloads(ev)` in
  `src/lib/event-channels.ts` is the single source of truth for per-channel
  content — the `saveEvent` publish path, `pushEventChannelContent`, and the
  portal **Discord preview** (`<DiscordPreview>`) all read it. `bulletize()` /
  `proseItems()` (`src/lib/prose.ts`) turn free-typed lines into point-wise
  lists — `# Heading` → bold, `Label:` → bold, `-/*/1.` normalised, one bullet
  per line; the event page renders the same via `<EventProse>`.
  `announcement / how-to-join / rules / gameplay / schedule / wipe-info /
  registration` are read-only. `Event.posterUrl` (absolute URL) → announcement
  embed image + event-page hero. A pinned **channel guide** message
  (`eventIndexContent`) sits in `#announcement`. `announcePing` /
  `announcePingAll` control `@everyone`. "Repost + ping" deletes & reposts to
  re-fire pings; "Sync channels" edits the existing messages in place (no
  re-ping) and creates any channels an older space is missing
  (`addMissingEventChannels`). Portal Settings surfaces the bot's missing
  guild permissions (`botGuildPermissions`).
- **Choosing channels for a new event** — the event form has a checkbox grid
  ("Which channels to build") that sets `Event.discordChannelPlan` (a JSON
  array; `announcement` always forced in). `buildEventSpace` uses it instead
  of `Settings.eventChannels` when set — e.g. a small event can build with
  just announcement/rules/gameplay/chat. Only affects the *first* build;
  `null` (default, box state mirrors the Settings template on a fresh form)
  falls back to the global template. `cloneEvent` copies it.
- **Per-event channel customization** — `Settings.eventChannels` (Portal →
  Settings → "Default channels for new events") is only the *template* new
  spaces are built from. To add/remove a channel on an event that already has
  its space, use the **Channels** panel on that event's page
  (`addEventChannel` / `removeEventChannel`) — add seeds content automatically
  for recognised names (rules/gameplay/schedule/wipe-info/rewards/…), remove
  deletes the Discord channel and drops it from `Event.discordChannels` /
  `discordSeedMessages`.
- **Event access roles** (`src/lib/event-space.ts`) — "Build space" also creates a
  per-event Discord role (`Event.discordRoleId`); `applyEventChannelPerms` gates
  every channel except `announcement / how-to-join / registration` to it. Signing
  up (site or `/signup`) grants the role; withdrawing revokes it. TEAM events get
  a private voice channel + role per team (`Team.discordRoleId` /
  `discordVoiceChannelId`). **Archive** writes an `EventParticipation` row for
  every signed-up player (survives event deletion → "Events competed in" on the
  public profile), then deletes the event + team roles / voice channels
  (`teardownEventAccess`). "Resync event roles" re-grants to everyone signed
  up. Disbanding a team also deletes its voice channel + role — both the
  player's own `disbandTeam` and staff's `staffDisbandTeam` (`/portal/teams`)
  do this; grab `discordVoiceChannelId`/`discordRoleId` (and member ids, to
  resync their roles) *before* `db.team.delete`, since the row's gone after.
- **Broadcast** (`/portal/broadcast`) — server-wide announcements outside an
  event's own space. Every post is tracked in the `Broadcast` model (channel +
  message id), so "Recent broadcasts" can edit it in place
  (`editBroadcast` — never re-pings) or delete it (`deleteBroadcast`). Optional
  image (`Broadcast.imageUrl`) — upload or paste a URL, same
  upload-wins-over-URL pattern as an event poster (`createMediaAsset`, kind
  `"broadcast"`). Rides along as an image-only embed even when not posting
  "as an embed", so it attaches to a plain-text message too; edit can replace
  or remove it.
- **Notifications** — players get Discord DMs (waitlist promotion, reward
  granted, event starting, placed in results, event cancelled, teammate
  joined / left) unless `Player.dmNotifications` is off. `src/lib/notify.ts`.
- **Lifetime rewards summary** — `summarizeRewards()` (`src/lib/rewards-summary.ts`,
  pure) groups a player's `Reward` rows by item name (case-insensitive, since
  it's free-typed) and sums `amount` after stripping commas/spaces —
  `Reward.amount` is a free-text string, not a number, so this tolerates
  `" 1,300"` alongside non-numeric rewards (shown as `×N` instead of a total).
  `<LifetimeRewards>` renders it on `/me` and `/me/rewards`.
- **Bot self-service commands** — `src/bot/commands.ts`'s `/join <code>` and
  `/standings <season>` duplicate a slice of web server-action logic directly
  (the bot is a separate process — it can't import `"use server"` actions),
  using the bot's own live `interaction.guild` for role grants instead of the
  web's REST-based `src/lib/discord.ts`. `/join` mirrors `joinTeam` +
  `registerTeam`'s per-member upsert (absorbs an existing free-agent signup
  via the `eventId_playerId` unique constraint) and grants both the team's
  voice-access role and, if the team's already registered, the event's role
  too. `/standings` is read-only — same `Season → events → placements` shape
  `/seasons/[slug]` renders, condensed to a podium-per-event embed.
- **Per-event nickname** — `EventSignup.nickname` lets a player use a different
  display name for one event (multiple characters, an event-specific alias)
  without touching their profile. Set at sign-up (solo `signUpForEvent`, free
  agent `registerAsFreeAgent`), when joining a team (`joinTeam`'s optional
  `nickname` field — best-effort, only takes if the team's already registered
  since that's the only time an `EventSignup` row exists yet), or any time
  after via `updateEventNickname` (shared by solo/free-agent/team-member — no
  state/capacity side effects; the shared `<NicknameEditor>` client component,
  `src/components/nickname-editor.tsx`, wraps it and is used on the event
  page, `/me/team`'s own roster row, and anywhere else the control is
  needed — a teal "+ Change name" affordance, not muted caption text, so it
  reads as clickable). Public rosters, `/teams/[id]`, `/me/team`, and the
  portal player/team pages show it ("as `<nickname>`" alongside the real name
  in staff views); the roster CSV carries both as separate columns.
  `EventParticipation.nickname` snapshots it so it survives archive/delete
  too. Placements/results/the bot still key off `Player.characterName` —
  nickname is a roster-display layer, not identity. `/me/profile`'s Character
  name field says so explicitly now, pointing players at the per-event
  nickname instead of renaming their real profile for a one-off team alias.
- **Check-in** — signed-up players self-mark attendance (`checkInToEvent`) from
  the event page from 30 min before start until the wipe ends; staff still
  override via the portal toggle / "mark all".
- **Reward disputes** — a player can flag a granted reward "didn't get it"
  (`Reward.disputedAt`, `disputeReward`). Flagged rewards surface at the top of
  `/portal/rewards`; staff clear them with "Re-sent it" / "Dismiss"
  (`resolveRewardDispute`). Marking a reward received clears any dispute.
- **Linking a reward to an event** — `Reward.eventId` is what the Crystgin
  sheet actually filters on, not the free-typed reason text. Logging from an
  event's own page (`fixedEventId` on `RewardForm`) auto-links it; logging
  from the general `/portal/rewards` page requires picking it from "Which
  event was this for?" — `guessEventForReason()` (`src/lib/reward-match.ts`)
  fuzzy-matches the typed reason against event titles to warn ("Reason
  mentions X — did you mean to link it?") before saving, and the same helper
  flags already-unlinked rows in the reward log (amber `≈ Title?` hint) so
  they're easy to spot after the fact. `assignRewardsToEvent` (bulk-select
  checkboxes on unlinked rows in `<RewardLogTable>`, `/portal/rewards`) fixes
  a batch of them at once without needing per-reward edit. Fixing a typo on
  an already-logged reward (item/amount/reason/event/public) doesn't need
  delete-and-relog — `editReward` updates it in place, keeps the original
  audit trail, and deliberately does NOT re-send the "reward granted" DM
  (unlike `grantReward`). The edit form itself is
  `src/components/portal/reward-edit-form.tsx` — shared between
  `<RewardLogTable>` (`/portal/rewards`) and `<PlayerRewardList>` (a player's
  own portal page), so both stay in sync.
- **Payout records** — `/portal/events/[id]/roster` CSV (character, UID,
  Discord, platform, region, team, sign-up state, attendance) covers who
  joined; `/portal/rewards/export?eventId=` — the "↓ Crystgin sheet" link in
  the event page's Registrations section (always tied to that one event) and
  "↓ Export CSV" on `/portal/rewards` (a plain GET `<form>`, no JS, with an
  event `<select>` next to it — pick one to scope the download, or "All
  events" for the full history) — is deliberately just `EVENT`/`ID`/
  `REGION`/`CRYSTGIN` (gameUid + amount, hardcoded to this community's one
  payout currency) so a dev has nothing else to parse when handing out
  rewards.
- **Results** — `savePlacements` also posts a `resultsEmbed` podium to the
  event's `#announcement` (stored as `discordSeedMessages.results`, editable
  via "Repost results to Discord") and DMs everyone who placed. The public
  event page shows a Results block whenever placements exist. Cancelling an
  event (`status` → `CANCELLED`) DMs the roster + overwrites the announcement.
- **Bracket** — optional single-elimination bracket per event (`src/lib/bracket.ts`,
  `Bracket` / `BracketMatch`). Staff draw it from the roster (`generateBracket`),
  set winners (`setBracketMatch` propagates the winner into the next match).
  Shown read-only on the public event page. Separate from the Results form
  (1/2/3 placements that feed `/winners`).

## Portal event form

Also: a delegated `onChange` on the `<form>` tracks a handful of fields
(`values` state) purely to power an inline "Preview" snippet under each
content field (`<MiniPreview>`, built on the same `proseItems()` from
`src/lib/prose.ts` that `<EventProse>` uses), a pre-save sanity-check banner
(past start date, Team format with no team size, publishing with no
summary/announcement, only announcement checked), a live flag under Reward
tiers for any line that won't parse as `place | reward`, and a small status
strip at the very top (title / status / "starts in…" via `relative()` from
`src/lib/format.ts` / channel count) above the jump-nav. It also flips a
`dirty` flag that arms a `beforeunload` warning (page unloads only — doesn't
catch in-app link clicks) until the next successful save.

`src/components/portal/event-form.tsx` is one long `<form>` (Basics → Public
brief → Discord channels) with a sticky jump-nav (`#basics`/`#brief`/`#discord`)
at the top. The "which channels to build" checkbox for each channel lives
**inline on its own field** (a controlled `channelPlan: Set<string>` state,
`toggleChannel`/`selectAllChannels`/`selectNoChannels`), not in a separate
grid — the 7 content fields (announcement/registration/how-to-join/gameplay/
schedule/wipe-info/rewards) carry it right above their textarea
(`id="content-<name>"` for jump-links) with a "filled — N chars" / "empty"
hint; `rules` carries it next to the Event rules field (its content is
`rulesMd` in Public brief, not a Discord-section field, and rules/gameplay/
schedule/wipe-info are also rendered on the public event page regardless of
Discord channel status, so their fields are never hidden — only the checkbox
is per-field, not the content); the 3 content-less channels
(looking-for-team/questions/chat) get a small standalone checklist. All of
it locks (dimmed, disabled) once the event already has a space. The
**Channels** panel (`event-channels-manager.tsx`, event page) lists what the
space actually has, whether each was posted yet, an "Edit content" jump link
to that `#content-<name>` anchor, an "Open in Discord ↗" link
(`discordId + DISCORD_GUILD_ID`), and add/remove.

## Player picker

`src/components/portal/player-picker.tsx` — a searchable + scrollable
combobox (text input + filtered `<ul>` dropdown, submits a hidden `name`
input) used anywhere staff pick one player from a long list, e.g.
`RewardForm`'s Player field. Swap in over a plain `<select>` whenever the
option list is the full player roster rather than a short per-event list
(`ResultsForm`'s placement dropdowns stay native `<select>` — entrants are
scoped to that event's roster, short enough that scrolling alone is fine).

## Migrations

Hand-write the SQL. `prisma migrate deploy` runs on web container boot (then
`db:seed`, non-fatal). To add one: edit `schema.prisma`, create
`prisma/migrations/<YYYYMMDDHHMMSS>_<name>/migration.sql` with plain `ALTER`
statements, run `npx prisma generate`. Additive columns only where possible.

## Commands

```
npm run dev          # next dev
npm run typecheck    # tsc --noEmit  (app) + tsc -p src/bot/tsconfig.json (bot)
npm run build        # prisma generate && next build
npm run bot          # tsx src/bot/index.ts
npm run db:seed
```

Always `npx tsc --noEmit` and `npx next build` before committing. Lint is strict
(`no-html-link-for-pages` — use `<Link>` for internal hrefs, `prefetch={false}`
for route handlers that download).

## Deploy

Self-hosted VPS, Docker Compose at `/opt/ascenith/` (compose file lives on the
server, not in the repo). One image, two services (`web` + `bot`). The web
service runs `prisma migrate deploy` + seed on boot; the bot re-registers slash
commands on boot.

**Redeploy is automatic**: push to `main` → `.github/workflows/build.yml`
builds the image, pushes to GHCR, then SSHes into the VPS and runs
`./deploy.sh`, which just `docker compose --profile app pull` +
`up -d` — no local build anymore. Gated on the `DEPLOY_ENABLED` repo variable
and `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` repo secrets; `ops/ci-deploy.md` has
the full setup + rollback (`docker-compose.yml.bak` / `deploy.sh.bak` on the
box are the pre-cutover, build-locally versions). Manual redeploy still works
the same way: SSH in, `cd /opt/ascenith && ./deploy.sh`. Public URL is an
nginx vhost on the box — **do not touch other services on that shared VPS.**

Site metadata (`metadataBase`, sitemap, robots) reads `NEXTAUTH_URL` at runtime —
that's why the landing, sitemap and robots are `force-dynamic`.
