"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildEventSpace, archiveEventDiscord } from "@/app/(site)/portal/actions";

export function ArchiveSpaceButton({ eventId }: { eventId: string }) {
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
          if (!window.confirm("Archive this event's Discord space? Renames the category, sinks it to the bottom, and locks the channels. Nothing is deleted."))
            return;
          setErr(null);
          start(async () => {
            const res = await archiveEventDiscord(eventId);
            if (res?.error) setErr(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Archiving…" : "Archive Discord space"}
      </button>
      {err && <span className="text-[0.65rem] text-ember">{err}</span>}
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
      {err && <span className="text-[0.65rem] text-ember">{err}</span>}
    </span>
  );
}
