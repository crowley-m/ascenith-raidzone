"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInToEvent } from "@/app/(site)/events/actions";

export function CheckInButton({
  eventId,
  checkedIn,
}: {
  eventId: string;
  checkedIn: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (checkedIn) {
    return (
      <span className="badge border-teal/40 text-teal">✓ You&apos;re checked in</span>
    );
  }

  return (
    <div className="space-y-1">
      <button
        className="btn-primary px-6 py-3 text-base"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await checkInToEvent(eventId);
            if (res?.error) setMsg(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "…" : "Check in"}
      </button>
      {msg && <p className="text-xs text-ember">{msg}</p>}
    </div>
  );
}
