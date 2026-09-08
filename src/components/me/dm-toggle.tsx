"use client";

import { useState, useTransition } from "react";
import { setDmNotifications } from "@/app/(site)/me/actions";

export function DmToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">Discord DM alerts</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          start(() => setDmNotifications(next));
        }}
        className={`h-5 w-9 shrink-0 border transition ${
          on ? "border-teal bg-teal/30" : "border-edge bg-void"
        }`}
      >
        <span
          className={`block h-3.5 w-3.5 bg-cream transition ${on ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}
