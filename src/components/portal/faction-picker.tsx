"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPlayerFaction } from "@/app/(site)/portal/actions";

export function FactionPicker({
  playerId,
  current,
  factions,
}: {
  playerId: string;
  current: string | null;
  factions: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <select
      className="input h-8 py-0 text-xs"
      value={current ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value || null;
        start(async () => {
          await setPlayerFaction(playerId, v);
          router.refresh();
        });
      }}
    >
      <option value="">— none —</option>
      {factions.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
