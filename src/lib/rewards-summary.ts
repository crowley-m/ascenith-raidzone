/**
 * Lifetime reward totals for a player — groups by item name (case-insensitive,
 * since it's free-typed) and sums `amount` where it parses as a number.
 * `Reward.amount` is a free-text string (e.g. "500", " 1,300", "Energy Link"
 * has none at all), so this tolerates commas/spaces and non-numeric rewards.
 */
export type RewardTally = { item: string; total: number; hasAmount: boolean; count: number };

export function summarizeRewards(rewards: { item: string; amount: string | null }[]): RewardTally[] {
  const byKey = new Map<string, RewardTally>();
  for (const r of rewards) {
    const label = r.item.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const parsed = r.amount ? Number(r.amount.replace(/[^\d.-]/g, "")) : NaN;
    const hasAmount = Number.isFinite(parsed);
    const existing = byKey.get(key);
    if (existing) {
      existing.total += hasAmount ? parsed : 0;
      existing.hasAmount = existing.hasAmount || hasAmount;
      existing.count += 1;
    } else {
      byKey.set(key, { item: label, total: hasAmount ? parsed : 0, hasAmount, count: 1 });
    }
  }
  return [...byKey.values()].sort((a, b) => b.total - a.total || b.count - a.count);
}
