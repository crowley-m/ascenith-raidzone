"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpForEvent, withdrawFromEvent } from "@/app/events/actions";

export function SignupButton({
  eventId,
  signedUp,
  state,
  loggedIn,
}: {
  eventId: string;
  signedUp: boolean;
  state?: string | null;
  loggedIn: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  if (!loggedIn) {
    return (
      <a href={`/login?callbackUrl=/events/${eventId}`} className="btn-primary px-6 py-3 text-base">
        Log in to sign up
      </a>
    );
  }

  if (signedUp) {
    return (
      <div className="flex flex-col items-start gap-2">
        <span className="badge border-teal/40 text-teal">
          {state === "WAITLIST" ? "On the waitlist" : "You're signed up"}
        </span>
        <button
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await withdrawFromEvent(eventId);
              router.refresh();
            })
          }
        >
          {pending ? "…" : "Withdraw"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="btn-primary px-6 py-3 text-base"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await signUpForEvent(eventId);
            if (res?.error) setMsg(res.error);
            else {
              setMsg(res?.state === "WAITLIST" ? "Added to the waitlist." : null);
              router.refresh();
            }
          })
        }
      >
        {pending ? "Signing up…" : "Sign up"}
      </button>
      {msg && <p className="text-xs text-ember">{msg}</p>}
    </div>
  );
}
