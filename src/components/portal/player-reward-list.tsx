"use client";

import { useState } from "react";
import { deleteReward } from "@/app/(site)/portal/actions";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { RewardEditForm } from "@/components/portal/reward-edit-form";

type Reward = {
  id: string;
  item: string;
  amount: string | null;
  reason: string;
  isPublic: boolean;
  eventId: string | null;
  eventTitle: string | null;
};

export function PlayerRewardList({
  playerId,
  rewards,
  events,
  canGrant,
}: {
  playerId: string;
  rewards: Reward[];
  events: { id: string; label: string }[];
  canGrant: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const cap = 10;
  const visible = rewards.length > cap && !expanded ? rewards.slice(0, cap) : rewards;

  return (
    <ul className="mt-3 divide-y divide-edge/60 text-sm">
      {rewards.length === 0 && <li className="py-2 text-slate-400">None yet.</li>}
      {visible.map((r) =>
        editingId === r.id ? (
          <li key={r.id} className="py-2">
            <RewardEditForm reward={r} events={events} onDone={() => setEditingId(null)} />
          </li>
        ) : (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="text-teal">{r.item}{r.amount ? ` ×${r.amount}` : ""}</span>
              <span className="text-slate-400"> — {r.reason}</span>
              {r.eventTitle && <span className="text-slate-600"> ({r.eventTitle})</span>}
              {r.isPublic && <span className="badge ml-2">public</span>}
            </span>
            {canGrant && (
              <span className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-teal"
                  onClick={() => setEditingId(r.id)}
                >
                  Edit
                </button>
                <ConfirmButton
                  action={deleteReward.bind(null, r.id, playerId)}
                  confirm="Delete this reward?"
                >
                  Delete
                </ConfirmButton>
              </span>
            )}
          </li>
        ),
      )}
      {rewards.length > cap && !expanded && (
        <li className="pt-2">
          <button type="button" onClick={() => setExpanded(true)} className="text-xs text-teal hover:underline">
            + {rewards.length - cap} more
          </button>
        </li>
      )}
    </ul>
  );
}
