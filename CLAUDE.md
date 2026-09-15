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
is never touched). `ScrollReveal` (`src/components/scroll-reveal.tsx`) mounts
once and watches `.site-shell` with a `MutationObserver` rather than querying
`data-reveal` elements once on mount/pathname-change — it used to do the
latter, which depended on its effect happening to run *after* whatever else
had changed the DOM for a route change, and intermittently lost that race
(most visibly against the page-transition wrapper's old remount behavior),
leaving whole sections stuck at `opacity: 0` with correct data underneath
them the whole time. The MutationObserver reacts to `data-reveal` elements
actually appearing, whenever that happens, so there's no timing to get
wrong — and each element gets its own 2.5s failsafe timer regardless.

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
- **Rules page content** — `/rules`' "Community rules" / "Anti-cheat & fair
  play" / "Disputes & appeals" sections are `Settings.rulesText`/
  `antiCheatText`/`disputesText` (Portal → Settings), rendered with the same
  `<EventProse>`/`proseItems()` free-typed convention event content uses —
  `1. …` numbers a rule, a short line ending in `:` becomes a heading, a
  blank line starts a new point. "How to join" and the FAQ stay hardcoded in
  `rules/page.tsx` — they reference actual internal routes (`/register`,
  `/me/team`, …) as real `<Link>`s, which free-text prose can't do, and they
  rarely change since they describe the site's own structure rather than
  policy wording.
- **Landing social links** — TikTok/Twitch/X/Facebook in the footer come from
  `Settings.social*Url` (Portal → Settings), not a hardcoded array — blank
  hides that one link. `src/app/page.tsx` builds the `{label, href}` list and
  passes it into `<Landing>` as a prop (the component is `"use client"`, no
  direct DB access).
- **Duplicate `gameUid`** — `Player.gameUid` has no DB-level `@unique` (blank/
  legacy UIDs would collide on `null`/`""`), so `updateProfileAction` checks
  app-side instead: a `db.player.findFirst` for another `User` already
  holding that UID returns a `fieldErrors.gameUid` message instead of saving
  — catches it before a Crystgin payout lands on the wrong account.
- **Public player pages in the sitemap** — `sitemap.ts` includes `ACTIVE`
  players with a `characterName` set, alongside events/seasons/teams/winners
  — PENDING/INACTIVE/BANNED stay unindexed.
- **`<VideoEmbed>` non-YouTube fallback** — `ytId()` only parses YouTube URLs;
  a Twitch clip, Streamable, or direct file link now renders a plain
  "▶ Watch ↗" link out to the URL instead of silently rendering nothing.
- **Ban enforcement** — `setPlayerStatus(id, "BANNED")` (`/portal/actions.ts`)
  does more than relabel the row: it withdraws every active `EventSignup`
  (SIGNED_UP/WAITLIST → WITHDRAWN, detaching `teamId`), revokes that event's
  Discord access role per event, runs `promoteWaitlist` behind them, and
  strips managed roles via `syncMemberRolesByPlayer`. `isBanned()`
  (`src/lib/team.ts`) is checked up front in every self-service entry point a
  player could otherwise use to get back in — `signUpForEvent`,
  `registerAsFreeAgent`, `checkInToEvent`, `registerTeamForEvent`,
  `createTeam`, `joinTeam`, and the bot's `/signup` and `/join`. As a last
  line of defense, `grantEventAccess` (`src/lib/event-space.ts`) itself
  refuses to hand out the Discord role to a `BANNED` player even if
  something re-syncs a stale roster row.
- **Team capacity at join-time** — `Event.teamSize` used to only be enforced
  in `registerTeam` (registration time), so a team could over-fill via
  invite code before ever registering. `joinTeam` (web) and the bot's
  `/join` now count current members against `event.teamSize` before adding
  one — web wraps the count + insert in a `db.$transaction` to close most of
  the race window; the bot path checks then inserts (Discord interactions
  are low-concurrency enough that this is an acceptable gap, matching the
  rest of the bot's non-transactional style).
- **Orphaned upload cleanup** — `deleteMediaAssetFromUrl()` (`src/lib/media.ts`)
  deletes the `MediaAsset` row a `/api/media/<id>` URL points at (no-op on a
  pasted external URL). `saveEvent` calls it when a poster is replaced and
  `deleteEvent` when the event goes away; `editBroadcast`/`deleteBroadcast`
  do the same for the broadcast image — each of those upload fields is
  exclusive to its one record. Season posters are deliberately **not**
  auto-cleaned — they're a pasted `/api/media/<id>` URL of unknown origin
  (often a gallery upload), so deleting on replace risked breaking a shared
  asset.
- **DM delivery visibility** — `dmUser()` (`src/lib/discord.ts`) returns
  whether the send actually succeeded instead of swallowing every outcome
  into a console line. `notifyPlayer()` (`src/lib/notify.ts`) writes a
  `notify.dm_failed` audit row (visible at `/portal/audit`, filterable) when
  a DM genuinely fails — closed DMs, rate limit, etc. — as opposed to the
  player having notifications off, so a reward/placement DM that never
  landed is now discoverable instead of invisible.
- **`deleteEvent` teardown** — deleting an event straight from its page (no
  requirement to archive first) used to skip `teardownEventAccess()`
  entirely, silently losing the `EventParticipation` history snapshot and
  orphaning the event's/each team's Discord role + voice channel.
  `deleteEvent` now calls it unconditionally before the cascade — safe to
  run twice if the event was already archived first.
- **CSV formula-injection guard** — `toCsv()`'s `esc()` (`src/lib/csv.ts`)
  prefixes a cell with `'` when it starts with `=`, `+`, `-`, `@`, tab or CR,
  so a free-typed field (character name, team name, reward reason — none of
  which are charset-restricted) can't open as a live formula when staff load
  a roster/rewards/players export into Excel or Sheets.
- **Reminder lead-time floor** — the bot's reminder tick
  (`src/bot/reminders.ts`) only runs every 5 minutes; `saveSettings` now
  rounds `reminderLeadMinutes` up to at least 5 when it's set above 0 (0
  stays "off"), since a shorter lead could close its `(now, now+lead]`
  window between ticks and never fire.
- **Private media cache-control** — `/api/media/[id]` serves a non-public
  reward-proof image to staff only, but used to send the same
  `public, immutable` cache header as everything else, so a shared
  proxy/CDN could cache and later leak it to an unauthenticated request.
  It now sends `private, no-store` whenever the image is only visible
  because the viewer is staff.
- **Team removal notifications** — `kickMember`/`disbandTeam` (player) and
  `staffKickTeamMember`/`staffDisbandTeam` (staff) all now DM the affected
  player(s) (`notify.teamKicked`/`teamDisbanded`) — previously only the
  voluntary-leave path (`notify.teamMemberLeft`, to the leader) sent
  anything, so a kicked/disbanded player lost their roster spot and Discord
  access with zero notice.
- **`howToJoinVideoUrl` scheme restriction** — free-typed by staff and
  rendered as a raw `href` by `<VideoEmbed>`'s non-YouTube fallback, so it's
  validated to `http(s)` only (`eventSchema` in `src/lib/validation.ts`) and
  `<VideoEmbed>` itself refuses to render anything else as a last line of
  defense — a `javascript:` URL there would otherwise run in the site's
  origin on click.
- **Reward proof-image URL** — `rewardSchema.proofImageUrl` used to demand a
  full `https://…` URL and reject the whole reward log over a bare
  `imgur.com/x.png`; it now auto-prefixes a missing scheme before
  validating.
- **Bot crash resilience** — `src/bot/index.ts` now listens for
  `Events.Error`/`Events.ShardError` on the client and
  `unhandledRejection`/`uncaughtException` on the process, logging instead
  of letting an unhandled emitter error kill the bot outright.
- **`botConfigured` surfaced** — Portal → Settings shows a banner when
  `DISCORD_BOT_TOKEN` isn't set on the *web* container specifically (`botConfigured`
  in `src/lib/discord.ts`, previously computed but never read) — every
  Discord call otherwise silently no-ops and saves still report success.
