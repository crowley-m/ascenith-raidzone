"use client";

import { useActionState, useEffect, useRef } from "react";
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
  videosText: string;
};

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

  useEffect(() => {
    if (state.ok && !season) ref.current?.reset();
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

      <div>
        <label className="label">Match videos — one per line, &ldquo;url | optional title&rdquo;</label>
        <textarea
          name="videosText"
          rows={6}
          className="input font-mono text-xs"
          defaultValue={season?.videosText ?? ""}
          placeholder={"https://youtu.be/abc123 | FSQ vs BS showdown\nhttps://www.tiktok.com/@user/video/123\nhttps://www.twitch.tv/videos/456"}
        />
        <p className="mt-1 text-xs text-slate-500">
          YouTube plays inline on the season page; TikTok / Twitch link out. First one is featured.
        </p>
      </div>

      {state.error && <p className="font-mono text-sm text-ember">{state.error}</p>}

      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : season ? "Save season" : "Add season"}
        </button>
      </div>
    </form>
  );
}
