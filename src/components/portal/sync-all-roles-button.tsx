"use client";

import { useState, useTransition } from "react";
import { syncAllDiscordRoles } from "@/app/(site)/portal/actions";

export function SyncAllRolesButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mt-4 border border-edge bg-panel/30 p-3 text-xs">
      <p className="text-slate-400">
        Reconcile the Registered / Team-leader / faction roles for every linked member. Run this
        once after setting the role IDs below, or any time roles drift.
      </p>
      <button
        className="btn-ghost mt-2 text-xs"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await syncAllDiscordRoles();
            setMsg(r.error ?? `Synced ${r.count ?? 0} member(s).`);
          })
        }
      >
        {pending ? "Syncing…" : "Sync all Discord roles"}
      </button>
      {msg && <p className="mt-1 text-slate-400">{msg}</p>}
    </div>
  );
}
