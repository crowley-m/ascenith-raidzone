"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { grantReward } from "@/app/(site)/portal/actions";
import { PlayerPicker } from "@/components/portal/player-picker";
import { guessEventForReason } from "@/lib/reward-match";

export function RewardForm({
  players,
  events,
  fixedPlayerId,
  fixedEventId,
}: {
  players?: { id: string; label: string }[];
  events?: { id: string; label: string }[];
  fixedPlayerId?: string;
  fixedEventId?: string;
}) {
  const [state, action, pending] = useActionState(grantReward, {});
  const ref = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  const [reason, setReason] = useState("");
  const [eventId, setEventId] = useState("");

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setResetKey((k) => k + 1);
      setReason("");
      setEventId("");
    }
  }, [state.ok]);

  const guess =
    !fixedEventId && !eventId && events
      ? guessEventForReason(reason, events.map((e) => ({ id: e.id, title: e.label })))
      : null;

  return (
    <form ref={ref} action={action} className="grid gap-3">
      {fixedPlayerId ? (
        <input type="hidden" name="playerId" value={fixedPlayerId} />
      ) : (
        <div>
          <label className="label">Player</label>
          <PlayerPicker key={resetKey} name="playerId" players={players ?? []} required />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Item</label>
          <input name="item" required className="input" placeholder="e.g. Energy Link" />
        </div>
        <div>
          <label className="label">Amount</label>
          <input name="amount" className="input" placeholder="e.g. 500" />
        </div>
      </div>

      <div>
        <label className="label">Reason</label>
        <input
          name="reason"
          required
          className="input"
          placeholder="e.g. 1st place — Purge Night"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {fixedEventId ? (
        <input type="hidden" name="eventId" value={fixedEventId} />
      ) : (
        events && (
          <div>
            <label className="label">Which event was this for?</label>
            <select
              name="eventId"
              className="input"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Not tied to a specific event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Leave it on &ldquo;Not tied to a specific event&rdquo; only if that&apos;s true —
              otherwise this reward won&apos;t show up on that event&apos;s payout sheet.
            </p>
            {guess && (
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ember">
                Reason mentions &ldquo;{guess.title}&rdquo; — did you mean to link it?
                <button
                  type="button"
                  className="font-mono text-[0.66rem] uppercase tracking-widest text-teal hover:text-cream"
                  onClick={() => setEventId(guess.id)}
                >
                  Link it
                </button>
              </p>
            )}
          </div>
        )
      )}

      <div>
        <label className="label">Proof image (optional)</label>
        <input
          type="file"
          name="proofImage"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="block w-full text-sm text-slate-300 file:mr-3 file:border file:border-edge file:bg-void file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-wide file:text-slate-200"
        />
        <input
          name="proofImageUrl"
          className="input mt-2"
          placeholder="…or paste an image URL"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="isPublic" /> Show on the public proof gallery
      </label>

      {state.error && <p className="text-sm text-ember">{state.error}</p>}
      {state.ok && <p className="text-sm text-teal">Reward logged.</p>}

      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Log reward"}
        </button>
      </div>
    </form>
  );
}
