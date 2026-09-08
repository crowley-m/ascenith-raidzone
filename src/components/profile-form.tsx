"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/app/(site)/me/actions";

type PlayerInit = {
  characterName: string | null;
  platform: string | null;
  region: string | null;
  powerLevel: number | null;
  timezone: string | null;
  playHours: string | null;
  languages: string | null;
  factionId: string | null;
};

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

      <div>
        <label className="label" htmlFor="characterName">Character name *</label>
        <input id="characterName" name="characterName" className="input" required maxLength={60}
          defaultValue={player?.characterName ?? ""} />
        {err("characterName") && <p className="mt-1 text-xs text-ember">{err("characterName")}</p>}
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
          <input id="region" name="region" className="input" maxLength={80}
            defaultValue={player?.region ?? ""} placeholder="e.g. NA-East, Asia" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="powerLevel">In-game power / level</label>
          <input id="powerLevel" name="powerLevel" type="number" className="input" min={0}
            defaultValue={player?.powerLevel ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="timezone">Timezone</label>
          <input id="timezone" name="timezone" className="input" maxLength={60}
            defaultValue={player?.timezone ?? ""} placeholder="e.g. GMT+5:30" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="playHours">Typical play hours</label>
        <input id="playHours" name="playHours" className="input" maxLength={200}
          defaultValue={player?.playHours ?? ""} placeholder="e.g. Weeknights 8pm–midnight" />
      </div>

      <div>
        <label className="label" htmlFor="languages">Languages</label>
        <input id="languages" name="languages" className="input" maxLength={200}
          defaultValue={player?.languages ?? ""} placeholder="e.g. English, Sinhala" />
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
