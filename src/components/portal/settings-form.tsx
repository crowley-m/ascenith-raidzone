"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/(site)/portal/actions";
import type { Settings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettings, {});

  return (
    <form action={action} className="grid gap-5">
      <div>
        <label className="label">Discord invite link</label>
        <input
          name="discordInvite"
          className="input"
          defaultValue={settings.discordInvite}
          placeholder="https://discord.gg/…"
        />
        <p className="mt-1 text-xs text-slate-500">
          Used for server-rendered links. Client-baked links still need a redeploy.
        </p>
      </div>

      <div>
        <label className="label">Announcement channel ID</label>
        <input
          name="announceChannelId"
          className="input font-mono"
          defaultValue={settings.announceChannelId}
          placeholder="1234567890"
        />
        <p className="mt-1 text-xs text-slate-500">
          Where a published event announces if it has no Discord space of its own.
        </p>
      </div>

      <div>
        <label className="label">Event channel template</label>
        <textarea
          name="eventChannels"
          rows={5}
          className="input font-mono text-sm"
          defaultValue={settings.eventChannels.join("\n")}
        />
        <p className="mt-1 text-xs text-slate-500">
          One per line (or comma-separated). Created under each event&apos;s category, in order.
          Spaces become dashes.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="autoBuildSpace" defaultChecked={settings.autoBuildSpace} />{" "}
        Build the Discord space automatically when an event is published
      </label>

      <div>
        <label className="label">Reminder lead time (minutes)</label>
        <input
          type="number"
          name="reminderLeadMinutes"
          min={0}
          className="input max-w-[10rem]"
          defaultValue={settings.reminderLeadMinutes}
        />
        <p className="mt-1 text-xs text-slate-500">
          How long before an event the bot posts a &ldquo;starts soon&rdquo; reminder. 0 = off.
        </p>
      </div>

      <div>
        <label className="label">&ldquo;How to join&rdquo; video (YouTube URL)</label>
        <input
          name="howToJoinVideoUrl"
          className="input"
          defaultValue={settings.howToJoinVideoUrl}
          placeholder="https://youtube.com/watch?v=…"
        />
        <p className="mt-1 text-xs text-slate-500">
          Shown on the landing page just before &ldquo;How it works&rdquo;. Leave blank to hide it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">&ldquo;Registered&rdquo; role ID</label>
          <input
            name="registeredRoleId"
            className="input font-mono"
            defaultValue={settings.registeredRoleId}
            placeholder="1234567890"
          />
          <p className="mt-1 text-xs text-slate-500">
            Given to anyone with a player profile. Blank = off.
          </p>
        </div>
        <div>
          <label className="label">&ldquo;Team leader&rdquo; role ID</label>
          <input
            name="teamLeaderRoleId"
            className="input font-mono"
            defaultValue={settings.teamLeaderRoleId}
            placeholder="1234567890"
          />
          <p className="mt-1 text-xs text-slate-500">
            Given to team leaders. The bot&apos;s role must sit above these in the role list.
          </p>
        </div>
      </div>

      {state.error && <p className="text-sm text-ember">{state.error}</p>}
      {state.ok && <p className="text-sm text-teal">Saved.</p>}
      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
