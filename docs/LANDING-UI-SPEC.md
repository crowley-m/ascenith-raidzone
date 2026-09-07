# ASCENITH RAIDZONE — Landing Page UI Spec

Status: **draft for review**. Scope: the public landing page only (`/`). The staff
portal and player pages keep their current plain styling and get restyled later.

---

## 1. The one job

A visitor lands, feels something, and clicks **Enlist** (or **Join Discord**).
Everything on the page serves that. Real info (event list, how-to-join, reward
history) lives on the inner site — the landing does not need it.

Format: **one immersive scroll experience**, ~4–5 "scenes", desktop-first, degrades
cleanly on mobile and for reduced-motion.

---

## 2. Design language

**Mood:** a dark operations room lit red. Restrained, heavy, a little menacing —
not neon, not "gamer RGB", not glassy. Confidence through weight and space, not
decoration.

### Palette

| Token | Hex | Use |
|---|---|---|
| `--black` | `#040203` | ground — near-pure black, faint warm tint |
| `--char` | `#0b0507` | raised surfaces (rare) |
| `--crimson` | `#e63950` | the one accent — CTAs, one word per headline, the 3D glow, focus rings |
| `--crimson-deep` | `#7c1e2b` | pressed / secondary crimson |
| `--ash` | `#efe4e4` | primary text (warm off-white) |
| `--ash-dim` | `rgba(239,228,228,0.55)` | secondary text, labels |
| `--line` | `rgba(239,228,228,0.12)` | hairlines, dividers |

Red is used **sparingly and deliberately** — one accent word, the button, the 3D
object. Everything else is black and ash. If two things are red on screen at once,
one of them is probably wrong.

### Type

| Role | Face | Notes |
|---|---|---|
| Display | **Syne** 800 | headlines, wordmark. Tight tracking (`-0.05em`), `line-height` ~0.86, uppercase. Bleeds off edges intentionally. |
| Body / UI | **Manrope** 400–700 | statements, labels, buttons, nav. |

No mono. Type scale is dramatic — the display jumps to `clamp(2.8rem, 13vw, 12rem)`
in the hero. Body stays calm at `~1rem`.

### Texture

- A fixed SVG film-grain overlay at ~6% opacity, `mix-blend-mode: overlay`, slowly
  jittering. This is the only "texture".
- Faint radial crimson bloom in two corners of the fixed background.
- No borders-everywhere, no cards, no glass.

---

## 3. The centrepiece — the 3D object

A single WebGL object, always on screen, fixed behind the content.

**What it is (recommendation): "the Stardust core"** — a dark, faceted crystalline
mass. Obsidian-black surface, crimson light bleeding from the fractures, slow
internal churn. Not a smooth ball — give it sharper facets and a visible internal
glow so it reads as a *shard/crystal*, not a planet or an organ.

**Behaviour:**
- Idle: slow rotation, gentle surface noise, faint pulsing glow in the cracks.
- Cursor: rotates toward the pointer (eased), camera drifts slightly.
- Click / tap: a shockwave — displacement spikes and the glow flares crimson, then
  settles (~0.6s).
- Scroll (hero): the camera **flies toward and into** it — turbulence and glow ramp,
  it fills the frame, then the wordmark is gone and you're "through".
- Scroll (panels): it drifts across the screen from scene to scene, re-framing the
  composition — small and low behind scene 01, swung right behind scene 02, etc.
- Finale: it re-forms centre-stage and pulses once as the last headline lands.

**Alternatives if the crystal isn't right:** a shattered cluster of shards orbiting
a core; a slowly-turning monolith; the respirator-mask emblem as 3D geometry. Pick
one before build — **this is the main open decision.**

---

## 4. The scroll journey

Smooth-scrolled (ScrollSmoother). Five scenes. Progress bar (2px crimson) pinned to
the top edge.

