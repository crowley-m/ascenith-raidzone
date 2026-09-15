"use client";

import { useState } from "react";
import Link from "next/link";
import { AttendanceToggle } from "@/components/portal/attendance-toggle";

type Member = {
  id: string;
  nickname: string | null;
  player: { id: string; characterName: string | null; gameUid: string | null };
};
type Group = { name: string; tag: string | null; members: Member[] };

export function TeamRosterList({
  eventId,
  groups,
  freeAgents,
  attendance,
  canMark,
}: {
  eventId: string;
  groups: Group[];
  freeAgents: Member[];
  attendance: Record<string, boolean | null>;
  canMark: boolean;
}) {
  const [allOpen, setAllOpen] = useState<boolean | undefined>(undefined);

  const rows = (members: Member[]) => (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-edge/60">
        {members.map((s) => (
          <tr key={s.id}>
            <td className="px-3 py-2">
              <Link href={`/portal/players/${s.player.id}`} className="text-slate-200 hover:text-teal">
                {s.player.characterName ?? "Unnamed"}
              </Link>
              {s.nickname && <span className="ml-1.5 text-xs text-teal">as {s.nickname}</span>}
              {s.player.gameUid && (
                <span className="block text-xs text-slate-500">UID {s.player.gameUid}</span>
              )}
            </td>
            {canMark && (
              <td className="px-3 py-2 text-right">
                <AttendanceToggle
                  eventId={eventId}
                  playerId={s.player.id}
                  attended={attendance[s.player.id] ?? null}
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-4">
      {(groups.length > 1 || freeAgents.length > 0) && (
        <div className="flex justify-end gap-3 font-mono text-[0.66rem] uppercase tracking-widest text-slate-500">
          <button type="button" onClick={() => setAllOpen(true)} className="hover:text-teal">
            Expand all
          </button>
          <button type="button" onClick={() => setAllOpen(false)} className="hover:text-teal">
            Collapse all
          </button>
        </div>
      )}

      {groups.length === 0 && <p className="text-sm text-slate-400">No teams registered yet.</p>}

      {groups.map((g) => (
        <details key={g.name} className="border border-edge" open={allOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between border-b border-edge bg-panel/50 px-3 py-2 text-sm font-bold text-white">
            <span>
              {g.tag && <span className="text-teal">[{g.tag}] </span>}
              {g.name}
            </span>
            <span className="text-xs font-normal text-slate-500">
              {g.members.length} player{g.members.length === 1 ? "" : "s"}
            </span>
          </summary>
          {rows(g.members)}
        </details>
      ))}

      {freeAgents.length > 0 && (
        <details className="border border-edge" open={allOpen}>
          <summary className="cursor-pointer list-none border-b border-edge bg-panel/50 px-3 py-2 text-sm font-bold text-white">
            Free agents — looking for a team
            <span className="ml-2 text-xs font-normal text-slate-500">{freeAgents.length}</span>
          </summary>
          {rows(freeAgents)}
        </details>
      )}
    </div>
  );
}
