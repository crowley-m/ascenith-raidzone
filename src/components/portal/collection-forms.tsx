"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMediaCollection,
  renameMediaCollection,
  deleteMediaCollection,
} from "@/app/(site)/portal/actions";

export function NewCollectionForm() {
  const [state, action, pending] = useActionState(createMediaCollection, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="card flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <label className="label">Section title</label>
        <input name="title" required maxLength={60} className="input" placeholder="Base tours" />
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add section"}
      </button>
      {state.error && <p className="w-full text-xs text-ember">{state.error}</p>}
    </form>
  );
}

export function CollectionHeader({
  id,
  slug,
  title,
}: {
  id: string;
  slug: string;
  title: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          className="input max-w-xs"
        />
        <button
          className="btn-ghost text-xs"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await renameMediaCollection(id, value);
              setEditing(false);
              router.refresh();
            })
          }
        >
          Save
        </button>
        <button className="btn-ghost text-xs" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      <button
        className="text-xs text-slate-500 hover:text-teal"
        onClick={() => {
          setValue(title);
          setEditing(true);
        }}
      >
        rename
      </button>
      <button
        className="text-xs text-slate-500 hover:text-red-300"
        disabled={pending}
        onClick={() => {
          if (
            window.confirm(
              `Delete the "${title}" section and all its images? This cannot be undone.`,
            )
          ) {
            start(async () => {
              await deleteMediaCollection(id);
              router.refresh();
            });
          }
        }}
      >
        delete section
      </button>
      <span className="font-mono text-[0.66rem] text-slate-600">/winners/{slug}</span>
    </div>
  );
}
