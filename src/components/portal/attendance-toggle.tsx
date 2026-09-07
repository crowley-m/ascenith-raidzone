"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendance } from "@/app/portal/actions";

export function AttendanceToggle({
  eventId,
  playerId,
  attended,
}: {
  eventId: string;
  playerId: string;
  attended: boolean | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-1">
      {[true, false].map((val) => (
        <button
          key={String(val)}
          disabled={pending}
          className={`btn text-xs ${
            attended === val
              ? val
                ? "bg-teal text-void"
                : "bg-red-500/20 text-red-300"
              : "border border-edge bg-panel/60 text-slate-400 hover:border-teal/50"
          }`}
          onClick={() =>
            start(async () => {
              await markAttendance(eventId, playerId, val);
              router.refresh();
            })
          }
        >
          {val ? "Attended" : "No-show"}
        </button>
      ))}
    </div>
  );
}
