"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildEventSpace,
  archiveEventDiscord,
  syncEventChannels,
  reannounceEvent,
  resyncEventRoles,
} from "@/app/(site)/portal/actions";

export function SyncChannelsButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const res = await syncEventChannels(eventId);
            if (res?.error) setMsg(res.error);
            else {
              setMsg(
                res?.count
                  ? `Channels updated · ${res.count} new channel${res.count === 1 ? "" : "s"} created.`
                  : "Channels updated.",
              );
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Syncing…" : "Sync channels"}
      </button>
      {msg && <span className="text-[0.66rem] text-slate-400">{msg}</span>}
    </span>
  );
}

export function ResyncRolesButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const res = await resyncEventRoles(eventId);
            setMsg(res?.error ?? `Access granted to ${res?.count ?? 0}.`);
            router.refresh();
          });
        }}
      >
        {pending ? "Syncing…" : "Resync event roles"}
      </button>
      {msg && <span className="text-[0.66rem] text-slate-400">{msg}</span>}
    </span>
  );
}

export function ReannounceButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Delete the current announcement and repost it to the configured announce channel? This re-fires the @everyone ping.",
            )
          )
            return;
          setMsg(null);
          start(async () => {
            const res = await reannounceEvent(eventId);
            setMsg(res?.error ?? "Reposted.");
            router.refresh();
          });
        }}
      >
        {pending ? "Reposting…" : "Repost announcement"}
      </button>
      {msg && <span className="text-[0.66rem] text-slate-400">{msg}</span>}
    </span>
  );
}

export function ArchiveSpaceButton({
  eventId,
  relock = false,
}: {
  eventId: string;
  relock?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => {
          if (
            !relock &&
            !window.confirm(
              "Archive this event's Discord space? Renames the category, sinks it to the bottom, and locks every channel private. Nothing is deleted.",
            )
          )
            return;
          setErr(null);
          start(async () => {
            const res = await archiveEventDiscord(eventId);
            if (res?.error) setErr(res.error);
            router.refresh();
          });
        }}
      >
        {pending
          ? relock
            ? "Locking…"
            : "Archiving…"
          : relock
            ? "Re-lock private"
            : "Archive Discord space"}
      </button>
      {err && <span className="text-[0.66rem] text-ember">{err}</span>}
    </span>
  );
}

export function BuildSpaceButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Create the Discord category + channels for this event?")) return;
          setErr(null);
          start(async () => {
            const res = await buildEventSpace(eventId);
            if (res?.error) setErr(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Building…" : "Build Discord space"}
      </button>
      {err && <span className="text-[0.66rem] text-ember">{err}</span>}
    </span>
  );
}
