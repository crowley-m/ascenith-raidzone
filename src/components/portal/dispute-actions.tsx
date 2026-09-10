"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveRewardDispute } from "@/app/(site)/portal/actions";

export function DisputeActions({
  rewardId,
  playerId,
}: {
  rewardId: string;
  playerId: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (sent: boolean) =>
    start(async () => {
      await resolveRewardDispute(rewardId, playerId, sent);
      router.refresh();
    });
  return (
    <span className="flex gap-2">
      <button
        className="btn-ghost text-xs disabled:opacity-50"
        disabled={pending}
        onClick={() => run(true)}
      >
        Re-sent it
      </button>
      <button
        className="font-mono text-[0.62rem] uppercase tracking-widest text-slate-500 hover:text-slate-300 disabled:opacity-50"
        disabled={pending}
        onClick={() => run(false)}
      >
        Dismiss
      </button>
    </span>
  );
}
