"use client";

import { useActionState, useRef } from "react";
import { saveEvent } from "@/app/(site)/portal/actions";
import { EVENT_TIMEZONES, DEFAULT_EVENT_TZ } from "@/lib/tz";

type EventInit = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string; // datetime-local value, in `timezone`
  endsAt: string;
  timezone: string | null;
  server: string | null;
  format: string;
  maxSlots: number | null;
  teamSize: number | null;
  rewardPoolText: string | null;
  status: string;
  seasonId: string | null;
  summary: string | null;
  mode: string | null;
  wipeCycle: string | null;
  raidWindow: string | null;
  rewardTiersText: string;
  bonusText: string | null;
  rulesMd: string | null;
  detailsMd: string | null;
  howToJoinVideoUrl: string | null;
  announcePing: boolean;
  announcePingAll: boolean;
  announcementMd: string | null;
  howToJoinMd: string | null;
  gameplayMd: string | null;
  wipeInfoMd: string | null;
  rewardsMd: string | null;
};

export type SeasonOption = { id: string; series: string; number: number; name: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
const dtLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;

export function EventForm({
  event,
  seasons = [],
}: {
  event?: EventInit;
  seasons?: SeasonOption[];
}) {
  const [state, action, pending] = useActionState(saveEvent, {});
  const formRef = useRef<HTMLFormElement>(null);

  function fillExample() {
    const f = formRef.current;
    if (!f) return;
    const set = (name: string, val: string) => {
      const el = f.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (el) el.value = val;
    };
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(20, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    set("title", "RAIDZONE Purge — Season 2");
    set("description", "Two-week no-rules purge wipe. Internal test event.");
    set("timezone", DEFAULT_EVENT_TZ);
    set("startsAt", dtLocal(start));
    set("endsAt", dtLocal(end));
    set("server", "ASCENITH • RaidZone 01 (NA)");
    set("format", "SOLO");
    set("maxSlots", "60");
    set("teamSize", "");
    set("status", "DRAFT");
    set("summary", "No rules, no limits. 2-week wipe. Top 3 on the Glory board take the pool.");
    set("mode", "PURGE");
    set("wipeCycle", "2 weeks");
    set("raidWindow", "Days 1–4 · 15:30 – 21:29 (6 hrs/day)\nFinal weekend · no safe window");
    set("rewardTiersText", "1st | 30K Crystgin\n2nd | 20K Crystgin\n3rd | 10K Crystgin");
    set(
      "bonusText",
      "20K Crystgin — hidden across airdrops, cards and the alpha boss\nEarly-bird: first 10 sign-ups get a starter cache",
    );
    set("rewardPoolText", "");
    set(
      "rulesMd",
      "- No cheating — permanent ban, no appeal\n- No bug exploiting\n- No account sharing — reward UID must match the player\n- Clips on request, or no points",
    );
    set(
      "detailsMd",
      "## Wipe & raid schedule\n\n- Raid time: 15:30 – 21:29 (6 hrs/day)\n\n## Glory Points\n\n**Red Room** — 2 pts, spawns every 2h\n**Blue Room** — 1 pt, spawns every 1h\n\nHighest Glory total at wipe wins.",
    );
    set("howToJoinVideoUrl", "");
    const ping = f.elements.namedItem("announcePing");
    if (ping) (ping as HTMLInputElement).checked = true;
    set(
      "announcementMd",
      "The purge is back. Two weeks, no rules, one board. Sign up on the website.",
    );
    set("howToJoinMd", "");
    set(
      "gameplayMd",
      "Capture Red and Blue rooms for Glory Points. Rooms rotate on the map every cycle — check pins. Bases are fair game outside the safe window.",
    );
    set("wipeInfoMd", "Full server wipe at start. Blueprints reset. Bring nothing, leave nothing.");
    set("rewardsMd", "");
  }

  return (
    <form ref={formRef} action={action} className="grid max-w-3xl gap-4">
      {event && <input type="hidden" name="id" value={event.id} />}

      {!event && (
        <div className="flex items-center justify-between gap-3 border border-edge bg-panel/40 p-3">
          <p className="text-xs text-slate-400">
            First time? Load example values to see the shape of a full event, then edit.
          </p>
          <button type="button" onClick={fillExample} className="btn-ghost shrink-0 text-xs">
            Fill with example data
          </button>
        </div>
      )}

      <div>
        <label className="label">Title *</label>
        <input
          name="title"
          required
          className="input"
          defaultValue={event?.title ?? ""}
          placeholder="RAIDZONE Purge — Season 2"
        />
      </div>

      <div>
        <label className="label">Description (internal / short)</label>
        <textarea
          name="description"
          rows={3}
          className="input"
          defaultValue={event?.description ?? ""}
          placeholder="A note for staff — not shown publicly."
        />
      </div>

      <div>
        <label className="label">Timezone — the start / end times below are in this zone</label>
        <select
          name="timezone"
          className="input sm:max-w-sm"
          defaultValue={event?.timezone ?? DEFAULT_EVENT_TZ}
        >
          {EVENT_TIMEZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Enter the wall-clock time you&apos;d announce (e.g. 8:00 PM Manila). It&apos;s stored
          as an absolute moment and shown to everyone in this zone; Discord shows it in each
          member&apos;s own zone.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Starts *</label>
          <input type="datetime-local" name="startsAt" required className="input" defaultValue={event?.startsAt ?? ""} />
        </div>
        <div>
          <label className="label">Ends (wipe) — exact</label>
          <input type="datetime-local" name="endsAt" className="input" defaultValue={event?.endsAt ?? ""} />
        </div>
      </div>

      <div>
        <label className="label">…or ends N weeks after start</label>
        <input
          type="number"
          name="endsWeeks"
          min={0}
          max={52}
          className="input sm:max-w-[10rem]"
          placeholder="2"
        />
        <p className="mt-1 text-xs text-slate-500">
          Set this and the end date is worked out for you (start + N weeks). Overrides the exact
          field above.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Server / world</label>
          <input
            name="server"
            className="input"
            defaultValue={event?.server ?? ""}
            placeholder="ASCENITH • RaidZone 01 (NA)"
          />
        </div>
        <div>
          <label className="label">Format</label>
          <select name="format" className="input" defaultValue={event?.format ?? "SOLO"}>
            <option value="SOLO">Solo — players sign up individually</option>
            <option value="TEAM">Team — a leader registers the whole team</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            Max <span className="lowercase">slots / teams</span> (blank = unlimited)
          </label>
          <input
            type="number"
            name="maxSlots"
            min={0}
            className="input"
            defaultValue={event?.maxSlots ?? ""}
            placeholder="60"
          />
        </div>
        <div>
          <label className="label">Team size cap (team events, optional)</label>
          <input
            type="number"
            name="teamSize"
            min={0}
            className="input"
            defaultValue={event?.teamSize ?? ""}
            placeholder="4"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={event?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published (announces to Discord)</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label">Season</label>
          <select name="seasonId" className="input" defaultValue={event?.seasonId ?? ""}>
            <option value="">— none —</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.series} · S{s.number}
                {s.name ? ` · ${s.name}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="border-edge" />
      <p className="font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-teal">
        Public brief — shown on the landing page + /events/{event ? event.id : "…"}
      </p>

      <div>
        <label className="label">Summary (1–2 lines, landing card)</label>
        <textarea name="summary" rows={2} className="input" defaultValue={event?.summary ?? ""} placeholder="No rules, no limits. 2-week wipe. Top 3 on the Glory Points board take the pool." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Mode (next to RAIDZONE)</label>
          <input name="mode" className="input" defaultValue={event?.mode ?? ""} placeholder="PURGE" />
        </div>
        <div>
          <label className="label">Wipe cycle</label>
          <input name="wipeCycle" className="input" defaultValue={event?.wipeCycle ?? ""} placeholder="2 weeks" />
        </div>
      </div>

      <div>
        <label className="label">Raid window — one per line</label>
        <textarea
          name="raidWindow"
          rows={2}
          className="input"
          defaultValue={event?.raidWindow ?? ""}
          placeholder={"Days 1–4 · 6 PM – 11:59 PM\nDays 5–7 · all day"}
        />
      </div>

      <div>
        <label className="label">Reward tiers — one per line, &ldquo;place | reward&rdquo;</label>
        <textarea
          name="rewardTiersText"
          rows={4}
          className="input font-mono text-xs"
          defaultValue={event?.rewardTiersText ?? ""}
          placeholder={"1st | 30K Crystgin\n2nd | 25K Crystgin\n3rd | 15K Crystgin"}
        />
      </div>

      <div>
        <label className="label">Bonus lines — one per line</label>
        <textarea
          name="bonusText"
          rows={3}
          className="input"
          defaultValue={event?.bonusText ?? ""}
          placeholder={"Meteor bonus — 5,000 Crystgin (shared by the team that secures the car)\nRandom Crystgin airdrops — unannounced timing"}
        />
      </div>

      <div>
        <label className="label">Reward pool (free text — optional)</label>
        <textarea
          name="rewardPoolText"
          rows={2}
          className="input"
          defaultValue={event?.rewardPoolText ?? ""}
          placeholder="Use this only if the tiers above don't fit — free text shown as-is."
        />
      </div>

      <div>
        <label className="label">Event rules (Markdown)</label>
        <textarea
          name="rulesMd"
          rows={8}
          className="input font-mono text-xs"
          defaultValue={event?.rulesMd ?? ""}
          placeholder={"- No cheating — permanent ban, no appeal\n- No bug exploiting\n- No account sharing — reward UID must match the player\n- Clips on request, or no points"}
        />
        <p className="mt-1 text-xs text-slate-500">
          Shown in its own section on the event page and posted to the event&apos;s Discord{" "}
          <code>rules</code> channel when you build the space.
        </p>
      </div>

      <div>
        <label className="label">Full brief (Markdown) — the whole event details page</label>
        <textarea
          name="detailsMd"
          rows={14}
          className="input font-mono text-xs"
          defaultValue={event?.detailsMd ?? ""}
          placeholder={"## Wipe & raid schedule\n\n- Start: 28 Aug 2026 09:30\n- End: 11 Sep 2026 21:29\n- Raid time: 15:30 – 21:29 (6 hrs/day)\n\n## Glory Points\n\n**Red Room** — 2 pts, spawns every 2h\n**Blue Room** — 1 pt, spawns every 1h"}
        />
      </div>

      <div>
        <label className="label">How-to-join video (YouTube URL)</label>
        <input
          name="howToJoinVideoUrl"
          type="url"
          className="input font-mono text-xs"
          defaultValue={event?.howToJoinVideoUrl ?? ""}
          placeholder="https://youtu.be/…"
        />
        <p className="mt-1 text-xs text-slate-500">
          Plays on this event&apos;s page, and in the landing &ldquo;How to join&rdquo; section
          while this is the featured event.
        </p>
      </div>

      <hr className="border-edge" />
      <p className="font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-teal">
        Discord channels — posted into the event&apos;s space (build it, then &ldquo;Sync
        channels&rdquo; after edits)
      </p>

      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="announcePing"
          defaultChecked={event?.announcePing ?? true}
          className="mt-0.5 accent-teal"
        />
        <span>
          Ping <span className="font-mono">@everyone</span> in the announcement
          <span className="mt-0.5 block text-xs text-slate-500">
            On by default. Editing the announcement afterwards won&apos;t re-ping.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="announcePingAll"
          defaultChecked={event?.announcePingAll ?? false}
          className="mt-0.5 accent-teal"
        />
        <span>
          Ping <span className="font-mono">@everyone</span> in <em>every</em> event channel
          <span className="mt-0.5 block text-xs text-slate-500">
            how-to-join, rules, gameplay, wipe-info and rewards too — one ping per channel
            when the space is first built. Off by default (it&apos;s a lot of pings).
          </span>
        </span>
      </label>

      {(
        [
          [
            "announcementMd",
            "Announcement",
            4,
            "Extra text above the announcement embed (optional).",
            "The purge is back. Two weeks, no rules, one board.",
          ],
          [
            "howToJoinMd",
            "How to join",
            5,
            "Overrides the default register → UID → sign-up steps.",
            "",
          ],
          [
            "gameplayMd",
            "Gameplay",
            8,
            "Objectives, map, how the mode plays.",
            "Capture Red and Blue rooms for Glory Points. Rooms rotate every cycle — check pins.",
          ],
          [
            "wipeInfoMd",
            "Wipe info",
            6,
            "Extra wipe detail beyond cycle / raid window.",
            "Full server wipe at start. Blueprints reset.",
          ],
          [
            "rewardsMd",
            "Rewards (override)",
            4,
            "Leave blank to auto-generate from the reward tiers.",
            "",
          ],
        ] as const
      ).map(([name, label, rows, hint, ph]) => (
        <div key={name}>
          <label className="label">{label}</label>
          <textarea
            name={name}
            rows={rows}
            className="input font-mono text-xs"
            defaultValue={(event?.[name] as string | null) ?? ""}
            placeholder={ph || undefined}
          />
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
      ))}

      {state.error && <p className="font-mono text-sm text-ember">{state.error}</p>}

      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : event ? "Save event" : "Create event"}
        </button>
      </div>
    </form>
  );
}
