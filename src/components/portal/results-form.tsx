"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  savePlacements,
  grantPlacementRewards,
  grantAttendeeRewards,
} from "@/app/(site)/portal/actions";

type Entrant = { value: string; label: string };

export function ResultsForm({
  eventId,
  entrants,
  current,
  tiers,
  canReward,
}: {
  eventId: string;
  entrants: Entrant[];
  current: Record<number, string>; // rank -> "team:id" | "player:id"
  tiers: { place: string; reward: string }[];
  canReward: boolean;
}) {
  const [state, action, pending] = useActionState(savePlacements, {});
  const router = useRouter();
  const ranks = [1, 2, 3];

  return (
    <div className="card space-y-4">
      <h3 className="font-display font-bold text-white">Results</h3>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="eventId" value={eventId} />
        {ranks.map((r) => (
          <div key={r} className="grid grid-cols-[3rem_1fr] items-center gap-3">
            <span className="font-mono text-xs uppercase text-slate-400">
              {tiers[r - 1]?.place ?? `#${r}`}
            </span>
            <select name={`rank${r}`} className="input" defaultValue={current[r] ?? ""}>
              <option value="">—</option>
              {entrants.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {state.error && <p className="text-sm text-ember">{state.error}</p>}
        {state.ok && <p className="text-sm text-teal">Results saved.</p>}
        <div>
          <button
            className="btn-primary text-xs"
            disabled={pending}
            onClick={() => setTimeout(() => router.refresh(), 400)}
          >
            {pending ? "Saving…" : "Save results"}
          </button>
        </div>
      </form>

      {canReward && Object.keys(current).length > 0 && (
        <PlacementRewardButton eventId={eventId} />
      )}
    </div>
  );
}

function PlacementRewardButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [pub, setPub] = useState(true);

  return (
    <div className="border-t border-edge pt-3">
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> show on
        the public Winners page
      </label>
      <button
        className="btn-ghost mt-2 text-xs"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Log a reward for each placed team/player from the event's reward tiers?"))
            return;
          const fd = new FormData();
          fd.set("eventId", eventId);
          if (pub) fd.set("isPublic", "on");
          start(async () => {
            const res = await grantPlacementRewards({}, fd);
            setMsg(res.error ?? `Logged ${res.count ?? 0} rewards.`);
            router.refresh();
          });
        }}
      >
        {pending ? "…" : "Reward the placements"}
      </button>
      {msg && <p className="mt-1 text-xs text-slate-400">{msg}</p>}
    </div>
  );
}

export function AttendeeRewardForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(grantAttendeeRewards, {});
  const router = useRouter();

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setTimeout(() => router.refresh(), 400);
      }}
      className="card grid gap-3"
    >
      <h3 className="font-display font-bold text-white">Reward every attendee</h3>
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="item" required className="input" placeholder="Item (e.g. 500 Crystgin)" />
        <input name="amount" className="input" placeholder="Amount (optional)" />
      </div>
      <input name="reason" className="input" placeholder="Reason (default: Attendance)" />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="isPublic" /> show on the public Winners page
      </label>
      {state.error && <p className="text-sm text-ember">{state.error}</p>}
      {state.ok && <p className="text-sm text-teal">Logged {state.count} rewards.</p>}
      <div>
        <button className="btn-primary text-xs" disabled={pending}>
          {pending ? "Logging…" : "Reward attendees"}
        </button>
      </div>
    </form>
  );
}
