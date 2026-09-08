"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveFaction } from "@/app/(site)/portal/actions";

type FactionInit = {
  id: string;
  name: string;
  tag: string | null;
  color: string | null;
  description: string | null;
  discordRoleId: string | null;
};

export function FactionForm({ faction }: { faction?: FactionInit }) {
  const [state, action, pending] = useActionState(saveFaction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !faction) ref.current?.reset();
  }, [state.ok, faction]);

  return (
    <form ref={ref} action={action} className="grid gap-3">
      {faction && <input type="hidden" name="id" value={faction.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_5rem]">
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" defaultValue={faction?.name ?? ""} />
        </div>
        <div>
          <label className="label">Tag</label>
          <input name="tag" className="input" maxLength={12} defaultValue={faction?.tag ?? ""} />
        </div>
        <div>
          <label className="label">Color</label>
          <input
            name="color"
            type="color"
            defaultValue={faction?.color ?? "#2fd4c7"}
            className="input h-[38px] p-1"
          />
        </div>
      </div>
      <div>
        <label className="label">Discord role ID (optional)</label>
        <input
          name="discordRoleId"
          className="input font-mono text-xs"
          inputMode="numeric"
          placeholder="1234567890123456789"
          defaultValue={faction?.discordRoleId ?? ""}
        />
        <p className="mt-1 text-xs text-slate-500">
          Members of this faction get this Discord role automatically; leaving or switching
          faction removes it. Right-click the role in Discord → Copy Role ID (Developer Mode on).
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "…" : faction ? "Save" : "Add faction"}
        </button>
        {state.error && <p className="text-xs text-ember">{state.error}</p>}
        {state.ok && faction && <p className="text-xs text-teal">Saved.</p>}
      </div>
    </form>
  );
}
