"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { saveFaction } from "@/app/(site)/portal/actions";

type FactionInit = {
  id: string;
  name: string;
  tag: string | null;
  color: string | null;
  description: string | null;
  discordRoleId: string | null;
};

type Role = { id: string; name: string };

export function FactionForm({
  faction,
  roles = [],
}: {
  faction?: FactionInit;
  roles?: Role[];
}) {
  const [state, action, pending] = useActionState(saveFaction, {});
  const ref = useRef<HTMLFormElement>(null);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  useEffect(() => {
    if (state.ok && !faction) ref.current?.reset();
  }, [state.ok, faction]);

  return (
    <form ref={ref} action={action} className="grid gap-3">
      {faction && <input type="hidden" name="id" value={faction.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_5rem]">
        <div>
          <label htmlFor={fid("name")} className="label">Name</label>
          <input id={fid("name")} name="name" required className="input" defaultValue={faction?.name ?? ""} />
        </div>
        <div>
          <label htmlFor={fid("tag")} className="label">Tag</label>
          <input id={fid("tag")} name="tag" className="input" maxLength={12} defaultValue={faction?.tag ?? ""} />
        </div>
        <div>
          <label htmlFor={fid("color")} className="label">Color</label>
          <input
            id={fid("color")}
            name="color"
            type="color"
            defaultValue={faction?.color ?? "#2fd4c7"}
            className="input h-[38px] p-1"
          />
        </div>
      </div>
      <div>
        <label htmlFor={fid("description")} className="label">Description (shown on the public Factions page)</label>
        <textarea
          id={fid("description")}
          name="description"
          rows={2}
          className="input"
          maxLength={500}
          defaultValue={faction?.description ?? ""}
          placeholder="Who they are, what they stand for."
        />
      </div>
      <div>
        <label htmlFor={fid("discordRoleId")} className="label">Discord role (optional)</label>
        {roles.length > 0 ? (
          <select
            id={fid("discordRoleId")}
            name="discordRoleId"
            className="input"
            defaultValue={faction?.discordRoleId ?? ""}
          >
            <option value="">— none —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {faction?.discordRoleId &&
              !roles.some((r) => r.id === faction.discordRoleId) && (
                <option value={faction.discordRoleId}>
                  (deleted role {faction.discordRoleId})
                </option>
              )}
          </select>
        ) : (
          <input
            id={fid("discordRoleId")}
            name="discordRoleId"
            className="input font-mono text-xs"
            inputMode="numeric"
            placeholder="1234567890123456789"
            defaultValue={faction?.discordRoleId ?? ""}
          />
        )}
        <p className="mt-1 text-xs text-slate-400">
          Members of this faction get this role automatically; leaving or switching faction
          removes it.
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