### Scene 0 — HERO  (pinned, ~1.4× viewport of scroll)
- On load: **"RAID" / "ZONE"** stacked, huge Syne, white, bleeding off the left
  edge. Each line's characters fly up into place from below, staggered
  (SplitText + GSAP, ~1.1s). The crystal materialises at the same time, upper-right,
  punching through the "D" and "E".
- Below: `Our server. Your loot. **Every week.**` — "Every week." crimson.
  Then `Enlist your raider` (solid crimson) + `Join Discord` (outline).
  Then a hairline status: `● Server's up · run by NOT POTATOZIE`.
- Centre-bottom: a thin scroll cue.
- As you scroll: the wordmark scales up, blurs and fades; the under-content lifts
  and fades; the camera flies into the crystal. Ends on near-black.

### Scene 1 — "OUR SERVER."  (full-viewport panel, left-aligned)
- Eyebrow `01 — The server` (crimson).
- Headline `Our server.` — words rise in on scroll-enter.
- One line: *"One custom world, always up. Tuned rulesets, boosted rates on op
  nights, admin-run scenarios. Not an official server."*
- Crystal: small, low, drifting left behind the text.

### Scene 2 — "WEEKLY RAIDS."  (full-viewport panel, right-aligned — breaks the rhythm)
- Eyebrow `02 — The operations`.
- Headline `Weekly raids.`
- Line: *"Purge nights, Prime raids, Deviant sweeps. Home base is our server — big
  ops sometimes run elsewhere, and we'll say where. Slots and rosters in Discord."*
- Crystal: swung to the left, larger, so the right-aligned text sits in its shadow.

### Scene 3 — "IN-GAME REWARDS."  (full-viewport panel, left-aligned)
- Eyebrow `03 — The split`.
- Headline `In-game rewards.`
- Line: *"Crystgen, Energy Link, mats, blueprints — split to every raider who shows.
  No real money, no cash prizes."*
- Crystal: centred, glow brightening — leading into the finale.

### Scene 4 — FINALE  (full-viewport, centred)
- `Enlist. Raid.` (white) / `Keep the drop.` (crimson) — dramatic word-by-word
  reveal on scroll-enter.
- Sub: *"Sign in, link Discord, and you're on the roster for the next one."*
- `Enlist your raider` + `Come to the Discord`.
- Crystal: full, centred, one pulse synced to the last word.

### Footer
- `ASCENITH·RAIDZONE` · Enlist / Discord / Rules · `Run by NOT POTATOZIE · not
  affiliated with the developers of Once Human.`

---

## 5. Copy — final, complete

| Slot | Text |
|---|---|
| Wordmark | `RAID` / `ZONE` |
| Hero statement | `Our server. Your loot. Every week.` |
| Hero status | `Server's up · run by NOT POTATOZIE` |
| Scene 01 | eyebrow `01 — The server` · head `Our server.` · `One custom world, always up. Tuned rulesets, boosted rates on op nights, admin-run scenarios. Not an official server.` |
| Scene 02 | `02 — The operations` · `Weekly raids.` · `Purge nights, Prime raids, Deviant sweeps. Home base is our server — big ops sometimes run elsewhere, and we'll say where. Slots and rosters in Discord.` |
| Scene 03 | `03 — The split` · `In-game rewards.` · `Crystgen, Energy Link, mats, blueprints — split to every raider who shows. No real money, no cash prizes.` |
| Finale | `Enlist. Raid. Keep the drop.` · `Sign in, link Discord, and you're on the roster for the next one.` |
| Primary CTA | `Enlist your raider` → `/register` |
| Secondary CTA | `Join Discord` / `Come to the Discord` → the invite |

**Hard content rule:** rewards are **in-game only** (Crystgen, Energy Link, mats,
blueprints, Deviant bounties). Never "get paid" / "payout" in a cash sense. No
paid-entry events.

---

## 6. Interaction model

- **Cursor** (desktop, fine pointer): the crystal tracks it; a subtle custom cursor
  ring is optional (skip if it feels gimmicky).
