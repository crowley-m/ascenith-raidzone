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

## Portal event detail page

`/portal/events/[id]` — the header toolbar is grouped by how often each
action is used, not all crammed into one row: the top strip keeps only
"Public page", "Clone", and a status badge ("Discord: N channels" /
"Discord archived") plus "Build Discord space" when there's no space yet.
Sync channels / Resync event roles / Repost announcement (all
Discord-space actions staff reach for together while working on channel
content) live in a small toolbar at the top of the **Channels** panel
itself instead, right next to what they act on. "Archive Discord space"
(and its "Re-lock private" retry) moved into the Danger zone at the bottom
next to Delete event — it's rare and semi-destructive (locks everything
private), not a everyday action.

- **Per-channel change tracking** — `Event.discordContentHashes` (Json,
  `{ channelName: "<serialized payload>" }`) records what was actually last
  pushed to each channel. `pushEventChannelContent()` (`portal/actions.ts`)
  recomputes every channel's payload via `eventChannelPayloads()`, compares
  it against the stored hash, and **skips the Discord call for anything
  unchanged** — editing one field and saving now only touches that one
  channel's message, not a silent re-edit of every channel every time.
  `opts.only` restricts a push to specific channel names (a single-channel
  push shouldn't also re-touch the pinned channel-guide index);
  `opts.force` bypasses the hash check — used by `reannounceEventChannels`
  (the old messages were just deleted, so a "nothing changed" false
  positive would leave a channel with no message at all) and always true
  for `pushSingleEventChannel`, since clicking "Push now" is itself the
  signal to push regardless.
- **"Push now" per channel** — `pushSingleEventChannel(eventId, name)` pushes
  just one channel's content on demand, without touching the rest or saving
  the whole event form. `EventChannelsManager` shows each content channel's
  live status — "not posted" / "changed, not pushed" / "up to date"
  (`event/[id]/page.tsx` computes the pending set the same way, comparing
  fresh payloads against `discordContentHashes`) — and only shows "Push
  now" when there's actually something to push. Each channel is its own
  bordered card (name + status badge on top, actions in their own row
  below a divider, "Remove" pushed to the far right) rather than one dense
  line per channel — the original single-line layout packed name, status
  text, and every action link together and read as a wall of text once a
  channel actually had something to say.
- **Inline content editor** — "Edit content" expands a textarea right
  inside that channel's own card instead of jumping to the field's spot on
  the big Edit form further down the page. `saveEventChannelContent(eventId,
  name, content)` (`portal/actions.ts`) maps the channel name to its Event
  field via `CHANNEL_CONTENT_FIELD` (mirrors the mapping in
  `eventChannelPayloads()` — e.g. `rewards` → `rewardsMd`), saves it, then
  pushes straight to Discord in the same call (`pushEventChannelContent`
  with `only`+`force`) — one Save does both, no separate "Push now" needed
  afterward. `page.tsx` builds the `content: Record<string,string>` prop
  (current raw text per channel) that pre-fills the textarea on open. The
  big Edit form's own copy of these fields can go stale in its uncommitted
  client state until the page is hard-reloaded if you edit both at once —
  a rare collision, not worth a forced remount that would risk wiping
  someone's in-progress typing in that form instead.
- **"Sync channels" reports what happened** — `syncEventChannels` now
  returns `changed: string[]`; the button shows "Already synced — nothing
  changed." when nothing did, or names what got updated / how many new
  channels were created, instead of a flat "Channels updated" every time.
- **Team roster collapse** — each registered team (and the "Free agents"
  block) on the Registrations tab is now a `<details>`, collapsed by
  default — with several teams registered the roster used to render every
  member row for every team at once regardless of scroll position.
  `<TeamRosterList>` (`src/components/portal/team-roster-list.tsx`) is a
  client component holding an `allOpen: boolean | undefined` state — passed
  straight through as each `<details>`'s `open` prop, `undefined` leaves
  every team's own manual toggle alone (React only forces the DOM attribute
  when the prop value itself changes between renders), so "Expand all" /
  "Collapse all" can force every team open or shut without fighting
  individual clicks in between.
- **Sticky jump-nav** — same pattern as the event *form*'s own jump-nav
  (`#basics`/`#brief`/`#discord`), one level up: a `sticky top-0` bar
  linking `#registrations`/`#bracket`/`#results`/`#previews`/`#channels`/
  `#edit`/`#danger`, each entry conditionally shown only when that section
  actually renders for this event/permission level.
- **Edit form collapsed by default** — the whole Edit card is a `<details
  open={event.status === "DRAFT"}>` — open automatically for a still-being-
  set-up draft, collapsed for anything already published, since a huge
  form sitting fully expanded at the bottom of every settled event's page
  added most of the page's scroll length for no reason once it's done.
  "Danger zone" lives inside it (`id="danger"`) — navigating to that anchor
  auto-expands the ancestor `<details>` in every modern browser.
- **Attendance-at-a-glance** — a slim 2-segment bar (attended / no-show,
  the remainder implicitly "not marked yet") under the stat tiles, next to
  a small legend — a quick read without doing the subtraction from the raw
  counts yourself.
