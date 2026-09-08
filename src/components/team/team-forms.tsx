"use client";

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

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeam, {});
  return (
    <form action={action} className="mt-3 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" required maxLength={40} className="input" placeholder="Team name" />
        <input name="tag" maxLength={6} className="input sm:w-24" placeholder="TAG" />
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
  me,
  isLeader,
  team,
}: {
  me: string;
  isLeader: boolean;
  team: {
    id: string;
    name: string;
    tag: string | null;
    inviteCode: string;
    leaderId: string;
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
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {team.tag && <span className="text-teal">[{team.tag}] </span>}
            {team.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {team.members.length} member{team.members.length === 1 ? "" : "s"} ·{" "}
            {isLeader ? "you lead this team" : "you're a member"}
          </p>
        </div>
        {isLeader && (
          <button className="btn-ghost text-xs" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {editing && isLeader && <RenameForm name={team.name} tag={team.tag} onDone={() => setEditing(false)} />}

      {/* invite code */}
      <div className="card">
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
              onClick={() => run(() => regenerateInviteCode(), "Generate a new code? The old one stops working.")}
            >
              New code
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">Anyone with this code can join the team.</p>
      </div>

      {/* members */}
      <div className="card">
        <div className="label">Roster</div>
        <ul className="mt-3 divide-y divide-edge/60">
          {team.members.map((m) => (
            <li key={m.playerId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
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
                    onClick={() => run(() => transferLeadership(m.playerId), `Make ${m.name} the team leader?`)}
                  >
                    Make leader
                  </button>
                  <button
                    className="btn-danger text-xs"
                    disabled={pending}
                    onClick={() => run(() => kickMember(m.playerId), `Remove ${m.name} from the team?`)}
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
            onClick={() => run(() => leaveTeam(), "Leave this team?")}
          >
            Leave team
          </button>
        )}
        {isLeader && (
          <button
            className="btn-danger text-xs"
            disabled={pending}
            onClick={() => run(() => disbandTeam(), "Disband the team? This removes every member and can't be undone.")}
          >
            Disband team
          </button>
        )}
      </div>
    </div>
  );
}

function RenameForm({
  name,
  tag,
  onDone,
}: {
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
    <form action={action} className="card grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input name="name" defaultValue={name} required maxLength={40} className="input" />
        <input name="tag" defaultValue={tag ?? ""} maxLength={6} className="input sm:w-24" placeholder="TAG" />
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
