/**
 * Best-effort "did you mean to link this event?" hint from free-typed reward
 * reason text — used to warn on the log form and to flag already-unlinked
 * rows in the reward log. Never auto-links anything, just a nudge.
 */
export function guessEventForReason<T extends { id: string; title: string }>(
  reason: string,
  events: T[],
): T | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const reasonNorm = norm(reason);
  if (!reasonNorm.trim()) return null;

  let best: { event: T; score: number } | null = null;
  for (const ev of events) {
    const words = norm(ev.title)
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    if (words.length === 0) continue;
    const matched = words.filter((w) => reasonNorm.includes(w));
    const score = matched.length / words.length;
    if (matched.length > 0 && score >= 0.5 && (!best || score > best.score)) {
      best = { event: ev, score };
    }
  }
  return best?.event ?? null;
}
