"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ConfirmButton({
  action,
  children,
  confirm = "Are you sure?",
  className = "btn-danger text-xs",
}: {
  action: () => Promise<unknown>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className={className}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        start(async () => {
          await action();
          router.refresh();
        });
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
