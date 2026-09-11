"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editBroadcast, deleteBroadcast } from "@/app/(site)/portal/actions";

type Broadcast = {
  id: string;
  channelName: string;
  title: string | null;
  body: string;
  asEmbed: boolean;
  postedBy: string;
  postedAt: string;
  editedAt: string | null;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function BroadcastList({ broadcasts }: { broadcasts: Broadcast[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-edge/60 border border-edge">
      {broadcasts.map((b) =>
        editingId === b.id ? (
          <li key={b.id} className="p-3">
            <EditForm broadcast={b} onDone={() => setEditingId(null)} />
          </li>
        ) : (
          <li key={b.id} className="p-3 text-sm">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                #{b.channelName} · {b.postedBy}
              </span>
              <span>
                {fmt(b.postedAt)}
                {b.editedAt && <span className="text-slate-600"> · edited</span>}
              </span>
            </div>
            {b.title && <div className="mt-1 font-bold text-slate-200">{b.title}</div>}
            <div className="mt-0.5 whitespace-pre-wrap text-slate-400">{b.body}</div>
            <div className="mt-2 flex gap-3">
              <button
                className="font-mono text-[0.66rem] uppercase tracking-widest text-teal hover:text-cream"
                onClick={() => setEditingId(b.id)}
              >
                Edit
              </button>
              <DeleteButton id={b.id} />
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

function EditForm({ broadcast, onDone }: { broadcast: Broadcast; onDone: () => void }) {
  const [state, action, pending] = useActionState(editBroadcast, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={broadcast.id} />
      <p className="text-xs text-slate-500">
        #{broadcast.channelName} — editing updates the message in place, no re-ping.
      </p>
      <input
        name="title"
        defaultValue={broadcast.title ?? ""}
        className="input"
        maxLength={200}
        placeholder="Title (optional)"
      />
      <textarea
        name="body"
        defaultValue={broadcast.body}
        rows={5}
        className="input"
        maxLength={4000}
        required
      />
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" name="asEmbed" defaultChecked={broadcast.asEmbed} className="accent-teal" />
        Post as an embed
      </label>
      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary text-xs" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="font-mono text-[0.66rem] uppercase tracking-widest text-slate-500 hover:text-red-300 disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this broadcast from Discord?")) return;
        start(async () => {
          await deleteBroadcast(id);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
