"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { editReward } from "@/app/(site)/portal/actions";

export type EditableReward = {
  id: string;
  item: string;
  amount: string | null;
  reason: string;
  isPublic: boolean;
  eventId: string | null;
};

/** Shared "fix a typo in place" form — used on both the reward log and a player's own page. */
export function RewardEditForm({
  reward,
  events,
  onDone,
  note,
}: {
  reward: EditableReward;
  events: { id: string; label: string }[];
  onDone: () => void;
  note?: string;
}) {
  const [state, action, pending] = useActionState(editReward, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  return (
    <form action={action} className="grid gap-2 border border-edge bg-panel-2 p-3">
      <input type="hidden" name="id" value={reward.id} />
      <p className="text-xs text-slate-400">
        {note ?? "No notification is re-sent to the player."}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="item" defaultValue={reward.item} required className="input" placeholder="Item" />
        <input name="amount" defaultValue={reward.amount ?? ""} className="input" placeholder="Amount" />
      </div>
      <input name="reason" defaultValue={reward.reason} required className="input" placeholder="Reason" />
      <select name="eventId" defaultValue={reward.eventId ?? ""} className="input">
        <option value="">Not tied to a specific event</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>{e.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" name="isPublic" defaultChecked={reward.isPublic} className="accent-teal" />
        Show on the public proof gallery
      </label>
      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary text-xs" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
