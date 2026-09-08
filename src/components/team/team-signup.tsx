"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerTeamForEvent, withdrawTeamFromEvent } from "@/app/(site)/events/actions";

type State =
  | { kind: "no-account" }
  | { kind: "no-player" }
  | { kind: "no-team" }
  | { kind: "member"; teamName: string; registered: boolean }
  | { kind: "leader"; teamName: string; memberCount: number; registeredCount: number };

export function TeamSignup({ eventId, state }: { eventId: string; state: State }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok?: boolean; error?: string; state?: string }>) {
    start(async () => {
      const res = await fn();
      if (res?.error) setMsg(res.error);
      else {
        setMsg(res?.state === "WAITLIST" ? "Team added to the waitlist." : null);
        router.refresh();
      }
    });
  }

  if (state.kind === "no-account") {
    return (
      <a href={`/login?callbackUrl=/events/${eventId}`} className="btn-primary px-6 py-3 text-base">
        Log in
      </a>
    );
  }
  if (state.kind === "no-player") {
    return (
      <Link href="/me/profile?new=1" className="btn-primary px-6 py-3 text-base">
        Complete your profile
      </Link>
    );
  }
  if (state.kind === "no-team") {
    return (
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wide text-slate-400">
          This is a team event.
        </p>
        <Link href="/me/team" className="btn-primary px-6 py-3 text-base">
          Create or join a team
        </Link>
      </div>
    );
  }
  if (state.kind === "member") {
    return (
      <div className="space-y-1">
        <span
          className={`badge ${state.registered ? "border-teal/40 text-teal" : "border-edge text-slate-400"}`}
        >
          {state.registered ? `${state.teamName} is registered` : `${state.teamName} — not registered`}
        </span>
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-500">
          Your team leader registers the team.
        </p>
      </div>
    );
  }

  // leader
  const behind = state.memberCount - state.registeredCount;
  return (
    <div className="space-y-2">
      {state.registeredCount > 0 ? (
        <>
          <span className="badge border-teal/40 text-teal">
            {state.teamName} registered · {state.registeredCount}/{state.memberCount}
          </span>
          <div className="flex flex-wrap gap-2">
            {behind > 0 && (
              <button
                className="btn-ghost"
                disabled={pending}
                onClick={() => run(() => registerTeamForEvent(eventId))}
              >
                {pending ? "…" : `Add ${behind} new member${behind === 1 ? "" : "s"}`}
              </button>
            )}
            <button
              className="btn-ghost"
              disabled={pending}
              onClick={() => run(() => withdrawTeamFromEvent(eventId))}
            >
              Withdraw team
            </button>
          </div>
        </>
      ) : (
        <button
          className="btn-primary px-6 py-3 text-base"
          disabled={pending}
          onClick={() => run(() => registerTeamForEvent(eventId))}
        >
          {pending ? "Registering…" : `Register ${state.teamName} (${state.memberCount})`}
        </button>
      )}
      {msg && <p className="text-xs text-ember">{msg}</p>}
    </div>
  );
}
