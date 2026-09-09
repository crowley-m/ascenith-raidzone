"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignEventsToSeason } from "@/app/(site)/portal/actions";

type EventOpt = { id: string; label: string; seasonId: string | null };

export function SeasonEventPicker({
  seasonId,
  events,
}: {
  seasonId: string;
  events: EventOpt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(events.filter((e) => e.seasonId === seasonId).map((e) => e.id)),
  );

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="mt-4 border-t border-edge pt-4">
      <p className="label mb-2">Events in this season</p>
      {events.length === 0 ? (
        <p className="text-xs text-slate-500">No events created yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => {
            const otherSeason = e.seasonId && e.seasonId !== seasonId;
            return (
              <li key={e.id}>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="accent-teal"
                    checked={checked.has(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                  <span>{e.label}</span>
                  {otherSeason && !checked.has(e.id) && (
                    <span className="text-[0.65rem] uppercase tracking-wide text-slate-600">
                      in another season
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          className="btn-ghost text-xs"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const res = await assignEventsToSeason(seasonId, [...checked]);
              setMsg(res.error ?? `Saved — ${res.count ?? 0} event${res.count === 1 ? "" : "s"}.`);
              router.refresh();
            });
          }}
        >
          {pending ? "Saving…" : "Save events"}
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
    </div>
  );
}
