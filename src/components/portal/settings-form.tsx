"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/(site)/portal/actions";
import type { Settings } from "@/lib/settings";

type Opt = { id: string; name: string };

export function SettingsForm({
  settings,
  channels = [],
  roles = [],
}: {
  settings: Settings;
  channels?: Opt[];
  roles?: Opt[];
}) {
  const [state, action, pending] = useActionState(saveSettings, {});

  const chanField = (name: string, value: string) =>
    channels.length > 0 ? (
      <select name={name} className="input" defaultValue={value}>
        <option value="">— none —</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            #{c.name}
          </option>
        ))}
        {value && !channels.some((c) => c.id === value) && (
          <option value={value}>(unknown channel {value})</option>
        )}
      </select>
    ) : (
      <input name={name} className="input font-mono" defaultValue={value} placeholder="1234567890" />
    );

  const roleField = (name: string, value: string) =>
    roles.length > 0 ? (
      <select name={name} className="input" defaultValue={value}>
        <option value="">— none —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
        {value && !roles.some((r) => r.id === value) && (
          <option value={value}>(unknown role {value})</option>
        )}
      </select>
    ) : (
      <input name={name} className="input font-mono" defaultValue={value} placeholder="1234567890" />
    );

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
        <label className="label">Announcement channel</label>
        {chanField("announceChannelId", settings.announceChannelId)}
        <p className="mt-1 text-xs text-slate-500">
          Where a published event announces if it has no Discord space of its own. Changing this
          only affects the <em>next</em> announcement — messages already posted stay put.
        </p>
      </div>

      <div>
        <label className="label">Default channels for new events</label>
        <textarea
          name="eventChannels"
          rows={5}
          className="input font-mono text-sm"
          defaultValue={settings.eventChannels.join("\n")}
        />
        <p className="mt-1 text-xs text-slate-500">
          One per line (or comma-separated) — add or remove names to change what &ldquo;Build
          Discord space&rdquo; creates for a <em>new</em> event. Spaces become dashes. To
          add/remove a channel on an event that already has its space, use the
          &ldquo;Channels&rdquo; panel on that event&apos;s page instead — this list only sets the
          starting template.
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
          <label className="label">&ldquo;Registered&rdquo; role</label>
          {roleField("registeredRoleId", settings.registeredRoleId)}
          <p className="mt-1 text-xs text-slate-500">
            Given to anyone with a player profile. Blank = off.
          </p>
        </div>
        <div>
          <label className="label">&ldquo;Team leader&rdquo; role</label>
          {roleField("teamLeaderRoleId", settings.teamLeaderRoleId)}
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
