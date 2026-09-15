"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { saveDiscordCategory } from "@/app/(site)/portal/actions";
import { DiscordRolePicker } from "@/components/portal/discord-role-picker";
import { slugifyChannelName, slugifyChannelNameFinal } from "@/lib/discord-slug";

type Role = { id: string; name: string };

let nextRowId = 0;

type ChannelRow = {
  id: number;
  name: string;
  kind: "text" | "voice";
  topic: string;
  message: string;
  pin: boolean;
  showDetails: boolean;
};

function ChannelCard({
  row,
  duplicate,
  onChange,
  onRemove,
}: {
  row: ChannelRow;
  duplicate: boolean;
  onChange: (patch: Partial<ChannelRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`border p-2.5 ${duplicate ? "border-ember/50 bg-ember/5" : "border-edge/60 bg-void/40"}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-slate-400">{row.kind === "voice" ? "🔊" : "#"}</span>
        <input
          name="channelNames"
          value={row.name}
          onChange={(e) => onChange({ name: slugifyChannelName(e.target.value) })}
          onBlur={(e) => onChange({ name: slugifyChannelNameFinal(e.target.value) })}
          maxLength={90}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal/50"
          placeholder="channel-name"
        />
        <input type="hidden" name="channelKinds" value={row.kind} />
        <div className="flex border border-edge/60 text-xs">
          <button
            type="button"
            onClick={() => onChange({ kind: "text" })}
            className={`px-2 py-0.5 ${row.kind === "text" ? "bg-teal/10 text-teal" : "text-slate-400"}`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => onChange({ kind: "voice", showDetails: false, topic: "", message: "", pin: false })}
            className={`px-2 py-0.5 ${row.kind === "voice" ? "bg-teal/10 text-teal" : "text-slate-400"}`}
          >
            Voice
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="px-1 text-slate-400 hover:text-ember"
          aria-label="Remove channel"
        >
          ×
        </button>
      </div>

      {duplicate && (
        <p className="mt-1.5 text-xs text-ember">Another card already uses this name.</p>
      )}

      {row.kind === "text" &&
        (row.showDetails ? (
          <div className="mt-2 space-y-1.5 border-t border-edge/60 pt-2">
            <input
              value={row.topic}
              onChange={(e) => onChange({ topic: e.target.value })}
              maxLength={200}
              className="input text-xs"
              placeholder="Topic shown under the channel name (optional)"
            />
            <textarea
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
                Pin the welcome message
              </label>
              <button
                type="button"
                onClick={() => onChange({ showDetails: false, topic: "", message: "", pin: false })}
                className="text-xs text-slate-400 hover:text-ember"
              >
                Remove details
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onChange({ showDetails: true })}
            className="mt-2 text-xs text-teal hover:underline"
          >
            + Add topic / welcome message
          </button>
        ))}

      <input type="hidden" name="channelTopics" value={row.kind === "text" ? row.topic : ""} />
      <input type="hidden" name="channelSeedMessages" value={row.kind === "text" ? row.message : ""} />
      <input type="hidden" name="channelPinSeeds" value={row.kind === "text" && row.pin ? "1" : ""} />
    </div>
  );
}

function ChannelListBuilder() {
  const [rows, setRows] = useState<ChannelRow[]>([]);

  const dupeNames = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const n = r.name.trim().toLowerCase();
      if (!n) continue;
      seen.set(n, (seen.get(n) ?? 0) + 1);
    }
    return new Set([...seen].filter(([, count]) => count > 1).map(([n]) => n));
  }, [rows]);

  return (
    <fieldset>
      <legend className="label">Channels to create (optional)</legend>
      <div className="space-y-2">
        {rows.map((row) => (
          <ChannelCard
            key={row.id}
            row={row}
            duplicate={!!row.name.trim() && dupeNames.has(row.name.trim().toLowerCase())}
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
              {
                id: nextRowId++,
                name: "",
                kind: "text",
                topic: "",
                message: "",
                pin: false,
                showDetails: false,
              },
            ])
          }
          className="btn-ghost w-full text-xs"
        >
          + Add channel
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        Synced to the roles picked above. Give one its own roles afterward with &ldquo;Add
        channel.&rdquo;
      </p>
    </fieldset>
  );
}

export function DiscordCategoryForm({
  category,
  roles = [],
  roleCounts,
}: {
  category?: { id: string; name: string; roleIds?: string[]; note?: string | null };
  roles?: Role[];
  roleCounts?: Record<string, number> | null;
}) {
  const [state, action, pending] = useActionState(saveDiscordCategory, {});
  const ref = useRef<HTMLFormElement>(null);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  useEffect(() => {
    if (state.ok && !category) ref.current?.reset();
  }, [state.ok, category]);

  return (
    <form ref={ref} action={action} className="grid gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          {!category && <label htmlFor={fid("name")} className="label">Category name</label>}
          <input
            id={fid("name")}
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
        <DiscordRolePicker roles={roles} defaultRoleIds={category?.roleIds ?? []} counts={roleCounts} />
        <p className="mt-1.5 text-xs text-slate-400">
          Only the category header itself — each channel underneath still needs its own roles set
          (unless it&apos;s marked &ldquo;sync to category&rdquo;).
        </p>
      </div>

      <div>
        <label htmlFor={fid("note")} className="label">Staff note (optional)</label>
        <input
          id={fid("note")}
          name="note"
          maxLength={200}
          className="input text-sm"
          defaultValue={category?.note ?? ""}
          placeholder="What this category is for — never posted to Discord, staff only"
        />
      </div>

      {!category && <ChannelListBuilder />}

      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      {state.ok && category && <p className="text-xs text-teal">Saved.</p>}
    </form>
  );
}
