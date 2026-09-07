"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPlayerStatus } from "@/app/(site)/portal/actions";
import type { PlayerStatus } from "@prisma/client";

const OPTIONS: PlayerStatus[] = ["PENDING", "ACTIVE", "INACTIVE", "BANNED"];

export function PlayerStatusControl({
  playerId,
  current,
  canEdit,
}: {
  playerId: string;
  current: PlayerStatus;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!canEdit) {
    return <span className="badge">{current}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((s) => (
        <button
          key={s}
          disabled={pending || s === current}
          className={`btn text-xs ${
            s === current
              ? "bg-teal text-void"
              : "border border-edge bg-panel/60 text-slate-300 hover:border-teal/50"
          }`}
          onClick={() =>
            start(async () => {
              await setPlayerStatus(playerId, s);
              router.refresh();
            })
          }
        >
          {s}
        </button>
      ))}
    </div>
  );
}