- **Unsynced-channel banner** — reuses the same `pendingChannels` computed
  for the Channels panel (see above) to show a banner right under the page
  header ("N channels with unpushed content changes") with a jump link to
  `#channels`, instead of only surfacing that state after scrolling all the
  way down to the panel itself.

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

## Discord server management (`/portal/discord`)

General-purpose Discord categories/channels staff create directly from the
portal — `discord:manage` permission (ADMIN+, same tier as `event:manage`).
Deliberately separate from the per-event space builder
(`src/lib/event-space.ts` / `buildEventSpace`), which creates a
category+channel set scoped to one event and tears it down when it's
archived/deleted — this section is for standalone, persistent server
organization (a community hangout channel, a staff-only channel, etc.) with
no event attached. `DiscordCategory` / `DiscordManagedChannel` (schema)
track only what was created **through this page** — a category or channel
set up manually in Discord never appears here and this tool never touches
it (`deleteDiscordCategory` explicitly deletes each of its own channels on
Discord first, since deleting a category on Discord does not cascade to its
children). Each channel's visibility is a plain list of Discord role ids
(`DiscordManagedChannel.roleIds`, a JSON string array) — @everyone is always
denied at creation and on every edit (`managedChannelOverwrites()` in
`src/lib/discord.ts` rebuilds the full permission-overwrite set from
scratch each time, the same pattern `applyEventChannelPerms` uses); an empty
role list means staff/bot only. `saveDiscordCategory`/`saveDiscordChannel`
follow the same create-or-update-by-optional-`id` shape as `saveFaction`,
and the page itself mirrors `/portal/factions`' `<details>`-accordion
layout (`ConfirmButton` for deletes).

Four things added on top of the initial version, since it's meant to be the
one place tracking never silently drifts from reality:

- **Honest deletes** — `deleteChannel()` (`src/lib/discord.ts`) now returns
  whether the thing is actually gone (`true` on success *or* an already-404,
  `false` on a real failure) instead of firing-and-forgetting. The delete
  actions only drop a DB row once that's confirmed — a failed Discord call
  (missing bot perms, rate limit) leaves the row in place so staff see it
  and can retry, rather than losing track of a channel that still exists.
  `deleteDiscordCategory` deletes all its channels first and keeps whatever
  succeeded even if the category deletion itself then fails.
- **Drift detection** — the page live-checks every tracked `discordId`
  against Discord on each load (`channelExists()`, parallel `Promise.all`,
  no schema flag) and badges anything that's gone missing (deleted directly
  in Discord, bypassing this page) as "Not found on Discord" rather than
  just looking fine. Deleting an already-missing one succeeds instantly
  (the 404-is-success case above), so it doubles as the cleanup path.
- **Move a channel to a different category** — `DiscordChannelForm`'s edit
  mode shows a category `<select>` when editing (only when there's more
  than one category to move to); `saveDiscordChannel` calls
  `setChannelParent()` and appends it at the end of the new category's
  order.
- **Reordering** — both models carry a swap-based `position` (new rows
  append at the end of their siblings). `moveDiscordCategory`/
  `moveDiscordChannel` swap one row with its immediate neighbor in a
  transaction, then best-effort mirror the swap to Discord's own
  `position` field via `setChannelPosition()`. `<MoveButtons>`
  (`src/components/portal/discord-move-buttons.tsx`) is the shared ↑/↓
  control, used inside a `<summary>` so it calls `stopPropagation` to avoid
  also toggling the `<details>` open/closed.
