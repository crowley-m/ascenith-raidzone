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
  everyone; it flips to `ACTIVE` when the profile is completed.
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
- **Event access roles** (`src/lib/event-space.ts`) — "Build space" also creates a
  per-event Discord role (`Event.discordRoleId`); `applyEventChannelPerms` gates
  every channel except `announcement / how-to-join / registration` to it. Signing
  up (site or `/signup`) grants the role; withdrawing revokes it. TEAM events get
  a private voice channel + role per team (`Team.discordRoleId` /
  `discordVoiceChannelId`). **Archive** writes an `EventParticipation` row for
  every signed-up player (survives event deletion → "Events competed in" on the
  public profile), then deletes the event + team roles / voice channels.
  "Resync event roles" re-grants to everyone signed up.
- **Notifications** — players get Discord DMs (waitlist promotion, reward
  granted, event starting, placed in results, event cancelled, teammate
  joined / left) unless `Player.dmNotifications` is off. `src/lib/notify.ts`.
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

Redeploy: `git archive --format=tar.gz -o repo.tar.gz HEAD`, scp to
`/opt/ascenith/`, then `rm -rf repo && mkdir repo && tar -xzf repo.tar.gz -C repo
&& ./deploy.sh`. The box has **2 vCPUs** — `deploy.sh` `nice`/`ionice`s the build
so it doesn't starve sshd (connection drops mid-build were the cause). Run the
build detached (`nohup ./deploy.sh >log 2>&1 &`) and poll the log so a dropped
SSH session can't kill it. `.github/workflows/build.yml` builds + pushes the
image to GHCR; `ops/ci-deploy.md` has the (not-yet-done) server cutover to
`docker compose pull`. Public URL is an nginx vhost on the box — **do not touch
other services on that shared VPS.**

Site metadata (`metadataBase`, sitemap, robots) reads `NEXTAUTH_URL` at runtime —
that's why the landing, sitemap and robots are `force-dynamic`.
