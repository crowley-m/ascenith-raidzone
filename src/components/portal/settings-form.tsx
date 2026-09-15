"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { saveSettings } from "@/app/(site)/portal/actions";
import { useToast } from "@/components/toast/toast-provider";
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
  const toast = useToast();
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.ok) toast("Settings saved.");
    else if (state.error) toast(state.error, "error");
  }, [state, toast]);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  const chanField = (name: string, value: string) =>
    channels.length > 0 ? (
      <select id={fid(name)} name={name} className="input" defaultValue={value}>
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
      <input id={fid(name)} name={name} className="input font-mono" defaultValue={value} placeholder="1234567890" />
    );

  const roleField = (name: string, value: string) =>
    roles.length > 0 ? (
      <select id={fid(name)} name={name} className="input" defaultValue={value}>
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
      <input id={fid(name)} name={name} className="input font-mono" defaultValue={value} placeholder="1234567890" />
    );

  return (
    <form action={action}>
      <nav className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-4 border-b border-edge bg-panel/95 px-1 py-2 font-mono text-[0.66rem] uppercase tracking-widest text-slate-400 backdrop-blur">
        <a href="#discord" className="hover:text-teal">Discord</a>
        <a href="#events" className="hover:text-teal">Events</a>
        <a href="#roles" className="hover:text-teal">Roles &amp; badges</a>
        <a href="#social" className="hover:text-teal">Social</a>
        <a href="#rules" className="hover:text-teal">Rules pages</a>
      </nav>

      <div id="discord" className="grid gap-5 pt-6">
        <h3 className="font-display font-bold text-white">Discord</h3>
        <div>
          <label htmlFor={fid("discordInvite")} className="label">Discord invite link</label>
          <input
            id={fid("discordInvite")}
            name="discordInvite"
            className="input"
            defaultValue={settings.discordInvite}
            placeholder="https://discord.gg/…"
          />
          <p className="mt-1 text-xs text-slate-400">
            Used for server-rendered links. Client-baked links still need a redeploy.
          </p>
        </div>

        <div>
          <label htmlFor={fid("announceChannelId")} className="label">Announcement channel</label>
          {chanField("announceChannelId", settings.announceChannelId)}
          <p className="mt-1 text-xs text-slate-400">
            Where a published event announces if it has no Discord space of its own. Changing this
            only affects the <em>next</em> announcement — messages already posted stay put.
          </p>
        </div>
      </div>

      <div id="events" className="mt-8 grid gap-5 border-t border-edge pt-6">
        <h3 className="font-display font-bold text-white">Events</h3>
        <div>
          <label htmlFor={fid("eventChannels")} className="label">Default channels for new events</label>
          <textarea
            id={fid("eventChannels")}
            name="eventChannels"
            rows={5}
            className="input font-mono text-sm"
            defaultValue={settings.eventChannels.join("\n")}
          />
          <p className="mt-1 text-xs text-slate-400">
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
          <label htmlFor={fid("reminderLeadMinutes")} className="label">Reminder lead time (minutes)</label>
          <input
            id={fid("reminderLeadMinutes")}
            type="number"
            name="reminderLeadMinutes"
            min={0}
            className="input max-w-[10rem]"
            defaultValue={settings.reminderLeadMinutes}
          />
          <p className="mt-1 text-xs text-slate-400">
            How long before an event the bot posts a &ldquo;starts soon&rdquo; reminder. 0 = off;
            the bot only checks every 5 minutes, so anything else rounds up to at least 5.
          </p>
        </div>

        <div>
          <label htmlFor={fid("howToJoinVideoUrl")} className="label">&ldquo;How to join&rdquo; video (YouTube URL)</label>
          <input
            id={fid("howToJoinVideoUrl")}
            name="howToJoinVideoUrl"
            className="input"
            defaultValue={settings.howToJoinVideoUrl}
            placeholder="https://youtube.com/watch?v=…"
          />
          <p className="mt-1 text-xs text-slate-400">
            Shown on the landing page just before &ldquo;How it works&rdquo;. Leave blank to hide it.
          </p>
        </div>
      </div>

      <div id="roles" className="mt-8 grid gap-5 border-t border-edge pt-6">
        <h3 className="font-display font-bold text-white">Roles &amp; badges</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fid("registeredRoleId")} className="label">&ldquo;Registered&rdquo; role</label>
            {roleField("registeredRoleId", settings.registeredRoleId)}
            <p className="mt-1 text-xs text-slate-400">
              Given to anyone with a player profile. Blank = off.
            </p>
          </div>
          <div>
            <label htmlFor={fid("teamLeaderRoleId")} className="label">&ldquo;Team leader&rdquo; role</label>
            {roleField("teamLeaderRoleId", settings.teamLeaderRoleId)}
            <p className="mt-1 text-xs text-slate-400">
              Given to team leaders. The bot&apos;s role must sit above these in the role list.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor={fid("veteranTiersText")} className="label">Tiered veteran badges</label>
          <textarea
            id={fid("veteranTiersText")}
            name="veteranTiersText"
            rows={4}
            className="input font-mono text-sm"
            defaultValue={settings.veteranTiersText}
            placeholder={"5 | 123456789012345678\n20 | 234567890123456789"}
          />
          <p className="mt-1 text-xs text-slate-400">
            One tier per line — <code>events played | Discord role id</code>. Every threshold a
            player has reached is granted and stacks (Bronze, Silver, Gold, …) — unlike the other
            roles here, these are never taken back off once earned.
          </p>
        </div>
      </div>

      <div id="social" className="mt-8 grid gap-5 border-t border-edge pt-6">
        <h3 className="font-display font-bold text-white">Social</h3>
        <fieldset>
          <legend className="label">Social links (landing footer)</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor={fid("socialTiktokUrl")} className="sr-only">TikTok URL</label>
            <input
              id={fid("socialTiktokUrl")}
              name="socialTiktokUrl"
              className="input"
              defaultValue={settings.socialTiktokUrl}
              placeholder="TikTok URL"
            />
            <label htmlFor={fid("socialTwitchUrl")} className="sr-only">Twitch URL</label>
            <input
              id={fid("socialTwitchUrl")}
              name="socialTwitchUrl"
              className="input"
              defaultValue={settings.socialTwitchUrl}
              placeholder="Twitch URL"
            />
            <label htmlFor={fid("socialXUrl")} className="sr-only">X (Twitter) URL</label>
            <input
              id={fid("socialXUrl")}
              name="socialXUrl"
              className="input"
              defaultValue={settings.socialXUrl}
              placeholder="X (Twitter) URL"
            />
            <label htmlFor={fid("socialFacebookUrl")} className="sr-only">Facebook URL</label>
            <input
              id={fid("socialFacebookUrl")}
              name="socialFacebookUrl"
              className="input"
              defaultValue={settings.socialFacebookUrl}
              placeholder="Facebook URL"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Shown in the landing page footer. Leave any blank to hide that link.
          </p>
        </fieldset>
      </div>

      <div id="rules" className="mt-8 grid gap-5 border-t border-edge pt-6">
        <h3 className="font-display font-bold text-white">Rules pages</h3>
        <div>
          <label htmlFor={fid("rulesText")} className="label">Community rules (/rules)</label>
          <textarea
            id={fid("rulesText")}
            name="rulesText"
            rows={7}
            className="input font-mono text-xs"
            defaultValue={settings.rulesText}
          />
          <p className="mt-1 text-xs text-slate-400">
            One rule per line — <code>1. …</code> keeps the numbering.
          </p>
        </div>

        <div>
          <label htmlFor={fid("antiCheatText")} className="label">Anti-cheat &amp; fair play (/rules)</label>
          <textarea
            id={fid("antiCheatText")}
            name="antiCheatText"
            rows={7}
            className="input font-mono text-xs"
            defaultValue={settings.antiCheatText}
          />
          <p className="mt-1 text-xs text-slate-400">
            A short line ending in <code>:</code> becomes a heading, blank line starts a new point.
          </p>
        </div>

        <div>
          <label htmlFor={fid("disputesText")} className="label">Disputes &amp; appeals (/rules)</label>
          <textarea
            id={fid("disputesText")}
            name="disputesText"
            rows={4}
            className="input font-mono text-xs"
            defaultValue={settings.disputesText}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-edge pt-6">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