- **Category permissions** — categories now carry their own
  `roleIds` too (`DiscordCategory.roleIds`, same shape as a channel's),
  applied via `categoryOverwrites()` (view-only — there's nothing to "send"
  or "connect" to on a category, unlike `managedChannelOverwrites()`).
  Originally categories were created with no explicit overwrites at all.
  **This only controls the category header itself** — each channel
  underneath still gets its own explicit overwrites at creation
  (`createManagedChannel`) rather than inheriting from the category, so
  restricting a category doesn't by itself restrict what's in it; the UI
  copy on `DiscordCategoryForm` says so — **unless** the channel opts into
  "sync to category" below.
- **Sync to category** — `DiscordManagedChannel.synced`. A synced channel's
  `roleIds` always mirrors its category's rather than being set
  independently — the role checkboxes disable in the UI while it's on.
  Editing a category's roles (`saveDiscordCategory`) cascades to every
  synced child via `cascadeSyncedChannelRoles()`; moving a synced channel to
  a different category (`saveDiscordChannel`) re-syncs it to the *new*
  category's roles in the same save, not the old one.
- **Seed message on channel creation** — the "Add channel" form (text
  channels only) and the bulk channel list on "New category" both take an
  optional welcome message, posted (and optionally pinned) once via the
  same `postToChannel`/`pinMessage` helpers event channels use to seed
  content — `seedChannelMessage()` in `portal/actions.ts`. Fire-once, not
  stored anywhere — re-editing a channel later has no way to re-send it.
- **Bulk channels on category creation** — `DiscordCategoryForm`'s create
  mode has a card-by-card channel builder (`ChannelListBuilder`/
  `ChannelCard`, see "form UX" below) — each card becomes a text or voice
  channel, synced to the roles just picked for the category. For anything
  needing its own roles instead, create it via "Add channel" afterward.
- **Duplicate a category** — `duplicateDiscordCategory` clones a category
  (name suffixed " (copy)", same `roleIds`/note) and every one of its
  channels (own roles, `synced` flag, and topic preserved — a duplicated
  synced channel follows its *own* new category, not the original) into a
  fresh set on Discord. For recurring setups (a seasonal category) without
  rebuilding by hand each time. One channel failing to clone doesn't abort
  the rest.
- **Channel topic** — `DiscordManagedChannel.topic` (text channels only),
  settable per card in the bulk builder and on the standalone add/edit form.
  `setManagedChannelTopic()` (`src/lib/discord.ts`) patches it independently
  of a rename.
- **Staff-only category note** — `DiscordCategory.note`, a short free-typed
  line shown only in the portal (never posted to Discord) — what a category
  is *for*, useful once there are a dozen of them and an older one's purpose
  isn't obvious anymore.
- **Role-membership counts** — `roleMemberCounts()` (`src/lib/discord.ts`)
  paginates the guild's member list and tallies role ids, shown as `· N`
  next to each chip in `<DiscordRolePicker>`. Best-effort: the "List Guild
  Members" REST endpoint needs the privileged Server Members intent enabled
  for the bot application, which not every setup has — on any failure
  (403 included) this returns `null` and the picker just renders without
  counts rather than breaking the page.
- **Duplicate-name guard** — client-side only, non-blocking. The bulk
  builder flags cards whose (post-slugify) names collide with each other;
  the single add/edit form flags a name that collides with another channel
  already in the target category (`existingNamesByCategory`, computed
  server-side in `discord/page.tsx` from each category's live channel list).
- **Auto-slugify channel names** — `slugifyChannelName()`/
  `slugifyChannelNameFinal()` (`src/lib/discord-slug.ts`) live-lowercase and
  hyphenate as staff type a channel name (not a category name — those keep
  spaces/emoji), mirroring what Discord's own client does. The live version
  doesn't trim a trailing hyphen (would eat the separator the instant a
  space is typed before the next word); the final trim runs on blur.
- **Creator badge** — `createdById`/`createdAt` were already stored but
  never shown; `discord/page.tsx` now formats "Created by X on <date>" per
  category/channel (masked through `maskName`/`hiddenActorIds` from
  `staff-mask.ts`, same owner-invisibility rule as everywhere else) as a
  hover tooltip (`title` attribute on a small ⓘ) — no extra JS needed.
- **Category-wide role bulk-apply** — `applyCategoryRolesToChannels`
  pushes the category's *current* `roleIds` onto every channel in it right
  now, once — distinct from "sync to category" (`synced`), which keeps a
  channel following the category's roles going forward and doesn't touch
  channels that don't have it on.
- **Bulk-select channels** — `<DiscordManagementList>`/`<CategoryBlock>`
  (`src/components/portal/discord-management-list.tsx`, a client component;
  page.tsx now just fetches data and formats it into
  `CategoryVM`/`ChannelVM` view-models) adds a checkbox per channel row; a
  toolbar appears once ≥1 is selected with "Move to…" + Move
  (`bulkMoveDiscordChannels`) and "Delete selected" (`bulkDeleteDiscordChannels`,
  same honest-delete semantics as a single delete).
- **Search/filter box** — appears once there are more than 6 categories;
  plain client-side text filter over category and channel names
  (`DiscordManagementList`'s `query` state) — matching categories show all
  their channels, a non-matching category still shows if any one of its
  channels matches.
- **"Recently deleted" recovery** — `DiscordCategory.deletedAt`/
  `DiscordManagedChannel.deletedAt`: a delete now tombstones the DB row
  (sets `deletedAt`) instead of hard-deleting it, once the Discord side is
  confirmed gone. The main listing query filters `deletedAt: null`;
  `discord/page.tsx` separately queries tombstones from the last 3 days
  into a "Recently deleted" section. `restoreDiscordCategory`/
  `restoreDiscordChannel` recreate the category/channel **fresh** on
  Discord (new id, same name/roles/kind/topic) and clear `deletedAt` —
  restoring a category also restores every channel that was deleted
  alongside it. This is a rebuild, not a true undo: message history and the
  original Discord ids are gone for good either way. Restoring a
  standalone-deleted channel refuses if its category was deleted too
  ("restore the category first").

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
- **Loading & transition system** — three independent pieces, each solving a
  different moment. All three went through multiple discarded attempts
  before landing here (previewed side-by-side as working demos in an
  artifact before building any of them for real — worth doing again if this
  area changes further, rather than iterating live).
  - **Intro loader** — `<IntroLoader>` (`src/components/landing/IntroLoader.tsx`,
    mounted first inside `Landing.tsx`'s root) is a full-screen **glitch-decode**
    boot sequence shown once, only on the site's actual entry point (not on
    every page): the wordmark resolves out of scrambled characters via a
    `requestAnimationFrame` loop mutating `textContent` directly through a
    ref (safe alongside React's own re-renders here since the JSX output for
    that node never changes, so React's diff never overwrites it), with a
    red scan-band flicker and a "Status: Online" line fading in after. Uses
    the landing's own palette (`landing.module.css`), not the app's tokens.
    A module-level `introShown` flag (not React state) means it only plays
    on a genuine fresh load, surviving client-side nav away from and back to
    `/` without replaying. Skipped under `prefers-reduced-motion`.
  - **Page transition** — `<PageWipe>` (`src/components/page-wipe.tsx`,
    mounted in `(site)/layout.tsx` next to `<NavProgress>`) is a **short
    chaser-wipe**: a crimson bar with a runner icon on its leading edge
    sweeps across on click, sweeping the rest of the way off once the
    destination page's data has landed. This is a second attempt — the
    first `PageWipe` had a persistent `box-shadow` glow-bleed artifact and
    made back/forward navigation feel stuck (a `force-dynamic` page's
    back-nav isn't actually instant — no client cache to fall back on, so
    the covering panel sat there for the real fetch time, not just an
    animation artifact) badly enough to be removed outright. This version:
    deliberately short durations (170ms cover / 180ms reveal), the
    edge-glow removed entirely rather than fixed (nothing renders at rest,
    so there's nothing to bleed), a back/forward nav (`popstate`, via an
    `isBackNav` ref) skips the reveal-out animation and snaps clear the
    instant data lands — though a genuinely slow back-nav fetch is still a
    genuinely slow fetch, no animation fixes that — and desktop-only
    (`≥1024px`, matching `PortalNav`'s own cutoff, guarded at both the JS
    trigger point and a CSS `max-width: 1023px` backstop) since it got in
    the way on mobile before. Standalone overlay, never wraps page content
    — that's what broke `ScrollReveal` twice with the earlier fade-based
    `PageTransition` (removed).
  - **Loading indicator** — `<NavProgress>` (`src/components/nav-progress.tsx`,
    mounted in a `<Suspense>` since it reads `useSearchParams()`) is a
    **HUD corner readout**, not a bar: a small bordered box, bottom-right,
    cycling `LINKING…` / `SYNCING…` while `status === "loading"` and
    showing `READY` briefly once the pathname/search actually change,
    before fading. Same click-detection mechanics as before (App Router has
    no navigation-start event, so this starts the instant an internal `<a>`
    is clicked; a 5s failsafe clears it if a click never becomes a
    navigation) — only the visual changed, from a plain hairline / a
    "deadline meme"-styled bar (chaser+target icons, tried and reverted) to
    this HUD box.
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

- **`/portal/discord` form UX** — `<DiscordRolePicker>` (`src/components/portal/discord-role-picker.tsx`)
  is the one role selector both `DiscordCategoryForm` and `DiscordChannelForm` use — checkbox-driven
  pill/chip toggles (`peer` + `sr-only` input, visual state on the sibling `<span>`, optional `· N`
  member count) instead of a cramped flat-wrapped row of native checkboxes, same `name="roleIds"`
  multi-value convention. The category form's "Channels to create" is a card-by-card list
  (`ChannelListBuilder`/`ChannelCard`, client `useState` array of `{id, name, kind, topic, message,
  pin, showDetails}` rows) instead of a newline-split textarea — each card has a text/voice toggle
  and, for text, a collapsible "+ Add topic / welcome message" section (own topic + message + pin,
  not one shared message for every bulk-created channel). Submitted as five index-aligned arrays —
  one `channelNames`/`channelKinds`/`channelTopics`/`channelSeedMessages`/`channelPinSeeds` input
  tuple per card, in DOM order — `saveDiscordCategory` zips them back into per-channel rows with
  `formData.getAll(...)` on each name (a collapsed/voice card still emits the empty hidden inputs so
  every array stays the same length and positionally aligned).

## Portal-wide UI/UX pass

A follow-up audit (after the `/portal/discord` and event-detail-page polish
above) covered every other portal page for the same class of issues —
uncapped/unpaginated lists, free-text-list inputs, buried confirmation on a
destructive action, a long form with no way to save except scrolling to the
bottom. Eight fixes landed from it:

- **Teams / Events lists paginate** — both now match `players/page.tsx`'s
  `skip`/`take: 100` + "X–Y of Z" + Page N/M pattern (previously unbounded
  `findMany`s). The events list also gained the same search+status-pill
  filter bar `players` already had — status counts via `groupBy`. Its
  "featured event" computation (same rule as the landing page: ongoing
  published event, else soonest upcoming) now runs its own small unfiltered
  `PUBLISHED`-only query rather than being derived from the current page's
  own filtered/paginated result set, so it stays correct while browsing
  page 2 or a status filter.
- **Rewards log paginates** — `/portal/rewards` was silently capped at 100
  rows with nothing indicating older ones existed past that; now the same
  `skip`/`take` + count + Page N/M pattern, `eventId` filter preserved
  across pages.
- **Season "Match videos" is a card builder** — `season-form.tsx`'s
  `VideoListBuilder` replaces the `url | optional title`-per-line textarea
  with add/remove cards (separate URL + Title inputs), matching the
  Discord category form's `ChannelListBuilder` pattern. Submitted as
  index-aligned `videoUrls`/`videoTitles` arrays; `saveSeason` builds rows
  via `buildSeasonVideos()` (`src/lib/validation.ts`, replaces the old
  `parseSeasonVideos` text-parser) instead of splitting a string. The
  builder's own React state can't be cleared by the form's native
  `reset()` on a successful create, so `SeasonForm` bumps a `key` on it
  (`videoBuilderKey`) alongside the reset to force a remount.
- **Settings gets sections + a jump-nav** — `settings-form.tsx`'s ~15
  unrelated fields were one flat list; now grouped under Discord / Events /
  Roles & badges / Social / Rules pages headings with a sticky jump-nav,
  the same `sticky top-0` bar pattern as the event form's.
- **Player detail page caps long lists** — event history, notes, and flags
  on `/portal/players/[id]` now go through `<CappedList>`
  (`src/components/portal/capped-list.tsx`, generic: takes pre-rendered
  `<li>` children, shows the first `cap` (10) plus a "+N more" expand
  toggle) instead of rendering everything at once for a long-tenured
  player. `<PlayerRewardList>` got the same cap/expand built directly into
  its own state instead, since it already owns its list rendering.
- **Banning a player needs confirmation** — `<PlayerStatusControl>`'s 4
  status buttons looked identical and switched on one click; the BANNED
  button is now styled distinctly (red, matching the red badge used for
  BANNED status elsewhere) and clicking it (not the other 3) prompts a
  confirm describing the cascade (withdraws signups, revokes Discord
  access, strips roles) before calling `setPlayerStatus`.
- **Event form: sticky save, dimmed skipped channels** — the jump-nav
  (`#basics`/`#brief`/`#discord`) now also carries the Save/Create button
  (`ml-auto` in the same sticky bar), so saving never requires scrolling
  through the ~500-line form first. Each Discord-channel content block
  (`rules` and the 7 `channelKey` fields further down) dims to `opacity-50`
  when its `channelPlan` checkbox is unchecked, so a skipped channel's
  full-height textarea doesn't read as "about to be built" while scanning
  past it.

## Public / player-facing UI/UX pass

A second audit round, same method as the portal-wide one above but scoped to
the public showcase pages and `/me/*` (the landing page itself is exempt —
its own separate design system per the Stack notes). Five fixes:

- **Public event page: mobile CTA order + jump-nav** — `events/[id]/page.tsx`'s
  sign-up sidebar (`<aside>`) is the second grid column on desktop
  (`lg:grid-cols-[1fr_320px]`) but, with no mobile-specific ordering, fell to
  the very bottom of the DOM on a phone — past poster, rewards, gameplay,
  schedule, rules, the whole roster — before "Claim a slot" ever appeared.
  `order-first lg:order-2` on the aside puts it first on mobile, second (its
  original desktop position) at `lg`. The page also gained a sticky jump-nav
  (`Brief`/`Rewards`/`Rules`/`Roster`(or `Teams`)/`Bracket`, each link only
  shown when that section actually renders) — `sticky top-16` (not `top-0`)
  since `<SiteHeader>` itself is `sticky top-0` at `h-16`; every anchored
  section carries `scroll-mt-32` to clear both stacked bars.
- **`/winners` caps "Event results"** — was an unbounded `findMany` (every
  event with placements, ever); now `take: 12` + a separate `db.event.count`
  so the kicker line's total stays accurate even though the list is capped,
  with a "View all events →" link to `/events` (an existing page, not a new
  one) once there are more than what's shown.
- **`CappedList` on the public side** — `src/components/capped-list.tsx` is
  a non-portal duplicate of `src/components/portal/capped-list.tsx` (same
  "first N + N more" behavior, kept separate since portal components and
  public ones live in their own folders by convention here) — its "+N more"
  renders as a plain teal text link rather than the portal version's bare
  button, since it has to sit naturally both inside a flex-wrap badge list
  and inside a `divide-y` row list. Used on the public player profile's
  "Events competed in" badge wall and each faction's member roster on
  `/factions` (`cap={20}`) — both previously rendered every item at once.
- **`/me/rewards` table scrolls instead of crushing** — the 5-column rewards
  table had no `overflow-x-auto` wrapper (every other data table in the app
  does), so it would either force page-level horizontal scroll or crush
  columns unreadably at phone width. Wrapped the same way as everywhere
  else, with a `min-w-[520px]` floor so columns don't crush before the
  scroll container kicks in.

## Correctness pass on this session's newer code

A bug-hunting audit (distinct from the two UI/UX passes above) targeted the
code added this session that hadn't had a correctness review yet — the
`/portal/discord` manager and the event content-hash sync system. Five
fixes:

- **Announcement embed's slot count was permanently stuck at 0** —
  `eventChannelPayloads()` hardcoded `signupCount: 0` for the `#announcement`
  embed; nothing on the channel-space push path (`pushEventChannelContent`)
  ever supplied the real count (only the legacy no-space-yet announcement
  path did, calling `eventEmbed()` directly). `eventChannelPayloads(ev,
  signupCount)` now takes it as a parameter — pure function, no DB access of
  its own, so every caller supplies its own live count:
  `pushEventChannelContent` queries `db.eventSignup.count(...)` fresh,
  `discord/[id]/page.tsx` passes `confirmed.length` to both `DiscordPreview`
  and the `pendingChannels` hash comparison (moved `confirmed`'s
  declaration earlier in the file so it's available before that
  computation — it must use the *exact* same count `pushEventChannelContent`
  will use, or the announcement channel would never hash-match even right
  after a push).
- **A failed channel-topic update still got written to the DB** —
  `saveDiscordChannel` fired `setManagedChannelTopic()` without awaiting it,
  unlike the same function's rename/roles handling (both awaited, both
  block the DB write on failure). Now awaited and blocking, same as those.
- **Deleting a category could resurrect an unrelated channel deleted days
  earlier** — the cascade-delete's `updateMany` stamped `deletedAt` on
  *every* channel under the category with no `deletedAt: null` guard,
  overwriting an already-tombstoned channel's original timestamp; combined
  with `restoreDiscordCategory`'s child-filter (`c.deletedAt` truthy, no
  further check), restoring the category later would recreate that
  long-forgotten channel too. Fixed both ends: the `updateMany` now only
  touches still-live channels, and the restore filter only recreates
  children whose `deletedAt` lands within 60s of the category's own (i.e.
  actually tombstoned in the same cascade-delete, not independently).
