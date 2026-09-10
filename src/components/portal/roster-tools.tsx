"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllAttendance, dmRoster } from "@/app/(site)/portal/actions";

export function RosterTools({
  eventId,
  canMark,
  canManage,
}: {
  eventId: string;
  canMark: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [dmState, dmAction, dmPending] = useActionState(dmRoster, {} as { ok?: boolean; error?: string; count?: number });

  if (!canMark && !canManage) return null;

  return (
    <div className="card mt-4 space-y-4">
      <h3 className="font-display font-bold text-white">Roster tools</h3>

      {canMark && (
        <div>
          <div className="label">Attendance — everyone signed up</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="btn-ghost text-xs"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await markAllAttendance(eventId, true);
                  setMsg(r.error ?? `Marked ${r.count ?? 0} attended.`);
                  router.refresh();
                })
              }
            >
              Mark all attended
            </button>
            <button
              className="btn-ghost text-xs"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await markAllAttendance(eventId, false);
                  setMsg(r.error ?? `Marked ${r.count ?? 0} as no-show.`);
                  router.refresh();
                })
              }
            >
              Mark all no-show
            </button>
          </div>
          {msg && <p className="mt-1 text-xs text-slate-400">{msg}</p>}
        </div>
      )}

      {canManage && (
        <form
          action={async (fd) => {
            fd.set("eventId", eventId);
            await dmAction(fd);
          }}
          className="border-t border-edge pt-4"
        >
          <label className="label" htmlFor="body">
            Message the roster (Discord DM to everyone signed up)
          </label>
          <textarea
            id="body"
            name="body"
            rows={3}
            required
            maxLength={1500}
            className="input mt-1 text-sm"
            placeholder="Server's back up — we start in 15. Sorry for the delay."
          />
          {dmState.error && <p className="mt-1 text-xs text-ember">{dmState.error}</p>}
          {dmState.ok && (
            <p className="mt-1 text-xs text-teal">Sent to {dmState.count} player(s).</p>
          )}
          <div className="mt-2">
            <button className="btn-ghost text-xs" disabled={dmPending}>
              {dmPending ? "Sending…" : "Send DM to roster"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
