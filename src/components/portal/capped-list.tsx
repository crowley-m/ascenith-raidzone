"use client";

import { useState } from "react";

/**
 * Wraps a long `<li>` list (event history, notes, flags, …) so a
 * long-tenured player's page doesn't render hundreds of rows at once —
 * shows the first `cap` items and a "+N more" toggle for the rest, both
 * pre-rendered server-side and passed straight through as children.
 */
export function CappedList({ children, cap = 10 }: { children: React.ReactNode[]; cap?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (children.length <= cap || expanded) return <>{children}</>;
  return (
    <>
      {children.slice(0, cap)}
      <li className="pt-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-teal hover:underline"
        >
          + {children.length - cap} more
        </button>
      </li>
    </>
  );
}
