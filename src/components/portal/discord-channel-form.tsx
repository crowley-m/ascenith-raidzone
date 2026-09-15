"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveDiscordChannel } from "@/app/(site)/portal/actions";
import { DiscordRolePicker } from "@/components/portal/discord-role-picker";
import { slugifyChannelName, slugifyChannelNameFinal } from "@/lib/discord-slug";

type Role = { id: string; name: string };
type Category = { id: string; name: string };

type ChannelInit = {
  id: string;
  name: string;
  kind: string;
  topic: string | null;
  categoryId: string;
  roleIds: string[];
  synced: boolean;
};

export function DiscordChannelForm({
  categoryId,
  roles,
  categories = [],
  channel,
  existingNamesByCategory = {},
  roleCounts,
}: {
  categoryId: string;
  roles: Role[];
  categories?: Category[];
  channel?: ChannelInit;
  existingNamesByCategory?: Record<string, string[]>;
  roleCounts?: Record<string, number> | null;
}) {
  const [state, action, pending] = useActionState(saveDiscordChannel, {});
  const ref = useRef<HTMLFormElement>(null);
  const [synced, setSynced] = useState(channel?.synced ?? false);
  const [kind, setKind] = useState(channel?.kind ?? "text");
  const [name, setName] = useState(channel?.name ?? "");
  const [targetCategoryId, setTargetCategoryId] = useState(channel?.categoryId ?? categoryId);
  useEffect(() => {
    if (state.ok && !channel) {
      ref.current?.reset();
      setName("");
    }
  }, [state.ok, channel]);

  const duplicate =
    !!name.trim() &&
    (existingNamesByCategory[targetCategoryId] ?? []).includes(name.trim().toLowerCase());

  return (
    <form ref={ref} action={action} className="grid gap-4">
      {channel && <input type="hidden" name="id" value={channel.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          {!channel && <label className="label">Channel name</label>}
          <input
            name="name"
            required
            maxLength={90}
            className="input"
            value={name}
            onChange={(e) => setName(slugifyChannelName(e.target.value))}
            onBlur={(e) => setName(slugifyChannelNameFinal(e.target.value))}
            placeholder="e.g. general-chat"
          />
          {duplicate && (
            <p className="mt-1 text-xs text-ember">
              A channel named #{name.trim()} already exists in this category.
            </p>
          )}
        </div>
        {!channel && (
          <div>
            <label className="label">Type</label>
            <select name="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="text">Text</option>
              <option value="voice">Voice</option>
            </select>
          </div>
        )}
      </div>

      {channel && categories.length > 1 ? (
        <div>
          <label className="label">Category</label>
          <select
            name="categoryId"
            className="input"
            value={targetCategoryId}
            onChange={(e) => setTargetCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        !channel && <input type="hidden" name="categoryId" value={categoryId} />
      )}

      <label className="flex items-center gap-2 border border-edge/60 bg-void/40 px-3 py-2 text-xs text-slate-300">
        <input
          type="checkbox"
          name="synced"
          checked={synced}
          onChange={(e) => setSynced(e.target.checked)}
        />
        Sync to category — follow its roles automatically, instead of setting its own
      </label>

      <div>
        <p className="label mb-1.5">Who can see it</p>
        <DiscordRolePicker
          roles={roles}
          defaultRoleIds={channel?.roleIds ?? []}
          disabled={synced}
          counts={roleCounts}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          {synced
            ? "Following the category's roles — untick “sync” to set its own instead."
            : "Leave every box unchecked for a staff/bot-only channel — nobody else can see it, even without picking a role."}
        </p>
      </div>

      {kind === "text" && (
        <div>
          <label className="label">Topic (optional)</label>
          <input
            name="topic"
            maxLength={200}
            className="input text-sm"
            defaultValue={channel?.topic ?? ""}
            placeholder="Shown under the channel name in Discord"
          />
        </div>
      )}

      {!channel && kind === "text" && (
        <div>
          <label className="label">Welcome message (optional)</label>
          <textarea name="seedMessage" rows={2} className="input text-sm" />
          <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
            <input type="checkbox" name="pinSeed" />
            Pin it
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "…" : channel ? "Save" : "Add channel"}
        </button>
        {state.error && <p className="text-xs text-ember">{state.error}</p>}
        {state.ok && channel && <p className="text-xs text-teal">Saved.</p>}
      </div>
    </form>
  );
}
