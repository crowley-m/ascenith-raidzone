"use client";

import { Fragment, useEffect, useState } from "react";
import type { BracketView } from "@/lib/bracket";

const POLL_MS = 10_000;
// Grid geometry for the connector-line layout — a round-1 match reserves one
// ROW-tall slot; round r's match spans 2^r of them and sits centered in it,
// so its vertical center always lands at (position + 0.5) * 2^r rows from
// the top — the same math a real single-elim bracket diagram uses.
const ROW = 84;
const COL = 208;
const CONN = 28;

/** Earliest undecided match with both sides filled in — the next one to actually happen. */
function upNextId(bracket: BracketView): string | null {
  for (const r of bracket.rounds) {
    for (const m of r.matches) {
      if (!m.decided && m.a.label && m.b.label) return m.id;
    }
  }
  return null;
}

/**
 * Read-only single-elimination bracket. Columns per round, scrolls sideways.
 * Polls for fresh results every 10s while the bracket is undecided — a
 * spectator watching a live tournament sees results land without reloading.
 * Stops on its own once a champion is set, and skips a tick while the tab
 * is backgrounded.
 */
export function BracketBoard({ eventId, bracket: initial }: { eventId: string; bracket: BracketView }) {
  const [bracket, setBracket] = useState(initial);

  useEffect(() => {
    if (bracket.champion) return;
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/events/${eventId}/bracket`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as BracketView;
        if (!cancelled) setBracket(data);
      } catch {
        // transient network hiccup — the next tick will try again
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId, bracket.champion]);

  const nextId = upNextId(bracket);
  const baseRows = bracket.rounds[0]?.matches.length ?? 0;
  const gridTemplateColumns = bracket.rounds.map((_, i) => (i === 0 ? `${COL}px` : `${CONN}px ${COL}px`)).join(" ");

  return (
    <div className="overflow-x-auto pb-2">
      {!bracket.champion && (
        <div className="mb-3 flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
          </span>
          Live — updates automatically
        </div>
      )}

      <div className="flex" style={{ width: bracket.rounds.length * COL + (bracket.rounds.length - 1) * CONN }}>
        {bracket.rounds.map((r, i) => (
          <div
            key={r.round}
            style={{ width: COL, marginLeft: i === 0 ? 0 : CONN }}
            className="font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-400"
          >
            {r.name}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns, gridTemplateRows: `repeat(${baseRows}, ${ROW}px)` }}>
        {bracket.rounds.map((r, ri) => {
          const roundCol = ri === 0 ? 1 : ri * 2 + 1;
          const span = 2 ** ri;
          return (
            <Fragment key={r.round}>
              {ri > 0 &&
                r.matches.map((m) => (
                  <div
                    key={`c-${m.id}`}
                    aria-hidden
                    className="relative"
                    style={{ gridColumn: roundCol - 1, gridRow: `${m.position * span + 1} / span ${span}` }}
                  >
                    <span className="absolute bottom-1/4 left-0 top-1/4 w-px bg-edge" />
                    <span className="absolute left-0 top-1/2 h-px w-full bg-edge" />
                  </div>
                ))}
              {r.matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center"
                  style={{ gridColumn: roundCol, gridRow: `${m.position * span + 1} / span ${span}` }}
                >
                  <div className="relative w-full">
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
                </div>
              ))}
            </Fragment>
          );
        })}
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
        won ? "text-white" : decided ? "text-slate-400" : "text-slate-300"
      }`}
    >
      <span className="flex items-center gap-1.5 truncate">
        {won && <span className="text-teal">▸</span>}
        {label ?? <span className="text-slate-400">—</span>}
      </span>
      {score !== null && <span className="font-mono tabular-nums text-slate-400">{score}</span>}
    </div>
  );
}
