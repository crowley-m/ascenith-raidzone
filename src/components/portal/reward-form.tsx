"use client";

import { useActionState, useEffect, useRef } from "react";
import { grantReward } from "@/app/portal/actions";

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

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="grid gap-3">
      {fixedPlayerId ? (
        <input type="hidden" name="playerId" value={fixedPlayerId} />
      ) : (
        <div>
          <label className="label">Player</label>
          <select name="playerId" required className="input" defaultValue="">
            <option value="" disabled>Choose a player…</option>
            {players?.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
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
        <input name="reason" required className="input" placeholder="e.g. 1st place — Purge Night" />
      </div>

      {fixedEventId ? (
        <input type="hidden" name="eventId" value={fixedEventId} />
      ) : (
        events && (
          <div>
            <label className="label">Linked event (optional)</label>
            <select name="eventId" className="input" defaultValue="">
              <option value="">—</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
        )
      )}

      <div>
        <label className="label">Proof image URL (optional)</label>
        <input name="proofImageUrl" className="input" placeholder="https://…" />
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
