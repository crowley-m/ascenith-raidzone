"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

type FactionOpt = { id: string; name: string };

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

const PLATFORM_LABEL: Record<string, string> = {
  PC: "PC",
  PLAYSTATION: "PlayStation",
  XBOX: "Xbox",
  MOBILE: "Mobile",
};

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [current, ...list] : list;
}

type FormShape = {
  characterName: string;
  gameUid: string;
  platform: string;
  region: string;
  timezone: string;
  playHours: string;
  languages: string;
  factionId: string;
};

const seed = (p: PlayerInit | null): FormShape => ({
  characterName: p?.characterName ?? "",
  gameUid: p?.gameUid ?? "",
  platform: p?.platform ?? "",
  region: p?.region ?? "",
  timezone: p?.timezone ?? "",
  playHours: p?.playHours ?? "",
  languages: p?.languages ?? "",
  factionId: p?.factionId ?? "",
});

export function ProfileForm({
  player,
  isNew,
  factions = [],
}: {
  player: PlayerInit | null;
  isNew?: boolean;
  factions?: FactionOpt[];
}) {
  const router = useRouter();
  const complete = !!player?.characterName;
  const [editing, setEditing] = useState(!!isNew || !complete);
  const [form, setForm] = useState<FormShape>(() => seed(player));
  const [state, setState] = useState<ProfileState>({});
  const [pending, start] = useTransition();

  const set =
    (k: keyof FormShape) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k: string) => state.fieldErrors?.[k];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) fd.set(k, v);
    start(async () => {
      const res = await updateProfileAction({}, fd);
      setState(res);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    const factionName = factions.find((f) => f.id === player?.factionId)?.name ?? null;
    const rows: [string, string | null, boolean?][] = [
      ["Character name", player?.characterName ?? null],
      ["In-game ID (UID)", player?.gameUid ?? null, true],
      ["Platform", player?.platform ? PLATFORM_LABEL[player.platform] ?? player.platform : null],
      ["Server / region", player?.region ?? null],
      ["Timezone", player?.timezone ?? null],
      ["Typical play hours", player?.playHours ?? null],
      ["Languages", player?.languages ?? null],
      ["Faction", factionName],
    ];
    return (
      <div className="max-w-2xl">
        {state.ok && <p className="mb-4 text-sm text-teal">Profile saved.</p>}
        <dl className="divide-y divide-edge/60 border border-edge">
          {rows.map(([label, value, wantUid]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="text-right text-sm text-slate-100">
                {value ?? (
                  <span className={wantUid ? "text-ember" : "text-slate-600"}>
                    {wantUid ? "not set — staff need this" : "—"}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          className="btn-primary mt-5"
          onClick={() => {
            setForm(seed(player));
            setState({});
            setEditing(true);
          }}
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-5">
      {(isNew || !complete) && (
        <div className="card border-teal/30 text-sm text-slate-300">
          Fill this in so staff can find you in game and get you on event sign-ups.
        </div>
      )}
      {state.error && <p className="text-sm text-ember">{state.error}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="characterName">Character name *</label>
          <input id="characterName" className="input" required maxLength={60}
            value={form.characterName} onChange={set("characterName")} />
          {err("characterName") && <p className="mt-1 text-xs text-ember">{err("characterName")}</p>}
        </div>
        <div>
          <label className="label" htmlFor="gameUid">In-game ID (UID)</label>
          <input id="gameUid" className="input" maxLength={40}
            value={form.gameUid} onChange={set("gameUid")} placeholder="e.g. 1000123456789" />
          <p className="mt-1 text-xs text-slate-500">
            Your main character&apos;s UID — this is where staff send event rewards.
          </p>
          {err("gameUid") && <p className="mt-1 text-xs text-ember">{err("gameUid")}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="platform">Platform</label>
          <select id="platform" className="input" value={form.platform} onChange={set("platform")}>
            <option value="">—</option>
            <option value="PC">PC</option>
            <option value="PLAYSTATION">PlayStation</option>
            <option value="XBOX">Xbox</option>
            <option value="MOBILE">Mobile</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="region">Server / region</label>
          <select id="region" className="input" value={form.region} onChange={set("region")}>
            <option value="">—</option>
            {withCurrent(REGIONS, form.region).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="timezone">Timezone</label>
          <select id="timezone" className="input" value={form.timezone} onChange={set("timezone")}>
            <option value="">—</option>
            {withCurrent(TIMEZONES, form.timezone).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="playHours">Typical play hours</label>
          <input id="playHours" className="input" maxLength={200}
            value={form.playHours} onChange={set("playHours")} placeholder="e.g. Weeknights 8pm–midnight" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="languages">Languages</label>
          <input id="languages" className="input" maxLength={200}
            value={form.languages} onChange={set("languages")} placeholder="e.g. English" />
        </div>
        {factions.length > 0 && (
          <div>
            <label className="label" htmlFor="factionId">Faction</label>
            <select id="factionId" className="input" value={form.factionId} onChange={set("factionId")}>
              <option value="">— none —</option>
              {factions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Pick your banner — grants the faction&apos;s Discord role. Staff may reassign.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Teams are managed on the <a href="/me/team" className="link">Team</a> page.
      </p>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        {complete && (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() => {
              setForm(seed(player));
              setState({});
              setEditing(false);
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
