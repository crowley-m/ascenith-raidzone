"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveDiscordCategory } from "@/app/(site)/portal/actions";
import { DiscordRolePicker } from "@/components/portal/discord-role-picker";

type Role = { id: string; name: string };

let nextRowId = 0;

function ChannelListBuilder() {
  const [rows, setRows] = useState<{ id: number; value: string }[]>([]);

  return (
    <div>
      <label className="label">Channels to create (optional)</label>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 border border-edge/60 bg-void/40 px-2.5 py-1.5">
            <span className="font-mono text-xs text-slate-600">#</span>
            <input
              name="channelNames"
              value={row.value}
              onChange={(e) => {
                const v = e.target.value;
                setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, value: v } : r)));
              }}
              maxLength={90}
              className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              placeholder="channel-name"
            />
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
              className="px-1 text-slate-500 hover:text-ember"
              aria-label="Remove channel"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { id: nextRowId++, value: "" }])}
          className="btn-ghost w-full text-xs"
        >
          + Add channel
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Created as text channels, synced to the roles picked above. Add a voice channel or give
        one its own roles afterward with &ldquo;Add channel.&rdquo;
      </p>
    </div>
  );
}

export function DiscordCategoryForm({
  category,
  roles = [],
}: {
  category?: { id: string; name: string; roleIds?: string[] };
  roles?: Role[];
}) {
  const [state, action, pending] = useActionState(saveDiscordCategory, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !category) ref.current?.reset();
  }, [state.ok, category]);

  return (
    <form ref={ref} action={action} className="grid gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          {!category && <label className="label">Category name</label>}
          <input
            name="name"
            required
            maxLength={90}
            className="input"
            defaultValue={category?.name ?? ""}
            placeholder="e.g. Community Hangout"
          />
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "…" : category ? "Save" : "Create category"}
        </button>
      </div>

      <div>
        <p className="label mb-1.5">Who can see it</p>
        <DiscordRolePicker roles={roles} defaultRoleIds={category?.roleIds ?? []} />
        <p className="mt-1.5 text-xs text-slate-500">
          Only the category header itself — each channel underneath still needs its own roles set
          (unless it&apos;s marked &ldquo;sync to category&rdquo;).
        </p>
      </div>

      {!category && (
        <>
          <ChannelListBuilder />
          <div>
            <label className="label">Welcome message for those channels (optional)</label>
            <textarea name="seedMessage" rows={2} className="input text-sm" />
            <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
              <input type="checkbox" name="pinSeed" />
              Pin it
            </label>
          </div>
        </>
      )}

      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      {state.ok && category && <p className="text-xs text-teal">Saved.</p>}
    </form>
  );
}
