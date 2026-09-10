"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTeam,
  joinTeam,
  leaveTeam,
  kickMember,
  renameTeam,
  transferLeadership,
  regenerateInviteCode,
  disbandTeam,
} from "@/app/(site)/me/team/actions";

type TeamEvent = { id: string; title: string; mode: string | null };

function eventLabel(e: TeamEvent) {
  return e.mode ? `RAIDZONE ${e.mode}` : e.title;
}

export function CreateTeamForm({ events = [] }: { events?: TeamEvent[] }) {
  const [state, action, pending] = useActionState(createTeam, {});
  return (
    <form action={action} className="mt-3 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" required maxLength={40} className="input" placeholder="Team name" />
        <input name="tag" maxLength={6} className="input sm:w-24" placeholder="TAG" />
      </div>
      <div>
        <label className="label" htmlFor="eventId">
          For which event? <span className="text-slate-500">(registers your team for it)</span>
        </label>
        <select id="eventId" name="eventId" required className="input" defaultValue="">
          <option value="" disabled>
            Pick a team event…
          </option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {eventLabel(e)}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-ember">{state.error}</p>}
      <div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create team"}
        </button>
      </div>
    </form>
  );
}

export function JoinTeamForm() {
  const [state, action, pending] = useActionState(joinTeam, {});
  return (
    <form action={action} className="mt-3 grid gap-3">
      <input
        name="code"
        required
        maxLength={12}
        className="input font-mono uppercase tracking-[0.3em]"
        placeholder="INVITE CODE"
      />
      {state.error && <p className="text-sm text-ember">{state.error}</p>}
      <div>
        <button className="btn-ghost" disabled={pending}>
          {pending ? "Joining…" : "Join team"}
        </button>
      </div>
    </form>
  );
}

type Member = {
  playerId: string;
  name: string;
  gameUid: string | null;
  region: string | null;
};

export function TeamPanel({
  isLeader,
  team,
}: {
  me?: string;
  isLeader: boolean;
  team: {
    id: string;
    name: string;
    tag: string | null;
    inviteCode: string;
    leaderId: string;
    eventId: string;
    eventLabel: string;
    registration: "SIGNED_UP" | "WAITLIST" | null;
    members: Member[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  function run(fn: () => Promise<unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
            <Link href={`/events/${team.eventId}`} className="hover:text-teal">
              {team.eventLabel}
            </Link>
          </p>
          <h3 className="mt-1 font-display text-xl font-bold text-white">
            {team.tag && <span className="text-teal">[{team.tag}] </span>}
            {team.name}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              {team.members.length} member{team.members.length === 1 ? "" : "s"} ·{" "}
              {isLeader ? "you lead this team" : "you're a member"}
            </span>
            {team.registration === "SIGNED_UP" && (
              <span className="badge border-teal/40 text-teal">Registered ✓</span>
            )}
            {team.registration === "WAITLIST" && (
              <span className="badge border-ember/40 text-ember">Waitlisted</span>
            )}
            {team.registration === null && (
              <span className="badge border-edge text-slate-400">Not registered</span>
            )}
          </p>
        </div>
        {isLeader && (
          <button className="btn-ghost text-xs" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {editing && isLeader && (
        <RenameForm
          teamId={team.id}
          name={team.name}
          tag={team.tag}
          onDone={() => setEditing(false)}
        />
      )}

      {/* invite code */}
      <div className="border border-edge/60 bg-void/40 p-3">
        <div className="label">Invite code</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="border border-edge bg-void px-3 py-2 font-mono text-lg tracking-[0.35em] text-teal">
            {team.inviteCode}
          </code>
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              navigator.clipboard?.writeText(team.inviteCode).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          {isLeader && (
            <button
              className="btn-ghost text-xs"
              disabled={pending}
              onClick={() =>
                run(
                  () => regenerateInviteCode(team.id),
                  "Generate a new code? The old one stops working.",
                )
              }
            >
              New code
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Anyone with this code joins the team for this event.
        </p>
      </div>

      {/* members */}
      <div>
        <div className="label">Roster</div>
        <ul className="mt-3 divide-y divide-edge/60">
          {team.members.map((m) => (
            <li
              key={m.playerId}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span>
                <span className="text-slate-100">{m.name}</span>
                {m.playerId === team.leaderId && (
                  <span className="badge ml-2 border-teal/40 text-teal">Leader</span>
                )}
                <span className="block text-xs text-slate-500">
                  {m.gameUid ? `UID ${m.gameUid}` : "no UID"} {m.region ? `· ${m.region}` : ""}
                </span>
              </span>
              {isLeader && m.playerId !== team.leaderId && (
                <span className="flex gap-1">
                  <button
                    className="btn-ghost text-xs"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => transferLeadership(team.id, m.playerId),
                        `Make ${m.name} the team leader?`,
                      )
                    }
                  >
                    Make leader
                  </button>
                  <button
                    className="btn-danger text-xs"
                    disabled={pending}
                    onClick={() =>
                      run(() => kickMember(team.id, m.playerId), `Remove ${m.name} from the team?`)
                    }
                  >
                    Remove
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* danger zone */}
      <div className="flex flex-wrap gap-2">
        {!isLeader && (
          <button
            className="btn-danger text-xs"
            disabled={pending}
            onClick={() => run(() => leaveTeam(team.id), "Leave this team?")}
          >
            Leave team
          </button>
        )}
        {isLeader && (
          <button
            className="btn-danger text-xs"
            disabled={pending}
            onClick={() =>
              run(
                () => disbandTeam(team.id),
                "Disband the team? This removes every member and can't be undone.",
              )
            }
          >
            Disband team
          </button>
        )}
      </div>
    </div>
  );
}

function RenameForm({
  teamId,
  name,
  tag,
  onDone,
}: {
  teamId: string;
  name: string;
  tag: string | null;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(renameTeam, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);
  return (
    <form action={action} className="border border-edge/60 bg-void/40 p-3 grid gap-3">
      <input type="hidden" name="teamId" value={teamId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" defaultValue={name} required maxLength={40} className="input" />
        <input
          name="tag"
          defaultValue={tag ?? ""}
          maxLength={6}
          className="input sm:w-24"
          placeholder="TAG"
        />
      </div>
      {state.error && <p className="text-sm text-ember">{state.error}</p>}
      <div>
        <button className="btn-primary text-xs" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
