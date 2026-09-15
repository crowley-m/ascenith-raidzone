"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addEventChannel,
  removeEventChannel,
  pushSingleEventChannel,
  saveEventChannelContent,
} from "@/app/(site)/portal/actions";
import { SyncChannelsButton, ResyncRolesButton, ReannounceButton } from "@/components/portal/build-space-button";

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

// channels whose content is edited inline here — anchors to `#content-<name>`
// on the big Edit form too, as a fallback / for the fields it also shows
// alongside it (e.g. wipe-info's wipeCycle/raidWindow)
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
  pending,
  content,
  guildId,
  archived = false,
}: {
  eventId: string;
  channels: Record<string, string>;
  seeded: string[];
  pending: string[];
  content: Record<string, string>;
  guildId?: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const [pendingTx, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pushMsg, setPushMsg] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addChannelId = useId();
  const seededSet = new Set(seeded);
  const pendingSet = new Set(pending);

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

  function pushNow(name: string) {
    setBusy(`push:${name}`);
    setPushMsg((m) => ({ ...m, [name]: "" }));
    start(async () => {
      const res = await pushSingleEventChannel(eventId, name);
      setBusy(null);
      setPushMsg((m) => ({ ...m, [name]: res?.error ?? "Pushed." }));
      router.refresh();
    });
  }

  function startEditing(name: string) {
    setEditing(name);
    setDraft(content[name] ?? "");
    setPushMsg((m) => ({ ...m, [name]: "" }));
  }

  function saveContent(name: string) {
    setBusy(`save:${name}`);
    start(async () => {
      const res = await saveEventChannelContent(eventId, name, draft);
      setBusy(null);
      if (res?.error) {
        setPushMsg((m) => ({ ...m, [name]: res.error! }));
      } else {
        setEditing(null);
        setPushMsg((m) => ({ ...m, [name]: "Saved and pushed." }));
        router.refresh();
      }
    });
  }

  return (
    <div className="card mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-white">Channels</h3>
        {!archived && (
          <div className="flex flex-wrap items-center gap-2">
            <SyncChannelsButton eventId={eventId} />
            <ResyncRolesButton eventId={eventId} />
            <ReannounceButton eventId={eventId} />
          </div>
        )}
      </div>
      <p className="mt-1.5 border-b border-edge pb-4 text-xs text-slate-400">
        Every channel this event&apos;s space actually has right now, and what to do with each
        one. This only affects this event — the default set new events start with lives in
        Settings.
      </p>

      <ul className="mt-4 space-y-2.5">
        {names.map((name) => {
          const hasContentField = HAS_CONTENT_FIELD.has(name);
          const isSeeded = seededSet.has(name);
          const isPending = pendingSet.has(name);
          const needsPush = hasContentField && (!isSeeded || isPending);
          const isEditing = editing === name;
          return (
            <li key={name} className="border border-edge/60 bg-void/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-slate-200">#{name}</span>
                {hasContentField ? (
                  <span className={`badge ${needsPush ? "border-ember/40 text-ember" : "border-teal/40 text-teal"}`}>
                    {!isSeeded ? "not posted" : isPending ? "changed, not pushed" : "up to date"}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">plain channel, no content</span>
                )}
              </div>
              {pushMsg[name] && <p className="mt-1.5 text-xs text-slate-400">{pushMsg[name]}</p>}

              {isEditing ? (
                <div className="mt-3 border-t border-edge/60 pt-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={6}
                    className="input font-mono text-xs"
                    placeholder="Free-typed — # heading, Label:, and -/*/1. lines are formatted automatically."
                    autoFocus
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      className="btn-primary text-xs disabled:opacity-50"
                      disabled={pendingTx && busy === `save:${name}`}
                      onClick={() => saveContent(name)}
                    >
                      {pendingTx && busy === `save:${name}` ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-white"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-edge/60 pt-2.5 font-mono text-[0.66rem] uppercase tracking-widest">
                  {hasContentField && (
                    <button className="text-slate-400 hover:text-teal" onClick={() => startEditing(name)}>
                      Edit content
                    </button>
                  )}
                  {needsPush && (
                    <button
                      className="text-teal hover:text-cream disabled:opacity-50"
                      disabled={pendingTx && busy === `push:${name}`}
                      onClick={() => pushNow(name)}
                    >
                      {pendingTx && busy === `push:${name}` ? "…" : "Push now"}
                    </button>
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
                    className="ml-auto text-slate-400 hover:text-red-300 disabled:opacity-50"
                    disabled={pendingTx && busy === name}
                    onClick={() => remove(name)}
                  >
                    {pendingTx && busy === name ? "…" : "Remove"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {names.length === 0 && (
          <li className="py-2 text-sm text-slate-400">No channels yet.</li>
        )}
      </ul>

      <div className="mt-5 border-t border-edge pt-4">
        <label htmlFor={addChannelId} className="label">Add a channel</label>
        <div className="flex flex-wrap gap-2">
          <input
            id={addChannelId}
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
            disabled={pendingTx && busy === "__add__"}
            onClick={add}
          >
            {pendingTx && busy === "__add__" ? "Adding…" : "Add channel"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Use a name like <code>rules</code>, <code>gameplay</code>, <code>schedule</code>,{" "}
          <code>wipe-info</code> or <code>rewards</code> to have its content seeded automatically
          from that field below — anything else is created as a plain empty channel.
        </p>
      </div>

      <p className="mt-4 border-t border-edge pt-4 text-xs text-slate-400">
        Edit a channel&apos;s content above and hit Save — it saves and pushes to Discord in one
        step. Saving the whole event form further down also re-pushes anything that changed there,
        and &ldquo;Repost announcement&rdquo; is different again — it deletes and reposts so the{" "}
        <span className="font-mono">@everyone</span> ping fires again.
      </p>

      {msg && <p className="mt-2 text-xs text-ember">{msg}</p>}
    </div>
  );
}
