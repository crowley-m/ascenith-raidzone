"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignRewardsToEvent, deleteReward, editReward } from "@/app/(site)/portal/actions";
import { ConfirmButton } from "@/components/portal/confirm-button";

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
            className="font-mono text-[0.66rem] uppercase tracking-widest text-slate-500 hover:text-cream"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}
      {msg && <p className="mb-2 text-xs text-teal">{msg}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              {canGrant && unlinkedIds.length > 0 && (
                <th className="w-6 py-2">
                  <input
                    type="checkbox"
                    checked={allUnlinkedSelected}
                    onChange={toggleAll}
                    title="Select all unlinked rewards"
                  />
                </th>
              )}
              <th className="py-2">Player</th>
              <th className="py-2">Item</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Event</th>
              <th className="py-2">By</th>
              <th className="py-2">Date</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {rewards.map((r) =>
              editingId === r.id ? (
                <tr key={r.id}>
                  <td colSpan={colCount} className="py-3">
                    <EditRewardRow
                      reward={r}
                      events={events}
                      onDone={() => setEditingId(null)}
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
                  <td className="py-2 text-slate-500">
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
                  <td className="py-2 text-slate-500">{r.grantedByName}</td>
                  <td className="py-2 text-slate-500">{r.grantedAtLabel}</td>
                  <td className="py-2">
                    {canGrant && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:text-teal"
                          onClick={() => setEditingId(r.id)}
                        >
                          edit
                        </button>
                        <ConfirmButton
                          action={deleteReward.bind(null, r.id, r.playerId)}
                          confirm="Delete this reward?"
                          className="text-xs text-slate-500 hover:text-red-300"
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

function EditRewardRow({
  reward,
  events,
  onDone,
}: {
  reward: RewardRow;
  events: { id: string; label: string }[];
  onDone: () => void;
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
      <p className="text-xs text-slate-500">
        Editing {reward.playerName}&apos;s reward — no notification is re-sent to the player.
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
