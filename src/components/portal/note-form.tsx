"use client";

import { useActionState, useEffect, useRef } from "react";
import { addNote } from "@/app/(site)/portal/actions";

export function NoteForm({ playerId }: { playerId: string }) {
  const [state, action, pending] = useActionState(addNote, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="mt-3 space-y-2">
      <input type="hidden" name="playerId" value={playerId} />
      <textarea
        name="body"
        required
        rows={2}
        className="input"
        placeholder="Add a private staff note…"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" name="pinned" /> Pin
        </label>
        <button className="btn-ghost text-xs" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
      {state.error && <p className="text-xs text-ember">{state.error}</p>}
    </form>
  );
}