- **A failed "sync to category" role push reported success** —
  `cascadeSyncedChannelRoles()` silently skipped the DB update for any
  synced channel whose Discord role PATCH failed, and `saveDiscordCategory`
  returned `{ ok: true }` regardless. Now returns which channels failed;
  `saveDiscordCategory` surfaces that as an error (category itself still
  saved — the message says so) instead of hiding the drift.
- **Position numbering could collide under concurrent writes** — several
  call sites (`saveDiscordCategory`/`saveDiscordChannel` create,
  `bulkMoveDiscordChannels`, `restoreDiscordCategory`,
  `restoreDiscordChannel`, `duplicateDiscordCategory`) read
  `count(...)` then inserted/updated with that value outside a transaction
  — two near-simultaneous actions on the same category could both land on
  the same position (harmless — no unique constraint — but breaks the
  intended order until a manual reorder). Each now wraps the count + write
  in `db.$transaction(...)`; `bulkMoveDiscordChannels` specifically does
  the Discord API calls first, then a single transaction for all the
  position writes together, so the transaction isn't held open across
  network round-trips. Narrows the race window rather than fully
  eliminating it (Postgres's default Read Committed isolation doesn't
  guarantee serializability) — proportionate given how rarely two staff
  members touch the same category within the same second.

## Second correctness pass — team lifecycle, bot reminders, bracket, broadcast

