"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { signUpForEvent, withdrawFromEvent, updateEventNickname } from "@/app/(site)/events/actions";

export function SignupButton({
  eventId,
  signedUp,
  state,
  loggedIn,
  nickname,
}: {
  eventId: string;
  signedUp: boolean;
  state?: string | null;
  loggedIn: boolean;
  nickname?: string | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [nick, setNick] = useState(nickname ?? "");
  const [editingNick, setEditingNick] = useState(false);
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
          {nickname && <span className="ml-1 font-normal text-slate-400">as {nickname}</span>}
        </span>
        {editingNick ? (
          <div className="flex items-center gap-2">
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={40}
              placeholder="Display name for this event"
              className="input py-1 text-xs"
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
                    setEditingNick(false);
                    router.refresh();
                  }
                })
              }
            >
              Save
            </button>
          </div>
        ) : (
          <button
            className="font-mono text-[0.66rem] uppercase tracking-widest text-slate-500 hover:text-teal"
            onClick={() => setEditingNick(true)}
          >
            {nickname ? "Change name for this event" : "Use a different name for this event"}
          </button>
        )}
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
        {msg && <p className="text-xs text-ember">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div>
        <label className="mb-1 block font-mono text-[0.66rem] uppercase tracking-widest text-slate-500">
          Display name (optional — blank uses your profile name)
        </label>
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={40}
          placeholder="Same as my profile"
          className="input py-1.5 text-sm"
        />
      </div>
      <button
        className="btn-primary px-6 py-3 text-base"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await signUpForEvent(eventId, nick);
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
