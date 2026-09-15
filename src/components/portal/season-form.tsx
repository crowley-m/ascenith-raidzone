"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveSeason } from "@/app/(site)/portal/actions";

export type SeasonInit = {
  id: string;
  series: string;
  number: number;
  slug: string;
  name: string | null;
  status: string;
  startsAt: string; // date value (yyyy-mm-dd) or ""
  endsAt: string;
  prizePoolText: string | null;
  championName: string | null;
  championNote: string | null;
  posterUrl: string | null;
  blurb: string | null;
  videos: { url: string; title: string | null }[];
};

let nextVideoRowId = 0;
type VideoRow = { id: number; url: string; title: string };

function VideoListBuilder({ initial }: { initial: { url: string; title: string | null }[] }) {
  const [rows, setRows] = useState<VideoRow[]>(() =>
    initial.map((v) => ({ id: nextVideoRowId++, url: v.url, title: v.title ?? "" })),
  );

  return (
    <div>
      <label className="label">Match videos (optional)</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex flex-wrap items-center gap-2 border border-edge/60 bg-void/40 p-2.5">
            <span className="text-xs text-slate-600">{i === 0 ? "★" : "#" + (i + 1)}</span>
            <input
              name="videoUrls"
              value={row.url}
              onChange={(e) => {
                const v = e.target.value;
                setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, url: v } : r)));
              }}
              className="input min-w-[14rem] flex-1 font-mono text-xs"
              placeholder="https://youtu.be/…"
            />
            <input
              name="videoTitles"
              value={row.title}
              onChange={(e) => {
                const v = e.target.value;
                setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, title: v } : r)));
              }}
              className="input min-w-[10rem] flex-1 text-xs"
              placeholder="Title (optional)"
            />
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
              className="px-1 text-slate-500 hover:text-ember"
              aria-label="Remove video"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { id: nextVideoRowId++, url: "", title: "" }])}
          className="btn-ghost w-full text-xs"
        >
          + Add video
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        YouTube plays inline on the season page; TikTok / Twitch link out. First one (★) is
        featured.
      </p>
    </div>
  );
}

export function SeasonForm({
  season,
  nextNumber,
  seriesList = [],
  onSaved,
}: {
  season?: SeasonInit;
  nextNumber?: number;
  seriesList?: string[];
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(saveSeason, {});
  const ref = useRef<HTMLFormElement>(null);
  const [videoBuilderKey, setVideoBuilderKey] = useState(0);

  useEffect(() => {
    if (state.ok && !season) {
      ref.current?.reset();
      setVideoBuilderKey((k) => k + 1); // VideoListBuilder holds its own React state — a native reset() can't clear it
    }
    if (state.ok) onSaved?.();
  }, [state.ok, season, onSaved]);

  return (
    <form ref={ref} action={action} className="grid gap-3">
      {season && <input type="hidden" name="id" value={season.id} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_5rem_1fr]">
        <div>
          <label className="label">Series</label>
          <input
            name="series"
            required
            list="season-series"
            className="input"
            defaultValue={season?.series ?? ""}
            placeholder="Duo-Squad Tournament"
          />
          <datalist id="season-series">
            {seriesList.map((sr) => (
              <option key={sr} value={sr} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">Season #</label>
          <input
            name="number"
            type="number"
            min={1}
            required
            className="input"
            defaultValue={season?.number ?? nextNumber ?? ""}
          />
        </div>
        <div>
          <label className="label">URL slug</label>
          <input
            name="slug"
            required
            className="input font-mono text-xs"
            defaultValue={season?.slug ?? ""}
            placeholder="duo-squad-6"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name (optional)</label>
          <input name="name" className="input" defaultValue={season?.name ?? ""} placeholder="Ascension" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="input" defaultValue={season?.status ?? "UPCOMING"}>
            <option value="UPCOMING">Upcoming</option>
            <option value="ACTIVE">Active</option>
            <option value="ENDED">Ended</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Starts</label>
          <input name="startsAt" type="date" className="input" defaultValue={season?.startsAt ?? ""} />
        </div>
        <div>
          <label className="label">Ends</label>
          <input name="endsAt" type="date" className="input" defaultValue={season?.endsAt ?? ""} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Prize pool</label>
          <input
            name="prizePoolText"
            className="input"
            defaultValue={season?.prizePoolText ?? ""}
            placeholder="101,450 Crystgin"
          />
        </div>
        <div>
          <label className="label">Champion</label>
          <input
            name="championName"
            className="input"
            defaultValue={season?.championName ?? ""}
            placeholder="SCUBACAT — blank until crowned"
          />
        </div>
      </div>

      <div>
        <label className="label">Champion note (optional line under the name)</label>
        <input name="championNote" className="input" defaultValue={season?.championNote ?? ""} />
      </div>

      <div>
        <label className="label">Poster URL</label>
        <input
          name="posterUrl"
          className="input font-mono text-xs"
          defaultValue={season?.posterUrl ?? ""}
          placeholder="/media/champion-season-3.webp"
        />
        <p className="mt-1 text-xs text-slate-500">
          Drop the file in <code>public/media</code> and use <code>/media/name.webp</code>, or paste a{" "}
          <code>/api/media/&lt;id&gt;</code> URL from an upload.
        </p>
      </div>

      <div>
        <label className="label">Blurb (optional)</label>
        <textarea name="blurb" rows={2} className="input" defaultValue={season?.blurb ?? ""} />
      </div>

      <VideoListBuilder key={videoBuilderKey} initial={season?.videos ?? []} />

      {state.error && <p className="font-mono text-sm text-ember">{state.error}</p>}

      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : season ? "Save season" : "Add season"}
        </button>
      </div>
    </form>
  );
}
