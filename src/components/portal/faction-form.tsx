"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveFaction } from "@/app/portal/actions";

export function FactionForm() {
  const [state, action, pending] = useActionState(saveFaction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-[1fr_6rem_5rem_auto] sm:items-end">
      <div>
        <label className="label">Name</label>
        <input name="name" required className="input" />
      </div>
      <div>
        <label className="label">Tag</label>
        <input name="tag" className="input" maxLength={12} />
      </div>
      <div>
        <label className="label">Color</label>
        <input name="color" type="color" defaultValue="#2fd4c7" className="input h-[38px] p-1" />
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "…" : "Add"}</button>
      {state.error && <p className="text-xs text-ember sm:col-span-4">{state.error}</p>}
    </form>
  );
}
