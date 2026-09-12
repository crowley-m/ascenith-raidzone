"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  registerTeamForEvent,
  withdrawTeamFromEvent,
  registerAsFreeAgent,
  withdrawFromEvent,
  updateEventNickname,
} from "@/app/(site)/events/actions";

type State =
  | { kind: "no-account" }
  | { kind: "no-player" }
  | { kind: "no-team"; freeAgent: boolean }
  | { kind: "member"; teamName: string; registered: boolean }
  | { kind: "leader"; teamName: string; memberCount: number; registeredCount: number };

/** Small inline "set my display name for this event" control, reused across states. */
function NicknameEditor({ eventId, nickname }: { eventId: string; nickname?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(nickname ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        className="font-mono text-[0.66rem] uppercase tracking-widest text-slate-500 hover:text-teal"
        onClick={() => setEditing(true)}
      >
        {nickname ? `Playing as ${nickname} — change` : "Use a different name for this event"}
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
      {msg && <span className="text-xs text-ember">{msg}</span>}
    </div>
  );
}

export function TeamSignup({
  eventId,
  state,
  nickname,
}: {
  eventId: string;
  state: State;
  nickname?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [freeAgentNick, setFreeAgentNick] = useState("");

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
        <Link href="/me/team" className="btn-primary block px-6 py-3 text-center text-base">
          Create or join a team
        </Link>
        {state.freeAgent ? (
          <div className="space-y-1">
            <span className="badge border-teal/40 text-teal">
              Registered — looking for a team
              {nickname && <span className="ml-1 font-normal text-slate-400">as {nickname}</span>}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <NicknameEditor eventId={eventId} nickname={nickname} />
              <button
                className="btn-ghost text-xs"
                disabled={pending}
                onClick={() => run(() => withdrawFromEvent(eventId))}
              >
                {pending ? "…" : "Withdraw"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-500">
              No team yet? Register as a free agent and a leader can pick you up.
            </p>
            <input
              value={freeAgentNick}
              onChange={(e) => setFreeAgentNick(e.target.value)}
              maxLength={40}
              placeholder="Display name for this event (optional)"
              className="input py-1.5 text-xs"
            />
            <button
              className="btn-ghost text-xs"
              disabled={pending}
              onClick={() => run(() => registerAsFreeAgent(eventId, freeAgentNick))}
            >
              {pending ? "…" : "Register — looking for a team"}
            </button>
          </>
        )}
        {msg && <p className="text-xs text-ember">{msg}</p>}
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
          {state.registered && nickname && (
            <span className="ml-1 font-normal text-slate-400">as {nickname}</span>
          )}
        </span>
        <p className="font-mono text-[0.7rem] uppercase tracking-wide text-slate-500">
          Your team leader registers the team.
        </p>
        {state.registered && <NicknameEditor eventId={eventId} nickname={nickname} />}
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
            {nickname && <span className="ml-1 font-normal text-slate-400">as {nickname}</span>}
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
          <NicknameEditor eventId={eventId} nickname={nickname} />
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
