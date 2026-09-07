"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawFromEvent } from "@/app/(site)/events/actions";

export function WithdrawButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-ghost text-xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await withdrawFromEvent(eventId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Withdraw"}
    </button>
  );
}
