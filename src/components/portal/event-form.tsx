"use client";

import { useActionState } from "react";
import { saveEvent } from "@/app/portal/actions";

type EventInit = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string; // datetime-local value
  endsAt: string;
  server: string | null;
  maxSlots: number | null;
  rewardPoolText: string | null;
  status: string;
};

export function EventForm({ event }: { event?: EventInit }) {
  const [state, action, pending] = useActionState(saveEvent, {});

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div>
        <label className="label">Title *</label>
        <input name="title" required className="input" defaultValue={event?.title ?? ""} />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea name="description" rows={4} className="input" defaultValue={event?.description ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Starts *</label>
          <input type="datetime-local" name="startsAt" required className="input" defaultValue={event?.startsAt ?? ""} />
        </div>
        <div>
          <label className="label">Ends</label>
          <input type="datetime-local" name="endsAt" className="input" defaultValue={event?.endsAt ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Server / world</label>
          <input name="server" className="input" defaultValue={event?.server ?? ""} />
        </div>
        <div>
          <label className="label">Max slots (blank = unlimited)</label>
          <input type="number" name="maxSlots" min={0} className="input" defaultValue={event?.maxSlots ?? ""} />
        </div>
      </div>

      <div>
        <label className="label">Reward pool</label>
        <textarea name="rewardPoolText" rows={2} className="input" defaultValue={event?.rewardPoolText ?? ""} />
      </div>

      <div>
        <label className="label">Status</label>
        <select name="status" className="input max-w-[12rem]" defaultValue={event?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published (announces to Discord)</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-ember">{state.error}</p>}

      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : event ? "Save event" : "Create event"}
        </button>
      </div>
    </form>
  );
}
