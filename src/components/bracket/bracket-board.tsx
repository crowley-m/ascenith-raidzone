import type { BracketView } from "@/lib/bracket";

/** Earliest undecided match with both sides filled in — the next one to actually happen. */
function upNextId(bracket: BracketView): string | null {
  for (const r of bracket.rounds) {
    for (const m of r.matches) {
      if (!m.decided && m.a.label && m.b.label) return m.id;
    }
  }
  return null;
}

/** Read-only single-elimination bracket. Columns per round, scrolls sideways. */
export function BracketBoard({ bracket }: { bracket: BracketView }) {
  const nextId = upNextId(bracket);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-6">
        {bracket.rounds.map((r) => (
          <div key={r.round} className="flex w-52 flex-col">
            <div className="mb-3 font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
              {r.name}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {r.matches.map((m) => (
                <div key={m.id} className="relative">
                  {m.id === nextId && (
                    <span className="absolute -top-2 left-2 bg-void px-1 font-mono text-[0.58rem] font-bold uppercase tracking-[0.14em] text-teal">
                      Up next
                    </span>
                  )}
                  <div
                    className={`border text-sm ${
                      m.id === nextId ? "border-teal/60 bg-teal/5" : "border-edge bg-panel/40"
                    }`}
                  >
                    <Side label={m.a.label} score={m.a.score} won={m.a.won} decided={m.decided} />
                    <div className="h-px bg-edge" />
                    <Side label={m.b.label} score={m.b.score} won={m.b.won} decided={m.decided} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {bracket.champion && (
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-teal">
          🏆 Champion — <span className="text-white">{bracket.champion}</span>
        </p>
      )}
    </div>
  );
}

function Side({
  label,
  score,
  won,
  decided,
}: {
  label: string | null;
  score: number | null;
  won: boolean;
  decided: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 ${
        won ? "text-white" : decided ? "text-slate-500" : "text-slate-300"
      }`}
    >
      <span className="flex items-center gap-1.5 truncate">
        {won && <span className="text-teal">▸</span>}
        {label ?? <span className="text-slate-600">—</span>}
      </span>
      {score !== null && <span className="font-mono tabular-nums text-slate-400">{score}</span>}
    </div>
  );
}