- **Faction Discord-role reassignment** — `syncMemberRoles`'s reconciliation
  query only ever looks at *currently assigned* faction role ids, so
  changing or clearing a faction's `discordRoleId` left the old role stuck
  on every member who'd already gotten it (invisible to that query).
  `saveFaction` now diffs against the faction's previous `discordRoleId`
  and explicitly `removeGuildRole`s it from current members when it changes.
- **`syncAllMemberRoles` covers everyone** — used to hard-cap at 400 linked
  members (oldest-first), so a community past that size silently never
  resynced its newest members on any future "Resync all roles" run. Now
  cursor-paginates through all of them; the per-member 150ms Discord pacing
  is unchanged.
- **`EventSignup`/`EventAttendance` `playerId` index** — both only had
  `eventId`-led composite indexes, unusable for the playerId-only lookup a
  player's roster/attendance history actually runs (leftmost-prefix rule).
  Added `@@index([playerId])` to both (migration
  `20260915010000_signup_attendance_player_index`).
- **Tiered veteran badges** — `Settings.veteranTiersText` (Portal → Settings)
  is free-typed `events played | Discord role id` per line
  (`parseVeteranTiers()` in `src/lib/settings.ts`). `syncMemberRoles` counts
  a player's `EventParticipation` rows and grants every threshold reached
  (Bronze/Silver/Gold-style, stacking) — unlike the per-event access role
  (`Event.discordRoleId`/`Team.discordRoleId`), which is *deleted* on
  archive/delete, these are permanent and only ever added, never stripped
  back off. `teardownEventAccess` triggers a sync right after writing each
  participant's row so a newly-crossed threshold lands immediately. The
  actual persistent "played this event" record is still the
  `EventParticipation` row itself (it snapshots the event's name), shown as
  "Events competed in" on the public profile — these roles are a
  Discord-side badge on top of that, not a replacement for it. (A flat
  single-tier "Veteran" role and a generic "Champion" role were considered
  and dropped — per-win recognition is better served by the existing
  named-event history than an unnamed badge.)
- **Auth account linking** — `allowDangerousEmailAccountLinking: true` on the
  Discord provider means a sign-in can attach to an existing `User` row on
  OAuth-email match alone. If that row was already linked to a *different*
  Discord identity, `src/auth.ts`'s `signIn` event logs it as
  `auth.discord_identity_changed` (visible in `/portal/audit`, `meta.from`/
  `meta.to` are the old/new Discord ids) before overwriting — doesn't block
  it, just makes an otherwise-silent merge visible to staff.
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
- **Free-agent finder** — a team event's "looking for a team" list
  (`registerAsFreeAgent`) now carries an optional short blurb
  (`EventSignup.lfgNote`, ≤140 chars, set alongside the per-event nickname at
  registration) and the public event page renders the list through
  `<FreeAgentBoard>` (`src/components/team/free-agent-board.tsx`) — a client
  component with region/timezone/platform filters built from whatever values
  are actually present among the current free agents (no filter shown for a
  dimension nobody's set). All client-side filtering over the list the page
  already fetched — no extra query.
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
  set winners (`setBracketMatch` propagates the winner into the next match;
  passing `winner: null` undoes it and recursively clears/rewrites everything
  downstream). Shown read-only on the public event page — `<BracketBoard>`
  highlights the earliest undecided match with both sides filled ("Up next"),
  computed client-side from `BracketView`. It's a client component that polls
  `GET /api/events/[id]/bracket` (a thin wrapper around `bracketForEvent()`)
  every 10s while `bracket.champion` is unset, so a spectator watching a live
  tournament sees results land without reloading — stops polling on its own
  once a champion is decided, and skips a tick while the tab is
  backgrounded (`document.hidden`). Laid out with real connector lines via
  CSS Grid, not just columns of cards: round `r`'s match at `position p`
  spans `2^r` grid rows starting at `p*2^r`, which is exactly why its
  vertical center always lands at the midpoint between its two children's
  centers — a connector element in the gap column just draws a line from
  25% to 75% of that same span (`ROW`/`COL`/`CONN` constants in
  `bracket-board.tsx`). Separate from the Results form (1/2/3 placements
  that feed `/winners`).

- **Gallery uploads** — `<GalleryManager>` (`src/components/portal/gallery-manager.tsx`,
  landing gallery / `/proof` / custom collections all share it) takes multiple
  files at once (`addGalleryImage` loops `formData.getAll("image")`); caption/
  small-label only apply when uploading exactly one image at a time, since
  they can't sensibly apply to a batch.

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

## Global portal search

`/portal/search?q=` (`requirePermission("player:view")`, MODERATOR+, same
gate as Players/Teams) — a plain GET `<form>` in the portal layout header
(no JS, submits on Enter), queries Player (characterName/gameUid/Discord
username/email), Team (name/tag) and Event (title/mode) in parallel and
lists matches grouped by type, each linking straight to its detail page.
Doesn't preserve the typed query in the header box on reload — layouts
don't receive `searchParams` in the App Router, so it always starts empty.

## Player picker

`src/components/portal/player-picker.tsx` — a searchable + scrollable
combobox (text input + filtered `<ul>` dropdown, submits a hidden `name`
input) used anywhere staff pick one player from a long list, e.g.
`RewardForm`'s Player field. Swap in over a plain `<select>` whenever the
option list is the full player roster rather than a short per-event list
(`ResultsForm`'s placement dropdowns stay native `<select>` — entrants are
scoped to that event's roster, short enough that scrolling alone is fine).

## UI/UX layer

- **Toasts** — `<ToastProvider>` (`src/components/toast/toast-provider.tsx`)
  is mounted once in `(site)/layout.tsx`, so every page under the public
  site/`/me`/`/portal` can call `const toast = useToast(); toast("Saved.")` /
  `toast("...", "error")`. `SettingsForm` is the reference conversion (its
  old inline `Saved.`/error text is gone, replaced by a toast fired from a
  `useEffect` that only reacts when the `useActionState` result object
  actually changes). Other forms still using inline `state.ok`/`state.error`
  text haven't been migrated yet — adopt the same one-`useEffect` pattern
  incrementally rather than assuming it's done everywhere.
- **Page transitions** — `<PageWipe>` (`src/components/page-wipe.tsx`,
  mounted in `(site)/layout.tsx` next to `<NavProgress>`) is a curtain-wipe:
  a full-screen panel slides in from the left the instant an internal link
  is clicked, then slides the rest of the way off to the right once the
  destination page's data has actually landed (`pathname`/`searchParams`
  change), revealing it underneath. It's a **standalone overlay that never
  touches page content** — deliberately, after the previous fade-based
  `PageTransition` (now removed) caused two real bugs by wrapping
  `{children}`: a `key={pathname}`-remounted version forced a full
  unmount/remount every navigation and raced with `<ScrollReveal>`, and even
  the non-remounting class-toggle version that replaced it could flash
  content at full opacity for a frame before its animation class reapplied.
  `PageWipe` sidesteps that whole failure mode by animating a `position:
  fixed` element that sits in front of everything, same idea as
  `NavProgress`, not something the actual page tree passes through. Uses
  `useLayoutEffect` for its own class swap (`wipe-cover`/`wipe-reveal` in
  `globals.css`) with the same remove→reflow→re-add pattern, plus a 4s
  failsafe back to idle if a click never turns into a navigation. Skipped
  under `prefers-reduced-motion`. Also listens for `popstate` (browser
  back/forward, including a mobile edge-swipe-back gesture) and triggers
  the same wipe — that doesn't fire a click on an `<a>`, so without this it
  would just snap to the previous page with no transition. The edge-glow
  strip (`.page-wipe-edge`) is only rendered while `status !== "idle"` —
  its `box-shadow` blur bleeds ~16px past the element's own bounds, so
  always rendering it (even "off-screen") left a persistent thin glow
  pinned to the left edge of every page, most visible on narrow/mobile
  viewports.
- **Landing intro loader** — `<IntroLoader>`
  (`src/components/landing/IntroLoader.tsx`, mounted first inside
  `Landing.tsx`'s root) is a separate thing from `PageTransition`: a
  full-screen boot-sequence overlay (wordmark, fill bar, blinking-cursor
  terminal line — matches the landing's own `.term`/scanline aesthetic, its
  own `landing.module.css` palette, not the app's dark/crimson tokens) shown
  once on the site's actual entry point, not on every page. A module-level
  `introShown` flag (not React state) means it only plays on a genuine fresh
  load — surviving client-side navigation away from and back to `/` within
  the same session without replaying. Skipped entirely under
  `prefers-reduced-motion`.
- **Top loading bar** — `<NavProgress>` (`src/components/nav-progress.tsx`,
  mounted in `(site)/layout.tsx` inside a `<Suspense>` since it reads
  `useSearchParams()`) is the NProgress-style bar: since App Router exposes
  no navigation-start event, it starts growing the instant an internal
  `<a>` is clicked (a same-origin, same-tab, non-download link to a
  different path/query) and snaps to 100%+fades once `usePathname()` +
  `useSearchParams()` actually change — i.e. the next page's data has
  landed. A 5s failsafe clears it if a click never becomes a navigation.
  Covers the gap `loading.tsx` skeletons don't — those only exist on a
  handful of routes; this fires on every internal link everywhere.
- **Skeleton loading** — `<Skeleton>`/`<TableSkeleton>`/`<TileSkeleton>`
  (`src/components/skeleton.tsx`) back a handful of route `loading.tsx`
  files (`/portal`, `/portal/players`, `/portal/events`, `/portal/rewards`,
  `/events`) using Next's App Router streaming convention — not every portal
  route has one yet, add more the same way as they're needed. `<Skeleton>`
  itself uses a diagonal crimson-tinted shimmer sweep (`.skeleton-shimmer`
  in `globals.css`, a `::after` gradient animated via `transform`) rather
  than a flat opacity pulse — falls back to a static dimmed block under
  `prefers-reduced-motion`. Each of those 5 pages wraps its main data fetch
  in `minDelay()` (`src/lib/min-delay.ts`) — the app and Postgres share a
  box, so most of these queries resolve in a few ms, too fast for the
  Suspense fallback to ever actually be visible; `minDelay` holds the
  promise's resolution back to a 400ms floor without adding anything on top
  of a fetch that's already slower than that. A deliberate trade-off (every
  load on these 5 routes takes at least 400ms now, even a trivially fast
  one) made because the skeleton being genuinely invisible was worse.
- **Live countdown** — `<LiveCountdown target={isoString} fallback={...} />`
  (`src/components/live-countdown.tsx`) renders `fallback` (the existing
  `relative()` string) until mounted and swaps to a ticking `Dd HH:MM:SS`
  clock — used on the event detail page's eyebrow line and `<EventCard>`'s
  badge, only while the event hasn't started yet.
- **Signup "hype meter"** — `<EventCard>` renders a thin fill bar under the
  slot count when `maxSlots` is set (`signups / maxSlots`), pulsing amber
  past 85% full and solid amber at capacity.
- **`<CopyButton>`** (`src/components/copy-button.tsx`) — a small
  copy-to-clipboard button with a checkmark micro-animation on success; used
  for the team invite code (`team-forms.tsx`). Deliberately not applied to
  the Discord invite link — that's a click-to-open link, not text someone
  needs to copy.

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
