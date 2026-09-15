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
              ? s === "BANNED"
                ? "bg-red-600 text-white"
                : "bg-teal text-void"
              : s === "BANNED"
                ? "border border-red-500/50 text-red-300 hover:border-red-400 hover:bg-red-500/10"
                : "border border-edge bg-panel/60 text-slate-300 hover:border-teal/50"
          }`}
          onClick={() => {
            if (
              s === "BANNED" &&
              !window.confirm(
                "Ban this player? Withdraws them from every event they're signed up for, revokes their Discord access role, and strips managed roles.",
              )
            )
              return;
            start(async () => {
              await setPlayerStatus(playerId, s);
              router.refresh();
            });
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
