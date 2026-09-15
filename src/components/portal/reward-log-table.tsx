"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignRewardsToEvent, deleteReward } from "@/app/(site)/portal/actions";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { RewardEditForm } from "@/components/portal/reward-edit-form";

export type RewardRow = {
  id: string;
  playerId: string;
  playerName: string;
  item: string;
  amount: string | null;
  reason: string;
  isPublic: boolean;
  received: boolean;
  disputed: boolean;
  eventId: string | null;
  eventTitle: string | null;
  guessedEventTitle: string | null; // only set when eventTitle is null
  grantedByName: string;
  grantedAtLabel: string;
};

export function RewardLogTable({
  rewards,
  events,
  canGrant,
}: {
  rewards: RewardRow[];
  events: { id: string; label: string }[];
  canGrant: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEventId, setBulkEventId] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const unlinkedIds = rewards.filter((r) => !r.eventTitle).map((r) => r.id);
  const allUnlinkedSelected = unlinkedIds.length > 0 && unlinkedIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allUnlinkedSelected ? new Set() : new Set(unlinkedIds));
  }

  function assign() {
    if (!bulkEventId || selected.size === 0) return;
    setMsg(null);
    start(async () => {
      const res = await assignRewardsToEvent(Array.from(selected), bulkEventId);
      if (res.error) {
        setMsg(res.error);
        return;
      }
      setMsg(`Linked ${res.count ?? 0} reward${res.count === 1 ? "" : "s"}.`);
      setSelected(new Set());
      setBulkEventId("");
      router.refresh();
    });
  }

  const colCount = 7 + (canGrant && unlinkedIds.length > 0 ? 1 : 0);

  return (
    <div>
      {canGrant && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 border border-teal-dim bg-teal/5 px-3 py-2">
          <span className="text-xs text-slate-200">{selected.size} selected</span>
          <select
            className="input w-auto text-xs"
            value={bulkEventId}
            onChange={(e) => setBulkEventId(e.target.value)}
          >
            <option value="">Assign to event…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={!bulkEventId || pending}
            onClick={assign}
          >
            {pending ? "Linking…" : "Assign to event"}
          </button>
          <button
            type="button"
            className="font-mono text-[0.66rem] uppercase tracking-widest text-slate-400 hover:text-cream"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}
      {msg && <p className="mb-2 text-xs text-teal">{msg}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr>
              {canGrant && unlinkedIds.length > 0 && (
                <th scope="col" className="w-6 py-2">
                  <input
                    type="checkbox"
                    checked={allUnlinkedSelected}
                    onChange={toggleAll}
                    title="Select all unlinked rewards"
                  />
                </th>
              )}
              <th scope="col" className="py-2">Player</th>
              <th scope="col" className="py-2">Item</th>
              <th scope="col" className="py-2">Reason</th>
              <th scope="col" className="py-2">Event</th>
              <th scope="col" className="py-2">By</th>
              <th scope="col" className="py-2">Date</th>
              <th scope="col" className="py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {rewards.map((r) =>
              editingId === r.id ? (
                <tr key={r.id}>
                  <td colSpan={colCount} className="py-3">
                    <RewardEditForm
                      reward={r}
                      events={events}
                      onDone={() => setEditingId(null)}
                      note={`Editing ${r.playerName}'s reward — no notification is re-sent to the player.`}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  {canGrant && unlinkedIds.length > 0 && (
                    <td className="py-2">
                      {!r.eventTitle && (
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                        />
                      )}
                    </td>
                  )}
                  <td className="py-2">
                    <Link href={`/portal/players/${r.playerId}`} className="text-slate-200 hover:text-teal">
                      {r.playerName}
                    </Link>
                  </td>
                  <td className="py-2 text-teal">
                    {r.item}{r.amount ? ` ×${r.amount}` : ""}
                    {r.received && <span className="ml-2 text-[0.65rem] uppercase text-teal/70">✓ received</span>}
                    {!r.received && r.disputed && (
                      <span className="ml-2 text-[0.65rem] uppercase text-ember">⚠ missing</span>
                    )}
                  </td>
                  <td className="py-2 text-slate-300">
                    {r.reason}
                    {r.isPublic && <span className="badge ml-2">public</span>}
                  </td>
                  <td className="py-2 text-slate-400">
                    {r.eventTitle ?? (
                      r.guessedEventTitle ? (
                        <span
                          className="text-ember"
                          title={`Reason mentions "${r.guessedEventTitle}" but no event is linked — select it above and use "Assign to event".`}
                        >
                          — <span className="text-[0.65rem]">≈ {r.guessedEventTitle}?</span>
                        </span>
                      ) : (
                        "—"
                      )
                    )}
                  </td>
                  <td className="py-2 text-slate-400">{r.grantedByName}</td>
                  <td className="py-2 text-slate-400">{r.grantedAtLabel}</td>
                  <td className="py-2">
                    {canGrant && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-teal"
                          onClick={() => setEditingId(r.id)}
                        >
                          edit
                        </button>
                        <ConfirmButton
                          action={deleteReward.bind(null, r.id, r.playerId)}
                          confirm="Delete this reward?"
                          className="text-xs text-slate-400 hover:text-red-300"
                        >
                          delete
                        </ConfirmButton>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-slate-400">No rewards logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
