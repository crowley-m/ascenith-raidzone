"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { setStaffRole } from "@/app/(site)/portal/actions";
import { PlayerPicker } from "@/components/portal/player-picker";

type Candidate = {
  id: string;
  name: string | null;
  email: string | null;
  discordUsername: string | null;
};

export function StaffRoleForm({ candidates }: { candidates: Candidate[] }) {
  const [state, action, pending] = useActionState(setStaffRole, {});
  const ref = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setResetKey((k) => k + 1);
    }
  }, [state.ok]);

  const label = (c: Candidate) =>
    (c.name ?? c.discordUsername ?? c.email ?? c.id.slice(0, 8)) +
    (c.discordUsername ? ` · @${c.discordUsername}` : "") +
    (c.email ? ` · ${c.email}` : "");

  return (
    <form ref={ref} action={action} className="grid gap-3">
      <div>
        <label htmlFor={fid("userId")} className="label">Person</label>
        <PlayerPicker
          key={resetKey}
          inputId={fid("userId")}
          name="userId"
          players={candidates.map((c) => ({ id: c.id, label: label(c) }))}
        />
      </div>

      <div>
        <label htmlFor={fid("ident")} className="label">…or type an email / Discord username</label>
        <input
          id={fid("ident")}
          name="ident"
          className="input"
          placeholder="oo7_cc7  or  name@example.com"
        />
        <p className="mt-1 text-xs text-slate-400">
          They must have signed in at least once. Discord username works — no email needed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[10rem_auto] sm:items-end">
        <div>
          <label htmlFor={fid("role")} className="label">Role</label>
          <select id={fid("role")} name="role" className="input" defaultValue="MODERATOR">
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
            <option value="OWNER">Owner</option>
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "…" : "Set role"}
        </button>
      </div>

      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      {state.ok && <p className="text-xs text-teal">Role updated.</p>}
    </form>
  );
}
