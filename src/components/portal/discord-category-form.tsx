"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveDiscordCategory } from "@/app/(site)/portal/actions";

type Role = { id: string; name: string };

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
    <form ref={ref} action={action} className="grid gap-3">
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
                  defaultChecked={category?.roleIds?.includes(r.id) ?? false}
                />
                {r.name}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-slate-500">
          Only controls the category header itself — each channel underneath still needs its own
          roles set, it doesn&apos;t inherit from here.
        </p>
      </div>

      {state.error && <p className="text-xs text-ember">{state.error}</p>}
      {state.ok && category && <p className="text-xs text-teal">Saved.</p>}
    </form>
  );
}
