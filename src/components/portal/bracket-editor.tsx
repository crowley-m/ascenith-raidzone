"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateBracket,
  setBracketMatch,
  deleteBracket,
} from "@/app/(site)/portal/actions";
import { BRACKET_SIZES, type BracketView } from "@/lib/bracket";

export function BracketEditor({
  eventId,
  bracket,
  entrantCount,
}: {
  eventId: string;
  bracket: BracketView | null;
  entrantCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | void>) => {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setMsg(res.error);
      router.refresh();
    });
  };

  if (!bracket) {
    const sizes = BRACKET_SIZES.filter((s) => s >= Math.min(entrantCount, 32));
    const suggested = sizes[0] ?? 32;
    return (
      <div className="card space-y-3">
        <h3 className="font-display font-bold text-white">Bracket</h3>
        {entrantCount < 2 ? (
          <p className="text-sm text-slate-400">
            Register at least 2 entrants (teams for a team event, sign-ups for solo) to draw a
            bracket.
          </p>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            action={(fd) =>
              run(() =>
                generateBracket(
                  eventId,
                  Number(fd.get("size")),
                  (fd.get("seed") as "signup" | "random") ?? "signup",
                ),
              )
            }
          >
            <div>
              <label className="label">Size</label>
              <select name="size" defaultValue={suggested} className="input h-9 py-0 text-sm">
                {BRACKET_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Seeding</label>
              <select name="seed" defaultValue="signup" className="input h-9 py-0 text-sm">
                <option value="signup">Registration order</option>
                <option value="random">Random draw</option>
              </select>
            </div>
            <button className="btn-primary text-xs" disabled={pending}>
              {pending ? "Drawing…" : "Draw bracket"}
            </button>
            <span className="text-xs text-slate-500">{entrantCount} entrants registered</span>
          </form>
        )}
        {msg && <p className="text-xs text-ember">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-bold text-white">
          Bracket <span className="text-slate-500">· {bracket.size}</span>
        </h3>
        <button
          className="text-xs text-slate-500 hover:text-red-300"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Clear this bracket? All match results are lost.")) {
              run(() => deleteBracket(eventId));
            }
          }}
        >
          clear bracket
        </button>
      </div>
      {bracket.champion && (
        <p className="font-mono text-xs uppercase tracking-wide text-teal">
          🏆 {bracket.champion}
        </p>
      )}
      {msg && <p className="text-xs text-ember">{msg}</p>}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-5">
          {bracket.rounds.map((r) => (
            <div key={r.round} className="flex w-56 flex-col">
              <div className="mb-3 font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                {r.name}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {r.matches.map((m) => (
                  <div key={m.id} className="border border-edge bg-void/40">
                    <EditRow
                      matchId={m.id}
                      side="a"
                      label={m.a.label}
                      score={m.a.score}
                      won={m.a.won}
                      canWin={!!m.a.ref}
                      onRun={run}
                    />
                    <div className="h-px bg-edge" />
                    <EditRow
                      matchId={m.id}
                      side="b"
                      label={m.b.label}
                      score={m.b.score}
                      won={m.b.won}
                      canWin={!!m.b.ref}
                      onRun={run}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditRow({
  matchId,
  side,
  label,
  score,
  won,
  canWin,
  onRun,
}: {
  matchId: string;
  side: "a" | "b";
  label: string | null;
  score: number | null;
  won: boolean;
  canWin: boolean;
  onRun: (fn: () => Promise<{ error?: string } | void>) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
      <button
        type="button"
        disabled={!canWin}
        title={won ? "Winner — click to clear" : "Mark winner"}
        onClick={() =>
          onRun(() => setBracketMatch(matchId, { winner: won ? null : side }))
        }
        className={`h-4 w-4 shrink-0 rounded-full border text-[0.6rem] ${
          won ? "border-teal bg-teal" : "border-edge hover:border-teal/60"
        } disabled:opacity-30`}
        aria-label="winner"
      />
      <span className={`flex-1 truncate ${won ? "text-white" : "text-slate-300"}`}>
        {label ?? <span className="text-slate-600">—</span>}
      </span>
      <input
        type="number"
        defaultValue={score ?? ""}
        disabled={!canWin}
        className="input h-6 w-10 px-1 py-0 text-center text-xs disabled:opacity-30"
        onBlur={(e) => {
          const v = e.target.value === "" ? null : Number(e.target.value);
          if (v !== score) {
            onRun(() =>
              setBracketMatch(matchId, side === "a" ? { aScore: v } : { bScore: v }),
            );
          }
        }}
      />
    </div>
  );
}