- **Click anywhere**: crystal shockwave.
- **Scroll**: smooth (ScrollSmoother), drives every scene transition.
- **Hover** on CTAs: lift + shadow bloom. On nav links: dim → bright.
- **Keyboard**: full tab order, visible crimson focus ring, `Enter`/`Space` on CTAs.
- **Anchor links** (nav "Raids"): `smoother.scrollTo(target)`.

---

## 7. Responsive · accessibility · performance

- **≤ 760px:** no smooth-scroll pinning of the hero (or a much shorter pin); crystal
  smaller and centred; wordmark scales down but still bleeds slightly; panels stack
  naturally; drop shard particles. Everything still readable and clickable.
- **`prefers-reduced-motion`:** no ScrollSmoother, no pinning, no SplitText fly-ins
  (text just appears), crystal renders a **static** frame (no rotation/scroll
  reaction) or falls back to a CSS radial-gradient glow. Page becomes a normal
  scroll of 5 readable sections.
- **No WebGL / context fails:** CSS crimson radial-glow fallback, everything else
  unchanged.
- **First frame:** hero is fully readable within ~1.2s (intro autoplays; if JS
  fails, the plain text is there — no content is gated behind scroll).
- **Perf budget:** libs lazy-loaded after first paint; crystal geometry detail ≤ 44
  desktop / 24 mobile; `pixelRatio` capped 1.75; pause the render loop when the tab
  is hidden and when the canvas is fully scrolled out.

---

## 8. Tech & build plan (into the Next.js app)

**Route:** replace `src/app/page.tsx` (currently the placeholder landing).

**Structure:**
- `src/app/page.tsx` — server component, renders metadata + `<Landing />`.
- `src/components/landing/Landing.tsx` — `"use client"`, owns the DOM structure
  (hero, panels, finale, footer) as plain JSX + the fixed layers.
- `src/components/landing/useImmersive.ts` — a client hook that, **after mount and
  first paint**, dynamically `import()`s GSAP + plugins + three.js and wires up
  ScrollSmoother / ScrollTrigger / SplitText / the WebGL scene. All refs, cleaned up
  on unmount.
- `src/components/landing/crystal.ts` — the three.js scene (renderer, shader,
  the `STATE` object the scroll hook writes to).
- Libs: load from cdn (`next/script` with `strategy="afterInteractive"`) **or** npm
  packages (`gsap`, `three`) code-split via `dynamic import`. Prefer **npm + dynamic
  import** in production — no CDN dependency, tree-shakeable, versioned.
  - `gsap` (incl. ScrollTrigger/ScrollSmoother/SplitText — all free as of GSAP 3.13+)
  - `three`
- Fonts: `next/font/google` for Syne + Manrope (already used elsewhere — keep
  consistent).
- SSR: the `<Landing />` markup renders on the server (SEO, first paint); the
  immersive layer is client-only and progressive.

**Order of work:**
1. Static `<Landing />` — all 5 scenes, real copy, responsive, styled, **no JS
   motion**. Ship-able on its own.
2. Add the three.js crystal (idle + cursor + click).
3. Add GSAP: hero intro, then ScrollSmoother + the scene scroll choreography.
4. Reduced-motion + no-WebGL fallbacks.
5. Polish pass + perf (lazy-load, hidden-tab pause, mobile tuning).

**Est:** ~1–1.5 focused sessions for a strong result.

---

## 9. What I need from you before build

1. **The 3D object** — confirm "dark faceted crystal / Stardust core", or pick one of
   the alternatives (§3). This is the one blocking decision.
2. **Wordmark** — keep `RAID` / `ZONE` stacked & bleeding, or a different treatment?
3. **Any real assets** — a logo mark, a font licence you'd rather use, brand colours
   if they differ from §2. (None needed to start; the spec stands alone.)
4. **Discord invite URL** to hard-link (currently `discord.gg/a4k3KTfE7`).

---

## 10. Reference

The current exploration artifact (v8 direction — near-black, stacked wordmark,
crimson crystal): https://claude.ai/code/artifact/45583a2e-ebe7-42a9-b8ac-5472647ef87e
