"use client";

import { EventBrief, type OpEvent } from "@/components/landing/EventBrief";
import s from "@/components/landing/landing.module.css";

/**
 * Renders the landing page's "Current event" brief with this event's content,
 * so staff can see how it reads on the homepage before publishing. Wrapped in
 * `.root` so the landing's warm palette + type scale apply (fonts fall back to
 * system faces here — the live page loads Anton / Space Mono).
 */
export function LandingPreview({ event }: { event: OpEvent }) {
  return (
    <div
      className={s.root}
      style={{ minHeight: 0, borderRadius: 6, overflow: "hidden", border: "1px solid #26221d" }}
    >
      <EventBrief event={event} />
    </div>
  );
}
