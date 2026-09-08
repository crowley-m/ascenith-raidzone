"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRewardReceived } from "@/app/(site)/me/actions";

export function RewardReceipt({ rewardId, received }: { rewardId: string; received: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (received) {
    return (
      <button
        className="font-mono text-[0.62rem] uppercase tracking-widest text-teal disabled:opacity-50"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setRewardReceived(rewardId, false);
            router.refresh();
          })
        }
        title="Undo — mark as not received"
      >
        ✓ Received
      </button>
    );
  }
  return (
    <button
      className="btn-ghost text-xs disabled:opacity-50"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setRewardReceived(rewardId, true);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Mark received"}
    </button>
  );
}
