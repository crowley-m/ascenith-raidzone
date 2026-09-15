"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveDiscordCategory } from "@/app/(site)/portal/actions";
import { DiscordRolePicker } from "@/components/portal/discord-role-picker";

type Role = { id: string; name: string };

let nextRowId = 0;

type ChannelRow = { id: number; name: string; message: string; pin: boolean; showMessage: boolean };

function ChannelCard({
  row,
  onChange,
  onRemove,
}: {
  row: ChannelRow;
  onChange: (patch: Partial<ChannelRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-edge/60 bg-void/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-600">#</span>
        <input
          name="channelNames"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={90}
          className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
          placeholder="channel-name"
        />
        <button
          type="button"
          onClick={onRemove}
          className="px-1 text-slate-500 hover:text-ember"
          aria-label="Remove channel"
        >
          ×
        </button>
      </div>

      {row.showMessage ? (
        <div className="mt-2 space-y-1.5 border-t border-edge/60 pt-2">
          <textarea
            name="channelSeedMessages"
            value={row.message}
            onChange={(e) => onChange({ message: e.target.value })}
            rows={2}
            className="input text-xs"
            placeholder={`Welcome message posted in #${row.name || "this-channel"}`}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={row.pin}
                onChange={(e) => onChange({ pin: e.target.checked })}
              />
              Pin it
            </label>
            <button
              type="button"
              onClick={() => onChange({ showMessage: false, message: "", pin: false })}
              className="text-xs text-slate-500 hover:text-ember"
            >
              Remove message
            </button>
          </div>
          <input type="hidden" name="channelPinSeeds" value={row.pin ? "1" : ""} />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onChange({ showMessage: true })}
            className="mt-2 text-xs text-teal hover:underline"
          >
            + Add welcome message
          </button>
          <input type="hidden" name="channelSeedMessages" value="" />
          <input type="hidden" name="channelPinSeeds" value="" />
        </>
      )}
    </div>
  );
}

function ChannelListBuilder() {
  const [rows, setRows] = useState<ChannelRow[]>([]);

  return (
    <div>
      <label className="label">Channels to create (optional)</label>
      <div className="space-y-2">
        {rows.map((row) => (
          <ChannelCard
            key={row.id}
            row={row}
            onChange={(patch) =>
              setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...patch } : r)))
            }
            onRemove={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { id: nextRowId++, name: "", message: "", pin: false, showMessage: false },
            ])
          }
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

      {!category && <ChannelListBuilder />}

      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      {state.ok && category && <p className="text-xs text-teal">Saved.</p>}
    </form>
  );
}
