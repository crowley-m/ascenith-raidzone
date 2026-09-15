"use client";

import { useState } from "react";

/**
 * Wraps a long `<li>` list (event history, faction roster, …) so a
 * long-tenured record doesn't render hundreds of items at once — shows the
 * first `cap` items and a "+N more" toggle for the rest, both pre-rendered
 * server-side and passed straight through as children.
 */
export function CappedList({ children, cap = 15 }: { children: React.ReactNode[]; cap?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (children.length <= cap || expanded) return <>{children}</>;
  return (
    <>
      {children.slice(0, cap)}
      <li className="py-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="font-mono text-xs uppercase tracking-wide text-teal hover:text-cream"
        >
          + {children.length - cap} more
        </button>
      </li>
    </>
  );
}
