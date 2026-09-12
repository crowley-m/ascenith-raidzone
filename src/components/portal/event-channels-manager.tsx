"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEventChannel, removeEventChannel } from "@/app/(site)/portal/actions";

const KNOWN_ORDER = [
  "announcement",
  "how-to-join",
  "registration",
  "rules",
  "gameplay",
  "schedule",
  "wipe-info",
  "rewards",
  "looking-for-team",
  "questions",
  "chat",
];

// channels whose content is edited in the form below — anchors to `#content-<name>`
const HAS_CONTENT_FIELD = new Set([
  "announcement",
  "registration",
  "how-to-join",
  "rules",
  "gameplay",
  "schedule",
  "wipe-info",
  "rewards",
]);

export function EventChannelsManager({
  eventId,
  channels,
  seeded,
  guildId,
}: {
  eventId: string;
  channels: Record<string, string>;
  seeded: string[];
  guildId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seededSet = new Set(seeded);

  const names = Object.keys(channels).sort((a, b) => {
    const ia = KNOWN_ORDER.indexOf(a);
    const ib = KNOWN_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  function remove(name: string) {
    const scary =
      name === "announcement"
        ? "This is the main announcement channel — a lot depends on it. Really remove it?"
        : `Remove #${name}? This deletes the Discord channel — can't be undone.`;
    if (!window.confirm(scary)) return;
    setBusy(name);
    setMsg(null);
    start(async () => {
      const res = await removeEventChannel(eventId, name);
      setBusy(null);
      if (res?.error) setMsg(res.error);
      router.refresh();
    });
  }

  function add() {
    const name = inputRef.current?.value.trim();
    if (!name) return;
    setBusy("__add__");
    setMsg(null);
    start(async () => {
      const res = await addEventChannel(eventId, name);
      setBusy(null);
      if (res?.error) setMsg(res.error);
      else if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="card mt-4">
      <h3 className="font-display font-bold text-white">Channels</h3>
      <p className="mt-1 text-xs text-slate-500">
        Every channel this event&apos;s space actually has right now, and what to do with each
        one. This only affects this event — the default set new events start with lives in
        Settings.
      </p>

      <ul className="mt-3 divide-y divide-edge/60">
        {names.map((name) => {
          const hasContentField = HAS_CONTENT_FIELD.has(name);
          const isSeeded = seededSet.has(name);
          return (
            <li key={name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
              <div>
                <span className="font-mono text-slate-200">#{name}</span>
                {hasContentField ? (
                  <span className={`ml-2 text-xs ${isSeeded ? "text-teal" : "text-ember"}`}>
                    {isSeeded ? "posted" : "not posted yet — save the event to push it"}
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-slate-600">plain channel, no content</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-[0.66rem] uppercase tracking-widest">
                {hasContentField && (
                  <a href={`#content-${name}`} className="text-slate-400 hover:text-teal">
                    Edit content
                  </a>
                )}
                {guildId && channels[name] && (
                  <a
                    href={`https://discord.com/channels/${guildId}/${channels[name]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-teal"
                  >
                    Open in Discord ↗
                  </a>
                )}
                <button
                  className="text-slate-500 hover:text-red-300 disabled:opacity-50"
                  disabled={pending && busy === name}
                  onClick={() => remove(name)}
                >
                  {pending && busy === name ? "…" : "Remove"}
                </button>
              </div>
            </li>
          );
        })}
        {names.length === 0 && (
          <li className="py-2 text-sm text-slate-400">No channels yet.</li>
        )}
      </ul>

      <div className="mt-3 border-t border-edge pt-3">
        <label className="label">Add a channel</label>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            className="input flex-1 font-mono text-xs"
            placeholder="new-channel-name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={pending && busy === "__add__"}
            onClick={add}
          >
            {pending && busy === "__add__" ? "Adding…" : "Add channel"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Use a name like <code>rules</code>, <code>gameplay</code>, <code>schedule</code>,{" "}
          <code>wipe-info</code> or <code>rewards</code> to have its content seeded automatically
          from that field below — anything else is created as a plain empty channel.
        </p>
      </div>

      <p className="mt-3 border-t border-edge pt-3 text-xs text-slate-500">
        Changed a field below? Hit <span className="text-slate-300">Save event</span> — it
        re-posts to every channel that already exists, right away. Want to re-fire the{" "}
        <span className="font-mono">@everyone</span> ping too? Use{" "}
        <span className="text-slate-300">Repost announcement</span> in the header above instead.
      </p>

      {msg && <p className="mt-2 text-xs text-ember">{msg}</p>}
    </div>
  );
}
