"use client";

import { useActionState } from "react";
import { saveEvent } from "@/app/(site)/portal/actions";

type EventInit = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string; // datetime-local value
  endsAt: string;
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
  announcementMd: string | null;
  howToJoinMd: string | null;
  gameplayMd: string | null;
  wipeInfoMd: string | null;
  rewardsMd: string | null;
};

export type SeasonOption = { id: string; number: number; name: string | null };

export function EventForm({
  event,
  seasons = [],
}: {
  event?: EventInit;
  seasons?: SeasonOption[];
}) {
  const [state, action, pending] = useActionState(saveEvent, {});

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div>
        <label className="label">Title *</label>
        <input name="title" required className="input" defaultValue={event?.title ?? ""} />
      </div>

      <div>
        <label className="label">Description (internal / short)</label>
        <textarea name="description" rows={3} className="input" defaultValue={event?.description ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Starts *</label>
          <input type="datetime-local" name="startsAt" required className="input" defaultValue={event?.startsAt ?? ""} />
        </div>
        <div>
          <label className="label">Ends (wipe)</label>
          <input type="datetime-local" name="endsAt" className="input" defaultValue={event?.endsAt ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Server / world</label>
          <input name="server" className="input" defaultValue={event?.server ?? ""} />
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
          <input type="number" name="maxSlots" min={0} className="input" defaultValue={event?.maxSlots ?? ""} />
        </div>
        <div>
          <label className="label">Team size cap (team events, optional)</label>
          <input type="number" name="teamSize" min={0} className="input" defaultValue={event?.teamSize ?? ""} />
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
                Season {s.number}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Mode (next to RAIDZONE)</label>
          <input name="mode" className="input" defaultValue={event?.mode ?? ""} placeholder="PURGE" />
        </div>
        <div>
          <label className="label">Wipe cycle</label>
          <input name="wipeCycle" className="input" defaultValue={event?.wipeCycle ?? ""} placeholder="2 weeks" />
        </div>
        <div>
          <label className="label">Raid window</label>
          <input name="raidWindow" className="input" defaultValue={event?.raidWindow ?? ""} placeholder="15:30 – 21:29 · 6 hrs/day" />
        </div>
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
        <label className="label">Bonus line</label>
        <input name="bonusText" className="input" defaultValue={event?.bonusText ?? ""} placeholder="20K Crystgin · hidden across airdrops, cards, alpha boss" />
      </div>

      <div>
        <label className="label">Reward pool (free text — optional)</label>
        <textarea name="rewardPoolText" rows={2} className="input" defaultValue={event?.rewardPoolText ?? ""} />
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

      {(
        [
          ["announcementMd", "Announcement", 4, "Extra text above the announcement embed (optional)."],
          ["howToJoinMd", "How to join", 5, "Overrides the default register → UID → sign-up steps."],
          ["gameplayMd", "Gameplay", 8, "Objectives, map, how the mode plays."],
          ["wipeInfoMd", "Wipe info", 6, "Extra wipe detail beyond cycle / raid window."],
          ["rewardsMd", "Rewards (override)", 4, "Leave blank to auto-generate from the reward tiers."],
        ] as const
      ).map(([name, label, rows, hint]) => (
        <div key={name}>
          <label className="label">{label}</label>
          <textarea
            name={name}
            rows={rows}
            className="input font-mono text-xs"
            defaultValue={(event?.[name] as string | null) ?? ""}
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
