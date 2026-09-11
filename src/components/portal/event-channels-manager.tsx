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

export function EventChannelsManager({
  eventId,
  channels,
}: {
  eventId: string;
  channels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        : `Remove #${name}? This deletes the Discord channel.`;
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
        Add or remove channels in this event&apos;s own space. Names like{" "}
        <code>rules</code> / <code>gameplay</code> / <code>schedule</code> / <code>wipe-info</code>{" "}
        / <code>rewards</code> get their content seeded automatically; anything else is a plain
        channel. This only changes this event — to change what <em>new</em> events get by default,
        edit the channel template in Settings.
      </p>

      <ul className="mt-3 divide-y divide-edge/60">
        {names.map((name) => (
          <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="font-mono text-slate-200">#{name}</span>
            <button
              className="font-mono text-[0.66rem] uppercase tracking-widest text-slate-500 hover:text-red-300 disabled:opacity-50"
              disabled={pending && busy === name}
              onClick={() => remove(name)}
            >
              {pending && busy === name ? "…" : "Remove"}
            </button>
          </li>
        ))}
        {names.length === 0 && (
          <li className="py-2 text-sm text-slate-400">No channels yet.</li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-edge pt-3">
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
      {msg && <p className="mt-2 text-xs text-ember">{msg}</p>}
    </div>
  );
}
