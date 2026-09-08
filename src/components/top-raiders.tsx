import Link from "next/link";
import type { RaiderStat } from "@/lib/leaderboard";

export function TopRaiders({
  raiders,
  compact = false,
}: {
  raiders: RaiderStat[];
  compact?: boolean;
}) {
  if (raiders.length === 0) {
    return <p className="text-sm text-slate-400">No standings yet — they build up as events run.</p>;
  }
  return (
    <ol className="divide-y divide-edge/60">
      {raiders.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
          <span className="w-6 text-right font-mono text-xs text-slate-500">{i + 1}</span>
          <span className="flex-1 text-slate-100">
            <Link href={`/players/${r.id}`} className="hover:text-teal">
              {r.name}
            </Link>
            {!compact && r.region && (
              <span className="ml-2 text-xs text-slate-500">{r.region}</span>
            )}
          </span>
          <span className="flex items-center gap-2 font-mono text-xs text-slate-400">
            {r.gold > 0 && <span className="text-teal">{r.gold}×1st</span>}
            {r.silver > 0 && <span>{r.silver}×2nd</span>}
            {r.bronze > 0 && <span>{r.bronze}×3rd</span>}
            <span className="text-slate-500">{r.attended} played</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
