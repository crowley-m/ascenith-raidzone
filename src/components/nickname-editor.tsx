"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEventNickname } from "@/app/(site)/events/actions";

/**
 * "Set/change my display name for this event" control — a clearly-teal "+"
 * affordance (matching "+ Add to calendar" elsewhere) rather than a muted
 * caption, so it actually reads as clickable.
 */
export function NicknameEditor({
  eventId,
  nickname,
}: {
  eventId: string;
  nickname?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(nickname ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        className="font-mono text-[0.7rem] uppercase tracking-widest text-teal hover:text-cream"
        onClick={() => setEditing(true)}
      >
        {nickname ? "+ Change name for this event" : "+ Use a different name for this event"}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        maxLength={40}
        placeholder="Display name for this event"
        className="input py-1 text-xs"
        autoFocus
      />
      <button
        className="font-mono text-[0.66rem] uppercase text-teal disabled:opacity-50"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await updateEventNickname(eventId, nick);
            if (res?.error) setMsg(res.error);
            else {
              setMsg(null);
              setEditing(false);
              router.refresh();
            }
          })
        }
      >
        Save
      </button>
      <button
        type="button"
        className="font-mono text-[0.66rem] uppercase text-slate-500 hover:text-cream"
        onClick={() => setEditing(false)}
        disabled={pending}
      >
        Cancel
      </button>
      {msg && <span className="text-xs text-ember">{msg}</span>}
    </div>
  );
}
