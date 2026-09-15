"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** A tiny up/down arrow pair for swap-based reordering — reused for categories and channels. */
export function MoveButtons({
  onUp,
  onDown,
  disableUp,
  disableDown,
}: {
  onUp: () => Promise<unknown>;
  onDown: () => Promise<unknown>;
  disableUp?: boolean;
  disableDown?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) => () => {
    start(async () => {
      await fn();
      router.refresh();
    });
  };
  return (
    <span className="inline-flex gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="border border-edge px-1.5 py-0.5 text-xs text-slate-400 hover:border-teal hover:text-teal disabled:opacity-30"
        disabled={pending || disableUp}
        onClick={run(onUp)}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className="border border-edge px-1.5 py-0.5 text-xs text-slate-400 hover:border-teal hover:text-teal disabled:opacity-30"
        disabled={pending || disableDown}
        onClick={run(onDown)}
        aria-label="Move down"
      >
        ↓
      </button>
    </span>
  );
}
