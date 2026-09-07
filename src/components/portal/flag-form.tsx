"use client";

import { useActionState, useEffect, useRef } from "react";
import { addFlag } from "@/app/portal/actions";

export function FlagForm({ playerId }: { playerId: string }) {
  const [state, action, pending] = useActionState(addFlag, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="mt-3 space-y-2">
      <input type="hidden" name="playerId" value={playerId} />
      <div className="flex gap-2">
        <select name="type" className="input max-w-[9rem]" defaultValue="NOTE">
          <option value="NOTE">Note</option>
          <option value="WARNING">Warning</option>
          <option value="BAN">Ban</option>
        </select>
        <input name="reason" required className="input" placeholder="Reason" />
      </div>
      <div className="flex justify-end">
        <button className="btn-danger text-xs" disabled={pending}>
          {pending ? "…" : "Add flag"}
        </button>
      </div>
      {state.error && <p className="text-xs text-ember">{state.error}</p>}
    </form>
  );
}
