"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRewardReceived, disputeReward } from "@/app/(site)/me/actions";

export function RewardReceipt({
  rewardId,
  received,
  disputed = false,
}: {
  rewardId: string;
  received: boolean;
  disputed?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  if (received) {
    return (
      <button
        className="font-mono text-[0.62rem] uppercase tracking-widest text-teal disabled:opacity-50"
        disabled={pending}
        onClick={() => run(() => setRewardReceived(rewardId, false))}
        title="Undo — mark as not received"
      >
        ✓ Received
      </button>
    );
  }

  if (disputed) {
    return (
      <button
        className="font-mono text-[0.62rem] uppercase tracking-widest text-ember disabled:opacity-50"
        disabled={pending}
        onClick={() => run(() => disputeReward(rewardId, false))}
        title="Withdraw — it arrived after all"
      >
        ⚠ Reported missing
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        className="btn-ghost text-xs disabled:opacity-50"
        disabled={pending}
        onClick={() => run(() => setRewardReceived(rewardId, true))}
      >
        {pending ? "…" : "Mark received"}
      </button>
      <button
        className="font-mono text-[0.62rem] uppercase tracking-widest text-slate-500 hover:text-ember disabled:opacity-50"
        disabled={pending}
        onClick={() => run(() => disputeReward(rewardId, true))}
        title="Tell staff this never arrived in-game"
      >
        Didn&apos;t get it
      </button>
    </span>
  );
}
