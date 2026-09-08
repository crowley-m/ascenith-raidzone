"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/app/(site)/me/actions";

type PlayerInit = {
  characterName: string | null;
  gameUid: string | null;
  platform: string | null;
  region: string | null;
  timezone: string | null;
  playHours: string | null;
  languages: string | null;
  factionId: string | null;
};

const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Oceania",
  "Middle East",
  "Africa",
];

const TIMEZONES = [
  "GMT-12", "GMT-11", "GMT-10", "GMT-9:30", "GMT-9", "GMT-8", "GMT-7", "GMT-6",
  "GMT-5", "GMT-4", "GMT-3:30", "GMT-3", "GMT-2", "GMT-1", "GMT+0", "GMT+1",
  "GMT+2", "GMT+3", "GMT+3:30", "GMT+4", "GMT+4:30", "GMT+5", "GMT+5:30",
  "GMT+5:45", "GMT+6", "GMT+6:30", "GMT+7", "GMT+8", "GMT+9", "GMT+9:30",
  "GMT+10", "GMT+10:30", "GMT+11", "GMT+12", "GMT+13", "GMT+14",
];

/** Keep a player's previously-saved free-text value selectable. */
function withCurrent(list: string[], current: string | null) {
  return current && !list.includes(current) ? [current, ...list] : list;
}

const initial: ProfileState = {};

export function ProfileForm({
  player,
  factions,
  isNew,
}: {
  player: PlayerInit | null;
  factions: { id: string; name: string }[];
  isNew?: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {isNew && (
        <div className="card border-teal/30 text-sm text-slate-300">
          Welcome to the roster! Fill this in so staff can find you in game and get you on
          event sign-ups.
        </div>
      )}
      {state.ok && <p className="text-sm text-teal">Saved.</p>}
      {state.error && <p className="text-sm text-ember">{state.error}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="characterName">Character name *</label>
          <input id="characterName" name="characterName" className="input" required maxLength={60}
            defaultValue={player?.characterName ?? ""} />
          {err("characterName") && <p className="mt-1 text-xs text-ember">{err("characterName")}</p>}
        </div>
        <div>
          <label className="label" htmlFor="gameUid">In-game ID (UID)</label>
          <input id="gameUid" name="gameUid" className="input" maxLength={40}
            defaultValue={player?.gameUid ?? ""} placeholder="e.g. 1000123456789" />
          <p className="mt-1 text-xs text-slate-500">
            Your main character&apos;s UID — this is where staff send event rewards.
          </p>
          {err("gameUid") && <p className="mt-1 text-xs text-ember">{err("gameUid")}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="platform">Platform</label>
          <select id="platform" name="platform" className="input" defaultValue={player?.platform ?? ""}>
            <option value="">—</option>
            <option value="PC">PC</option>
            <option value="PLAYSTATION">PlayStation</option>
            <option value="XBOX">Xbox</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="region">Server / region</label>
          <select id="region" name="region" className="input" defaultValue={player?.region ?? ""}>
            <option value="">—</option>
            {withCurrent(REGIONS, player?.region ?? null).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="timezone">Timezone</label>
          <select id="timezone" name="timezone" className="input" defaultValue={player?.timezone ?? ""}>
            <option value="">—</option>
            {withCurrent(TIMEZONES, player?.timezone ?? null).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="playHours">Typical play hours</label>
          <input id="playHours" name="playHours" className="input" maxLength={200}
            defaultValue={player?.playHours ?? ""} placeholder="e.g. Weeknights 8pm–midnight" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="languages">Languages</label>
        <input id="languages" name="languages" className="input" maxLength={200}
          defaultValue={player?.languages ?? ""} placeholder="e.g. English" />
      </div>

      <div>
        <label className="label" htmlFor="factionId">Faction / team</label>
        <select id="factionId" name="factionId" className="input" defaultValue={player?.factionId ?? ""}>
          <option value="">Unassigned</option>
          {factions.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
