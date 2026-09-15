"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveDiscordChannel } from "@/app/(site)/portal/actions";

type Role = { id: string; name: string };
type Category = { id: string; name: string };

type ChannelInit = {
  id: string;
  name: string;
  kind: string;
  categoryId: string;
  roleIds: string[];
};

export function DiscordChannelForm({
  categoryId,
  roles,
  categories = [],
  channel,
}: {
  categoryId: string;
  roles: Role[];
  categories?: Category[];
  channel?: ChannelInit;
}) {
  const [state, action, pending] = useActionState(saveDiscordChannel, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !channel) ref.current?.reset();
  }, [state.ok, channel]);

  return (
    <form ref={ref} action={action} className="grid gap-3">
      {channel && <input type="hidden" name="id" value={channel.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          {!channel && <label className="label">Channel name</label>}
          <input
            name="name"
            required
            maxLength={90}
            className="input"
            defaultValue={channel?.name ?? ""}
            placeholder="e.g. general-chat"
          />
        </div>
        {!channel && (
          <div>
            <label className="label">Type</label>
            <select name="kind" className="input" defaultValue="text">
              <option value="text">Text</option>
              <option value="voice">Voice</option>
            </select>
          </div>
        )}
      </div>

      {channel && categories.length > 1 ? (
        <div>
          <label className="label">Category</label>
          <select name="categoryId" className="input" defaultValue={channel.categoryId}>
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

      <div>
        <p className="label mb-1.5">Who can see it</p>
        {roles.length === 0 ? (
          <p className="text-xs text-slate-500">
            No assignable roles found on the server yet — leave blank for staff/bot only.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  name="roleIds"
                  value={r.id}
                  defaultChecked={channel?.roleIds.includes(r.id) ?? false}
                />
                {r.name}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-slate-500">
          Leave every box unchecked for a staff/bot-only channel — nobody else can see it, even
          without picking a role.
        </p>
      </div>

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
