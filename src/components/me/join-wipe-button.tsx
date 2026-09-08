"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signUpForEvent } from "@/app/(site)/events/actions";

export function JoinWipeButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-xs text-ember">{msg}</span>}
      <button
        className="btn-primary text-xs disabled:opacity-50"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await signUpForEvent(eventId);
            if (res?.error) setMsg(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "…" : "Join the wipe"}
      </button>
    </span>
  );
}
