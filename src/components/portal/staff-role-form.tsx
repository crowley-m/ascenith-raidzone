"use client";

import { useActionState, useEffect, useRef } from "react";
import { setStaffRole } from "@/app/(site)/portal/actions";

type Candidate = {
  id: string;
  name: string | null;
  email: string | null;
  discordUsername: string | null;
};

export function StaffRoleForm({ candidates }: { candidates: Candidate[] }) {
  const [state, action, pending] = useActionState(setStaffRole, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  const label = (c: Candidate) =>
    c.name ??
    c.discordUsername ??
    c.email ??
    c.id.slice(0, 8);

  return (
    <form ref={ref} action={action} className="grid gap-3">
      <div>
        <label className="label">Person</label>
        <select name="userId" className="input" defaultValue="">
          <option value="">— pick someone who has signed in —</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {label(c)}
              {c.discordUsername ? ` · @${c.discordUsername}` : ""}
              {c.email ? ` · ${c.email}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">…or type an email / Discord username</label>
        <input
          name="ident"
          className="input"
          placeholder="oo7_cc7  or  name@example.com"
        />
        <p className="mt-1 text-xs text-slate-500">
          They must have signed in at least once. Discord username works — no email needed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[10rem_auto] sm:items-end">
        <div>
          <label className="label">Role</label>
          <select name="role" className="input" defaultValue="MODERATOR">
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
