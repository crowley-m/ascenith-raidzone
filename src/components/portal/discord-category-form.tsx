"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveDiscordCategory } from "@/app/(site)/portal/actions";

export function DiscordCategoryForm({ category }: { category?: { id: string; name: string } }) {
  const [state, action, pending] = useActionState(saveDiscordCategory, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !category) ref.current?.reset();
  }, [state.ok, category]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      {category && <input type="hidden" name="id" value={category.id} />}
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
        {pending ? "…" : category ? "Rename" : "Create category"}
      </button>
      {state.error && <p className="w-full text-xs text-ember">{state.error}</p>}
      {state.ok && category && <p className="w-full text-xs text-teal">Saved.</p>}
    </form>
  );
}
