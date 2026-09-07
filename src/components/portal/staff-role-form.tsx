"use client";

import { useActionState, useEffect, useRef } from "react";
import { setStaffRole } from "@/app/portal/actions";

export function StaffRoleForm() {
  const [state, action, pending] = useActionState(setStaffRole, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <div>
        <label className="label">User email</label>
        <input name="email" type="email" required className="input" placeholder="They must have signed in once" />
      </div>
      <div>
        <label className="label">Role</label>
        <select name="role" className="input" defaultValue="MODERATOR">
          <option value="MODERATOR">Moderator</option>
          <option value="ADMIN">Admin</option>
          <option value="OWNER">Owner</option>
        </select>
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "…" : "Set role"}</button>
      {state.error && <p className="text-xs text-ember sm:col-span-3">{state.error}</p>}
      {state.ok && <p className="text-xs text-teal sm:col-span-3">Role updated.</p>}
    </form>
  );
}