A follow-up bug-hunting round covering areas the first correctness pass
didn't touch (that one was scoped to `/portal/discord` + event content-hash
sync). Six more fixes:

- **Staff-kicking a team member did less cleanup than the self-service
  version it mirrors** — `staffKickTeamMember` only deleted the
  `TeamMember` row; unlike `kickMember` (`me/team/actions.ts`) it never
  called `dropFromTeamEvent` (now exported from that file and imported into
  `portal/actions.ts`), `syncMemberRolesByPlayer`, or `revokeTeamVoice` — so
  a staff-kicked player kept their `EventSignup` pointed at the team, the
  event's Discord access role, and the team's voice-channel role.
- **Disbanding a full team never promoted the waitlist** — `disbandTeam`
  and `staffDisbandTeam` both `db.team.delete` (which `onDelete: SetNull`s
  every member's `EventSignup.teamId`, so they become teamless free agents
  rather than being withdrawn — left as-is, that's a reasonable outcome
  already handled by the existing free-agent grouping) but neither called
  `promoteWaitlist(eventId)` afterward, so a slot a disbanded team frees up
  never actually reaches a waitlisted team. Both now call it.
- **A broken announcement channel could silently kill an event's entire
  reminder** — the bot's reminder `tick()` used one try/catch around the
  channel post *and* the roster-DM loop *and* the short-team leader-nudge
  loop *and* the `reminderSentAt` write, all for one event. A channel fetch
  failure (deleted channel, lost access) threw straight past the DM/nudge
  loops (which don't depend on that channel at all) and left
  `reminderSentAt` unset — so the next tick retried the same broken channel
  and re-DMed the whole roster from scratch, indefinitely. Restructured:
  `reminderSentAt` is now written *first*, before any of the three
  best-effort steps, each of which is now independently try/caught — the
  event is marked handled exactly once regardless of which step(s) fail,
  and one broken piece can't block the others.
- **A sparse bracket could permanently stall with no possible champion** —
  `generateBracket`'s round-1 bye auto-advance only handles one-side-filled
  pairings; when byes outnumber real entrants in a given pairing (e.g. 3
  entrants in a size-8 bracket, which the standard seed order does produce
  for some entrant counts), a round-1 match can end up with *both* sides
  empty — no possible winner, so that match and everything above it in the
  tree can never be decided. Now rejected up front with a clear error
  ("N entrants is too few for a size-N bracket") before anything is
  written, rather than silently creating an unwinnable bracket.
- **A failed broadcast post/edit could orphan its just-uploaded image** —
  `postBroadcast`/`editBroadcast` upload the image via `createMediaAsset`
  before the Discord call; if that call then fails (or, for post, if
  Discord simply isn't configured), the function returned an error but the
  freshly-created `MediaAsset` was never cleaned up. Both now delete the
  asset they just created on that failure path — tracked via a separate
  `uploadedAssetUrl` (not the general `imageUrl`, since that can also hold
  a pasted external URL or, on edit, the pre-existing saved one, neither of
  which this cleanup should ever touch).

## Third correctness pass — permission bypass, data exposure, session staleness

A third bug-hunting round targeting areas the first two hadn't touched
(auth/session, API routes, and the remaining portal action groups). Three
fixes, the first a real permission-bypass:

- **A Moderator could "ban" a player through the Flag form with none of a
  ban's teeth** — `addFlag`'s `type: "BAN"` case wrote `status: "BANNED"`
  straight to the DB, gated only by `flag:write` (MODERATOR) — bypassing
  both the ADMIN-only `player:status` permission the real ban control
  requires, and every enforcement step a real ban does (withdrawing
  signups, revoking Discord access, `promoteWaitlist`, role sync). The
  player ended up *labeled* BANNED while still fully signed up and still
  holding Discord access — worse than not flagging it, since staff now
  believe they're actually banned. The ban logic itself is now
  `banPlayer()`, a shared helper both `setPlayerStatus` (the real control)
  and `addFlag` call — `addFlag` pre-checks `can(actor.role,
  "player:status")` before allowing the BAN type and returns a friendly
  error ("ask an Admin, or log this as a Warning instead") rather than
  silently downgrading to a label-only ban.
- **A draft event's bracket was publicly fetchable** —
  `/api/events/[id]/bracket` had no status check at all, unlike every
  other public event surface (the event page, the calendar route), all of
  which gate to `PUBLISHED`/`COMPLETED`/`CANCELLED`. Anyone who knew or
  guessed a draft event's id could see its bracket (team/player names)
  before the event was ever meant to be visible. Now checks status the
  same way the event page does before calling `bracketForEvent`.
- **Session staleness window tightened from 10 minutes to 1** — `auth.ts`'s
  `jwt` callback only re-reads a user's role/ban status from the DB once
  the cached copy is older than this window (deliberately, to avoid a DB
  round-trip on every request — see the comment there). 10 minutes was too
  long a gap between a staff demotion or a player ban and it actually
  taking effect against that user's already-open session; 1 minute keeps
  the same no-DB-hit-per-request design while capping the exposure far
  tighter. Not a move to instant revocation (that would need a real
  invalidation mechanism — database sessions or a revocation list — which
  is a bigger change than this app's scale warrants right now), just a
  tighter version of the existing trade-off.

## Accessibility pass

A dedicated a11y audit (distinct from the two density/layout UI/UX passes and
the three correctness passes above) covered keyboard navigation, focus
management, color contrast, and form labeling across the portal and public
pages (landing page exempt, own design system). Nine fixes:

- **Skip links** — `(site)/layout.tsx` and `portal/layout.tsx` each get a
  `sr-only focus:not-sr-only` "Skip to content" link as the first focusable
  element, jumping past `SiteHeader`'s 7 links (and, on portal pages,
  `PortalNav`'s 14 more) straight to `#main-content` / `#portal-content`
  (`tabIndex={-1}` so the target itself is programmatically focusable
  without joining the normal tab order).
- **Mobile nav overlay gets a real focus trap** — `NavOverlay`
  (`src/components/nav-overlay.tsx`), a full-screen `createPortal` menu,
  previously only handled Escape; a keyboard user tabbing from the trigger
  walked straight through the covered page behind it. Now moves focus to
  the Close button on open, traps Tab/Shift+Tab within the overlay
  (`role="dialog"` `aria-modal="true"`, a `FOCUSABLE` selector constant
  used to find the wrap-around endpoints), and returns focus to the
  trigger button on close.
- **Gallery lightbox gets the same focus trap** — `GalleryGrid`
  (`src/components/winners/gallery-grid.tsx`) was already marked
  `role="dialog"` but had no focus management at all; same pattern as the
  nav overlay (focus in on open, Tab-trap, focus back to whichever
  thumbnail opened it on close via a `triggerElRef` captured from
  `document.activeElement`).
- **Contrast swept from `slate-500`/`slate-600` to `slate-400`** — both
  measured under WCAG AA's 4.5:1 minimum against the `void`/`panel`
  backgrounds (500 ≈4.1:1 marginal fail, 600 ≈2.57:1 badly failing) and
  were carrying real content app-wide (labels, timestamps, legends,
  `.eyebrow` section kickers) — 272 + 36 occurrences across 71 files, swept
  via `sed` (protecting the two genuine `placeholder:text-slate-*` uses,
  which are exempt). `.eyebrow` in `globals.css` updated the same way.
- **`<th>` cells get `scope="col"`** — the 8 data tables across the portal
  (rewards log, players, teams, events, event roster, audit, analytics,
  `/me/rewards`) had bare unscoped headers; a screen reader moving
  cell-by-cell through a data-heavy table didn't get the column name
  announced. The rewards log's one genuinely empty action-column header
  gets a `sr-only` "Actions" label instead of staying silent.
- **Uncaptioned gallery/proof photos no longer get `alt=""`** —
  `proofItems()`/`collectionItems()` in `src/lib/gallery.ts` fell back to
  an empty (decorative-only) alt whenever staff skipped the optional
  caption, even though the photo is the actual content of that grid item.
  Now falls back to a real description ("Reward proof photo" / `"${title}
  photo"`) instead.
- **One input had its focus outline removed with no replacement** — the
  Discord bulk-builder's channel-name field (`discord-category-form.tsx`)
  used a bare `outline-none`, unlike every other input's `.input` class
  (which pairs `focus:outline-none` with a `focus:ring`) — now gets the
  same `focus:ring-1 focus:ring-teal/50`.
- **`PlayerPicker` gets real combobox ARIA** — `role="combobox"` +
  `aria-expanded`/`aria-controls`/`aria-autocomplete` on the input,
  `role="listbox"`/`option` + `aria-activedescendant` tracking `highlight`
  on the popup — previously a screen reader had no indication a dropdown
  existed at all, despite full sighted-keyboard support already working.
  Takes an optional `inputId` prop so a `<label htmlFor>` outside the
  component can point at its internal input.
- **~85 form labels across 16 files weren't programmatically associated
  with their inputs** — the pattern was a sibling `<label className="label">`
  immediately before its input/select/textarea, with no `id`/`htmlFor`
  pairing at all (95 uses of the `.label` class app-wide, only 10 already
  correct — `profile-form.tsx` and `team-forms.tsx` were the reference
  pattern). Every affected component now calls `useId()` once and builds
  `id`/`htmlFor` pairs from it (collision-safe regardless of how many times
  the component renders per page — several of these, like
  `DiscordCategoryForm`/`DiscordChannelForm`/`SeasonForm`/`FactionForm`,
  render once per row in an accordion). A `<label>` that was really
  describing a *group* of checkboxes rather than one field (event form's
  "Other channels", the Discord category form's "Channels to create", the
  season form's "Match videos", settings' "Social links") became a proper
  `<fieldset>`/`<legend>` instead of a dangling label with nothing to
  point at. Two files' matches (`events/[id]/page.tsx`'s `<dt>`,
  `me/page.tsx`'s plain `<div>`) turned out to be false positives from the
  audit's string-based grep — real `.label`-styled elements that were
  never `<label>` tags to begin with, so nothing to fix there. Caught and
  fixed one related pre-existing bug while in this code: `SeasonForm`'s
  video-source `<datalist id="season-series">` used a static id, which
  breaks (duplicate ids, `list` pointing at the wrong element) the moment
  more than one season's edit form is open in the same accordion page —
  now derived from the same per-instance `useId()`.

## Discord bot slash-command UX pass

A dedicated audit of `src/bot/commands.ts` command quality (not backend
correctness — the reminder loop already had a correctness pass earlier).
Five fixes:

- **`/join` now defers its reply** — the handler runs several sequential DB
  writes plus Discord API calls (a guild-member fetch, role grants, a DM)
  before it had anything to say; without `deferReply()`, a slow round-trip
  could lapse Discord's 3-second interaction window and show the player a
  generic "This interaction failed" even though the join had already gone
  through. Every early-return path in the case now uses `editReply()`
  instead of `reply()` to match.
- **A failed Discord role grant on `/join` no longer goes unmentioned** —
  previously `.catch(() => {})`'d silently; the reply still said
  "✅ Joined" unconditionally even if the team/event role never actually
  landed. Now tracked as `roleIssue` and appended as a caveat ("⚠️ Couldn't
  grant your Discord access for this — ping staff to fix it") when either
  role grant fails, mirroring the DM-failure-visibility precedent in
  `src/lib/notify.ts`.
- **Autocomplete now filters in the query, not after a fixed `take: 25`**
  — `/signup`'s event option and `/standings`'s season option both used to
  fetch only the 25 most recent rows *then* filter by what was typed, so a
  community with more than 25 open events/seasons couldn't autocomplete to
  one outside that pre-fetched batch even though it was a valid,
  selectable option. The Prisma `where` now does the filtering (season
  search matches `series`/`name`; event search matches `title`), so the
  25-cap applies to matches instead of the pre-filter pool.
- **`/standings`'s podium medals now index by `p.rank`, not array
  position** — `medal[i]` (position in the top-3 slice) could show 🥇 next
  to the actual 2nd-place finisher whenever staff log placements with a
  skipped rank (no 1st recorded, say — `savePlacements` explicitly allows
  this). Now `medal[p.rank - 1]`, matching the convention `resultsEmbed`
  and `/seasons/[slug]` already use on the web side for the same data.
- **`/events`'s embed gets the same footer every other bot embed has** —
  `.setFooter({ text: "ASCENITH RAIDZONE" })`, for visual consistency.

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
