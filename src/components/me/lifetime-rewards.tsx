import { summarizeRewards } from "@/lib/rewards-summary";

export function LifetimeRewards({ rewards }: { rewards: { item: string; amount: string | null }[] }) {
  const tallies = summarizeRewards(rewards);
  if (tallies.length === 0) return null;

  return (
    <div className="card">
      <div className="label mb-3">Lifetime rewards</div>
      <ul className="space-y-1.5 text-sm">
        {tallies.map((t) => (
          <li key={t.item} className="flex items-center justify-between gap-3">
            <span className="text-slate-300">{t.item}</span>
            <span className="font-mono text-teal">
              {t.hasAmount ? t.total.toLocaleString() : `×${t.count}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
